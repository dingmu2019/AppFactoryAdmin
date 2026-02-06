import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AGENT_DATA = {
    name: '顶级流程专家',
    role: 'Top-tier Process Expert',
    avatar: '🔄',
    description: '专注于业务流程管理 (BPM)、流程优化 (BPR) 和流程自动化 (RPA)。擅长使用 BPMN 2.0、SIPOC、VSM 等工具进行流程诊断与重构。',
    system_prompt: `你是一位拥有20年经验的顶级流程专家，精通 Lean Six Sigma 黑带和 BPMN 2.0 标准。
你的核心目标是消除浪费、提升效率，并确保业务流程的合规性与敏捷性。

**核心能力**：
1. **流程建模**：精通 BPMN 2.0，能够绘制清晰、标准的流程图，从 L1 (价值链) 到 L4 (作业指导书)。
2. **流程诊断**：擅长使用 SIPOC、VSM (价值流图) 和泳道图识别流程中的瓶颈、断点和非增值环节 (NVA)。
3. **流程优化 (BPR)**：能够运用 ECRS 原则 (取消、合并、重排、简化) 进行流程重组，大幅提升效率。
4. **数字化转型**：熟悉 RPA (UiPath/Power Automate) 和 iBPMS 平台，能够提出切实可行的流程自动化方案。

**行为准则**：
- 始终坚持“以客户为中心”的流程设计理念。
- 在优化建议中，必须量化预期收益 (如 FTE 节省、周期时间缩短)。
- 关注流程的端到端 (End-to-End) 拉通，打破部门墙。
- 确保流程设计符合 ISO9001 等质量管理体系要求。

**输出风格**：
- 结构化强，多使用步骤说明。
- 必须包含 Mermaid 格式的流程图代码。
- 对关键改进点进行高亮说明。`,
    is_active: true
};

const PROMPTS_DATA = [
    { label: '流程现状诊断 (As-Is)', content: '请基于我提供的业务场景，使用 SIPOC 模型分析当前的流程现状，识别供应商、输入、过程、输出和客户，并指出主要痛点。' },
    { label: '流程优化方案 (To-Be)', content: '针对当前流程的瓶颈，请运用 ECRS 原则提出优化方案，并绘制优化后的 BPMN 2.0 流程图 (Mermaid 格式)。' },
    { label: 'SOP 标准作业书', content: '请为该核心业务环节编写一份标准的 SOP (Standard Operating Procedure)，包含操作步骤、负责角色、输入输出及异常处理机制。' },
    { label: 'RPA 自动化机会评估', content: '请分析当前流程中哪些环节适合引入 RPA 机器人，评估实施难度和预期 ROI，并列出推荐的自动化场景。' },
    { label: 'VSM 价值流分析', content: '请绘制当前流程的价值流图 (Value Stream Mapping)，计算增值时间 (VA) 与非增值时间 (NVA) 的比例，并找出浪费最严重的环节。' },
    { label: '流程绩效指标 (KPI)', content: '请为该业务流程设计一套 KPI 指标体系，涵盖效率 (Cycle Time)、质量 (First Pass Yield) 和成本三个维度。' },
    { label: '跨部门流程拉通', content: '当前流程在部门交接处存在严重的推诿现象。请设计一套跨部门协作机制 (RACI 矩阵)，明确各环节的责权利。' },
    { label: 'ISO9001 合规检查', content: '请对照 ISO9001:2015 标准，检查当前流程文件是否满足质量管理体系的要求，特别是关于风险思维和持续改进的部分。' },
    { label: '流程异常处理机制', content: '设计一套完善的异常处理流程 (Exception Handling)，确保在系统故障或人为错误发生时，业务能够快速恢复或降级运行。' },
    { label: '审批流程优化', content: '目前的审批链条过长，严重影响效率。请根据授权体系 (DOA) 提出审批流简化建议，平衡风险控制与敏捷性。' }
];

async function seedProcessExpertAgent() {
    console.log('🌱 Seeding Process Expert Agent...');

    try {
        // 1. Check if agent exists
        const { data: existingAgents, error: searchError } = await supabase
            .from('ai_agents')
            .select('id')
            .eq('name', AGENT_DATA.name)
            .limit(1);

        if (searchError) throw searchError;

        let agentId;

        if (existingAgents && existingAgents.length > 0) {
            console.log('⚠️ Agent "顶级流程专家" already exists. Updating/Adding prompts only.');
            agentId = existingAgents[0].id;
        } else {
            // 2. Insert Agent
            const { data: newAgent, error: insertError } = await supabase
                .from('ai_agents')
                .insert(AGENT_DATA)
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            agentId = newAgent.id;
            console.log('✅ Agent created with ID:', agentId);
        }

        // 3. Insert Prompts
        if (agentId) {
            // First, delete existing prompts to avoid duplicates or stale data
            // (Optional, but cleaner for seeding script)
            await supabase.from('agent_prompts').delete().eq('agent_id', agentId);

            const promptsToInsert = PROMPTS_DATA.map(p => ({
                agent_id: agentId,
                label: p.label,
                content: p.content
            }));
            
            const { error: pError } = await supabase
                .from('agent_prompts')
                .insert(promptsToInsert);

            if (pError) throw pError;
            console.log('✅ Prompts updated (Total: 10).');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedProcessExpertAgent();
