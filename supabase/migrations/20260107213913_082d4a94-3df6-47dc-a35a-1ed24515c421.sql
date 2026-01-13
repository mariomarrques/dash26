-- Add stock_posted boolean to track if stock movements were already created
ALTER TABLE public.purchase_orders 
ADD COLUMN stock_posted boolean NOT NULL DEFAULT false;

-- Update existing orders that already have status "chegou" to mark stock_posted as true
-- This prevents re-posting for orders that were already processed
UPDATE public.purchase_orders 
SET stock_posted = true 
WHERE status = 'chegou';