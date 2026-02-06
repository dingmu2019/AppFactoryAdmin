
-- Increment Coupon Usage Function
CREATE OR REPLACE FUNCTION increment_coupon_usage(row_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
