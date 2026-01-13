
-- Add sale_items for the 20 demo sales that have no items
-- Using variants with good stock levels

INSERT INTO sale_items (user_id, sale_id, variant_id, qty, unit_price_brl, product_label_snapshot, uniform_snapshot, size_snapshot)
VALUES
-- Sale 1: 2025-07-20, gross R$160 (1 item @ R$160)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'c0dbf178-5a23-4465-9b2b-cdacc61723b6', '619d550f-7762-44c0-8bc9-02b4efa4dac1', 1, 160.00, 'Cruzeiro 24/25', 'Titular', 'M'),

-- Sale 2: 2025-07-25, gross R$170 (1 item @ R$170)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '8374c675-9506-45c2-8778-7e1dd2f3ca0b', '2b5413e7-ba8c-4cf4-bc03-70f293be6f02', 1, 170.00, 'Barcelona 25/26', 'Titular', 'GG'),

-- Sale 3: 2025-07-30, gross R$150 (1 item @ R$150)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '03e0f106-34e3-438e-af7f-bac50dfafb59', 'a2d07b86-42f5-4ee6-93b9-f31ed8435da1', 1, 150.00, 'Atlético-MG 24/25', 'Titular', 'M'),

-- Sale 4: 2025-08-05, gross R$180 (1 item @ R$180)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '8cf38d58-b380-4218-944a-6ee9eaa1de2c', '20c2f63a-0000-4c81-8cf1-4b49580d54bd', 1, 180.00, 'Barcelona 25/26', 'Titular', 'G'),

-- Sale 5: 2025-08-15, gross R$160 (1 item @ R$160)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '02bcb5e7-6898-4c13-83f1-06342fe3edf3', 'da58674c-6eae-4887-b7cb-6cd9d3d35736', 1, 160.00, 'Barcelona 25/26', 'Titular', 'P'),

-- Sale 6: 2025-08-20, gross R$175 (1 item @ R$175)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '36f4e368-0ef1-400c-84e0-232e1b74a03e', '7933ab58-0cef-415a-917d-062af9e2e0c6', 1, 175.00, 'Cruzeiro 24/25', 'Titular', 'G'),

-- Sale 7: 2025-08-28, gross R$165 (1 item @ R$165)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '7e927666-4f39-485a-af6b-09d3cfad005a', 'f225c7db-ca85-46bc-b9d0-5a6968a7a88f', 1, 165.00, 'Cruzeiro 24/25', 'Titular', 'P'),

-- Sale 8: 2025-09-10, gross R$155 (1 item @ R$155)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '07a51111-0e42-432b-8a84-c4b995043a4e', '6ae259ed-d9ed-476e-a5af-791858fc48ec', 1, 155.00, 'Barcelona 25/26', 'Titular', 'M'),

-- Sale 9: 2025-09-18, gross R$170 (1 item @ R$170)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'bdbc4e48-327a-4d31-ac7d-0c88e3565a5d', '20563796-0c40-4b96-9af6-d737456b9733', 1, 170.00, 'Atlético-MG 24/25', 'Titular', 'G'),

-- Sale 10: 2025-09-25, gross R$180 (1 item @ R$180)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '08efd751-6d21-4c32-a76c-5b89c5721da2', 'b14caf44-f87f-47e2-a4da-486850c4a8f2', 1, 180.00, 'Cruzeiro 24/25', 'Titular', 'GG'),

-- Sale 11: 2025-10-05, gross R$165 (1 item @ R$165)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '67e80524-5a4b-46e5-ad1d-f869fdd5abbd', '2527f288-e5f3-4710-8684-80cb056bfecd', 1, 165.00, 'Atlético-MG 24/25', 'Titular', 'P'),

-- Sale 12: 2025-10-15, gross R$175 (1 item @ R$175)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '2627b928-75d3-49c5-a2b0-43c0da64b0c4', '478b0660-ba91-4220-b5b6-61ba4fe37ee0', 1, 175.00, 'Flamengo 25/26', 'Reserva', 'G'),

-- Sale 13: 2025-10-25, gross R$160 (1 item @ R$160)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'e14c12d6-ff26-43ab-a8e8-98f85cc9ccfd', 'a7a7126f-df13-423f-8663-7f0c1ca3187b', 1, 160.00, 'Atlético-MG 25/26', 'Titular', 'P'),

-- Sale 14: 2025-11-05, gross R$170 (1 item @ R$170)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'aac19190-7839-4280-96ad-3d505fbeab0c', 'dc711290-b03a-4a3e-b0a3-69d5b8975a5c', 1, 170.00, 'Cruzeiro 24/25', 'Reserva', 'G'),

-- Sale 15: 2025-11-15, gross R$180 (1 item @ R$180)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', '9532091c-ac12-40dd-868d-9d955c3ec0c6', 'f3d6337e-a69c-4ae9-8fd8-5a8d60ac4723', 1, 180.00, 'Flamengo 24/25', 'Goleiro', 'P'),

-- Sale 16: 2025-11-25, gross R$155 (1 item @ R$155)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a1e49705-b25a-4940-acd5-c3d6604cc573', 'a034207b-6267-49ca-b1aa-8de348a655d8', 1, 155.00, 'PSG 25/26', 'Reserva', 'M'),

-- Sale 17: 2025-12-05, gross R$175 (1 item @ R$175)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'de126f56-f536-4827-9445-d6b9d1c0c78c', 'eabf10d0-0fe4-4be2-97f9-27e75d421608', 1, 175.00, 'Atlético-MG 24/25', 'Titular', 'GG'),

-- Sale 18: 2025-12-15, gross R$180 (1 item @ R$180)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'a2ab3fd3-8ffa-4ed9-b13b-208620d00f86', '5110bda3-df9c-46c4-94cc-87b7277fbc5f', 1, 180.00, 'Real Madrid 25/26', 'Titular', 'GG'),

-- Sale 19: 2025-12-25, gross R$160 (1 item @ R$160)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'be7454fb-3ada-4579-af1c-59281d550095', '2cc59a51-4c4b-4c7a-a061-d280b78be847', 1, 160.00, 'Manchester City 25/26', 'Titular', 'G'),

-- Sale 20: 2026-01-05, gross R$170 (1 item @ R$170)
('5b3a15e1-ac1b-42bc-8401-e7af804bb0da', 'b9a657dd-f08b-479a-9f72-4a18d7c83e8b', 'ccfe43e6-7daf-4f6c-91f4-d45adbe24e78', 1, 170.00, 'Cruzeiro 24/25', 'Goleiro', 'M');
