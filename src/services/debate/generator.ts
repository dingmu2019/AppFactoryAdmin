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
    const result = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    const cleanJson = DebateUtils.cleanJson(result.content);
    return JSON.parse(cleanJson);
  }

  static async evaluateAlignment(debate: any, context: string): Promise<{ score: number, status: string, reason: string }> {
    const prompt = `
        Topic: "${debate.topic}"
        Context:
        ${context}
        
        Task: Assess the current "Alignment/Consensus" status.
        
        Output strictly JSON:
        {
            "score": 0-100, // 0=Total Conflict, 100=Full Consensus
            "status": "Diverging" | "Converging" | "Stuck" | "Resolved",
            "reason": "Brief explanation (1 sentence)"
        }
    `;
    try {
        const result = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
        const json = JSON.parse(DebateUtils.cleanJson(result.content));
        return {
            score: json.score || 50,
            status: json.status || "Diverging",
            reason: json.reason || "Analyzing..."
        };
    } catch (e) {
        return { score: 50, status: "Unknown", reason: "Analysis failed" };
    }
  }

  static async determineNextSpeaker(debate: any, agents: AgentProfile[], debateId: string, lastSpeakerIdx: number): Promise<{ index: number, reason: string, thought: string, _usage?: any }> {
    if (lastSpeakerIdx === -1) return { index: 0, reason: "Initial speaker", thought: "Starting the debate." };
    
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
        
        Task: Select the next speaker index (0-${agents.length-1}) and Explain Why.
        
        Orchestration Logic (System 2):
        1. Analyze the last speaker's argument strength.
        2. Identify if there's a need for critique (Critic), new perspective (Diverse), or synthesis (Constructive).
        3. Check for repetitive loops.
        
        Output strictly JSON:
        {
            "internal_thought": "Analyze the current flow... (e.g., Argument A is weak, needs a challenge)",
            "next_speaker_index": 0, 
            "reason": "Public explanation for the audience (e.g., 'Inviting Dr. X to verify these claims.')"
        }
    `;
    
    try {
        const result = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
        const jsonResult = JSON.parse(DebateUtils.cleanJson(result.content));
        const idx = jsonResult.next_speaker_index;
        
        // Fallback if index invalid
        if (typeof idx !== 'number' || idx < 0 || idx >= agents.length) {
            return { 
                index: (lastSpeakerIdx + 1) % agents.length, 
                reason: "Fallback: Round-robin sequence.", 
                thought: "LLM returned invalid index.",
                _usage: result.usage
            };
        }

        return { 
            index: idx, 
            reason: jsonResult.reason || "Selected based on debate flow.", 
            thought: jsonResult.internal_thought || "Analyzing debate dynamics...",
            _usage: result.usage
        };

    } catch (e) {
        return { 
            index: (lastSpeakerIdx + 1) % agents.length, 
            reason: "System Fallback: Sequential order.", 
            thought: "Orchestration service error.",
        };
    }
  }

  static async generateCriticEvaluation(debate: any, context: string): Promise<{ content: string, usage?: any }> {
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

  static async generateAgentSpeech(debate: any, speaker: AgentProfile, context: string, timeLeftRatio?: number): Promise<{ content: string, usage?: any }> {
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
        const draftResult = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Draft your response.' }], draftPrompt);
        let draft = { internal_monologue: "", public_speech: "" };
        try { draft = JSON.parse(DebateUtils.cleanJson(draftResult.content)); } catch (e) {}

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
        const critiqueResult = await DebateUtils.callInternalLLM([{ role: 'user', content: critiquePrompt }]);

        // Step 3: Revise
        const finalPrompt = `
            ${baseSystemPrompt}
            
            [DRAFT]: ${draft.public_speech}
            [SELF-CRITIQUE]: ${critiqueResult.content}
            
            Task: Generate FINAL JSON response, incorporating the critique.
            Output strictly JSON:
            {
                "internal_monologue": "...", 
                "tool_call": "...", 
                "public_speech": "..." 
            }
        `;
        const rawResponse = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Finalize your response.' }], finalPrompt);
        
        // Accumulate tokens from all steps
        const totalUsage = {
            promptTokens: (draftResult.usage?.promptTokens || 0) + (critiqueResult.usage?.promptTokens || 0) + (rawResponse.usage?.promptTokens || 0),
            completionTokens: (draftResult.usage?.completionTokens || 0) + (critiqueResult.usage?.completionTokens || 0) + (rawResponse.usage?.completionTokens || 0)
        };

        const result = await this.handleToolAndReturn(rawResponse.content, baseSystemPrompt);
        return {
            content: result.content,
            usage: {
                promptTokens: totalUsage.promptTokens + (result.usage?.promptTokens || 0),
                completionTokens: totalUsage.completionTokens + (result.usage?.completionTokens || 0)
            }
        };
    } else {
        // Standard fast path
        const prompt = `${baseSystemPrompt}\nOutput strictly JSON:\n{"internal_monologue": "...", "tool_call": "...", "public_speech": "..."}`;
        const rawResponse = await DebateUtils.callInternalLLM([{ role: 'user', content: 'Please speak now.' }], prompt);
        return this.handleToolAndReturn(rawResponse.content, baseSystemPrompt, rawResponse.usage);
    }
  }

  // Helper to handle tool calls
  private static async handleToolAndReturn(content: string, systemPrompt: string, initialUsage?: any): Promise<{ content: string, usage?: any }> {
      let parsed: any = {};
      try {
          parsed = JSON.parse(DebateUtils.cleanJson(content));
      } catch (e) { return { content, usage: initialUsage }; }

      if (parsed.tool_call) {
          const toolResult = await DebateTools.executeTool(parsed.tool_call);
          const followUpPrompt = `Tool Result: ${toolResult}\nGenerate final Public Speech based on this evidence. Output strictly JSON.`;
          const response = await DebateUtils.callInternalLLM([{ role: 'user', content: followUpPrompt }], systemPrompt);
          
          return {
              content: response.content,
              usage: {
                  promptTokens: (initialUsage?.promptTokens || 0) + (response.usage?.promptTokens || 0),
                  completionTokens: (initialUsage?.completionTokens || 0) + (response.usage?.completionTokens || 0)
              }
          };
      }
      return { content, usage: initialUsage };
  }

  static async generateSummary(debate: any) {
    const { data: messages } = await supabase
        .from('debate_messages')
        .select('agent_name, content')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: true });
    const transcript = messages?.map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';
    const prompt = `Analyze transcript on "${debate.topic}". Provide Markdown summary in Chinese. NO HTML, NO ITALICS.`;
    const result = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    await supabase.from('agent_debates').update({ summary: result.content }).eq('id', debate.id);
    await DebateUtils.saveMessage(debate.id, 'System', 'Judge', `**Summary Report**\n\n${result.content}`, 999, undefined, true, result.usage?.promptTokens, result.usage?.completionTokens);
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
    
    const result = await DebateUtils.callInternalLLM([{ role: 'user', content: prompt }]);
    try {
        const parsed = JSON.parse(DebateUtils.cleanJson(result.content));
        // Inject usage into the parsed object for the caller to save
        parsed._usage = result.usage; 
        return parsed;
    } catch (e) {
        console.error('Failed to parse structured result:', e);
        return {
            conclusion: "Analysis failed.",
            key_arguments: [],
            risks: [],
            action_items: [],
            summary_markdown: "Failed to generate structured summary.",
            _usage: result.usage
        };
    }
  }
}
