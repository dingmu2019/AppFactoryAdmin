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
    name: '用户增长专家',
    role: 'Head of Growth',
    avatar: '🚀',
    description: '专注于用户获取 (Acquisition)、激活 (Activation) 和留存 (Retention)。擅长设计增长实验 (A/B Testing)、裂变机制及转化率优化 (CRO)。',
    system_prompt: `你是一位顶级的用户增长专家（Growth Hacker），深谙 AARRR 模型（海盗指标）和 PLG（产品驱动增长）策略。
你的核心目标是以最低的成本获取高质量用户，并最大化用户生命周期价值 (LTV)。

**核心能力**：
1. **获客策略 (Acquisition)**：精通 SEO/ASO、内容营销、病毒式传播及付费投放渠道优化。
2. **激活与留存 (Activation & Retention)**：擅长设计 Aha Moment，优化 Onboarding 流程，利用钩子模型 (Hook Model) 提升用户粘性。
3. **数据分析**：能够通过漏斗分析 (Funnel Analysis) 和同期群分析 (Cohort Analysis) 识别增长瓶颈。
4. **实验驱动**：坚持“假设-实验-验证-迭代”的闭环，通过 A/B 测试寻找最优解。

**行为准则**：
- 一切以数据为导向，拒绝凭感觉决策。
- 关注全链路增长，而不仅是单一环节。
- 善于利用心理学原理（如稀缺性、社会认同）影响用户行为。
- 输出方案需包含具体的实验设计（变量、对照组、预期结果）。

**输出风格**：
- 极具行动力，多使用动词。
- 方案结构化：背景 -> 假设 -> 实验方案 -> 衡量指标。`,
    is_active: true
};

const PROMPTS_DATA = [
    { label: 'AARRR 漏斗诊断', content: '请基于 AARRR 模型（获取、激活、留存、变现、推荐），为我们的产品设计一套核心指标体系，并指出当前最可能存在的增长瓶颈。' },
    { label: '裂变活动策划', content: '请策划一个低成本的用户裂变活动，利用“老带新”机制，包含诱饵设计、分享路径及防刷策略。' },
    { label: 'Onboarding 优化', content: '新用户注册后的流失率较高。请提供 3-5 个具体的优化建议，帮助用户更快达到 Aha Moment（惊喜时刻）。' },
    { label: '转化率提升 (CRO)', content: '针对我们的落地页 (Landing Page)，请提出 5 个基于行为心理学的修改建议，以提升注册转化率。' },
    // New Prompts
    { label: 'Hook 模型应用', content: '请运用 Nir Eyal 的 Hook 模型（触发、行动、多变的酬赏、投入），为我们的产品设计一套用户习惯养成机制。' },
    { label: 'PLG 增长策略', content: '如何通过产品本身驱动增长 (PLG)？请设计一套“免费增值 (Freemium)”或“免费试用 (Free Trial)”的转化路径，并设定关键的 PQL (Product Qualified Lead) 指标。' },
    { label: '用户流失预警', content: '请建立一套用户流失预警模型，定义高风险流失用户的特征行为，并制定自动化的挽回策略 (Win-back Strategy)。' },
    { label: 'SEO 关键词布局', content: '针对我们的目标用户群体，请挖掘 10 个高潜力、低竞争的长尾关键词，并规划相应的内容营销主题。' },
    { label: 'AB 测试实验库', content: '请构建一个包含 5 个假设的 A/B 测试实验库，针对定价页面或注册流程，明确每个实验的变量、假设和预期提升。' },
    { label: 'K 因子病毒传播', content: '为了实现指数级增长，请分析如何提升产品的 K 因子（病毒系数），从社交分享动机、便捷性和激励机制三个维度提出改进建议。' }
];

async function seedGrowthAgent() {
    console.log('🌱 Seeding Growth Agent...');

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
            console.log('⚠️ Agent "用户增长专家" already exists. Updating/Adding prompts only.');
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
            console.log('✅ Prompts updated (Total: 10).');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedGrowthAgent();
