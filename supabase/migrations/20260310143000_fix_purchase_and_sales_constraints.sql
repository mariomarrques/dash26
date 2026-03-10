-- Fixes two production regressions:
-- 1) purchase_orders.shipping_mode must allow NULL for non-China flows
-- 2) sales.payment_method must accept current app payment method types

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.purchase_orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%shipping_mode%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.purchase_orders DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_shipping_mode_check
  CHECK (
    shipping_mode IS NULL
    OR shipping_mode IN ('remessa', 'offline', 'cssbuy')
  );
END;
$$;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.sales'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%payment_method%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sales DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (
    payment_method IN ('pix', 'debit', 'credit', 'cash', 'other', 'installments')
  );
END;
$$;
