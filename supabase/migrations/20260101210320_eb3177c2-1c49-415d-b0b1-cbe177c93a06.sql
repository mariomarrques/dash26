-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Create payment_fees table
CREATE TABLE public.payment_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_method TEXT NOT NULL,
  installments INTEGER DEFAULT 1,
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_fees
ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_fees
CREATE POLICY "Users can view own payment fees" ON public.payment_fees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment fees" ON public.payment_fees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment fees" ON public.payment_fees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment fees" ON public.payment_fees FOR DELETE USING (auth.uid() = user_id);

-- Add customer_id to sales table
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.sales ADD COLUMN installments INTEGER DEFAULT 1;

-- Add updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_fees_updated_at BEFORE UPDATE ON public.payment_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default payment fees
INSERT INTO public.payment_fees (user_id, payment_method, installments, fee_percent) VALUES
  ('00000000-0000-0000-0000-000000000000', 'pix', 1, 0),
  ('00000000-0000-0000-0000-000000000000', 'debit', 1, 1.5),
  ('00000000-0000-0000-0000-000000000000', 'credit', 1, 4.5),
  ('00000000-0000-0000-0000-000000000000', 'credit', 2, 7.5),
  ('00000000-0000-0000-0000-000000000000', 'credit', 3, 9.0),
  ('00000000-0000-0000-0000-000000000000', 'credit', 4, 10.5),
  ('00000000-0000-0000-0000-000000000000', 'credit', 5, 12.0),
  ('00000000-0000-0000-0000-000000000000', 'credit', 6, 13.5);