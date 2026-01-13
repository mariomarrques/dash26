-- Create inventory_lots table to track FIFO cost layers
CREATE TABLE public.inventory_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL,
  purchase_item_id UUID NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qty_received INTEGER NOT NULL,
  qty_remaining INTEGER NOT NULL,
  unit_cost_brl NUMERIC NOT NULL,
  cost_pending_tax BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own inventory lots"
  ON public.inventory_lots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory lots"
  ON public.inventory_lots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory lots"
  ON public.inventory_lots
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory lots"
  ON public.inventory_lots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_lots_updated_at
  BEFORE UPDATE ON public.inventory_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add product_costs_brl column to sales if not exists (for COGS tracking)
-- Also add cogs_pending boolean to track when cost is incomplete
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cogs_pending BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient FIFO queries
CREATE INDEX idx_inventory_lots_variant_remaining ON public.inventory_lots(variant_id, received_at) 
  WHERE qty_remaining > 0;