-- 22_create_refunds_table.sql
-- 创建退款记录表，用于追踪订单的退款明细（支持部分退款）

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    -- 金额信息
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'CNY',
    
    -- 状态与类型
    status VARCHAR(32) DEFAULT 'pending',
    type VARCHAR(32) DEFAULT 'full',
    
    -- 业务信息
    reason TEXT,
    refund_channel VARCHAR(32),
    transaction_id VARCHAR(128),
    
    -- 审计
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加详细注释 (Database Documentation)
COMMENT ON TABLE public.refunds IS '退款记录表：存储订单的退款流水，支持部分退款和全额退款';

COMMENT ON COLUMN public.refunds.id IS '主键ID';
COMMENT ON COLUMN public.refunds.refund_no IS '退款单号 (唯一，通常以 REF 开头)';
COMMENT ON COLUMN public.refunds.order_id IS '关联的原订单ID (外键)';
COMMENT ON COLUMN public.refunds.amount IS '本次退款金额 (支持小数)';
COMMENT ON COLUMN public.refunds.currency IS '币种 (如 CNY, USD)，默认 CNY';
COMMENT ON COLUMN public.refunds.status IS '退款状态：pending(待处理), processing(处理中), success(成功), failed(失败)';
COMMENT ON COLUMN public.refunds.type IS '退款类型：full(全额退款), partial(部分退款)';
COMMENT ON COLUMN public.refunds.reason IS '退款原因说明 (用户申请理由或客服备注)';
COMMENT ON COLUMN public.refunds.refund_channel IS '退款渠道：original(原路返回), manual(线下打款/人工处理)';
COMMENT ON COLUMN public.refunds.transaction_id IS '第三方支付网关的退款流水号 (如 Stripe Refund ID, 支付宝退款单号)';
COMMENT ON COLUMN public.refunds.created_by IS '操作人ID (通常是执行退款的管理员)';
COMMENT ON COLUMN public.refunds.created_at IS '创建时间';
COMMENT ON COLUMN public.refunds.updated_at IS '最后更新时间';

-- 索引
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_no ON public.refunds(refund_no);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- RLS: 仅管理员可操作 (或用户只能看自己的退款)
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己订单的退款记录
CREATE POLICY "Users can view own refunds" ON public.refunds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.refunds.order_id 
            AND public.orders.user_id = auth.uid()
        )
    );

-- 触发器：更新 updated_at
CREATE TRIGGER update_refunds_modtime BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
