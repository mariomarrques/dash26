-- Support CSV purchase imports grouped by supplier + lot with transactional persistence.

ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS lot_code TEXT;

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS personalization TEXT;

ALTER TABLE public.purchase_items
ADD COLUMN IF NOT EXISTS season_snapshot TEXT,
ADD COLUMN IF NOT EXISTS country_snapshot TEXT,
ADD COLUMN IF NOT EXISTS team_snapshot TEXT,
ADD COLUMN IF NOT EXISTS version_snapshot TEXT,
ADD COLUMN IF NOT EXISTS uniform_snapshot TEXT,
ADD COLUMN IF NOT EXISTS size_snapshot TEXT,
ADD COLUMN IF NOT EXISTS personalization_snapshot TEXT;

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
  CHECK (shipping_mode IN ('remessa', 'offline', 'cssbuy'));
END;
$$;

CREATE OR REPLACE FUNCTION public.import_purchase_orders_csv(p_groups JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group JSONB;
  v_item JSONB;
  v_supplier_id UUID;
  v_purchase_order_id UUID;
  v_team_id UUID;
  v_product_id UUID;
  v_variant_id UUID;
  v_created_ids UUID[] := ARRAY[]::UUID[];
  v_supplier_name TEXT;
  v_lot_code TEXT;
  v_order_date DATE;
  v_source TEXT;
  v_status TEXT;
  v_shipping_mode TEXT;
  v_freight_brl NUMERIC;
  v_extra_fees_brl NUMERIC;
  v_notes TEXT;
  v_items JSONB;
  v_country TEXT;
  v_team TEXT;
  v_season TEXT;
  v_version TEXT;
  v_uniform TEXT;
  v_size TEXT;
  v_personalization TEXT;
  v_product_label TEXT;
  v_qty INTEGER;
  v_unit_cost_value NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_groups IS NULL OR jsonb_typeof(p_groups) <> 'array' OR jsonb_array_length(p_groups) = 0 THEN
    RAISE EXCEPTION 'Nenhum lote válido foi enviado para importação';
  END IF;

  FOR v_group IN SELECT value FROM jsonb_array_elements(p_groups)
  LOOP
    v_supplier_name := NULLIF(BTRIM(v_group ->> 'supplierName'), '');
    v_lot_code := NULLIF(BTRIM(v_group ->> 'lot'), '');
    v_source := NULLIF(BTRIM(v_group ->> 'source'), '');
    v_status := NULLIF(BTRIM(v_group ->> 'status'), '');
    v_shipping_mode := NULLIF(BTRIM(v_group ->> 'shippingMode'), '');
    v_freight_brl := COALESCE((v_group ->> 'freightBrl')::NUMERIC, 0);
    v_extra_fees_brl := COALESCE((v_group ->> 'extraFeesBrl')::NUMERIC, 0);
    v_notes := COALESCE(NULLIF(BTRIM(v_group ->> 'notes'), ''), format('Importado via CSV - lote: %s', COALESCE(v_lot_code, 'sem-lote')));
    v_items := v_group -> 'items';

    IF v_supplier_name IS NULL THEN
      RAISE EXCEPTION 'Fornecedor inválido no payload de importação';
    END IF;

    IF v_lot_code IS NULL THEN
      RAISE EXCEPTION 'Lote inválido no payload de importação';
    END IF;

    IF v_source NOT IN ('china', 'brasil') THEN
      RAISE EXCEPTION 'Origem inválida no lote %: %', v_lot_code, v_source;
    END IF;

    IF v_status NOT IN ('rascunho', 'comprado', 'enviado', 'chegou') THEN
      RAISE EXCEPTION 'Status inválido no lote %: %', v_lot_code, v_status;
    END IF;

    IF v_shipping_mode NOT IN ('remessa', 'offline', 'cssbuy') THEN
      RAISE EXCEPTION 'Modo de envio inválido no lote %: %', v_lot_code, v_shipping_mode;
    END IF;

    BEGIN
      v_order_date := (v_group ->> 'orderDate')::DATE;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Data do pedido inválida no lote %: %', v_lot_code, v_group ->> 'orderDate';
    END;

    IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
      RAISE EXCEPTION 'O lote % não possui itens válidos', v_lot_code;
    END IF;

    SELECT id
      INTO v_supplier_id
    FROM public.suppliers
    WHERE user_id = v_user_id
      AND lower(name) = lower(v_supplier_name)
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_supplier_id IS NULL THEN
      INSERT INTO public.suppliers (user_id, name, type)
      VALUES (
        v_user_id,
        v_supplier_name,
        CASE WHEN v_source = 'brasil' THEN 'brasil' ELSE 'china' END
      )
      RETURNING id INTO v_supplier_id;
    END IF;

    INSERT INTO public.purchase_orders (
      user_id,
      supplier_id,
      lot_code,
      source,
      shipping_mode,
      status,
      order_date,
      freight_brl,
      extra_fees_brl,
      arrival_tax_brl,
      stock_posted,
      notes
    )
    VALUES (
      v_user_id,
      v_supplier_id,
      v_lot_code,
      v_source,
      v_shipping_mode,
      v_status,
      v_order_date,
      v_freight_brl,
      v_extra_fees_brl,
      NULL,
      FALSE,
      v_notes
    )
    RETURNING id INTO v_purchase_order_id;

    v_created_ids := array_append(v_created_ids, v_purchase_order_id);

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
    LOOP
      v_season := NULLIF(BTRIM(v_item ->> 'season'), '');
      v_country := NULLIF(BTRIM(v_item ->> 'country'), '');
      v_team := NULLIF(BTRIM(v_item ->> 'team'), '');
      v_version := NULLIF(BTRIM(v_item ->> 'version'), '');
      v_uniform := NULLIF(BTRIM(v_item ->> 'uniform'), '');
      v_size := NULLIF(BTRIM(v_item ->> 'size'), '');
      v_personalization := NULLIF(BTRIM(v_item ->> 'personalization'), '');
      v_product_label := COALESCE(NULLIF(BTRIM(v_item ->> 'productLabel'), ''), CONCAT_WS(' ', v_team, v_season, v_version));
      v_qty := (v_item ->> 'qty')::INTEGER;
      v_unit_cost_value := (v_item ->> 'unitCostValue')::NUMERIC;

      IF v_season IS NULL OR v_country IS NULL OR v_team IS NULL OR v_version IS NULL OR v_uniform IS NULL OR v_size IS NULL THEN
        RAISE EXCEPTION 'Item inválido no lote %: campos obrigatórios ausentes', v_lot_code;
      END IF;

      IF v_qty IS NULL OR v_qty <= 0 THEN
        RAISE EXCEPTION 'Quantidade inválida no lote %', v_lot_code;
      END IF;

      IF v_unit_cost_value IS NULL OR v_unit_cost_value <= 0 THEN
        RAISE EXCEPTION 'Preço unitário inválido no lote %', v_lot_code;
      END IF;

      SELECT id
        INTO v_team_id
      FROM public.teams
      WHERE lower(country) = lower(v_country)
        AND lower(name) = lower(v_team)
        AND (user_id IS NULL OR user_id = v_user_id)
      ORDER BY CASE WHEN user_id = v_user_id THEN 0 ELSE 1 END, created_at ASC
      LIMIT 1;

      IF v_team_id IS NULL THEN
        INSERT INTO public.teams (country, name, league, is_active, user_id)
        VALUES (v_country, v_team, NULL, TRUE, v_user_id)
        RETURNING id INTO v_team_id;
      END IF;

      SELECT id
        INTO v_product_id
      FROM public.products
      WHERE user_id = v_user_id
        AND lower(label) = lower(v_product_label)
        AND COALESCE(lower(country), '') = COALESCE(lower(v_country), '')
        AND COALESCE(lower(season), '') = COALESCE(lower(v_season), '')
        AND COALESCE(team_id::TEXT, '') = COALESCE(v_team_id::TEXT, '')
      ORDER BY created_at ASC
      LIMIT 1;

      IF v_product_id IS NULL THEN
        INSERT INTO public.products (user_id, label, country, team, team_id, season)
        VALUES (v_user_id, v_product_label, v_country, v_team, v_team_id, v_season)
        RETURNING id INTO v_product_id;
      END IF;

      SELECT id
        INTO v_variant_id
      FROM public.product_variants
      WHERE user_id = v_user_id
        AND product_id = v_product_id
        AND COALESCE(lower(uniform), '') = COALESCE(lower(v_uniform), '')
        AND COALESCE(lower(size), '') = COALESCE(lower(v_size), '')
        AND COALESCE(lower(personalization), '') = COALESCE(lower(v_personalization), '')
      ORDER BY created_at ASC
      LIMIT 1;

      IF v_variant_id IS NULL THEN
        INSERT INTO public.product_variants (user_id, product_id, uniform, size, personalization)
        VALUES (v_user_id, v_product_id, v_uniform, v_size, v_personalization)
        RETURNING id INTO v_variant_id;
      END IF;

      INSERT INTO public.purchase_items (
        user_id,
        purchase_order_id,
        variant_id,
        qty,
        unit_cost_currency,
        unit_cost_value,
        usd_to_brl_rate,
        season_snapshot,
        country_snapshot,
        team_snapshot,
        version_snapshot,
        uniform_snapshot,
        size_snapshot,
        personalization_snapshot
      )
      VALUES (
        v_user_id,
        v_purchase_order_id,
        v_variant_id,
        v_qty,
        'BRL',
        v_unit_cost_value,
        NULL,
        v_season,
        v_country,
        v_team,
        v_version,
        v_uniform,
        v_size,
        v_personalization
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'purchaseOrderIds', to_jsonb(v_created_ids),
    'count', COALESCE(array_length(v_created_ids, 1), 0)
  );
END;
$$;
