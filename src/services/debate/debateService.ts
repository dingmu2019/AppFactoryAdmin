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
    if (debate.status === 'running') return;
    await supabase.from('agent_debates').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', debateId);
    activeDebates.set(debateId, { status: 'running' });
    this.runDebateLoop(debate);
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
    const startTime = Date.now();
    let round = 1;
    let lastSpeakerIndex = -1;
    const CRITIC_INTERVAL = 4;
    const criticAgent: AgentProfile = {
        name: "Hassabis (Critic)",
        role: "Adversarial Critic",
        stance: "Objective, Critical, Scientific",
        avatar: "🕵️‍♂️"
    };

    try {
      await DebateUtils.saveMessage(debate.id, 'System', 'Moderator', `Welcome everyone. Today's topic is: "${debate.topic}".`, 0);

      while (Date.now() - startTime < durationMs) {
        const control = activeDebates.get(debate.id);
        if (!control || control.status !== 'running') break;

        let speaker: AgentProfile;
        let isCriticTurn = false;

        if (round > 1 && round % CRITIC_INTERVAL === 0) {
            isCriticTurn = true;
            speaker = criticAgent;
        } else {
            const speakerIndex = await DebateGenerator.determineNextSpeaker(debate, agents, debate.id, lastSpeakerIndex);
            speaker = agents[speakerIndex];
            lastSpeakerIndex = speakerIndex;
        }

        const { data: recentMsgs } = await supabase.from('debate_messages').select('agent_name, content').eq('debate_id', debate.id).order('created_at', { ascending: false }).limit(5);
        const context = recentMsgs?.reverse().map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';

        let schemaInfo = "";
        if (debate.enable_environment_awareness) {
             const schemaSnapshot = await DebateTools.getSchemaSnapshot();
             schemaInfo = `\n[ACTIVE ENVIRONMENT DATA]\nDB Tables: ${Object.keys(schemaSnapshot.database_tables).join(', ')}\n`;
        }
        
        const fullContext = `${context}${schemaInfo}`;
        
        const elapsedTime = Date.now() - startTime;
        const timeLeftRatio = 1 - (elapsedTime / durationMs);

        let dualStreamContent = isCriticTurn 
            ? await DebateGenerator.generateCriticEvaluation(debate, fullContext)
            : await DebateGenerator.generateAgentSpeech(debate, speaker, fullContext, timeLeftRatio);
        
        let publicSpeech = "";
        let internalMonologue = "";
        try {
             const parsed = JSON.parse(DebateUtils.cleanJson(dualStreamContent));
             publicSpeech = parsed.public_speech || parsed.speech;
             internalMonologue = parsed.internal_monologue || parsed.thought;
        } catch (e) {
            publicSpeech = dualStreamContent;
            internalMonologue = "Analysis failed or raw output.";
        }
        
        await DebateUtils.saveMessage(debate.id, speaker.name, speaker.role, publicSpeech, round, internalMonologue);
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

        await DebateUtils.saveMessage(debate.id, 'System', 'Judge', `**Summary Report**\n\n${summary}`, 999, JSON.stringify(structuredResult), true);
      }
    } catch (error) {
      console.error(`Debate ${debate.id} error:`, error);
      await supabase.from('agent_debates').update({ status: 'error', error_message: String(error) }).eq('id', debate.id);
    } finally {
      activeDebates.delete(debate.id);
    }
  }
}
