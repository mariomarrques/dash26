-- Performance indexes for common query patterns
-- These indexes support filtering by user_id + date ranges (most common access pattern)

-- Index for sales table: user_id + sale_date (used in /vendas, /margens, dashboard)
CREATE INDEX IF NOT EXISTS idx_sales_user_date 
ON public.sales (user_id, sale_date DESC);

-- Index for purchase_orders table: user_id + created_at (used in /compras, feed de atividades)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_created 
ON public.purchase_orders (user_id, created_at DESC);

-- Index for stock_movements table: user_id + created_at (used in /estoque, feed de atividades)
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created 
ON public.stock_movements (user_id, created_at DESC);

-- Additional useful indexes for FIFO lookups and joins

-- Index for inventory_lots: user_id + variant_id + received_at (FIFO order)
CREATE INDEX IF NOT EXISTS idx_inventory_lots_user_variant_received 
ON public.inventory_lots (user_id, variant_id, received_at ASC);

-- Index for sale_item_lots: inventory_lot_id (for reverse lookups from lots to sales)
CREATE INDEX IF NOT EXISTS idx_sale_item_lots_inventory_lot 
ON public.sale_item_lots (inventory_lot_id);

-- Index for sale_items: sale_id (for joining sale details)
CREATE INDEX IF NOT EXISTS idx_sale_items_sale 
ON public.sale_items (sale_id);

-- Index for purchase_items: purchase_order_id (for joining purchase details)
CREATE INDEX IF NOT EXISTS idx_purchase_items_order 
ON public.purchase_items (purchase_order_id);