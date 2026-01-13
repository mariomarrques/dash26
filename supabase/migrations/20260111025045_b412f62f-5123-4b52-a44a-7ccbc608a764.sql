-- ============================================================
-- Performance Indexes for ~100 Active Users
-- Critical for Dashboard, /vendas, /margens, and /estoque pages
-- ============================================================

-- 1. Sales: Critical for Dashboard, /vendas, /margens queries
-- Supports: user_id + sale_date filtering (most common pattern)
CREATE INDEX IF NOT EXISTS idx_sales_user_date 
ON public.sales (user_id, sale_date DESC);

-- 2. Stock Movements: Critical for /estoque and inventory calculations
-- Supports: user_id + created_at filtering
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created 
ON public.stock_movements (user_id, created_at DESC);

-- 3. Additional indexes for FIFO operations and joins
-- Inventory Lots: Supports FIFO consumption (variant + remaining qty)
CREATE INDEX IF NOT EXISTS idx_inventory_lots_variant_remaining 
ON public.inventory_lots (variant_id, qty_remaining) 
WHERE qty_remaining > 0;

-- Sale Items: Supports sale item lookups with user filtering
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
ON public.sale_items (sale_id);

-- Sale Item Lots: Supports FIFO tracking lookups
CREATE INDEX IF NOT EXISTS idx_sale_item_lots_sale_item 
ON public.sale_item_lots (sale_item_id);