
-- =====================================================
-- SEED DE DADOS DEMO - Fornecedores, Custos e Compras
-- User ID: 5b3a15e1-ac1b-42bc-8401-e7af804bb0da
-- Valores válidos de status: rascunho, comprado, enviado, chegou
-- =====================================================

-- 1. Criar fornecedores
INSERT INTO suppliers (id, user_id, name, type) VALUES
  ('a0000001-0000-0000-0000-000000000001', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'XingSun', 'brasil'),
  ('a0000001-0000-0000-0000-000000000002', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Chen', 'china'),
  ('a0000001-0000-0000-0000-000000000003', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Xiao', 'china'),
  ('a0000001-0000-0000-0000-000000000004', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Wu Xiaodi', 'china'),
  ('a0000001-0000-0000-0000-000000000005', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Amy', 'china');

-- 2. Criar custos fixos
INSERT INTO fixed_costs (id, user_id, name, total_cost_brl, total_units, remaining_units, is_active) VALUES
  ('d0000001-0000-0000-0000-000000000001', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Sacola Kraft', 150.00, 100, 50, true),
  ('d0000001-0000-0000-0000-000000000002', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Tag Personalizada', 80.00, 200, 100, true),
  ('d0000001-0000-0000-0000-000000000003', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'Embalagem', 200.00, 100, 50, true);

-- 3. Criar pedidos de compra do Brasil
INSERT INTO purchase_orders (id, user_id, supplier_id, source, status, order_date, freight_brl, extra_fees_brl, arrival_tax_brl, shipping_mode, stock_posted, notes) VALUES
  ('e0000001-0000-0000-0000-000000000001', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-07-15', 25.00, 0, NULL, NULL, true, 'Lote inicial Cruzeiro'),
  ('e0000001-0000-0000-0000-000000000002', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-07-25', 30.00, 0, NULL, NULL, true, 'Reposição Atlético'),
  ('e0000001-0000-0000-0000-000000000003', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-08-10', 20.00, 0, NULL, NULL, true, 'Flamengo diversos'),
  ('e0000001-0000-0000-0000-000000000004', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-08-28', 25.00, 0, NULL, NULL, true, 'Palmeiras titular'),
  ('e0000001-0000-0000-0000-000000000005', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-09-05', 30.00, 0, NULL, NULL, true, 'Misto times BR'),
  ('e0000001-0000-0000-0000-000000000006', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-09-20', 25.00, 0, NULL, NULL, true, 'Cruzeiro 25/26'),
  ('e0000001-0000-0000-0000-000000000007', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-10-08', 20.00, 0, NULL, NULL, true, 'Atlético 25/26'),
  ('e0000001-0000-0000-0000-000000000008', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-10-22', 30.00, 0, NULL, NULL, true, 'Reposição geral'),
  ('e0000001-0000-0000-0000-000000000009', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-11-05', 25.00, 0, NULL, NULL, true, 'Natal Flamengo'),
  ('e0000001-0000-0000-0000-000000000010', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-11-18', 30.00, 0, NULL, NULL, true, 'Natal Palmeiras'),
  ('e0000001-0000-0000-0000-000000000011', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-12-02', 25.00, 0, NULL, NULL, true, 'Fim de ano'),
  ('e0000001-0000-0000-0000-000000000012', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2025-12-15', 20.00, 0, NULL, NULL, true, 'Urgente natal'),
  ('e0000001-0000-0000-0000-000000000013', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'chegou', '2026-01-03', 25.00, 0, NULL, NULL, true, 'Reposição janeiro'),
  ('e0000001-0000-0000-0000-000000000014', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'enviado', '2026-01-08', 30.00, 0, NULL, NULL, false, 'Próximo lote'),
  ('e0000001-0000-0000-0000-000000000015', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000001', 'brasil', 'rascunho', '2026-01-12', 0, 0, NULL, NULL, false, 'Planejando compra');

-- 4. Criar pedidos de compra da China (valores válidos: chegou, enviado, comprado, rascunho)
INSERT INTO purchase_orders (id, user_id, supplier_id, source, status, order_date, freight_brl, extra_fees_brl, arrival_tax_brl, shipping_mode, stock_posted, notes) VALUES
  ('e0000001-0000-0000-0000-000000000016', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000002', 'china', 'chegou', '2025-07-01', 60.00, 10, 75.00, 'offline', true, 'Real Madrid lote'),
  ('e0000001-0000-0000-0000-000000000017', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000003', 'china', 'chegou', '2025-08-01', 55.00, 15, 80.00, 'remessa', true, 'Barcelona mix'),
  ('e0000001-0000-0000-0000-000000000018', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000004', 'china', 'chegou', '2025-09-01', 70.00, 10, 90.00, 'offline', true, 'Man City'),
  ('e0000001-0000-0000-0000-000000000019', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000005', 'china', 'chegou', '2025-10-01', 65.00, 20, 85.00, 'remessa', true, 'PSG lote'),
  ('e0000001-0000-0000-0000-000000000020', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000002', 'china', 'chegou', '2025-10-20', 50.00, 10, 70.00, 'offline', true, 'Europeus mix'),
  ('e0000001-0000-0000-0000-000000000021', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000003', 'china', 'chegou', '2025-11-10', 60.00, 15, 75.00, 'remessa', true, 'Natal europeus'),
  ('e0000001-0000-0000-0000-000000000022', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000004', 'china', 'chegou', '2025-12-01', 55.00, 10, 80.00, 'offline', true, 'Dezembro'),
  ('e0000001-0000-0000-0000-000000000023', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000005', 'china', 'enviado', '2025-12-20', 70.00, 15, NULL, 'remessa', false, 'Em trânsito'),
  ('e0000001-0000-0000-0000-000000000024', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000002', 'china', 'comprado', '2026-01-05', 60.00, 10, NULL, 'offline', false, 'Aguardando envio'),
  ('e0000001-0000-0000-0000-000000000025', '5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a0000001-0000-0000-0000-000000000003', 'china', 'rascunho', '2026-01-10', 0, 0, NULL, NULL, false, 'Planejando');
