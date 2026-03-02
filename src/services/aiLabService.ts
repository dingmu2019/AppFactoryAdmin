import { supabase } from '@/lib/supabase';
import { closeDatabaseClient, getDatabaseClient } from '@/lib/db';
import type { Client } from 'pg';

/**
 * AI 实验室会话配置接口
 */
export interface LabSessionConfig {
  title: string;
  mode: 'architect_blueprint' | 'market_simulation' | 'factory_optimization';
  description: string;
  user_id: string;
  entropy?: number;
}

/**
 * AI 实验室代理（Agent）配置接口
 */
export interface LabAgentProfile {
  name: string;
  role: string;
  stance: string;
  avatar: string;
  system_prompt_suffix?: string;
}

// 内存中用于控制实验室循环的状态
const activeLabSessions = new Map<string, {
  status: 'running' | 'stopping' | 'stopped';
}>();

/**
 * AI 实验室服务
 * 提供创建会话、管理代理对话循环、生成工件的核心逻辑
 */
export class AILabService {

  /**
   * 启动一个新的 AI 实验室会话
   * @param config 会话配置
   * @returns 创建的会话对象
   */
  static async createSession(config: LabSessionConfig) {
    // 1. 获取当前系统上下文快照 (主动环境感知)
    // 获取真实的数据库架构作为上下文
    const contextSnapshot = await this.getSchemaSnapshot();

    // 2. 根据模式生成参与讨论的 AI 代理
    const agents = await this.generateLabAgents(config.mode, config.description);

    // 3. 在数据库中创建会话记录
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

    // 4. 立即启动异步循环
    this.startLabLoop(session, agents);

    return session;
  }

  /**
   * 实验室会话的主循环逻辑
   * @param session 会话对象
   * @param agents 参与的代理列表
   */
  private static async startLabLoop(session: any, agents: LabAgentProfile[]) {
    const sessionId = session.id;
    activeLabSessions.set(sessionId, { status: 'running' });

    try {
      // 初始系统消息
      await this.saveMessage(sessionId, 'System', 'Facilitator', {
        thought: 'Initializing session...',
        speech: `欢迎来到 AI 实验室。模式: ${session.mode}。\n目标: ${session.config.description}`
      }, 0);

      let round = 1;
      const maxRounds = 10; // 增加最大轮数以支持更复杂的交互
      let lastSpeakerIndex = -1;

      while (round <= maxRounds) {
        // 检查控制状态，如果停止则退出循环
        if (activeLabSessions.get(sessionId)?.status !== 'running') break;

        // 获取历史记录
        const history = await this.fetchHistory(sessionId);

        // --- 主持人循环 (Moderator Loop) ---
        // 基于上下文和熵动态决定下一个发言者
        const nextSpeakerIndex = await this.determineNextSpeaker(session, agents, history, lastSpeakerIndex);
        const speaker = agents[nextSpeakerIndex];
        lastSpeakerIndex = nextSpeakerIndex;
        // ---------------------------------------------

        // --- 双流推理 (Dual-Stream Reasoning) ---
        // 生成包含显式内部独白 (CoT) 的发言
        const response = await this.generateLabSpeech(session, speaker, history);
        // ---------------------------------------------

        // 保存消息
        await this.saveMessage(sessionId, speaker.name, speaker.role, response, round);

        // --- 评论家循环 (Critic Loop) ---
        // 评估发言质量
        const criticResult = await this.evaluateSpeech(session, speaker, response, history);
        
        if (!criticResult.pass) {
          await this.saveMessage(sessionId, 'System', 'Critic', {
            thought: `质量检查未通过。得分: ${criticResult.score}/10。原因: ${criticResult.reason}`,
            speech: `(自动修正) 刚才的发言存在逻辑漏洞：${criticResult.reason}。请重新思考并修正您的观点。`
          }, round);
          // 在下一次迭代中，主持人可能会选择同一发言者或挑战者来解决这个问题
        }
        // ---------------------------------------------

        // 模拟“深度思考”延迟
        await new Promise(r => setTimeout(r, 3000));

        round++;
      }

      // 游戏结束：生成工件
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

  // --- 辅助方法 ---

  /**
   * 决定下一个发言者
   */
  private static async determineNextSpeaker(session: any, agents: LabAgentProfile[], history: string, lastSpeakerIdx: number): Promise<number> {
    // 如果是第一轮，直接选择第一个代理
    if (lastSpeakerIdx === -1) return 0;

    const prompt = `
      你是“主持人”（游戏管理员）。
      目标: ${session.config.description}
      
      参与者:
      ${agents.map((a, i) => `${i}. ${a.name} (${a.role})`).join('\n')}
      
      当前讨论历史（最后3轮）:
      ${history.split('\n').slice(-3).join('\n')}
      
      任务:
      决定谁应该下一个发言，以最大化富有成效的冲突和收敛。
      - 如果上一位发言者提出了有争议的观点，选择挑战者（怀疑论者/审计员）。
      - 如果讨论陷入僵局，选择解决者（架构师/DevOps）。
      - 除非必要，避免连续选择同一个人。
      
      请严格输出 JSON:
      {
        "next_speaker_index": 0,
        "reason": "选择的简要原因"
      }
    `;

    try {
      const jsonStr = await this.callLLM(prompt);
      const result = JSON.parse(this.cleanJson(jsonStr));
      const idx = result.next_speaker_index;
      return (typeof idx === 'number' && idx >= 0 && idx < agents.length) ? idx : (lastSpeakerIdx + 1) % agents.length;
    } catch (e) {
      // 如果 LLM 失败，回退到轮询
      return (lastSpeakerIdx + 1) % agents.length;
    }
  }

  /**
   * 评估发言质量
   */
  private static async evaluateSpeech(session: any, speaker: LabAgentProfile, speech: any, history: string): Promise<{ pass: boolean; score: number; reason: string }> {
    const prompt = `
      你是“评论家”（系统2监督者）。
      评估来自 ${speaker.name} (${speaker.role}) 的最后一条消息。
      
      目标: ${session.config.description}
      消息内容: ${speech.speech}
      
      标准:
      1. 相关性: 是否针对目标？
      2. 逻辑: 推理是否合理？
      3. 约束: 是否尊重 SaaS 工厂的背景（重用、低运维）？
      
      请严格输出 JSON:
      {
        "pass": true/false,
        "score": 1-10,
        "reason": "简要解释（简体中文）"
      }
    `;
    
    try {
      const jsonStr = await this.callLLM(prompt);
      return JSON.parse(this.cleanJson(jsonStr));
    } catch (e) {
      console.error("Critic Evaluation Failed", e);
      return { pass: true, score: 5, reason: "Evaluation failed, proceeding." }; // 失败时默认通过
    }
  }

  /**
   * 生成实验室代理
   */
  private static async generateLabAgents(mode: string, description: string): Promise<LabAgentProfile[]> {
    const prompt = `
      为 "${mode}" 会话设计 3 个专门的 AI 代理。
      目标: ${description}
      
      约束:
      1. 如果模式是 'architect_blueprint'，必须包括“系统架构师”和“安全审计员”。
      2. 如果模式是 'market_simulation'，必须包括“增长黑客”和“挑剔的用户”。
      3. 如果模式是 'factory_optimization'，必须包括“DevOps 工程师”和“产品经理”。
      
      返回 JSON 数组: [{ "name": "...", "role": "...", "stance": "...", "avatar": "emoji" }]
      重要: "role" 和 "stance" 的值必须是简体中文。
    `;
    const jsonStr = await this.callLLM(prompt);
    return JSON.parse(this.cleanJson(jsonStr));
  }

  /**
   * 生成实验室发言
   */
  private static async generateLabSpeech(session: any, speaker: LabAgentProfile, history: string): Promise<any> {
    const contextStr = JSON.stringify(session.context_snapshot);
    
    const systemPrompt = `
      你是 ${speaker.name}，一个 ${speaker.role}。立场: ${speaker.stance}。
      会话模式: ${session.mode}。
      目标: ${session.config.description}。
      
      关键背景 (SaaS 工厂):
      ${contextStr}
      
      你的指令:
      1. 尽可能重用现有模块（认证、支付等）。不要重新造轮子。
      2. 使用“系统2”思维。在发言前进行分析。
      3. 你必须使用简体中文 (Simplified Chinese) 发言。
      4. 请严格输出 JSON:
      {
        "thought": "你的内部独白和分析（中文）...",
        "speech": "你对讨论的公开贡献（中文）..."
      }
    `;

    const userPrompt = `
      当前对话历史:
      ${history}
      
      轮到你了。请发言。
    `;

    const jsonStr = await this.callLLM(userPrompt, systemPrompt);
    try {
      return JSON.parse(this.cleanJson(jsonStr));
    } catch (e) {
      return { thought: "Error parsing thought", speech: jsonStr };
    }
  }

  /**
   * 生成最终工件
   */
  private static async generateArtifacts(session: any) {
    const history = await this.fetchHistory(session.id);
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let artifactType = 'blueprint_json';
    let prompt = '';

    if (session.mode === 'architect_blueprint') {
      prompt = `
        基于以下讨论，为 SaaS 工厂生成一份技术“AlphaCode 蓝图”。
        日期: ${today}
        
        遵循金字塔原理和结论先行:
        1. 从“执行摘要”（架构决策与核心价值）开始。
        2. 然后提供“关键技术规范”（“是什么”和“怎么做”）。
        3. 最后，列出详细的“实施步骤”和“架构定义”。

        请严格输出如下结构的 JSON:
        {
          "title": "...",
          "modules": ["..."],
          "database_schema": "SQL CREATE statements...",
          "api_endpoints": ["GET /api/..."],
          "implementation_steps": ["步骤 1...", "步骤 2..."]
        }
        
        讨论内容:
        ${history}

        重要: JSON 内的所有描述性文本、注释和说明必须是简体中文。
      `;
    } else if (session.mode === 'market_simulation') {
      artifactType = 'market_report';
      prompt = `
        基于模拟生成一份市场可行性报告。
        日期: ${today}
        输出 Markdown 格式。
        
        遵循金字塔原理和结论先行:
        1. **执行摘要**: 立即陈述通过/不通过的建议和主要原因。
        2. **关键发现**: 总结前3大风险和验证过的画像。
        3. **详细分析**: 然后提供支持证据和 GTM 策略。

        以包含日期的标题开始: "AI Lab 市场模拟组报告 (${today})"
        
        讨论内容:
        ${history}

        重要: 报告必须用简体中文编写。
      `;
    } else {
      prompt = `用 Markdown 总结优化计划。日期: ${today}。
      遵循金字塔原理: 从核心优化结果/影响开始（结论先行），然后分解策略，最后列出执行步骤。
      讨论内容: ${history}。
      重要: 用简体中文输出。`;
    }

    const content = await this.callLLM(prompt);

    // 保存工件
    await supabase.from('ai_lab_artifacts').insert({
      session_id: session.id,
      type: artifactType,
      title: `${session.title} - Output`,
      content: content,
      version: 1
    });

    // 在聊天中通知
    await this.saveMessage(session.id, 'System', 'ArtifactGenerator', {
      thought: 'Compiling final results...',
      speech: `工件生成完成: ${session.title} - Output`
    }, 100);
  }

  /**
   * 获取历史记录
   */
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

  /**
   * 保存消息
   */
  private static async saveMessage(sessionId: string, name: string, role: string, content: any, round: number) {
    await supabase.from('ai_lab_messages').insert({
      session_id: sessionId,
      agent_name: name,
      agent_role: role,
      content: content, // JSONB
      round_index: round
    });
  }

  /**
   * 获取数据库架构快照
   */
  private static async getSchemaSnapshot(): Promise<any> {
    let client: any = null;
    try {
      client = await getDatabaseClient();
      
      // 查询表名和列定义
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
        core_modules: Object.keys(schema), // 基于表的动态模块列表
        database_tables: schema, // 详细架构
        constraints: 'Low Ops, High Reusability, Single Tenant Logic within Multi-Tenant DB'
      };
      
    } catch (e) {
      console.error("Failed to fetch schema snapshot", e);
      // 回退到静态数据
      return {
        tech_stack: ['React 18', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS'],
        core_modules: ['Auth', 'Payment', 'Webhooks', 'RBAC', 'Audit Logs'],
        database_tables: ['users', 'orders', 'products', 'subscriptions', 'ai_agents'],
        constraints: 'Low Ops, High Reusability, Single Tenant Logic within Multi-Tenant DB'
      };
    } finally {
      await closeDatabaseClient(client);
    }
  }

  /**
   * 调用 LLM 服务
   */
  private static async callLLM(userPrompt: string, systemPrompt?: string): Promise<string> {
    // 默认使用 localhost:3000 (Next.js 默认端口) 或环境变量
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
    
    try {
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
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

  /**
   * 清理 JSON 字符串
   */
  private static cleanJson(str: string): string {
    // 1. 移除 markdown 代码块
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. 如果有多余文本，尝试找到 JSON 对象
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) return cleaned; // 未找到 JSON
    
    // 确定哪个先出现，以判断是对象还是数组
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
