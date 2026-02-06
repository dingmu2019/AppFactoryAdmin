import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getDatabaseClient } from '../lib/db/connection.ts';
import type { Client } from 'pg';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface LabSessionConfig {
  title: string;
  mode: 'architect_blueprint' | 'market_simulation' | 'factory_optimization';
  description: string;
  user_id: string;
  entropy?: number;
}

export interface LabAgentProfile {
  name: string;
  role: string;
  stance: string;
  avatar: string;
  system_prompt_suffix?: string;
}

// In-memory control for lab loops
const activeLabSessions = new Map<string, {
  status: 'running' | 'stopping' | 'stopped';
}>();

export class AILabService {

  /**
   * Start a new AI Lab Session
   */
  static async createSession(config: LabSessionConfig) {
    // 1. Capture Factory Context (Snapshot of current system capabilities)
    // We now use "Active Environment Perception" to fetch real DB schema
    const contextSnapshot = await this.getSchemaSnapshot();

    // 2. Generate Agents based on Mode
    const agents = await this.generateLabAgents(config.mode, config.description);

    // 3. Create DB Record
    const { data: session, error } = await supabase
      .from('ai_lab_sessions')
      .insert({
        title: config.title,
        mode: config.mode,
        config: { description: config.description, entropy: config.entropy || 0.5, agents },
        context_snapshot: contextSnapshot,
        status: 'active',
        user_id: config.user_id
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create lab session: ${error.message}`);

    // 4. Start the Loop immediately (async)
    this.startLabLoop(session, agents);

    return session;
  }

  /**
   * The Main Loop for the Lab Session
   */
  private static async startLabLoop(session: any, agents: LabAgentProfile[]) {
    const sessionId = session.id;
    activeLabSessions.set(sessionId, { status: 'running' });

    try {
        // Initial System Message
        await this.saveMessage(sessionId, 'System', 'Facilitator', {
            thought: 'Initializing session...',
            speech: `Welcome to the AI Lab. Mode: ${session.mode}. \nTarget: ${session.config.description}`
        }, 0);

        let round = 1;
        const maxRounds = 10; // Increased cap for more complex interactions
        let lastSpeakerIndex = -1;

        while (round <= maxRounds) {
            // Check control
            if (activeLabSessions.get(sessionId)?.status !== 'running') break;

            // Fetch History
            const history = await this.fetchHistory(sessionId);

            // --- MODERATOR LOOP (Hassabis Suggestion #2) ---
            // Determine next speaker dynamically based on context and entropy
            const nextSpeakerIndex = await this.determineNextSpeaker(session, agents, history, lastSpeakerIndex);
            const speaker = agents[nextSpeakerIndex];
            lastSpeakerIndex = nextSpeakerIndex;
            // ---------------------------------------------

            // --- DUAL-STREAM REASONING (Hassabis Suggestion #1) ---
            // Generate Speech with explicit internal monologue (CoT)
            const response = await this.generateLabSpeech(session, speaker, history);
            // ---------------------------------------------

            // Save Message
            await this.saveMessage(sessionId, speaker.name, speaker.role, response, round);

            // --- CRITIC LOOP (Existing + Enhanced) ---
            const criticResult = await this.evaluateSpeech(session, speaker, response, history);
            
            if (!criticResult.pass) {
                await this.saveMessage(sessionId, 'System', 'Critic', {
                    thought: `Quality Check Failed. Score: ${criticResult.score}/10. Reason: ${criticResult.reason}`,
                    speech: `(自动修正) 刚才的发言存在逻辑漏洞：${criticResult.reason}。请重新思考并修正您的观点。`
                }, round);
                // In next iteration, the Moderator will likely pick the same speaker or a challenger to address this.
            }
            // ---------------------------------------------

            // Simulate "Deep Thought" delay
            await new Promise(r => setTimeout(r, 3000));

            round++;
        }

        // End Game: Generate Artifacts
        if (activeLabSessions.get(sessionId)?.status === 'running') {
            await this.generateArtifacts(session);
            
            await supabase
                .from('ai_lab_sessions')
                .update({ status: 'completed' })
                .eq('id', sessionId);
        }

    } catch (error) {
        console.error(`Lab Session ${sessionId} Error:`, error);
        await this.saveMessage(sessionId, 'System', 'Error', {
            thought: 'System Crash',
            speech: `Session terminated due to error: ${error}`
        }, 999);
    } finally {
        activeLabSessions.delete(sessionId);
    }
  }

  // --- Helpers ---

  // New Helper for Moderator Logic
  private static async determineNextSpeaker(session: any, agents: LabAgentProfile[], history: string, lastSpeakerIdx: number): Promise<number> {
    // If it's the very first turn, just pick the first agent
    if (lastSpeakerIdx === -1) return 0;

    const prompt = `
        You are the "Moderator" (Game Master).
        Goal: ${session.config.description}
        
        Participants:
        ${agents.map((a, i) => `${i}. ${a.name} (${a.role})`).join('\n')}
        
        Current Discussion History (Last 3 rounds):
        ${history.split('\n').slice(-3).join('\n')}
        
        Task:
        Decide who should speak next to maximize productive conflict and convergence.
        - If the last speaker made a controversial point, pick a challenger (Skeptic/Auditor).
        - If the discussion is stuck, pick a solver (Architect/DevOps).
        - Avoid picking the same person twice in a row unless necessary for defense.
        
        Output strictly JSON:
        {
            "next_speaker_index": 0,
            "reason": "Brief reason for selection"
        }
    `;

    try {
        const jsonStr = await this.callLLM(prompt);
        const result = JSON.parse(this.cleanJson(jsonStr));
        const idx = result.next_speaker_index;
        return (typeof idx === 'number' && idx >= 0 && idx < agents.length) ? idx : (lastSpeakerIdx + 1) % agents.length;
    } catch (e) {
        // Fallback to Round Robin if LLM fails
        return (lastSpeakerIdx + 1) % agents.length;
    }
  }

  private static async evaluateSpeech(session: any, speaker: LabAgentProfile, speech: any, history: string): Promise<{ pass: boolean; score: number; reason: string }> {
    const prompt = `
        You are the "Critic" (System 2 Supervisor).
        Evaluate the last message from ${speaker.name} (${speaker.role}).
        
        Goal: ${session.config.description}
        Message Content: ${speech.speech}
        
        Criteria:
        1. Relevance: Does it address the goal?
        2. Logic: Is the reasoning sound?
        3. Constraints: Does it respect the SaaS Factory context (Reuse, Low Ops)?
        
        Output strictly JSON:
        {
            "pass": true/false,
            "score": 1-10,
            "reason": "Brief explanation in Chinese (Simplified)"
        }
    `;
    
    try {
        const jsonStr = await this.callLLM(prompt);
        return JSON.parse(this.cleanJson(jsonStr));
    } catch (e) {
        console.error("Critic Evaluation Failed", e);
        return { pass: true, score: 5, reason: "Evaluation failed, proceeding." }; // Fail open
    }
  }

  private static async generateLabAgents(mode: string, description: string): Promise<LabAgentProfile[]> {
    const prompt = `
        Design 3 specialized AI agents for a "${mode}" session.
        Goal: ${description}
        
        Constraints:
        1. If mode is 'architect_blueprint', agents must include a "System Architect" and a "Security Auditor".
        2. If mode is 'market_simulation', include a "Growth Hacker" and a "Skeptical User".
        3. If mode is 'factory_optimization', include a "DevOps Engineer" and a "Product Manager".
        
        Return JSON array: [{ "name": "...", "role": "...", "stance": "...", "avatar": "emoji" }]
        IMPORTANT: The "role" and "stance" values MUST be in Simplified Chinese.
    `;
    const jsonStr = await this.callLLM(prompt);
    return JSON.parse(this.cleanJson(jsonStr));
  }

  private static async generateLabSpeech(session: any, speaker: LabAgentProfile, history: string): Promise<any> {
    const contextStr = JSON.stringify(session.context_snapshot);
    
    const systemPrompt = `
        You are ${speaker.name}, a ${speaker.role}. Stance: ${speaker.stance}.
        Session Mode: ${session.mode}.
        Goal: ${session.config.description}.
        
        CRITICAL CONTEXT (The SaaS Factory):
        ${contextStr}
        
        Your Directive:
        1. Reuse existing modules (Auth, Payment, etc.) whenever possible. Do NOT reinvent wheels.
        2. Use "System 2" thinking. Analyze before speaking.
        3. You MUST speak in Simplified Chinese (简体中文).
        4. Output strictly JSON:
        {
            "thought": "Your internal monologue and analysis (in Chinese)...",
            "speech": "Your public contribution to the discussion (in Chinese)..."
        }
    `;

    const userPrompt = `
        Current Conversation History:
        ${history}
        
        It is your turn. Speak now.
    `;

    const jsonStr = await this.callLLM(userPrompt, systemPrompt);
    try {
        return JSON.parse(this.cleanJson(jsonStr));
    } catch (e) {
        return { thought: "Error parsing thought", speech: jsonStr };
    }
  }

  private static async generateArtifacts(session: any) {
    const history = await this.fetchHistory(session.id);
    
    let artifactType = 'blueprint_json';
    let prompt = '';

    if (session.mode === 'architect_blueprint') {
        prompt = `
            Based on the discussion below, generate a technical "AlphaCode Blueprint" for the SaaS Factory.
            Output strictly JSON with this structure:
            {
                "title": "...",
                "modules": ["..."],
                "database_schema": "SQL CREATE statements...",
                "api_endpoints": ["GET /api/..."],
                "implementation_steps": ["Step 1...", "Step 2..."]
            }
            
            Discussion:
            ${history}

            IMPORTANT: All descriptive text, comments, and instructions inside the JSON must be in Simplified Chinese (简体中文).
        `;
    } else if (session.mode === 'market_simulation') {
        artifactType = 'market_report';
        prompt = `
            Generate a Market Viability Report based on the simulation.
            Output Markdown format.
            Include: Key Risks, User Personas Validated, GTM Strategy.
            
            Discussion:
            ${history}

            IMPORTANT: The report must be written in Simplified Chinese (简体中文).
        `;
    } else {
        prompt = `Summarize the optimization plan in Markdown. Discussion: ${history}. IMPORTANT: Output in Simplified Chinese (简体中文).`;
    }

    const content = await this.callLLM(prompt);

    // Save Artifact
    await supabase.from('ai_lab_artifacts').insert({
        session_id: session.id,
        type: artifactType,
        title: `${session.title} - Output`,
        content: content,
        version: 1
    });

    // Notify in chat
    await this.saveMessage(session.id, 'System', 'ArtifactGenerator', {
        thought: 'Compiling final results...',
        speech: `工件生成完成: ${session.title} - Output`
    }, 100);
  }

  private static async fetchHistory(sessionId: string): Promise<string> {
    const { data } = await supabase
        .from('ai_lab_messages')
        .select('agent_name, content')
        .eq('session_id', sessionId)
        .order('round_index', { ascending: true });
    
    return data?.map(m => {
        const c = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        return `${m.agent_name}: ${c.speech}`;
    }).join('\n') || '';
  }

  private static async saveMessage(sessionId: string, name: string, role: string, content: any, round: number) {
    await supabase.from('ai_lab_messages').insert({
        session_id: sessionId,
        agent_name: name,
        agent_role: role,
        content: content, // JSONB
        round_index: round
    });
  }

  private static async getSchemaSnapshot(): Promise<any> {
    let client: Client | null = null;
    try {
        client = await getDatabaseClient();
        
        // Query for table names and column definitions
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
            
            if (!schema[tableName]) {
                schema[tableName] = [];
            }
            schema[tableName].push(colDef);
        });
        
        return {
            tech_stack: ['React 18', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS'],
            core_modules: Object.keys(schema), // Dynamic module list based on tables
            database_tables: schema, // Detailed schema
            constraints: 'Low Ops, High Reusability, Single Tenant Logic within Multi-Tenant DB'
        };
        
    } catch (e) {
        console.error("Failed to fetch schema snapshot", e);
        // Fallback to static
        return {
            tech_stack: ['React 18', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS'],
            core_modules: ['Auth', 'Payment', 'Webhooks', 'RBAC', 'Audit Logs'],
            database_tables: ['users', 'orders', 'products', 'subscriptions', 'ai_agents'],
            constraints: 'Low Ops, High Reusability, Single Tenant Logic within Multi-Tenant DB'
        };
    } finally {
        if (client) await client.end();
    }
  }

  private static async callLLM(userPrompt: string, systemPrompt?: string): Promise<string> {
    // In a real app, import the shared LLM service.
    // For now, we fetch the localhost API or mock it if server is down.
    const port = process.env.PORT || 3001;
    try {
        const response = await fetch(`http://localhost:${port}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': process.env.SUPABASE_SERVICE_ROLE_KEY!
            },
            body: JSON.stringify({ 
                messages: [{ role: 'user', content: userPrompt }], 
                systemPrompt 
            })
        });
        if (!response.ok) throw new Error(await response.text());
        const data: any = await response.json();
        return data.content;
    } catch (e) {
        console.error("LLM Call Failed", e);
        return `[LLM Error: ${e}]`;
    }
  }

  private static cleanJson(str: string): string {
    // 1. Remove markdown code blocks
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Try to find the JSON object if there's extra text
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) return cleaned; // No JSON found
    
    // Determine which comes first to know if it's an object or array
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) 
        ? firstBrace 
        : firstBracket;
        
    const isObject = start === firstBrace;
    const end = cleaned.lastIndexOf(isObject ? '}' : ']');
    
    if (end !== -1 && end > start) {
        cleaned = cleaned.substring(start, end + 1);
    }
    
    return cleaned;
  }
}
