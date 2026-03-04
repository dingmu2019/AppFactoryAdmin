import { supabaseAdmin as supabase } from '@/lib/supabase';
import type { DebateConfig, AgentProfile, DebateControl } from './types';
import { DebateUtils } from './utils';
import { DebateTools } from './tools';
import { DebateGenerator } from './generator';

const activeDebates = new Map<string, DebateControl>();

export class DebateService {
  
  static async recoverRunningDebates() {
      console.log('[DebateService] Checking for interrupted debates...');
      try {
          const { data: runningDebates, error } = await supabase
              .from('agent_debates')
              .select('*')
              .eq('status', 'running');
          
          if (error) throw error;
          
          if (runningDebates && runningDebates.length > 0) {
              console.log(`[DebateService] Found ${runningDebates.length} interrupted debates. Resuming...`);
              for (const debate of runningDebates) {
                  if (!activeDebates.has(debate.id)) {
                      activeDebates.set(debate.id, { status: 'running' });
                      this.runDebateLoop(debate).catch(err => console.error(`[DebateService] Failed to resume debate ${debate.id}:`, err));
                  }
              }
          } else {
              console.log('[DebateService] No interrupted debates found.');
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
    await supabase.from('agent_debates').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', debateId);
    
    // In Serverless environment (Vercel), we cannot rely on long-running background process.
    // Instead, we execute ONE round immediately, and let the Cron Job pick up the rest.
    // Or we use QStash (if configured) to trigger the next round.
    
    // For now, we use the "Cron-Rescue" pattern:
    // 1. Mark as running.
    // 2. Try to run loop (will likely timeout after 10-60s).
    // 3. Cron job runs every minute, finds 'running' debates, and resumes them.
    
    activeDebates.set(debateId, { status: 'running' });
    
    // Don't await this in the API route handler to return response fast (though Vercel might kill it)
    this.runDebateLoop(debate).catch(err => console.error(`[Debate] Loop error:`, err));
  }

  static async stopDebate(debateId: string) {
    const control = activeDebates.get(debateId);
    if (control) control.status = 'stopping';
    await supabase.from('agent_debates').update({ status: 'terminated', ended_at: new Date().toISOString() }).eq('id', debateId);
    activeDebates.delete(debateId);
  }

  private static async runDebateLoop(debate: any) {
    const agents: AgentProfile[] = debate.participants;
    const durationMs = (debate.duration_limit || 5) * 60 * 1000;
    
    // Check actual start time from DB, fallback to now
    const dbStartTime = debate.started_at ? new Date(debate.started_at).getTime() : Date.now();
    let round = 1;
    let lastSpeakerIndex = -1;
    
    // Resume state from DB messages to determine round and last speaker
    const { data: lastMsgs } = await supabase
        .from('debate_messages')
        .select('round_index, agent_name')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: false })
        .limit(1);
        
    if (lastMsgs && lastMsgs.length > 0) {
        round = lastMsgs[0].round_index + 1;
        // Find agent index
        const lastAgentName = lastMsgs[0].agent_name;
        lastSpeakerIndex = agents.findIndex(a => a.name === lastAgentName);
    }

    const CRITIC_INTERVAL = 4;
    const criticAgent: AgentProfile = {
        name: "Hassabis (Critic)",
        role: "Adversarial Critic",
        stance: "Objective, Critical, Scientific",
        avatar: "🕵️‍♂️"
    };

    try {
      if (round === 1) {
          await DebateUtils.saveMessage(debate.id, 'System', 'Moderator', `Welcome everyone. Today's topic is: "${debate.topic}".`, 0);
      }

      // Vercel Serverless Function Execution Limit Safety
      // We run a loop, but we must check execution time to avoid hard kill.
      // Assuming 60s max duration, we try to run for 40s then exit gracefully.
      const loopStart = Date.now();
      const MAX_EXECUTION_TIME = 40 * 1000; 

      while (Date.now() - dbStartTime < durationMs) {
        // Safety check: if this specific execution is running too long, break and let Cron pick it up
        if (Date.now() - loopStart > MAX_EXECUTION_TIME) {
            console.log(`[DebateService] Pausing debate ${debate.id} to avoid Serverless timeout. Waiting for Cron rescue.`);
            break;
        }

        const control = activeDebates.get(debate.id);
        if (!control || control.status !== 'running') {
            // Double check DB in case memory cache is lost (new serverless instance)
            const { data: currentStatus } = await supabase.from('agent_debates').select('status').eq('id', debate.id).single();
            if (currentStatus?.status !== 'running') break;
        }

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
            lastSpeakerIndex = decision.index;
            orchestrationReason = decision.reason;
            orchestrationThought = decision.thought;
            orchestrationUsage = decision._usage;
        }

        // --- EXPOSE ORCHESTRATION LOGIC ---
        // Save the moderator's decision process as a system message
        if (round > 1) { // Skip for the very first round if desired, or keep it
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
                orchestrationThought, // Also save thought in internal_monologue column for consistency
                false,
                orchestrationUsage?.promptTokens,
                orchestrationUsage?.completionTokens
            );
        }

        const { data: recentMsgs } = await supabase.from('debate_messages').select('agent_name, content').eq('debate_id', debate.id).order('created_at', { ascending: false }).limit(5);
        const context = recentMsgs?.reverse().map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';

        let schemaInfo = "";
        if (debate.enable_environment_awareness) {
             const schemaSnapshot = await DebateTools.getSchemaSnapshot();
             schemaInfo = `\n[ACTIVE ENVIRONMENT DATA]\nDB Tables: ${Object.keys(schemaSnapshot.database_tables).join(', ')}\n`;
        }
        
        const fullContext = `${context}${schemaInfo}`;
        
        const elapsedTime = Date.now() - dbStartTime;
        const timeLeftRatio = 1 - (elapsedTime / durationMs);

        let dualStreamResponse = isCriticTurn 
            ? await DebateGenerator.generateCriticEvaluation(debate, fullContext)
            : await DebateGenerator.generateAgentSpeech(debate, speaker, fullContext, timeLeftRatio);
        
        let publicSpeech = "";
        let internalMonologue = "";
        try {
             const parsed = JSON.parse(DebateUtils.cleanJson(dualStreamResponse.content));
             publicSpeech = parsed.public_speech || parsed.speech;
             internalMonologue = parsed.internal_monologue || parsed.thought;
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

        // --- REAL-TIME ALIGNMENT TRACKING ---
        if (round % 2 === 0) { // Evaluate every 2 rounds to save tokens
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
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        round++;
      }

      const finalControl = activeDebates.get(debate.id);
      if (finalControl && finalControl.status === 'running') {
        // Step 1: Generate Structure Result
        const structuredResult = await DebateGenerator.generateStructuredResult(debate);
        
        // Step 2: Generate Summary (Legacy support, can be derived from structured result)
        const summary = structuredResult.summary_markdown;

        await supabase.from('agent_debates').update({ 
            status: 'completed', 
            ended_at: new Date().toISOString(),
            summary: summary,
            // Assuming we will add a column for structured result later or store in a separate table
            // For now, let's just log it or store in summary if schema allows JSON
        }).eq('id', debate.id);
        
        // Store structured result in a dedicated table if exists (TODO)
        // await supabase.from('debate_results').insert({ debate_id: debate.id, ...structuredResult });

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
      }
    } catch (error) {
      console.error(`Debate ${debate.id} error:`, error);
      await supabase.from('agent_debates').update({ status: 'error', error_message: String(error) }).eq('id', debate.id);
    } finally {
      activeDebates.delete(debate.id);
    }
  }
}
