
-- Create table to track which inventory lots were consumed by each sale item
-- This enables proper FIFO revenue attribution per purchase order
CREATE TABLE public.sale_item_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  inventory_lot_id UUID NOT NULL REFERENCES public.inventory_lots(id) ON DELETE CASCADE,
  qty_consumed INTEGER NOT NULL CHECK (qty_consumed > 0),
  unit_cost_brl NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.sale_item_lots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own sale item lots"
ON public.sale_item_lots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sale item lots"
ON public.sale_item_lots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sale item lots"
ON public.sale_item_lots
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_sale_item_lots_sale_item ON public.sale_item_lots(sale_item_id);
CREATE INDEX idx_sale_item_lots_inventory_lot ON public.sale_item_lots(inventory_lot_id);
CREATE INDEX idx_sale_item_lots_user ON public.sale_item_lots(user_id);
