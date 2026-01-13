import { supabase } from "@/integrations/supabase/client";

interface PurchaseItem {
  id: string;
  qty: number;
  unit_cost_value: number;
  unit_cost_currency: string;
  usd_to_brl_rate: number | null;
  product_variants?: {
    id: string;
  };
}

interface PurchaseOrder {
  id: string;
  freight_brl: number;
  extra_fees_brl: number;
  arrival_tax_brl: number | null;
  source: string;
  shipping_mode: string | null;
  purchase_items: PurchaseItem[];
}

/**
 * Create inventory lots when a purchase order arrives.
 * Each purchase_item generates one lot with the fully loaded unit cost.
 * 
 * CRITICAL: This function is IDEMPOTENT - it will NOT create duplicate lots
 * if lots already exist for this purchase order.
 */
export async function createInventoryLots(
  userId: string,
  purchase: PurchaseOrder
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const totalPieces = purchase.purchase_items.reduce((sum, item) => sum + item.qty, 0);
  if (totalPieces === 0) {
    return { success: true };
  }

  // CRITICAL IDEMPOTENCY CHECK: Don't create lots if they already exist
  const { data: existingLots, error: checkError } = await supabase
    .from("inventory_lots")
    .select("id")
    .eq("purchase_order_id", purchase.id)
    .limit(1);

  if (checkError) {
    console.error("Error checking existing lots:", checkError);
    return { success: false, error: checkError.message };
  }

  // If lots already exist, skip creation (idempotent behavior)
  if (existingLots && existingLots.length > 0) {
    console.log(`Lots already exist for purchase order ${purchase.id}, skipping creation`);
    return { success: true, skipped: true };
  }

  // Calculate rateio (extra costs per piece)
  const extraCosts = purchase.freight_brl + purchase.extra_fees_brl + (purchase.arrival_tax_brl || 0);
  const rateioPerPiece = extraCosts / totalPieces;

  // Check if arrival_tax is pending (offline China orders without tax)
  const costPendingTax = 
    purchase.source === "china" && 
    purchase.shipping_mode === "offline" && 
    purchase.arrival_tax_brl === null;

  const lots = purchase.purchase_items
    .filter((item) => item.product_variants?.id)
    .map((item) => {
      // Calculate unit cost in BRL
      const baseCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
        ? item.unit_cost_value * item.usd_to_brl_rate
        : item.unit_cost_value;
      
      const unitCostBrl = baseCostBrl + rateioPerPiece;

      return {
        user_id: userId,
        variant_id: item.product_variants!.id,
        purchase_order_id: purchase.id,
        purchase_item_id: item.id,
        qty_received: item.qty,
        qty_remaining: item.qty,
        unit_cost_brl: unitCostBrl,
        cost_pending_tax: costPendingTax,
      };
    });

  if (lots.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("inventory_lots")
    .insert(lots);

  if (error) {
    console.error("Error creating inventory lots:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create or recalculate inventory lot costs when arrival_tax is updated.
 * If lots don't exist, creates them. If they exist, updates them.
 */
export async function recalculateLotsForTax(
  userId: string,
  purchaseOrderId: string,
  newTaxBrl: number,
  purchase: PurchaseOrder
): Promise<{ success: boolean; error?: string }> {
  const totalPieces = purchase.purchase_items.reduce((sum, item) => sum + item.qty, 0);
  if (totalPieces === 0) {
    return { success: true };
  }

  // Check if lots exist for this purchase order
  const { data: existingLots } = await supabase
    .from("inventory_lots")
    .select("id")
    .eq("purchase_order_id", purchaseOrderId)
    .limit(1);

  // If no lots exist, create them
  if (!existingLots || existingLots.length === 0) {
    return await createInventoryLots(userId, {
      ...purchase,
      arrival_tax_brl: newTaxBrl,
    });
  }

  // Calculate new rateio with the tax included
  const extraCosts = purchase.freight_brl + purchase.extra_fees_brl + newTaxBrl;
  const rateioPerPiece = extraCosts / totalPieces;

  // Update each lot with the new unit cost
  for (const item of purchase.purchase_items) {
    if (!item.product_variants?.id) continue;

    const baseCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
      ? item.unit_cost_value * item.usd_to_brl_rate
      : item.unit_cost_value;
    
    const newUnitCostBrl = baseCostBrl + rateioPerPiece;

    const { error } = await supabase
      .from("inventory_lots")
      .update({ 
        unit_cost_brl: newUnitCostBrl,
        cost_pending_tax: false 
      })
      .eq("purchase_item_id", item.id);

    if (error) {
      console.error("Error updating lot:", error);
      return { success: false, error: error.message };
    }
  }

  // After updating lots, recalculate affected sales
  await recalculateSalesForPurchaseOrder(purchaseOrderId);

  return { success: true };
}

/**
 * Fix missing inventory lots for a purchase order that was marked as arrived
 * but didn't have lots created (legacy data / bug fix).
 */
export async function fixMissingInventoryData(
  userId: string,
  purchase: PurchaseOrder & { stock_posted: boolean }
): Promise<{ success: boolean; error?: string; stockMovementsCreated: number; lotsCreated: boolean }> {
  // Check if stock_movements exist for this purchase
  const { data: existingMovements } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("ref_type", "purchase")
    .eq("ref_id", purchase.id)
    .limit(1);

  let stockMovementsCreated = 0;

  // Create stock movements if they don't exist
  if (!existingMovements || existingMovements.length === 0) {
    const stockMovements = purchase.purchase_items
      .filter((item) => item.product_variants?.id)
      .map((item) => ({
        user_id: userId,
        variant_id: item.product_variants!.id,
        type: "in",
        qty: item.qty,
        ref_type: "purchase",
        ref_id: purchase.id,
      }));

    if (stockMovements.length > 0) {
      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert(stockMovements);

      if (stockError) {
        console.error("Error creating stock movements:", stockError);
        return { success: false, error: stockError.message, stockMovementsCreated: 0, lotsCreated: false };
      }
      stockMovementsCreated = stockMovements.length;
    }
  }

  // Check if inventory_lots exist
  const { data: existingLots } = await supabase
    .from("inventory_lots")
    .select("id")
    .eq("purchase_order_id", purchase.id)
    .limit(1);

  let lotsCreated = false;

  // Create inventory lots if they don't exist
  if (!existingLots || existingLots.length === 0) {
    const lotsResult = await createInventoryLots(userId, purchase);
    if (!lotsResult.success) {
      return { success: false, error: lotsResult.error, stockMovementsCreated, lotsCreated: false };
    }
    lotsCreated = true;
  }

  // Mark as stock_posted if it wasn't
  if (!purchase.stock_posted) {
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ stock_posted: true })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("Error updating stock_posted:", updateError);
      return { success: false, error: updateError.message, stockMovementsCreated, lotsCreated };
    }
  }

  return { success: true, stockMovementsCreated, lotsCreated };
}

/**
 * Recalculate sales that used lots from a specific purchase order.
 * This is called after arrival_tax is updated.
 */
async function recalculateSalesForPurchaseOrder(purchaseOrderId: string): Promise<void> {
  // Find all lots from this purchase order
  const { data: lots } = await supabase
    .from("inventory_lots")
    .select("variant_id")
    .eq("purchase_order_id", purchaseOrderId);

  if (!lots || lots.length === 0) return;

  const variantIds = [...new Set(lots.map(l => l.variant_id))];

  // Find sales that have items with these variants and have cogs_pending
  const { data: pendingSales } = await supabase
    .from("sales")
    .select(`
      id,
      gross_brl,
      fees_brl,
      shipping_brl,
      fixed_costs_brl,
      sale_items(
        variant_id,
        qty
      )
    `)
    .eq("cogs_pending", true);

  if (!pendingSales) return;

  for (const sale of pendingSales) {
    const relevantItems = sale.sale_items.filter(
      (item: any) => item.variant_id && variantIds.includes(item.variant_id)
    );

    if (relevantItems.length > 0) {
      // Recalculate COGS for this sale
      await recalculateSaleCogs(sale.id);
    }
  }
}

/**
 * Consume inventory lots using FIFO for a sale.
 * Returns the total COGS and whether any cost is pending.
 * Also records the consumption in sale_item_lots for proper revenue attribution.
 */
export async function consumeLotsForSale(
  userId: string,
  saleId: string,
  items: Array<{ variantId: string; qty: number; saleItemId?: string }>
): Promise<{ 
  totalCogs: number; 
  cogsPending: boolean; 
  consumptions: Array<{ lotId: string; qty: number; unitCost: number }>;
  error?: string;
}> {
  let totalCogs = 0;
  let cogsPending = false;
  const consumptions: Array<{ lotId: string; qty: number; unitCost: number }> = [];

  for (const item of items) {
    if (!item.variantId) continue;

    let remainingQty = item.qty;

    // Get available lots for this variant, ordered by received_at (FIFO)
    const { data: lots, error } = await supabase
      .from("inventory_lots")
      .select("*")
      .eq("variant_id", item.variantId)
      .eq("user_id", userId)
      .gt("qty_remaining", 0)
      .order("received_at", { ascending: true });

    if (error) {
      console.error("Error fetching lots:", error);
      return { totalCogs: 0, cogsPending: true, consumptions: [], error: error.message };
    }

    if (!lots || lots.length === 0) {
      // No lots available - cost is unknown
      cogsPending = true;
      continue;
    }

    // Consume lots in FIFO order
    for (const lot of lots) {
      if (remainingQty <= 0) break;

      const consumeQty = Math.min(remainingQty, lot.qty_remaining);
      const cost = consumeQty * Number(lot.unit_cost_brl);
      
      totalCogs += cost;
      consumptions.push({ 
        lotId: lot.id, 
        qty: consumeQty, 
        unitCost: Number(lot.unit_cost_brl) 
      });

      // Check if this lot has pending tax
      if (lot.cost_pending_tax) {
        cogsPending = true;
      }

      // Update the lot's remaining quantity
      const newRemaining = lot.qty_remaining - consumeQty;
      const { error: updateError } = await supabase
        .from("inventory_lots")
        .update({ qty_remaining: newRemaining })
        .eq("id", lot.id);

      if (updateError) {
        console.error("Error updating lot:", updateError);
        return { totalCogs: 0, cogsPending: true, consumptions: [], error: updateError.message };
      }

      remainingQty -= consumeQty;
    }

    // If we still have remaining qty, cost is pending (not enough lots)
    if (remainingQty > 0) {
      cogsPending = true;
    }
  }

  return { totalCogs, cogsPending, consumptions };
}

/**
 * Record which lots were consumed by a sale item.
 * This enables proper FIFO revenue attribution per purchase order.
 */
export async function recordSaleItemLots(
  userId: string,
  saleItemId: string,
  consumptions: Array<{ lotId: string; qty: number; unitCost: number }>
): Promise<{ success: boolean; error?: string }> {
  if (consumptions.length === 0) return { success: true };

  const records = consumptions.map((c) => ({
    user_id: userId,
    sale_item_id: saleItemId,
    inventory_lot_id: c.lotId,
    qty_consumed: c.qty,
    unit_cost_brl: c.unitCost,
  }));

  const { error } = await supabase
    .from("sale_item_lots")
    .insert(records);

  if (error) {
    console.error("Error recording sale item lots:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Recalculate COGS for a specific sale.
 * This doesn't re-consume lots, just recalculates based on current lot costs.
 */
async function recalculateSaleCogs(saleId: string): Promise<void> {
  // Get the sale with items
  const { data: sale } = await supabase
    .from("sales")
    .select(`
      id,
      gross_brl,
      fees_brl,
      shipping_brl,
      fixed_costs_brl,
      sale_items(variant_id, qty)
    `)
    .eq("id", saleId)
    .single();

  if (!sale) return;

  // For now, we just mark cogs_pending as false if all related lots are no longer pending
  // A more sophisticated approach would track which lots were consumed per sale
  
  // Get all variants from this sale
  const variantIds = sale.sale_items
    .filter((item: any) => item.variant_id)
    .map((item: any) => item.variant_id);

  if (variantIds.length === 0) return;

  // Check if any lots for these variants still have pending tax
  const { data: pendingLots } = await supabase
    .from("inventory_lots")
    .select("id")
    .in("variant_id", variantIds)
    .eq("cost_pending_tax", true)
    .limit(1);

  const stillPending = pendingLots && pendingLots.length > 0;

  // Update the sale's cogs_pending status
  await supabase
    .from("sales")
    .update({ cogs_pending: stillPending })
    .eq("id", saleId);
}

/**
 * Calculate net profit and margin for a sale.
 */
export function calculateSaleProfit(
  grossBrl: number,
  feesBrl: number,
  shippingBrl: number,
  fixedCostsBrl: number,
  cogsBrl: number
): { netProfit: number; marginPercent: number } {
  const netProfit = grossBrl - feesBrl - shippingBrl - fixedCostsBrl - cogsBrl;
  const marginPercent = grossBrl > 0 ? (netProfit / grossBrl) * 100 : 0;
  return { netProfit, marginPercent };
}
