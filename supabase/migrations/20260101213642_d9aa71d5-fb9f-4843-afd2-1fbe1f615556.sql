-- =============================================
-- PHASE 6: Fixed Costs + Margins
-- =============================================

-- 1. Create fixed_costs table for consumable costs
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  total_cost_brl NUMERIC NOT NULL,
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  unit_cost_brl NUMERIC GENERATED ALWAYS AS (total_cost_brl / total_units) STORED,
  remaining_units INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create junction table for fixed costs applied to sales
CREATE TABLE public.sale_fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  fixed_cost_id UUID NOT NULL REFERENCES public.fixed_costs(id) ON DELETE CASCADE,
  unit_cost_applied NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add margin columns to sales table
ALTER TABLE public.sales 
ADD COLUMN product_costs_brl NUMERIC DEFAULT 0,
ADD COLUMN fixed_costs_brl NUMERIC DEFAULT 0,
ADD COLUMN net_profit_brl NUMERIC DEFAULT 0,
ADD COLUMN margin_percent NUMERIC DEFAULT 0;

-- 4. Enable RLS on fixed_costs
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed costs"
ON public.fixed_costs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed costs"
ON public.fixed_costs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed costs"
ON public.fixed_costs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed costs"
ON public.fixed_costs FOR DELETE
USING (auth.uid() = user_id);

-- 5. Enable RLS on sale_fixed_costs
ALTER TABLE public.sale_fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sale fixed costs"
ON public.sale_fixed_costs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sale fixed costs"
ON public.sale_fixed_costs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sale fixed costs"
ON public.sale_fixed_costs FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add updated_at trigger for fixed_costs
CREATE TRIGGER update_fixed_costs_updated_at
BEFORE UPDATE ON public.fixed_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();