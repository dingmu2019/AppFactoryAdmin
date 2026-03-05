import { supabaseAdmin as supabase } from '@/lib/supabase';
import type { DebateConfig, AgentProfile } from './types';
import { DebateUtils } from './utils';
import { DebateTools } from './tools';
import { DebateGenerator } from './generator';

export class DebateService {
  static async stopDebate(debateId: string) {
    await supabase.from('agent_debates').update({ status: 'terminated', ended_at: new Date().toISOString() }).eq('id', debateId);
  }
  
  static async recoverRunningDebates() {
      console.log('[DebateService] Checking for stalled debates...');
      try {
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          
          const { data: stalledDebates } = await supabase
              .from('agent_debates')
              .select('id')
              .eq('status', 'running')
              .lt('last_heartbeat_at', tenMinutesAgo);
          
          if (stalledDebates && stalledDebates.length > 0) {
              console.log(`[DebateService] Found ${stalledDebates.length} stalled debates. Triggering one round for each...`);
              for (const debate of stalledDebates) {
                  this.processNextRound(debate.id).catch(err => {
                      console.error(`[DebateService] Failed to rescue debate ${debate.id}:`, err);
                  });
              }
          }
      } catch (err) {
          console.error('[DebateService] Recovery failed:', err);
      }
  }

  static async createDebate(config: DebateConfig & { participants_count?: number }) {
    const agents = await DebateGenerator.generateAgents(config.topic, config.mode, config.entropy, config.participants_count || 5);
    const baseInsert: any = {
      topic: config.topic,
      mode: config.mode,
      duration_limit: config.duration,
      entropy: config.entropy,
      participants: agents,
      status: 'pending',
      user_id: config.user_id,
      app_id: config.app_id,
      enable_environment_awareness: config.enable_environment_awareness || false,
      scroll_mode: config.scroll_mode || 'auto'
    };

    let { data: debate, error } = await supabase
      .from('agent_debates')
      .insert(baseInsert)
      .select()
      .single();

    if (error) {
      const msg = String(error.message || '');
      if (msg.includes('enable_environment_awareness') || msg.includes('scroll_mode')) {
        delete baseInsert.enable_environment_awareness;
        delete baseInsert.scroll_mode;
        ({ data: debate, error } = await supabase
          .from('agent_debates')
          .insert(baseInsert)
          .select()
          .single());
      }
    }

    if (error) throw new Error(`Failed to create debate: ${error.message}`);
    return debate;
  }

  static async startDebate(debateId: string) {
    const { data: debate } = await supabase.from('agent_debates').select('*').eq('id', debateId).single();
    if (!debate) throw new Error('Debate not found');
    
    // Update status to running immediately
    await supabase.from('agent_debates').update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString() 
    }).eq('id', debateId);
    
    // In our new stable architecture, the Frontend will drive the rounds via API.
    // We no longer start a long-running background loop here.
    console.log(`[DebateService] Debate ${debateId} marked as running. Waiting for client to drive rounds.`);
  }

  static async processNextRound(debateId: string) {
    const { data: debate, error: dError } = await supabase.from('agent_debates').select('*').eq('id', debateId).single();
    if (dError || !debate) throw new Error('Debate not found');
    if (debate.status !== 'running') return { status: debate.status, finished: true };

    // --- Distributed Lock / Mutex ---
    // Prevent multiple clients from processing the same round simultaneously.
    // We check the last heartbeat. If it's less than 8s ago, we skip to avoid race.
    const lastHeartbeat = debate.last_heartbeat_at ? new Date(debate.last_heartbeat_at).getTime() : 0;
    if (Date.now() - lastHeartbeat < 8000) {
        return { status: 'running', finished: false, skipped: true };
    }

    // Update heartbeat immediately to "claim" this round
    await supabase.from('agent_debates').update({ last_heartbeat_at: new Date().toISOString() }).eq('id', debate.id);

    const agents: AgentProfile[] = debate.participants;
    const durationMs = (debate.duration_limit || 5) * 60 * 1000;
    const dbStartTime = debate.started_at ? new Date(debate.started_at).getTime() : Date.now();
    const elapsedTime = Date.now() - dbStartTime;

    // Check if time is up
    if (elapsedTime >= durationMs) {
        return await this.finalizeDebate(debate);
    }

    // Determine current round and last speaker
    const { data: lastMsgs } = await supabase
        .from('debate_messages')
        .select('round_index, agent_name')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: false })
        .limit(1);
        
    let round = 1;
    let lastSpeakerIndex = -1;
    if (lastMsgs && lastMsgs.length > 0) {
        round = lastMsgs[0].round_index + 1;
        lastSpeakerIndex = agents.findIndex(a => a.name === lastMsgs[0].agent_name);
    }

    const CRITIC_INTERVAL = 4;
    const criticAgent: AgentProfile = {
        name: "Hassabis (Critic)",
        role: "Adversarial Critic",
        stance: "Objective, Critical, Scientific",
        avatar: "🕵️‍♂️"
    };

    if (round === 1) {
        await DebateUtils.saveMessage(debate.id, 'System', 'Moderator', `Welcome everyone. Today's topic is: "${debate.topic}".`, 0);
    }

    try {
        let speaker: AgentProfile;
        let isCriticTurn = false;
        let orchestrationReason = "";
        let orchestrationThought = "";
        let orchestrationUsage = null;

        if (round > 1 && round % CRITIC_INTERVAL === 0) {
            isCriticTurn = true;
            speaker = criticAgent;
            orchestrationReason = "Scheduled critique phase.";
            orchestrationThought = "It's time for a critical review.";
        } else {
            const decision = await DebateGenerator.determineNextSpeaker(debate, agents, debate.id, lastSpeakerIndex);
            speaker = agents[decision.index];
            orchestrationReason = decision.reason;
            orchestrationThought = decision.thought;
            orchestrationUsage = decision._usage;
        }

        // Save Orchestration logic
        if (round > 1) {
            await DebateUtils.saveMessage(
                debate.id,
                'System',
                'Orchestrator',
                JSON.stringify({
                    type: 'orchestration',
                    target_speaker: speaker.name,
                    reason: orchestrationReason,
                    thought: orchestrationThought
                }),
                round,
                orchestrationThought,
                false,
                orchestrationUsage?.promptTokens,
                orchestrationUsage?.completionTokens
            );
        }

        // Context assembly
        const { data: recentMsgs } = await supabase.from('debate_messages').select('agent_name, content').eq('debate_id', debate.id).order('created_at', { ascending: false }).limit(5);
        const context = recentMsgs?.reverse().map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';
        let schemaInfo = "";
        if (debate.enable_environment_awareness) {
             try {
                const schemaSnapshot = await DebateTools.getSchemaSnapshot();
                schemaInfo = `\n[ACTIVE ENVIRONMENT DATA]\nDB Tables: ${Object.keys(schemaSnapshot.database_tables).join(', ')}\n`;
             } catch (e) { console.warn('Environment awareness failed:', e); }
        }
        const fullContext = `${context}${schemaInfo}`;
        const timeLeftRatio = 1 - (elapsedTime / durationMs);

        // Generate Speech
        const dualStreamResponse = isCriticTurn 
            ? await DebateGenerator.generateCriticEvaluation(debate, fullContext)
            : await DebateGenerator.generateAgentSpeech(debate, speaker, fullContext, timeLeftRatio);
        
        let publicSpeech = "";
        let internalMonologue = "";
        try {
             const parsed = JSON.parse(DebateUtils.cleanJson(dualStreamResponse.content));
             publicSpeech = parsed.public_speech || parsed.speech || parsed.content;
             internalMonologue = parsed.internal_monologue || parsed.thought || parsed.analysis;
        } catch (e) {
            publicSpeech = dualStreamResponse.content;
            internalMonologue = "Analysis failed or raw output.";
        }
        
        await DebateUtils.saveMessage(
            debate.id, 
            speaker.name, 
            speaker.role, 
            publicSpeech, 
            round, 
            internalMonologue,
            false,
            dualStreamResponse.usage?.promptTokens,
            dualStreamResponse.usage?.completionTokens
        );

        // Alignment tracking
        if (round % 2 === 0) {
            try {
                const alignment = await DebateGenerator.evaluateAlignment(debate, fullContext);
                await DebateUtils.saveMessage(
                    debate.id,
                    'System',
                    'Moderator',
                    JSON.stringify({
                        type: 'alignment',
                        score: alignment.score,
                        status: alignment.status,
                        reason: alignment.reason
                    }),
                    round,
                    undefined,
                    false
                );
            } catch (e) { console.warn('Alignment evaluation failed:', e); }
        }

        return { status: 'running', finished: false, round };
    } catch (err: any) {
        console.error(`[DebateService] Round ${round} error:`, err);
        return { status: 'running', finished: false, error: err.message };
    }
  }

  private static async finalizeDebate(debate: any) {
    try {
        const structuredResult = await DebateGenerator.generateStructuredResult(debate);
        const summary = structuredResult.summary_markdown;

        await supabase.from('agent_debates').update({ 
            status: 'completed', 
            ended_at: new Date().toISOString(),
            summary: summary,
        }).eq('id', debate.id);
        
        await DebateUtils.saveMessage(
            debate.id, 
            'System', 
            'Judge', 
            `**Summary Report**\n\n${summary}`, 
            999, 
            JSON.stringify(structuredResult), 
            true,
            structuredResult._usage?.promptTokens,
            structuredResult._usage?.completionTokens
        );
        return { status: 'completed', finished: true };
    } catch (err: any) {
        console.error(`[DebateService] Finalization failed:`, err);
        await supabase.from('agent_debates').update({ status: 'completed', summary: 'Manual summary required.' }).eq('id', debate.id);
        return { status: 'completed', finished: true, error: err.message };
    }
  }

  private static async runDebateLoop(debate: any) {
    // This is now legacy/unused, replaced by processNextRound called from Frontend.
    // Keeping it briefly for backward compatibility if any cron still hits it, 
    // but it should be removed once API is updated.
    console.warn('[DebateService] runDebateLoop called but deprecated. Use processNextRound.');
  }
}
