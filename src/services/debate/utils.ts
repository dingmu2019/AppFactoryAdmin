import { supabaseAdmin as supabase } from '@/lib/supabase';

export class DebateUtils {
  static cleanJson(str: string): string {
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();

    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    const start =
      firstObj === -1 ? firstArr :
      firstArr === -1 ? firstObj :
      Math.min(firstObj, firstArr);

    if (start === -1) return cleaned;

    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') {
        const expected = stack.pop();
        if (expected !== ch) {
           return cleaned.slice(start).trim();
        }
        if (stack.length === 0) {
          return cleaned.slice(start, i + 1).trim();
        }
      }
    }

    return cleaned.slice(start).trim();
  }

  static async saveMessage(debateId: string, name: string, role: string, content: string, round: number, thought?: string, isSummary: boolean = false) {
    let finalContent = content;

    // --- VISUALIZING SYSTEM 2 ---
    if (thought && thought.trim().length > 0 && thought !== "Analysis failed or raw output.") {
        finalContent = JSON.stringify({
            public_speech: content,
            internal_monologue: thought
        });
    }
    
    await supabase.from('debate_messages').insert({
      debate_id: debateId,
      agent_name: name,
      role: role,
      content: finalContent,
      round_index: round,
      is_summary: isSummary
    });
  }

  static async callInternalLLM(messages: any[], systemPrompt?: string): Promise<string> {
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
}
