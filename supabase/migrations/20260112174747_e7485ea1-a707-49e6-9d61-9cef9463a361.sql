
-- =====================================================
-- SEED DE DADOS DEMO - Vendas (20 vendas distribuídas)
-- User ID: 5b3a15e1-ac1b-42bc-8401-e7af804bb0da
-- IDs reais:
-- PIX: 510112f1-a67d-4747-86e6-879bb2b5ab11
-- Crédito: d88eb927-7142-4e9a-b766-2707d84eafe6
-- Débito: fb598382-e5c7-4eaf-bbbd-2c8bd82f413f
-- WhatsApp: 7ad37690-640d-4f0e-ad02-eda576e219c8
-- Instagram: a1a316c8-66fa-4545-93f2-bfcf05667ce8
-- Influencer: 97781f1b-05b4-4166-937f-ad90a5fb313c
-- Loja: f34d1549-eeba-43fa-9c69-94ee1e93fdf1
-- =====================================================

INSERT INTO sales (user_id, sale_date, gross_brl, discount_percent, discount_value_brl, gross_after_discount_brl, 
                   payment_method, payment_method_id, sales_channel_id, fees_brl, shipping_brl, 
                   product_costs_brl, fixed_costs_brl, net_profit_brl, margin_percent, cogs_pending, is_preorder) VALUES
-- Julho 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-07-20', 160.00, 0, 0, 160.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 15.00, 82.00, 3.90, 59.10, 36.94, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-07-25', 170.00, 5, 8.50, 161.50, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 8.06, 0, 82.00, 3.90, 67.54, 41.82, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-07-30', 150.00, 0, 0, 150.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 20.00, 82.00, 3.90, 44.10, 29.40, false, false),

-- Agosto 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-08-05', 180.00, 0, 0, 180.00, 'debit', 'fb598382-e5c7-4eaf-bbbd-2c8bd82f413f', '97781f1b-05b4-4166-937f-ad90a5fb313c', 3.58, 15.00, 82.00, 3.90, 75.52, 41.96, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-08-15', 160.00, 10, 16.00, 144.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 0, 82.00, 3.90, 58.10, 40.35, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-08-20', 175.00, 0, 0, 175.00, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 8.74, 20.00, 82.00, 3.90, 60.36, 34.49, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-08-28', 165.00, 0, 0, 165.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', 'f34d1549-eeba-43fa-9c69-94ee1e93fdf1', 0, 0, 82.00, 3.90, 79.10, 47.94, false, false),

-- Setembro 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-09-10', 155.00, 0, 0, 155.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 18.00, 82.00, 3.90, 51.10, 32.97, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-09-18', 170.00, 5, 8.50, 161.50, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 8.06, 15.00, 82.00, 3.90, 52.54, 32.53, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-09-25', 180.00, 0, 0, 180.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 0, 82.00, 3.90, 94.10, 52.28, false, false),

-- Outubro 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-10-05', 165.00, 0, 0, 165.00, 'debit', 'fb598382-e5c7-4eaf-bbbd-2c8bd82f413f', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 3.28, 12.00, 82.00, 3.90, 63.82, 38.68, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-10-15', 175.00, 0, 0, 175.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 20.00, 82.00, 3.90, 69.10, 39.49, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-10-25', 160.00, 10, 16.00, 144.00, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', '97781f1b-05b4-4166-937f-ad90a5fb313c', 7.19, 0, 82.00, 3.90, 50.91, 35.35, false, false),

-- Novembro 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-11-05', 170.00, 0, 0, 170.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 15.00, 82.00, 3.90, 69.10, 40.65, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-11-15', 180.00, 0, 0, 180.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 0, 0, 82.00, 3.90, 94.10, 52.28, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-11-25', 155.00, 5, 7.75, 147.25, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', '7ad37690-640d-4f0e-ad02-eda576e219c8', 7.35, 18.00, 82.00, 3.90, 36.00, 24.45, false, false),

-- Dezembro 2025
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-12-05', 175.00, 0, 0, 175.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 0, 12.00, 82.00, 3.90, 77.10, 44.06, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-12-15', 180.00, 0, 0, 180.00, 'debit', 'fb598382-e5c7-4eaf-bbbd-2c8bd82f413f', '7ad37690-640d-4f0e-ad02-eda576e219c8', 3.58, 0, 82.00, 3.90, 90.52, 50.29, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2025-12-25', 160.00, 10, 16.00, 144.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '97781f1b-05b4-4166-937f-ad90a5fb313c', 0, 15.00, 82.00, 3.90, 43.10, 29.93, false, false),

-- Janeiro 2026
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2026-01-05', 170.00, 0, 0, 170.00, 'pix', '510112f1-a67d-4747-86e6-879bb2b5ab11', '7ad37690-640d-4f0e-ad02-eda576e219c8', 0, 0, 82.00, 3.90, 84.10, 49.47, false, false),
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2026-01-10', 165.00, 0, 0, 165.00, 'credit', 'd88eb927-7142-4e9a-b766-2707d84eafe6', 'a1a316c8-66fa-4545-93f2-bfcf05667ce8', 8.24, 18.00, 82.00, 3.90, 52.86, 32.04, false, false);
