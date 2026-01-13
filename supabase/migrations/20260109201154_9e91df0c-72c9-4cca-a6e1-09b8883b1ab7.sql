-- Remove duplicate inventory_lots, keeping only the first (oldest) lot per purchase_item_id
-- This fixes data corruption caused by race conditions or double-clicks

DELETE FROM inventory_lots
WHERE id IN (
  SELECT unnest(lot_ids[2:array_length(lot_ids, 1)])
  FROM (
    SELECT 
      array_agg(id ORDER BY created_at) as lot_ids
    FROM inventory_lots
    GROUP BY purchase_item_id
    HAVING COUNT(*) > 1
  ) duplicates
);

-- Add a comment explaining the fix
COMMENT ON TABLE inventory_lots IS 'Each purchase_item should have exactly ONE inventory_lot. The createInventoryLots function now has idempotency checks to prevent duplicates.';