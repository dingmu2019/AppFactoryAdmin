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
    name: '顶级商业分析师',
    role: 'Senior Business Analyst',
};

const PROMPTS_DATA = [
    // Existing Prompts
    { label: '商业画布分析', content: '请为当前项目构建一个精简版的商业模式画布 (Business Model Canvas)，重点分析价值主张、客户细分、收入来源和成本结构。' },
    { label: 'SWOT 分析', content: '请对当前业务进行 SWOT 分析，列出优势、劣势、机会和威胁，并针对性地提出 SO、WO、ST、WT 策略。' },
    { label: '竞品分析', content: '请列出当前赛道的 3-5 个主要竞争对手，对比其核心功能、定价策略和市场定位，并找出我们的差异化优势。' },
    { label: 'MVP 规划', content: '基于当前资源，请规划一个最小可行性产品 (MVP) 的功能清单，按优先级排序，并说明理由。' },
    // New Prompts
    { label: 'PESTEL 宏观分析', content: '请使用 PESTEL 模型分析当前目标市场的宏观环境（政治、经济、社会、技术、环境、法律），并识别对业务影响最大的外部因素。' },
    { label: 'TAM/SAM/SOM 测算', content: '请估算当前业务的市场规模，分别计算 TAM (潜在市场总量)、SAM (可服务市场) 和 SOM (可获得市场)，并说明估算逻辑和数据来源。' },
    { label: '用户画像 (Persona)', content: '请基于现有信息，构建 3 个典型的用户画像 (Persona)，包含其人口统计学特征、痛点、目标、行为习惯及决策影响因素。' },
    { label: '盈利模式优化', content: '当前的盈利模式可能存在瓶颈。请分析现有的收入来源，并提出 3 种可能的创新盈利模式（如订阅制、交易佣金、增值服务）。' },
    { label: '波特五力分析', content: '请运用波特五力模型分析当前行业的竞争态势，评估供应商议价能力、购买者议价能力、新进入者威胁、替代品威胁及同业竞争激烈程度。' },
    { label: 'GTM 策略 (Go-to-Market)', content: '请制定一份新产品的上市策略 (GTM Strategy)，明确目标客群、核心价值传递、营销渠道选择及首发阶段的关键里程碑。' }
];

async function seedBusinessAnalystPrompts() {
    console.log('🌱 Seeding Business Analyst Prompts...');

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
            agentId = existingAgents[0].id;
            console.log(`✅ Found Agent "${AGENT_DATA.name}" with ID: ${agentId}`);
        } else {
            console.error(`❌ Agent "${AGENT_DATA.name}" not found. Please seed agents first.`);
            return;
        }

        // 2. Insert Prompts
        if (agentId) {
            // Optional: Delete existing prompts to avoid duplicates if re-running
            // For now, we assume we might want to just add. But to be safe and avoid duplicates:
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
            console.log(`✅ Prompts updated (Total: ${promptsToInsert.length}).`);
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedBusinessAnalystPrompts();
