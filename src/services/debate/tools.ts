import { closeDatabaseClient, getDatabaseClient } from '@/lib/db';
import { modelRouter } from '../ai/ModelRouter';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class DebateTools {
  private static schemaCache: { data: any, timestamp: number } | null = null;
  private static SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  static async getSchemaSnapshot(): Promise<any> {
    if (this.schemaCache && (Date.now() - this.schemaCache.timestamp < this.SCHEMA_CACHE_TTL)) {
        return this.schemaCache.data;
    }

    let client: any = null;
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
        const result = {
            tech_stack: ['React 18', 'Node.js', 'Supabase'],
            database_tables: schema,
            constraints: 'Low Ops, High Reusability'
        };
        this.schemaCache = { data: result, timestamp: Date.now() };
        return result;
    } catch (e) {
        console.error("Failed to fetch schema", e);
        return { database_tables: {}, constraints: 'Unknown' };
    } finally {
        await closeDatabaseClient(client);
    }
  }

  static async executeTool(toolCallStr: string): Promise<string> {
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
        try {
            const sanitizedQuery = query.replace(/[^a-zA-Z0-9_\-\.\s]/g, '');
            if (!sanitizedQuery || sanitizedQuery.length < 2) return `[Tool Result] Query too short or invalid.`;
            const cmd = `grep -r "${sanitizedQuery}" src ../frontend/src --exclude-dir=node_modules --exclude-dir=.git --exclude=".*" --exclude="*.env*" | head -n 5`;
            const { stdout } = await execPromise(cmd);
            if (!stdout || stdout.trim().length === 0) return `[Tool Result] No code matches found for "${sanitizedQuery}".`;
            return `[Tool Result] Found matches:\n${stdout.substring(0, 1000)}...`;
        } catch (e: any) {
            return `[Tool Result] Search failed: ${e.message}`;
        }
    }
    
    if (toolName === 'web_search') {
        try {
            const serpKey = process.env.SERPAPI_KEY || process.env.GOOGLE_SEARCH_API_KEY;
            if (serpKey) {
                 const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}`;
                 const res = await fetch(url);
                 const data: any = await res.json();
                 if (data.organic_results && data.organic_results.length > 0) {
                     const snippets = data.organic_results.slice(0, 3).map((r: any) => `[${r.title}] ${r.snippet}`).join('\n');
                     return `[Tool Result] Google Search Results:\n${snippets}`;
                 }
            }
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
            const res = await fetch(ddgUrl);
            const data: any = await res.json();
             if (data.AbstractText) return `[Tool Result] Web Search Result from DuckDuckGo:\n${data.AbstractText}\nSource: ${data.AbstractURL}`;
             else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                  const snippets = data.RelatedTopics.slice(0, 3).map((t: any) => t.Text).join('\n- ');
                  return `[Tool Result] Web Search Results from DuckDuckGo:\n- ${snippets}`;
             } else return `[Tool Result] No direct "Instant Answer" found on DuckDuckGo for "${query}".`;
        } catch (e: any) {
            return `[Tool Result] Web Search Failed: ${e.message}`;
        }
    }
    return `[Tool Result] Tool execution failed: Unknown tool.`;
  }
}
