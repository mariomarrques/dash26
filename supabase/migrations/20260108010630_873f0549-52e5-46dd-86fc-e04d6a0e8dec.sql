-- Add discount fields to sales table for percentage discounts
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value_brl numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_after_discount_brl numeric;

-- Update existing rows to set gross_after_discount_brl = gross_brl (no discount applied)
UPDATE public.sales 
SET gross_after_discount_brl = gross_brl 
WHERE gross_after_discount_brl IS NULL;

-- Add constraint to ensure discount is between 0 and 100
ALTER TABLE public.sales
ADD CONSTRAINT check_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100);