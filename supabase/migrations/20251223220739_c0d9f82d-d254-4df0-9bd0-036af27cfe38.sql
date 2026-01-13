-- =============================================
-- PAINEL 55 - DATABASE SCHEMA (Phase 2)
-- =============================================

-- 1) PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data ->> 'name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  country TEXT,
  team TEXT,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- 3) PRODUCT_VARIANTS
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  uniform TEXT,
  size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variants" ON public.product_variants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variants" ON public.product_variants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variants" ON public.product_variants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variants" ON public.product_variants
  FOR DELETE USING (auth.uid() = user_id);

-- 4) SUPPLIERS
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('china', 'brasil')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers" ON public.suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers" ON public.suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- 5) PURCHASE_ORDERS
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('china', 'brasil')),
  shipping_mode TEXT CHECK (shipping_mode IN ('remessa', 'offline')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'comprado', 'enviado', 'chegou')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  freight_brl NUMERIC NOT NULL DEFAULT 0,
  extra_fees_brl NUMERIC NOT NULL DEFAULT 0,
  arrival_tax_brl NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase orders" ON public.purchase_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase orders" ON public.purchase_orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase orders" ON public.purchase_orders
  FOR DELETE USING (auth.uid() = user_id);

-- 6) PURCHASE_ITEMS
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost_currency TEXT NOT NULL DEFAULT 'BRL' CHECK (unit_cost_currency IN ('BRL', 'USD')),
  unit_cost_value NUMERIC NOT NULL,
  usd_to_brl_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase items" ON public.purchase_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase items" ON public.purchase_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase items" ON public.purchase_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase items" ON public.purchase_items
  FOR DELETE USING (auth.uid() = user_id);

-- 7) STOCK_MOVEMENTS
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  qty INTEGER NOT NULL,
  ref_type TEXT CHECK (ref_type IN ('purchase', 'sale', 'manual')),
  ref_id UUID,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock movements" ON public.stock_movements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock movements" ON public.stock_movements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock movements" ON public.stock_movements
  FOR DELETE USING (auth.uid() = user_id);

-- 8) SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'debit', 'credit', 'installments')),
  gross_brl NUMERIC NOT NULL,
  fees_brl NUMERIC NOT NULL DEFAULT 0,
  shipping_brl NUMERIC NOT NULL DEFAULT 0,
  is_preorder BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales" ON public.sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON public.sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.sales
  FOR DELETE USING (auth.uid() = user_id);

-- 9) SALE_ITEMS
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_label_snapshot TEXT NOT NULL,
  uniform_snapshot TEXT,
  size_snapshot TEXT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_brl NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sale items" ON public.sale_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sale items" ON public.sale_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sale items" ON public.sale_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sale items" ON public.sale_items
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_items_updated_at BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at BEFORE UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_product_variants_user_id ON public.product_variants(user_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX idx_purchase_orders_user_id ON public.purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders(order_date);
CREATE INDEX idx_purchase_items_user_id ON public.purchase_items(user_id);
CREATE INDEX idx_purchase_items_purchase_order_id ON public.purchase_items(purchase_order_id);
CREATE INDEX idx_stock_movements_user_id ON public.stock_movements(user_id);
CREATE INDEX idx_stock_movements_variant_id ON public.stock_movements(variant_id);
CREATE INDEX idx_stock_movements_movement_date ON public.stock_movements(movement_date);
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_sale_items_user_id ON public.sale_items(user_id);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);