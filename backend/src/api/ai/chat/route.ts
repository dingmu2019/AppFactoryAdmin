
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { modelRouter } from '../../../services/ai/ModelRouter.ts';
import type { AIRequest } from '../../../services/ai/types.ts';
import { SYSTEM_OPS_TOOLS, AgentTools } from '../../../services/agentTools.ts';
import { getSkillTools, executeSkill } from '../../../services/skillService.ts';
import { loadLLMConfigsIntoRouter } from '../../../services/ai/loadLLMConfigs.ts';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auth Middleware
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      (req as any).user = user;
      return next();
    }
  }
  
  // Also check for service role secret
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      (req as any).user = { role: 'service_role' };
      return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Please login first' });
};

const loadLLMConfigs = async () => loadLLMConfigsIntoRouter(modelRouter, supabase);

/**
 * @openapi
 * /api/ai/chat/optimize:
 *   post:
 *     tags: [AI Chat]
 *     summary: Optimize prompt
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Optimized content
 */
router.post('/optimize', authMiddleware, async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const hasConfigs = await loadLLMConfigs();
        if (!hasConfigs) return res.status(404).json({ error: 'LLM Configuration missing or disabled' });

        const optimizationPrompt = `你是一个提示词优化专家。请优化以下用户输入，使其更加清晰、具体，以便 LLM 能更好地理解。
        直接输出优化后的内容，不要包含任何解释或额外的文字。
        如果原内容已经是高质量的，则原样返回。
        
        用户输入: "${content}"`;

        const aiRequest: AIRequest = {
            messages: [{ role: 'user', content: optimizationPrompt }],
            complexity: 'simple'
        };

        const response = await modelRouter.routeRequest(aiRequest);
        return res.json({ content: response.content });
    } catch (error: any) {
        console.error('[API] Optimization Error:', error);
        next(error);
    }
});

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     tags: [AI Chat]
 *     summary: Chat with AI agent
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               agentId:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               complexity:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { messages, systemPrompt, agentId, complexity } = req.body;

    const hasConfigs = await loadLLMConfigs();
    if (!hasConfigs) return res.status(404).json({ error: 'LLM Configuration missing or disabled' });

    // 2. Prepare Tools
    let tools: any[] = [];
    if (agentId) {
        const { data: agent } = await supabase.from('ai_agents').select('role').eq('id', agentId).single();
        if (agent && (agent.role === 'System Ops Expert' || agent.role === '系统运维专家')) {
            // Map to generic tool format (OpenAI style is standard)
            // Our Gemini Adapter handles conversion
            tools = SYSTEM_OPS_TOOLS.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));
        }
    }
    
    const skillTools = await getSkillTools();
    const formattedSkills = skillTools.map(t => t.functionDeclarations.map((fd: any) => ({
        type: 'function',
        function: {
            name: fd.name,
            description: fd.description,
            parameters: fd.parameters
        }
    }))).flat();
    
    tools = [...tools, ...formattedSkills];

    // 3. Create Request
    const aiRequest: AIRequest = {
        messages,
        systemPrompt,
        complexity: complexity || 'simple',
        tools: tools.length > 0 ? tools : undefined
    };

    // 4. Route and Execute (with Circuit Breaker & Fallback)
    // NOTE: Tool execution loop needs to be handled here or in the Provider?
    // The Provider adapter currently returns `toolCalls`.
    // We need a loop here to handle tool calls and re-route if needed.
    // BUT, if we switch provider mid-conversation (e.g. tool call response), we need to ensure context is compatible.
    // Generally, we stick to the same provider for a single turn unless it fails.
    
    let response = await modelRouter.routeRequest(aiRequest);
    
    // Handle Tool Calls Loop
    let turns = 0;
    while (response.toolCalls && response.toolCalls.length > 0 && turns < 5) {
        turns++;
        const toolCall = response.toolCalls[0]; // Handle first tool call for simplicity or parallel
        // OpenAI: toolCall.function.name, toolCall.function.arguments
        
        console.log(`[AI] Tool Call: ${toolCall.function.name}`, toolCall.function.arguments);
        
        let toolResult = '';
        try {
             const fnName = toolCall.function.name;
             const fnArgs = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
             
             if (AgentTools[fnName as keyof typeof AgentTools]) {
                  toolResult = await AgentTools[fnName as keyof typeof AgentTools](fnArgs);
             } else {
                  try {
                      const result = await executeSkill(fnName, fnArgs);
                      toolResult = typeof result === 'string' ? result : JSON.stringify(result);
                  } catch (skillErr) {
                      toolResult = `Error: Tool ${fnName} not found or failed.`;
                  }
             }
        } catch (err: any) {
             toolResult = `Error executing tool: ${err.message}`;
        }
        
        // Append to messages
        aiRequest.messages.push({
            role: 'assistant',
            content: '',
            // @ts-ignore - OpenAI format needs tool_calls
            tool_calls: response.toolCalls 
        } as any);
        
        aiRequest.messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id
        } as any);
        
        // Call again
        response = await modelRouter.routeRequest(aiRequest);
    }

    return res.json({ content: response.content });

  } catch (error: any) {
    console.error('[API] Internal Error:', error);
    next(error);
  }
});

/**
 * @openapi
 * /api/ai/chat/skills:
 *   get:
 *     tags: [AI Chat]
 *     summary: List available skills
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of skills
 */
router.get('/skills', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ai_skills')
      .select('id, name, description, version, author, command, is_active, created_at, manifest')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (error: any) {
    next(error);
  }
});

/**
 * @openapi
 * /api/ai/chat/history:
 *   delete:
 *     tags: [AI Chat]
 *     summary: Clear chat history
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History cleared
 */
router.delete('/history', authMiddleware, async (req, res, next) => {
  try {
    const user = (req as any).user;
    const agentId = req.query.agentId as string | undefined;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized: Please login first' });
    }

    const { error } = await supabase
      .from('ai_chat_messages')
      .delete()
      .eq('agent_id', agentId)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;
