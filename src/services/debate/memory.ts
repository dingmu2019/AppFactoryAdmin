import { modelRouter } from '../ai/ModelRouter';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { DebateUtils } from './utils';

export class MemoryService {
  /**
   * Retrieves relevant long-term memories (Episodic Memory).
   * Currently implements a keyword-based search on past debate summaries.
   * Future upgrade: Vector Embeddings (pgvector).
   */
  static async retrieveRelevantMemories(topic: string, currentDebateId: string): Promise<string> {
    try {
        // Simple keyword extraction (first 2 significant words) or just use the whole topic for fuzzy match
        // For MVP, we search for debates with similar topics in the summary or topic field
        const keywords = topic.split(' ').filter(w => w.length > 2).slice(0, 3).join(' | ');
        
        const { data: pastDebates, error } = await supabase
            .from('agent_debates')
            .select('topic, summary, created_at')
            .neq('id', currentDebateId)
            .eq('status', 'completed')
            .textSearch('topic', keywords, { type: 'websearch', config: 'english' }) // specific to english config, might need simple ilike for chinese
            .limit(3);

        if (!pastDebates || pastDebates.length === 0) {
            // Fallback: fetch last 3 completed debates regardless of topic to provide "general context"
            const { data: recent } = await supabase
                .from('agent_debates')
                .select('topic, summary')
                .neq('id', currentDebateId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(2);
            
            if (recent && recent.length > 0) {
                 return recent.map(d => `[Past Debate "${d.topic}"]: ${d.summary?.slice(0, 200)}...`).join('\n');
            }
            return "";
        }

        return pastDebates.map(d => `[Related Memory "${d.topic}"]: ${d.summary?.slice(0, 300)}...`).join('\n');
    } catch (error) {
        console.error('Memory retrieval failed:', error);
        return "";
    }
  }

  /**
   * Stores a high-value insight into memory.
   * (Placeholder for future Vector DB insertion)
   */
  static async storeMemory(content: string, metadata: any) {
      // In a real vector DB, we would embed 'content' and store with metadata.
      console.log('[Memory] Storing insight:', content.slice(0, 50));
  }
}
