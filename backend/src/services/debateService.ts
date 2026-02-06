
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getDatabaseClient } from '../lib/db/connection.ts';
import type { Client } from 'pg';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface DebateConfig {
  topic: string;
  mode: 'free_discussion' | 'debate';
  duration: number; // minutes
  entropy: number; // 0.0 - 1.0
  user_id: string;
  app_id?: string;
  enable_environment_awareness?: boolean;
}

export interface AgentProfile {
  name: string;
  role: string;
  stance: string;
  avatar: string;
}

// Simple in-memory storage for active debates to manage the loop
// In a production serverless env, this should be a queue worker or similar
// Since we have a long-running Express server, this map works for MVP.
const activeDebates = new Map<string, {
  status: 'running' | 'stopping' | 'stopped';
  timer?: NodeJS.Timeout;
}>();

export class DebateService {
  
  static async createDebate(config: DebateConfig & { participants_count?: number }) {
    // 1. Generate Agents using LLM
    const agents = await this.generateAgents(config.topic, config.mode, config.entropy, config.participants_count || 5);
    
    // 2. Create DB Record
    const { data: debate, error } = await supabase
      .from('agent_debates')
      .insert({
        topic: config.topic,
        mode: config.mode,
        duration_limit: config.duration,
        entropy: config.entropy,
        participants: agents,
        status: 'pending',
        user_id: config.user_id,
        app_id: config.app_id,
        enable_environment_awareness: config.enable_environment_awareness || false
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create debate: ${error.message}`);
    return debate;
  }

  static async startDebate(debateId: string) {
    const { data: debate } = await supabase
      .from('agent_debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (!debate) throw new Error('Debate not found');
    if (debate.status === 'running') return; // Already running

    // Update status
    await supabase
      .from('agent_debates')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', debateId);

    // Initialize in-memory control
    activeDebates.set(debateId, { status: 'running' });

    // Start background loop
    this.runDebateLoop(debate);
  }

  static async stopDebate(debateId: string) {
    const control = activeDebates.get(debateId);
    if (control) {
      control.status = 'stopping';
    }
    
    await supabase
      .from('agent_debates')
      .update({ status: 'terminated', ended_at: new Date().toISOString() })
      .eq('id', debateId);
      
    activeDebates.delete(debateId);
  }

  /**
   * Main Debate Loop
   */
  private static async runDebateLoop(debate: any) {
    const agents: AgentProfile[] = debate.participants;
    const durationMs = (debate.duration_limit || 5) * 60 * 1000;
    const startTime = Date.now();
    let round = 1;
    let lastSpeakerIndex = -1;
    
    // --- ADVERSARIAL CRITIC CONFIG ---
    const CRITIC_INTERVAL = 4; // Critic intervenes every 4 rounds
    const criticAgent: AgentProfile = {
        name: "Hassabis (Critic)",
        role: "Adversarial Critic",
        stance: "Objective, Critical, Scientific",
        avatar: "🕵️‍♂️"
    };

    try {
      // Initial Moderator Message
      await this.saveMessage(debate.id, 'System', 'Moderator', `Welcome everyone. Today's topic is: "${debate.topic}". Let's begin the ${debate.mode === 'debate' ? 'debate' : 'discussion'}.`, 0);

      while (Date.now() - startTime < durationMs) {
        // Check control flag
        const control = activeDebates.get(debate.id);
        if (!control || control.status !== 'running') {
          break;
        }

        let speaker: AgentProfile;
        let isCriticTurn = false;

        // --- ADVERSARIAL CRITIC INTERVENTION ---
        if (round > 1 && round % CRITIC_INTERVAL === 0) {
            isCriticTurn = true;
            speaker = criticAgent;
        } else {
            // Normal Debate Flow
            const speakerIndex = await this.determineNextSpeaker(debate, agents, debate.id, lastSpeakerIndex);
            speaker = agents[speakerIndex];
            lastSpeakerIndex = speakerIndex;
        }
        // ----------------------------------------

        // Fetch recent context (last 5 messages)
        const { data: recentMsgs } = await supabase
          .from('debate_messages')
          .select('agent_name, content')
          .eq('debate_id', debate.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        const context = recentMsgs?.reverse().map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';

        // --- INJECT ACTIVE SCHEMA ---
        let schemaInfo = "";
        if (debate.enable_environment_awareness) {
             const schemaSnapshot = await this.getSchemaSnapshot();
             schemaInfo = `
            [ACTIVE ENVIRONMENT DATA]
            DB Tables: ${Object.keys(schemaSnapshot.database_tables).join(', ')}
            Constraints: ${schemaSnapshot.constraints}
            `;
        }

        const fullContext = `
            ${context}
            ${schemaInfo}
        `;
        
        // --- GENERATE SPEECH ---
        let dualStreamContent = "";
        
        if (isCriticTurn) {
            // Generate Critic's Evaluation
            dualStreamContent = await this.generateCriticEvaluation(debate, fullContext);
        } else {
            // Generate Standard Agent Speech
            dualStreamContent = await this.generateAgentSpeech(debate, speaker, fullContext);
        }
        
        let publicSpeech = "";
        let internalMonologue = "";
        
        try {
             const parsed = JSON.parse(this.cleanJson(dualStreamContent));
             publicSpeech = parsed.public_speech || parsed.speech; // Fallback
             internalMonologue = parsed.internal_monologue || parsed.thought; // Fallback
        } catch (e) {
            // Fallback for parsing error
            publicSpeech = dualStreamContent;
            internalMonologue = "Analysis failed or raw output.";
        }
        
        // Save message
        await this.saveMessage(debate.id, speaker.name, speaker.role, publicSpeech, round, internalMonologue);

        // Wait a bit (simulate thinking/reading time)
        await new Promise(resolve => setTimeout(resolve, 5000));

        round++;
      }

      // Time's up or stopped
      const finalControl = activeDebates.get(debate.id);
      if (finalControl && finalControl.status === 'running') {
        await this.generateSummary(debate);
        await supabase
          .from('agent_debates')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('id', debate.id);
      }

    } catch (error) {
      console.error(`Debate ${debate.id} error:`, error);
      await supabase
        .from('agent_debates')
        .update({ status: 'error', error_message: String(error) })
        .eq('id', debate.id);
    } finally {
      activeDebates.delete(debate.id);
    }
  }

  // --- NEW: GENERATE CRITIC EVALUATION ---
  private static async generateCriticEvaluation(debate: any, context: string): Promise<string> {
    const systemPrompt = `
      You are Hassabis, an Adversarial Critic and Senior Architect.
      Topic: "${debate.topic}"
      
      Context of recent debate:
      ${context}
      
      Task: Critically evaluate the recent arguments.
      1. Identify logical fallacies, lack of evidence, or technical inaccuracies.
      ${debate.enable_environment_awareness ? '2. Check if participants ignored the [ACTIVE ENVIRONMENT DATA] (e.g. suggesting tables that don\'t exist).' : ''}
      3. Point out "groupthink" or "hallucination spirals".
      4. Be direct, constructive, and slightly strict. Demand higher standards.
      5. IMPORTANT: You MUST speak in Chinese (Simplified Chinese).
      
      Output strictly JSON:
      {
          "internal_monologue": "Scanning recent 4 rounds for consistency and fact-checking...",
          "public_speech": "等一下。我发现 Alice 的论点有一个致命缺陷..."
      }
    `;
    
    return await this.callInternalLLM([{ role: 'user', content: 'Evaluate the debate progress now.' }], systemPrompt);
  }

  // --- Active Perception Helper ---
  private static async getSchemaSnapshot(): Promise<any> {
    let client: Client | null = null;
    try {
        client = await getDatabaseClient();
        
        const query = `
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `;
        
        const res = await client.query(query);
        const schema: Record<string, string[]> = {};
        
        res.rows.forEach((row: any) => {
            const tableName = row.table_name;
            const colDef = `${row.column_name} (${row.data_type})`;
            if (!schema[tableName]) schema[tableName] = [];
            schema[tableName].push(colDef);
        });
        
        return {
            tech_stack: ['React 18', 'Node.js', 'Supabase'],
            database_tables: schema,
            constraints: 'Low Ops, High Reusability'
        };
    } catch (e) {
        console.error("Failed to fetch schema", e);
        return { database_tables: {}, constraints: 'Unknown' };
    } finally {
        if (client) await client.end();
    }
  }

  private static async saveMessage(debateId: string, name: string, role: string, content: string, round: number, thought?: string) {
    let finalContent = content;

    // --- VISUALIZING SYSTEM 2 ---
    // Prepend the Internal Monologue as a collapsible details block in Markdown/HTML
    if (thought && thought.trim().length > 0 && thought !== "Analysis failed or raw output.") {
        const thoughtBlock = `
<details class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg text-xs text-amber-800 dark:text-amber-400">
<summary class="cursor-pointer font-bold select-none flex items-center gap-2 opacity-80 hover:opacity-100">
   <span>🧠 System 2 Thinking (Internal Monologue)</span>
</summary>

${thought}

</details>

`;
        finalContent = thoughtBlock + content;
    }
    
    await supabase.from('debate_messages').insert({
      debate_id: debateId,
      agent_name: name,
      role: role,
      content: finalContent,
      round_index: round
    });
  }

  // --- LLM Helpers ---

  // NOTE: In a real implementation, these would call the internal `callLLM` helper.
  // Since we are in the backend folder, we need to invoke the LLM API route logic directly or via fetch.
  // For simplicity, I'll use `fetch` to localhost since `callLLM` in frontend is client-side.
  // Wait, I can import the logic from `api/ai/chat/route.ts` if I refactor it, but it's an express handler.
  // Better to copy the LLM calling logic or make a shared service.
  // For this MVP, I will implement a private `callInternalLLM` that duplicates the `api/ai/chat/route` logic minimally
  // OR simply fetch the public API if the server is running.
  
  private static async callInternalLLM(messages: any[], systemPrompt?: string): Promise<string> {
    // We can use the existing /api/ai/chat route logic by calling it via fetch to localhost
    // We need to sign a JWT or use service role secret if we bypass auth?
    // The route checks for `x-admin-secret`.
    
    const port = process.env.PORT || 3001;
    const response = await fetch(`http://localhost:${port}/api/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': process.env.SUPABASE_SERVICE_ROLE_KEY!
        },
        body: JSON.stringify({ messages, systemPrompt })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`LLM Error: ${txt}`);
    }
    const data = await response.json() as { content: string };
    return data.content;
  }

  // --- SUGGESTION 2: DYNAMIC SPEAKER SELECTION ---
  private static async determineNextSpeaker(debate: any, agents: AgentProfile[], debateId: string, lastSpeakerIdx: number): Promise<number> {
    // First turn
    if (lastSpeakerIdx === -1) return 0;

    // Get recent history for context
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
        const jsonStr = await this.callInternalLLM([{ role: 'user', content: prompt }]);
        const result = JSON.parse(this.cleanJson(jsonStr));
        const idx = result.next_speaker_index;
        if (typeof idx === 'number' && idx >= 0 && idx < agents.length) {
            return idx;
        }
        return (lastSpeakerIdx + 1) % agents.length;
    } catch (e) {
        return (lastSpeakerIdx + 1) % agents.length;
    }
  }

  private static async generateAgents(topic: string, mode: string, entropy: number, count: number = 5): Promise<AgentProfile[]> {
    const prompt = `
      Topic: "${topic}"
      Mode: ${mode}
      Intensity (Entropy): ${entropy} (0=Calm, 1=Chaos/Aggressive)
      
      Generate ${count} debate participants.
      Return strictly a JSON array of objects with keys: name, role, stance, avatar (emoji).
      The participants should be suitable for a Chinese language debate environment.
      Example: [{"name": "张三", "role": "支持者", "stance": "...", "avatar": "😊"}]
    `;
    
    const jsonStr = await this.callInternalLLM([{ role: 'user', content: prompt }]);
    // Basic cleanup to ensure JSON
    const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  }

  // --- SUGGESTION 1: DUAL-STREAM PROMPT ---
  private static async generateAgentSpeech(debate: any, speaker: AgentProfile, context: string): Promise<string> {
    const systemPrompt = `
      You are ${speaker.name}, a ${speaker.role}.
      Stance: ${speaker.stance}.
      Topic: "${debate.topic}".
      Mode: ${debate.mode}.
      
      Context:
      ${context}
      
      Task: Provide a Dual-Stream response.
      1. Internal Monologue (System 2): Analyze the situation, check for fallacies, plan your argument.
      2. Tool Usage (Optional): If you need to verify facts, use a tool notation like [TOOL: search_codebase "query"].
         Supported Tools: 
         ${debate.enable_environment_awareness ? '- [TOOL: search_codebase "query"] : Search local project code.' : ''}
         - [TOOL: web_search "query"] : Search the internet.
      3. Public Speech (System 1): The actual response.
      
      IMPORTANT: You MUST speak in Chinese (Simplified Chinese). Your internal monologue should also be in Chinese.

      Output strictly JSON:
      {
          "internal_monologue": "我需要检查一下订单服务的逻辑...",
          "tool_call": "search_codebase 'OrderService lock'",
          "public_speech": "我认为..." 
      }
    `;
    
    // 1. Initial Call
    const rawResponse = await this.callInternalLLM([{ role: 'user', content: 'Please speak now.' }], systemPrompt);
    let parsed: any = {};
    
    try {
        parsed = JSON.parse(this.cleanJson(rawResponse));
    } catch (e) {
        return rawResponse; // Fallback
    }
    
    // 2. Handle Tool Call (if any)
    if (parsed.tool_call) {
        const toolResult = await this.executeTool(parsed.tool_call);
        
        // Re-generate speech with tool result
        const followUpPrompt = `
            Tool Result: ${toolResult}
            
            Now, generate the final Public Speech incorporating this evidence.
            
            Output strictly JSON:
            {
                "internal_monologue": "The tool confirmed that...",
                "public_speech": "I checked the code and found that..."
            }
        `;
        const finalRes = await this.callInternalLLM([{ role: 'user', content: followUpPrompt }], systemPrompt);
        return finalRes;
    }
    
    return rawResponse;
  }

  // --- TOOL EXECUTOR ---
  private static async executeTool(toolCallStr: string): Promise<string> {
    // Simple parser for [TOOL: name "args"] or JSON string
    // Expected format: "tool_name 'args'"
    
    // Parse tool name and query
    let toolName = "";
    let query = "";
    
    if (toolCallStr.includes("search_codebase")) {
        toolName = "search_codebase";
        const match = toolCallStr.match(/['"](.*?)['"]/);
        query = match ? match[1] : "";
    } else if (toolCallStr.includes("web_search")) {
        toolName = "web_search";
        const match = toolCallStr.match(/['"](.*?)['"]/);
        query = match ? match[1] : "";
    } else {
        return `[Tool Result] Tool execution failed: Unknown tool format. Use 'tool_name "query"'.`;
    }

    if (toolName === 'search_codebase') {
        return `[Tool Result] Found 3 matches in 'OrderService.ts': \n1. function lockInventory()...\n2. // TODO: Fix race condition\n(Simulated Search Result)`;
    }
    
    if (toolName === 'web_search') {
        try {
            console.log(`[DebateService] Executing Web Search: ${query}`);
            
            // 1. Check for SerpApi Key (Google) - Best Quality
            const serpKey = process.env.SERPAPI_KEY || process.env.GOOGLE_SEARCH_API_KEY;
            
            if (serpKey) {
                 // Use SerpApi/Google Custom Search if configured
                 const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}`;
                 const res = await fetch(url);
                 const data: any = await res.json();
                 
                 if (data.organic_results && data.organic_results.length > 0) {
                     const snippets = data.organic_results.slice(0, 3).map((r: any) => `[${r.title}] ${r.snippet}`).join('\n');
                     return `[Tool Result] Google Search Results:\n${snippets}`;
                 }
            }
            
            // 2. Fallback to DuckDuckGo (Free)
            console.log(`[DebateService] Fallback to DuckDuckGo for: ${query}`);
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
            const res = await fetch(ddgUrl);
            const data: any = await res.json();
             
             if (data.AbstractText) {
                  return `[Tool Result] Web Search Result from DuckDuckGo:\n${data.AbstractText}\nSource: ${data.AbstractURL}`;
             } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                  const snippets = data.RelatedTopics.slice(0, 3).map((t: any) => t.Text).join('\n- ');
                  return `[Tool Result] Web Search Results from DuckDuckGo:\n- ${snippets}`;
             } else {
                  return `[Tool Result] No direct "Instant Answer" found on DuckDuckGo for "${query}". (Suggestion: Try more general keywords or configure a Google/SerpApi Key for full web indexing.)`;
            }
            
        } catch (e: any) {
            return `[Tool Result] Web Search Failed: ${e.message}`;
        }
    }
    
    return `[Tool Result] Tool execution failed: Unknown tool.`;
  }

  private static cleanJson(str: string): string {
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
    }
    return cleaned;
  }

  private static async generateSummary(debate: any) {
    // Fetch all messages
    const { data: messages } = await supabase
        .from('debate_messages')
        .select('agent_name, content')
        .eq('debate_id', debate.id)
        .order('round_index', { ascending: true });
    
    const transcript = messages?.map(m => `${m.agent_name}: ${m.content}`).join('\n') || '';

    const prompt = `
      Analyze the following debate transcript on topic "${debate.topic}".
      Provide a structured summary using the Pyramid Principle.
      Output in Markdown format.

      **Requirements:**
      1. Do NOT use italic text (e.g., *text* or _text_).
      2. Do NOT center the text.
      3. Use colorful Markdown features if possible (e.g., use blockquotes, bold text for emphasis, headers).
      4. Make it visually appealing and easy to grasp the key points.
      5. Use standard Markdown headers (#, ##, ###) for structure.
      6. IMPORTANT: Please provide the summary in Simplified Chinese (简体中文).
      
      Transcript:
      ${transcript}
    `;

    const summary = await this.callInternalLLM([{ role: 'user', content: prompt }]);
    
    // Save summary
    await supabase
        .from('agent_debates')
        .update({ summary })
        .eq('id', debate.id);
        
    // Also add a summary message
    await this.saveMessage(debate.id, 'System', 'Judge', `**Summary Report**\n\n${summary}`, 999);
  }
}
