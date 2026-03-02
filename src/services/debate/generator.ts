import { modelRouter } from '../ai/ModelRouter';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import type { AgentProfile } from './types';
import { DebateUtils } from './utils';
import { DebateTools } from './tools';
import { MemoryService } from './memory';

export class DebateGenerator {
  static async generateAgents(topic: string, mode: string, entropy: number, count: number = 5): Promise<AgentProfile[]> {
    const prompt = `
      Topic: "${topic}"
      Mode: ${mode}
      Intensity (Entropy): ${entropy} (0=Calm, 1=Chaos/Aggressive)
      
      Generate ${count} world-class expert participants.
      
      REQUIREMENTS:
      1. Authority: Each participant must be a recognized expert, senior architect, or thought leader in their field (e.g., "Chief AI Scientist", "Senior System Architect", "Industry Veteran"). Avoid generic names like "User A" or "Supporter".
      2. Diversity: Ensure a mix of perspectives (e.g., Academic Theorist, Pragmatic Engineer, Skeptical Security Expert, Product Visionary).
      3. Depth: Their stances should be nuanced and grounded in deep domain knowledge, not superficial opinions.
      4. Language: The participants must be suitable for a high-level Chinese language technical debate.
      
      Return strictly a JSON array of objects with keys: name, role, stance, avatar (emoji).
      Example: [{"name": "Dr. Li (Turing Award Winner)", "role": "Chief AI Scientist", "stance": "Advocates for...", "avatar": "🧑‍🔬"}]
      
      CRITICAL: Ensure the JSON is valid and does not contain any trailing characters or comments.
    `;
    const jsonStr = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    const cleanJson = DebateUtils.cleanJson(jsonStr);
    return JSON.parse(cleanJson);
  }

  static async determineNextSpeaker(debate: any, agents: AgentProfile[], debateId: string, lastSpeakerIdx: number): Promise<number> {
    if (lastSpeakerIdx === -1) return 0;
    const { data: recentMsgs } = await supabase
        .from('debate_messages')
        .select('agent_name, content')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: false })
        .limit(3);
    const history = recentMsgs?.reverse().map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';
    const prompt = `
        You are the Moderator of a debate.
        Topic: "${debate.topic}"
        Participants:
        ${agents.map((a, i) => `${i}. ${a.name} (${a.role})`).join('\n')}
        Recent transcript:
        ${history}
        Task: Select the next speaker index (0-${agents.length-1}).
        Rules:
        1. If the last argument was weak or controversial, pick a Critic/Challenger.
        2. If the debate is stuck, pick a Constructive role.
        3. Do not pick the same person twice in a row.
        Return JSON: {"next_speaker_index": 0, "reason": "..."}
    `;
    try {
        const jsonStr = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
        const result = JSON.parse(DebateUtils.cleanJson(jsonStr));
        const idx = result.next_speaker_index;
        if (typeof idx === 'number' && idx >= 0 && idx < agents.length) return idx;
        return (lastSpeakerIdx + 1) % agents.length;
    } catch (e) {
        return (lastSpeakerIdx + 1) % agents.length;
    }
  }

  static async generateCriticEvaluation(debate: any, context: string): Promise<string> {
    const systemPrompt = `
      You are Hassabis, an Adversarial Critic and Senior Architect.
      Topic: "${debate.topic}"
      Context of recent debate:
      ${context}
      Task: Critically evaluate the recent arguments.
      1. Identify logical fallacies, lack of evidence, or technical inaccuracies.
      ${debate.enable_environment_awareness ? '2. Check if participants ignored the [ACTIVE ENVIRONMENT DATA].' : ''}
      3. Point out "groupthink" or "hallucination spirals".
      4. Be direct, constructive, and slightly strict. Demand higher standards.
      5. IMPORTANT: You MUST speak in Chinese.
      Output strictly JSON:
      {
          "internal_monologue": "...",
          "public_speech": "..."
      }
    `;
    return await DebateUtils.callInternalLLM([{ role: 'user', content: 'Evaluate the debate progress now.' }], systemPrompt);
  }

  static async generateAgentSpeech(debate: any, speaker: AgentProfile, context: string, timeLeftRatio?: number): Promise<string> {
    // 1. Retrieve Long-term Memory
    const longTermMemory = await MemoryService.retrieveRelevantMemories(debate.topic, debate.id);
    const memoryContext = longTermMemory ? `\n[LONG-TERM MEMORY (Insights from past debates)]:\n${longTermMemory}\n` : '';

    // 2. Check Entropy for Deep Search / System 2 intensity
    const isHighEntropy = (debate.entropy || 0.5) > 0.7;
    const forceToolUsage = isHighEntropy ? `\nCRITICAL INSTRUCTION: Due to high debate intensity, you MUST use a tool (web_search or search_codebase) to verify your claims before speaking.` : '';

    let timeInstruction = '';
    if (timeLeftRatio !== undefined) {
        if (timeLeftRatio < 0.2) {
            timeInstruction = '\n[URGENT]: The debate is ending soon (less than 20% time left). Please start converging your arguments, summarize key points, and work towards a conclusion or consensus. Do not introduce new complex topics.';
        } else if (timeLeftRatio < 0.5) {
            timeInstruction = '\n[NOTICE]: The debate is halfway through. Ensure you are addressing the core issues and not just scratching the surface.';
        }
    }

    const baseSystemPrompt = `
      You are ${speaker.name}, a ${speaker.role}.
      Stance: ${speaker.stance}.
      Topic: "${debate.topic}".
      Mode: ${debate.mode}.
      
      Context:
      ${context}
      ${memoryContext}

      Task: Provide a Dual-Stream response.
      1. Internal Monologue (System 2): Analyze, plan your argument. Check Long-term Memory for contradictions or support.
      2. Tool Usage (Optional): Use [TOOL: name "args"] if needed.
         Supported Tools: 
         ${debate.enable_environment_awareness ? '- [TOOL: search_codebase "query"]' : ''}
         - [TOOL: web_search "query"]
      3. Public Speech (System 1): Actual response.
      
      IMPORTANT: You MUST speak in Chinese.
      ${forceToolUsage}
      ${timeInstruction}
    `;

    // --- Reflexion Loop (Draft -> Critique -> Revise) ---
    // Only trigger Reflexion if high entropy or explicitly a "Deep Thinker" role
    const enableReflexion = isHighEntropy || speaker.role.includes('Architect') || speaker.role.includes('Expert');

    if (enableReflexion) {
        // Step 1: Draft
        const draftPrompt = `${baseSystemPrompt}\nOutput strictly JSON draft:\n{"internal_monologue": "...", "public_speech": "..."}`;
        const draftRaw = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Draft your response.' }], draftPrompt);
        let draft = { internal_monologue: "", public_speech: "" };
        try { draft = JSON.parse(DebateUtils.cleanJson(draftRaw)); } catch (e) {}

        // Step 2: Critique (Self-Correction)
        const critiquePrompt = `
            You are ${speaker.name}. Review your own draft response:
            "${draft.public_speech}"
            
            Critique Criteria:
            1. Is it consistent with your stance (${speaker.stance})?
            2. Is the logic sound?
            3. Did you verify facts (if high intensity)?
            
            Output concise critique in 1 sentence.
        `;
        const critique = await DebateUtils.callInternalLLM([{ role: 'user', content: critiquePrompt }]);

        // Step 3: Revise
        const finalPrompt = `
            ${baseSystemPrompt}
            
            [DRAFT]: ${draft.public_speech}
            [SELF-CRITIQUE]: ${critique}
            
            Task: Generate FINAL JSON response, incorporating the critique.
            Output strictly JSON:
            {
                "internal_monologue": "...", 
                "tool_call": "...", 
                "public_speech": "..." 
            }
        `;
        const rawResponse = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Finalize your response.' }], finalPrompt);
        return this.handleToolAndReturn(rawResponse, baseSystemPrompt);
    } else {
        // Standard fast path
        const prompt = `${baseSystemPrompt}\nOutput strictly JSON:\n{"internal_monologue": "...", "tool_call": "...", "public_speech": "..."}`;
        const rawResponse = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Please speak now.' }], prompt);
        return this.handleToolAndReturn(rawResponse, baseSystemPrompt);
    }
  }

  // Helper to handle tool calls
  private static async handleToolAndReturn(rawResponse: string, systemPrompt: string): Promise<string> {
      let parsed: any = {};
      try {
          parsed = JSON.parse(DebateUtils.cleanJson(rawResponse));
      } catch (e) { return rawResponse; }

      if (parsed.tool_call) {
          const toolResult = await DebateTools.executeTool(parsed.tool_call);
          const followUpPrompt = `Tool Result: ${toolResult}\nGenerate final Public Speech based on this evidence. Output strictly JSON.`;
          return await DebateUtils.callInternalLLM([{ role: 'user', content: followUpPrompt }], systemPrompt);
      }
      return rawResponse;
  }

  static async generateSummary(debate: any) {
    const { data: messages } = await supabase
        .from('debate_messages')
        .select('agent_name, content')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: true });
    const transcript = messages?.map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';
    const prompt = `Analyze transcript on "${debate.topic}". Provide Markdown summary in Chinese. NO HTML, NO ITALICS.`;
    const summary = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    await supabase.from('agent_debates').update({ summary }).eq('id', debate.id);
    await DebateUtils.saveMessage(debate.id, 'System', 'Judge', `**Summary Report**\n\n${summary}`, 999, undefined, true);
  }

  static async generateStructuredResult(debate: any) {
    const { data: messages } = await supabase
        .from('debate_messages')
        .select('agent_name, content, round_index')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: true });
    
    const transcript = messages?.map(m => `[Round ${m.round_index}] ${m.agent_name}: ${m.content}`).join('\n') || '';
    
    const prompt = `
        You are a Strategic Analyst. Analyze the debate transcript on "${debate.topic}".
        
        Transcript:
        ${transcript}
        
        Task: Generate a structured outcome report.
        Output strictly JSON with the following schema:
        {
            "conclusion": "Final consensus or main takeaway (1-2 sentences)",
            "key_arguments": [
                { "point": "...", "supporter": "Agent Name", "evidence_round": 1 }
            ],
            "risks": [
                { "risk": "...", "probability": "High/Medium/Low", "mitigation": "..." }
            ],
            "action_items": [
                { "task": "...", "owner": "Role/Department", "priority": "P0/P1/P2" }
            ],
            "summary_markdown": "A concise executive summary in Markdown format"
        }
        
        IMPORTANT: 
        1. Be specific and actionable.
        2. If no consensus, state the divergence.
        3. Use Chinese for content.
    `;
    
    const jsonStr = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    try {
        return JSON.parse(DebateUtils.cleanJson(jsonStr));
    } catch (e) {
        console.error('Failed to parse structured result:', e);
        return {
            conclusion: "Analysis failed.",
            key_arguments: [],
            risks: [],
            action_items: [],
            summary_markdown: "Failed to generate structured summary."
        };
    }
  }
}
