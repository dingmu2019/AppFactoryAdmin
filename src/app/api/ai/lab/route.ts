
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AILabService } from '@/services/aiLabService';

/**
 * @openapi
 * /api/ai/lab:
 *   get:
 *     tags: [AI Lab]
 *     summary: 获取实验室配置信息
 *     responses:
 *       200:
 *         description: 实验室配置
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    modes: [
      { id: 'architect_blueprint', name: '架构蓝图', description: 'AI 代理共同设计系统架构、数据库模式和 API 定义。' },
      { id: 'market_simulation', name: '市场模拟', description: '模拟市场反馈，分析产品可行性、竞争对手和增长策略。' },
      { id: 'factory_optimization', name: '工厂优化', description: '分析现有流程，提出自动化、成本优化和性能提升方案。' }
    ]
  });
}
