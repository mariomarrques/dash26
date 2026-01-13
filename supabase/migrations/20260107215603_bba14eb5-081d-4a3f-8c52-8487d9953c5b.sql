-- Create payment_methods table for configurable payment methods
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other', -- pix, credit, debit, cash, other
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sales_channels table for configurable sales channels
CREATE TABLE public.sales_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own sales channels"
  ON public.sales_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales channels"
  ON public.sales_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales channels"
  ON public.sales_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales channels"
  ON public.sales_channels FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sales_channels_updated_at
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add payment_method_id to payment_fees table (nullable for migration)
ALTER TABLE public.payment_fees 
ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id);

-- Add fee_fixed_brl for fixed fee support
ALTER TABLE public.payment_fees 
ADD COLUMN fee_fixed_brl NUMERIC NOT NULL DEFAULT 0;

-- Add payment_method_id and sales_channel_id to sales table (nullable for backwards compatibility)
ALTER TABLE public.sales 
ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id);

ALTER TABLE public.sales 
ADD COLUMN sales_channel_id UUID REFERENCES public.sales_channels(id);