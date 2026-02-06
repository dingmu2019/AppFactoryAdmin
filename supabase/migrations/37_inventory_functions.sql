
-- Inventory Management RPC Functions

-- 1. Decrement Stock (Atomic)
CREATE OR REPLACE FUNCTION decrement_stock(row_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - quantity
    WHERE id = row_id AND stock >= quantity;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock or product not found';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Increment Stock (Atomic) - For Cancellation
CREATE OR REPLACE FUNCTION increment_stock(row_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock = stock + quantity
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
