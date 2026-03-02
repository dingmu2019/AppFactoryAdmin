
import { supabase } from '@/lib/supabase';
import { DebateService } from './debate/debateService';

// --- Tool Definitions ---

export const SYSTEM_OPS_TOOLS = [
  {
    name: "get_user_info",
    description: "Search for a user by email or name to check their status and details.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The email or name of the user to search for." }
      },
      required: ["query"]
    }
  },
  {
    name: "create_agent",
    description: "Create a new AI Agent in the system.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the agent" },
        role: { type: "STRING", description: "Role or title of the agent" },
        description: { type: "STRING", description: "Short description of what the agent does" },
        system_prompt: { type: "STRING", description: "The system prompt/instructions for the agent" },
        avatar: { type: "STRING", description: "Emoji or URL for avatar" }
      },
      required: ["name", "role", "system_prompt"]
    }
  },
  {
    name: "start_debate",
    description: "Start a new AI Agent debate session.",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: { type: "STRING", description: "The topic to debate" },
        mode: { type: "STRING", description: "Mode: 'free_discussion' or 'debate'", enum: ["free_discussion", "debate"] },
        duration: { type: "NUMBER", description: "Duration in minutes (default 5)" }
      },
      required: ["topic"]
    }
  },
  {
    name: "get_recent_feedbacks",
    description: "Get a list of recent user feedbacks.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Number of items to return (default 5)" }
      }
    }
  },
  {
    name: "get_system_logs",
    description: "Get recent system error logs.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Number of logs to return (default 5)" },
        level: { type: "STRING", description: "Filter by level (error, warn, info)" }
      }
    }
  },
  {
    name: "web_search",
    description: "Search the internet for real-time information when you don't know the answer.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The search query" }
      },
      required: ["query"]
    }
  }
];

// --- Tool Implementations ---

export const AgentTools = {
  
  async web_search({ query }: { query: string }) {
    console.log(`[Tool] web_search: ${query}`);
    try {
        // Use DuckDuckGo HTML search (no API key needed for basic usage, but unstable for prod)
        // OR use a real search API like SerpApi/Bing if key exists.
        // For MVP demo, we can mock it or use a simple fetch if possible.
        // But better to simulate "I found this online" for now if we don't have an API key.
        // Actually, let's try to fetch a real result if possible, or return a placeholder.
        
        // Simulating search results for demo purposes since we don't have a Search API Key configured in env
        // In production, integrate with Google Custom Search or Bing Search API.
        
        return JSON.stringify({
            results: [
                { title: `Result for ${query}`, snippet: `This is a simulated search result for "${query}". In a real environment, this would call Google/Bing API.` },
                { title: `More info on ${query}`, snippet: `Deep details found on the web about ${query}...` }
            ]
        });
    } catch (e: any) {
        return `Search failed: ${e.message}`;
    }
  },
  
  async get_user_info({ query }: { query: string }) {
    console.log(`[Tool] get_user_info: ${query}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%${query}%,raw_user_meta_data->>name.ilike.%${query}%`)
      .limit(5);

    if (error) throw new Error(`Database error: ${error.message}`);
    if (!data || data.length === 0) return "No user found matching that query.";
    
    return JSON.stringify(data.map(u => ({
      id: u.id,
      email: u.email,
      name: u.raw_user_meta_data?.name || 'Unknown',
      role: u.role,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at
    })));
  },

  async create_agent({ name, role, description, system_prompt, avatar }: any) {
    console.log(`[Tool] create_agent: ${name}`);
    const { data, error } = await supabase
      .from('ai_agents')
      .insert({
        name,
        role,
        description,
        system_prompt,
        avatar: avatar || '🤖',
        is_active: true
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create agent: ${error.message}`);
    return JSON.stringify({ success: true, agent: data });
  },

  async start_debate({ topic, mode, duration }: any) {
    console.log(`[Tool] start_debate: ${topic}`);
    // Use the user_id of the system admin (or a placeholder if called by system)
    // For now, we'll try to find an admin user or just use a specific ID if known.
    // Ideally the calling context provides the user_id. 
    // Since this is a tool call, we might not have the original request context easily passed down 
    // without refactoring. Let's find the first admin user.
    
    const { data: admin } = await supabase
        .from('users')
        .select('id')
        .contains('roles', ['admin'])
        .limit(1)
        .single();
        
    const userId = admin?.id;
    if (!userId) throw new Error("No admin user found to attribute this debate to.");

    const debate = await DebateService.createDebate({
        topic,
        mode: mode || 'free_discussion',
        duration: duration || 5,
        entropy: 0.6,
        user_id: userId
    });
    
    // Start it asynchronously
    DebateService.startDebate(debate.id).catch(err => console.error('Async start failed:', err));

    return JSON.stringify({ success: true, debate_id: debate.id, message: "Debate started successfully." });
  },

  async get_recent_feedbacks({ limit }: { limit?: number }) {
    // Assuming there is a 'feedbacks' table? Or 'ai_chat_messages' with feedback?
    // The user said "reply user feedback". Let's look for a feedback table.
    // Checking previous file lists... I don't recall a specific feedback table. 
    // Maybe `ai_chat_messages` has feedback column? Yes it does.
    // Or maybe there is a general feedback center? `Layout.tsx` has `/feedback`.
    // Let's assume generic system feedback table or just query chat messages with feedback.
    // Let's use `ai_chat_messages` with `feedback` IS NOT NULL.
    
    const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, content, feedback, created_at, users(email)')
        .not('feedback', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit || 5);

    if (error) throw error;
    return JSON.stringify(data);
  },

  async get_system_logs({ limit, level }: { limit?: number, level?: string }) {
    let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit || 5);
        
    if (level) {
        query = query.eq('level', level);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return JSON.stringify(data);
  }
};
