
import { modelRouter } from './ModelRouter.ts';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ExtractionResult {
    title: string;
    optimizedPrompt: string;
    tags: string[];
}

export class PromptExtractionService {
    /**
     * Analyze and optimize a programming prompt
     */
    static async extractAndOptimize(originalPrompt: string, userId: string): Promise<ExtractionResult> {
        const systemPrompt = `
            You are an expert Prompt Engineer specializing in software development.
            Your task is to take a raw programming instruction and:
            1. Generate a short, catchy title (max 20 chars).
            2. Optimize it to be more precise, professional, and effective for LLMs.
            3. Extract 3-5 relevant keywords as tags.
            
            Output strictly JSON:
            {
                "title": "Short Title",
                "optimized": "The improved version of the prompt...",
                "tags": ["tag1", "tag2", "tag3"]
            }
            
            Language: If the input is in Chinese, the output should be in Chinese. If English, output English.
        `;

        const userPrompt = `Raw Instruction: ${originalPrompt}`;

        try {
            // Use the shared modelRouter to get a response
            const response = await modelRouter.routeRequest({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                complexity: 'simple'
            });

            const result = JSON.parse(this.cleanJson(response.content));
            
            // Save to database
            const insertData: any = {
                original_content: originalPrompt,
                optimized_content: result.optimized,
                tags: result.tags,
                user_id: userId
            };
            
            // Try to include title if column exists
            if (result.title) insertData.title = result.title;

            const { data, error } = await supabase.from('programming_prompts')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                // Fallback for missing title column
                if (error.message.includes('column')) {
                    const minimalData = {
                        original_content: originalPrompt,
                        optimized_content: result.optimized,
                        tags: result.tags,
                        user_id: userId
                    };
                    const { data: retryData, error: retryError } = await supabase
                        .from('programming_prompts')
                        .insert(minimalData)
                        .select()
                        .single();
                    if (retryError) throw retryError;
                    
                    return {
                        id: retryData.id,
                        optimizedPrompt: result.optimized,
                        tags: result.tags
                    } as any;
                }
                throw error;
            }

            return {
                id: data.id,
                title: result.title,
                optimizedPrompt: result.optimized,
                tags: result.tags
            } as any;
        } catch (error) {
            console.error('Prompt optimization failed:', error);
            throw new Error('Failed to optimize prompt');
        }
    }

    private static cleanJson(str: string): string {
        let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
    }
}
