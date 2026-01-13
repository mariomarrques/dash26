import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Package, ShoppingCart, Plus, Trash2, AlertTriangle, Check, User, Info, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { consumeLotsForSale, calculateSaleProfit, recordSaleItemLots } from "@/hooks/useInventoryLots";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SaleData {
  id: string;
  sale_date: string;
  customer_id: string | null;
  channel: string | null;
  sales_channel_id: string | null;
  payment_method: string;
  payment_method_id: string | null;
  installments: number | null;
  gross_brl: number;
  discount_percent: number;
  discount_value_brl: number;
  gross_after_discount_brl: number | null;
  fees_brl: number;
  shipping_brl: number;
  fixed_costs_brl: number | null;
  product_costs_brl: number | null;
  net_profit_brl: number | null;
  margin_percent: number | null;
  is_preorder: boolean;
  notes: string | null;
  sale_items: Array<{
    id: string;
    variant_id: string | null;
    qty: number;
    unit_price_brl: number;
    product_label_snapshot: string;
    uniform_snapshot: string | null;
    size_snapshot: string | null;
  }>;
}

interface NovaVendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingSale?: SaleData | null;
}

interface SaleItem {
  id: string;
  variantId?: string;
  productLabel: string;
  uniform: string;
  size: string;
  qty: number;
  unitPrice: number;
  availableStock?: number;
  originalVariantId?: string; // Track original variant for stock reversal
  originalQty?: number; // Track original qty for stock reversal
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface FixedCostSelection {
  id: string;
  name: string;
  unitCost: number;
  remaining: number;
  apply: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export function NovaVendaModal({ open, onOpenChange, onSuccess, editingSale }: NovaVendaModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editingSale;
  
  // State
  const [saleType, setSaleType] = useState<"stock" | "preorder" | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [channelId, setChannelId] = useState<string>("");
  const [channelName, setChannelName] = useState<string>(""); // For legacy/free text
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [paymentMethodType, setPaymentMethodType] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [shippingBrl, setShippingBrl] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [stockWarningAcknowledged, setStockWarningAcknowledged] = useState(false);
  const [fixedCosts, setFixedCosts] = useState<FixedCostSelection[]>([]);
  const [editWarningAcknowledged, setEditWarningAcknowledged] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form or populate with edit data
  useEffect(() => {
    if (!open) {
      // Reset when closing
      setSaleType(null);
      setItems([]);
      setSelectedCustomerId("");
      setIsCreatingCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setChannelId("");
      setChannelName("");
      setPaymentMethodId("");
      setPaymentMethodType("");
      setInstallments(1);
      setShippingBrl(0);
      setDiscountPercent(0);
      setNotes("");
      setStockWarningAcknowledged(false);
      setFixedCosts([]);
      setEditWarningAcknowledged(false);
    } else if (editingSale) {
      // Populate with editing data
      setSaleType(editingSale.is_preorder ? "preorder" : "stock");
      setSelectedCustomerId(editingSale.customer_id || "");
      setChannelId(editingSale.sales_channel_id || "");
      setChannelName(editingSale.channel || "");
      setPaymentMethodId(editingSale.payment_method_id || "");
      setPaymentMethodType(editingSale.payment_method || "");
      setInstallments(editingSale.installments || 1);
      setShippingBrl(editingSale.shipping_brl || 0);
      setDiscountPercent(editingSale.discount_percent || 0);
      setNotes(editingSale.notes || "");
      
      // Convert sale items to our format
      const convertedItems: SaleItem[] = editingSale.sale_items.map((item) => ({
        id: item.id,
        variantId: item.variant_id || undefined,
        productLabel: item.product_label_snapshot,
        uniform: item.uniform_snapshot || "",
        size: item.size_snapshot || "",
        qty: item.qty,
        unitPrice: item.unit_price_brl,
        originalVariantId: item.variant_id || undefined,
        originalQty: item.qty,
      }));
      setItems(convertedItems);
    }
  }, [open, editingSale]);

  // Fetch FIFO lot consumption details when editing (for display purposes)
  const { data: saleItemLotsData } = useQuery({
    queryKey: ['sale-item-lots', editingSale?.id],
    queryFn: async () => {
      if (!editingSale?.id) return [];
      
      const saleItemIds = editingSale.sale_items.map(si => si.id);
      if (saleItemIds.length === 0) return [];

      const { data, error } = await supabase
        .from('sale_item_lots')
        .select(`
          id,
          sale_item_id,
          inventory_lot_id,
          qty_consumed,
          unit_cost_brl,
          inventory_lots (
            received_at,
            purchase_order_id
          )
        `)
        .in('sale_item_id', saleItemIds)
        .order('unit_cost_brl', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!editingSale?.id && open,
  });

  // Fetch fixed costs
  const { data: availableFixedCosts } = useQuery({
    queryKey: ['fixed-costs-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('remaining_units', 0);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open && !isEditing,
  });

  // Initialize fixed costs selection when data loads (only for new sales)
  useEffect(() => {
    if (availableFixedCosts && fixedCosts.length === 0 && !isEditing) {
      setFixedCosts(availableFixedCosts.map((fc) => ({
        id: fc.id,
        name: fc.name,
        unitCost: fc.unit_cost_brl,
        remaining: fc.remaining_units,
        apply: true,
      })));
    }
  }, [availableFixedCosts, fixedCosts.length, isEditing]);

  // Fetch variants with stock
  const { data: variantsWithStock } = useQuery({
    queryKey: ['variants-with-stock', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          uniform,
          size,
          product:products(id, label)
        `)
        .eq('user_id', user.id);

      if (variantsError) throw variantsError;

      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select('variant_id, qty, type')
        .eq('user_id', user.id);

      if (movementsError) throw movementsError;

      const stockMap = new Map<string, number>();
      movements?.forEach((m) => {
        const current = stockMap.get(m.variant_id) || 0;
        const delta = m.type === 'in' ? m.qty : -m.qty;
        stockMap.set(m.variant_id, current + delta);
      });

      return variants?.map((v) => ({
        id: v.id,
        uniform: v.uniform,
        size: v.size,
        productLabel: v.product?.label || 'Produto',
        stock: stockMap.get(v.id) || 0,
      })) || [];
    },
    enabled: !!user?.id && open && saleType === 'stock',
  });

  // Fetch customers
  const { data: customers, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Fetch sales channels
  const { data: salesChannels = [] } = useQuery({
    queryKey: ['sales-channels-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sales_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Fetch payment fees
  const { data: paymentFees } = useQuery({
    queryKey: ['payment-fees', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let { data, error } = await supabase
        .from('payment_fees')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const { data: defaultFees, error: defaultError } = await supabase
          .from('payment_fees')
          .select('*')
          .eq('user_id', '00000000-0000-0000-0000-000000000000');
        
        if (defaultError) throw defaultError;
        data = defaultFees;
      }
      
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Find the selected payment method details
  const selectedMethod = paymentMethods.find(m => m.id === paymentMethodId);

  // Calculate totals with discount
  const grossTotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const discountValue = grossTotal * (discountPercent / 100);
  const grossAfterDiscount = grossTotal - discountValue;
  
  const matchingFee = paymentFees?.find(
    (f) => (f.payment_method_id === paymentMethodId || f.payment_method === paymentMethodType) && 
           f.installments === installments
  );
  const feePercent = matchingFee?.fee_percent || 0;
  const feeFixed = matchingFee?.fee_fixed_brl || 0;
  
  // Fees calculated on discounted value
  const feesTotal = (grossAfterDiscount * (feePercent / 100)) + feeFixed;
  const fixedCostsTotal = fixedCosts.filter(fc => fc.apply).reduce((sum, fc) => sum + fc.unitCost, 0);
  const netTotal = grossAfterDiscount - feesTotal - shippingBrl - fixedCostsTotal;

  // Check for stock warnings (considering original stock for edits)
  const hasStockWarning = saleType === 'stock' && items.some((item) => {
    if (item.availableStock === undefined) return false;
    // For edits, add back the original qty if same variant
    let effectiveStock = item.availableStock;
    if (isEditing && item.originalVariantId === item.variantId && item.originalQty) {
      effectiveStock += item.originalQty;
    }
    return item.qty > effectiveStock;
  });

  // Add item for stock sale
  const addStockItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      variantId: undefined,
      productLabel: '',
      uniform: '',
      size: '',
      qty: 1,
      unitPrice: 0,
      availableStock: 0,
    }]);
  };

  // Add item for preorder sale
  const addPreorderItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      productLabel: '',
      uniform: '',
      size: '',
      qty: 1,
      unitPrice: 0,
    }]);
  };

  // Update item
  const updateItem = (id: string, updates: Partial<SaleItem>) => {
    setItems(items.map((item) => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Select variant for stock item
  const selectVariant = (itemId: string, variantId: string) => {
    const variant = variantsWithStock?.find((v) => v.id === variantId);
    if (variant) {
      updateItem(itemId, {
        variantId,
        productLabel: variant.productLabel,
        uniform: variant.uniform || '',
        size: variant.size || '',
        availableStock: variant.stock,
      });
    }
  };

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newCustomerName.trim()) throw new Error("Nome do cliente é obrigatório");
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSelectedCustomerId(data.id);
      setIsCreatingCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      refetchCustomers();
      toast({ title: "Cliente adicionado" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao adicionar cliente", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Reverse stock movements for editing
  const reverseStockMovements = async (saleId: string) => {
    // Get existing sale_items for this sale to delete their lot records
    const { data: existingSaleItems } = await supabase
      .from('sale_items')
      .select('id')
      .eq('sale_id', saleId);

    // Delete sale_item_lots for these sale items
    if (existingSaleItems && existingSaleItems.length > 0) {
      const saleItemIds = existingSaleItems.map(si => si.id);
      await supabase
        .from('sale_item_lots')
        .delete()
        .in('sale_item_id', saleItemIds);
    }

    // Get existing stock movements for this sale
    const { data: existingMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('ref_type', 'sale')
      .eq('ref_id', saleId);

    if (movementsError) throw movementsError;

    // Delete existing movements (will be recreated)
    if (existingMovements && existingMovements.length > 0) {
      const { error: deleteError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('ref_type', 'sale')
        .eq('ref_id', saleId);

      if (deleteError) throw deleteError;

      // Restore lot quantities
      for (const movement of existingMovements) {
        // Get lots for this variant to restore (LIFO for reversal)
        const { data: lots } = await supabase
          .from('inventory_lots')
          .select('*')
          .eq('variant_id', movement.variant_id)
          .order('received_at', { ascending: false });

        if (lots && lots.length > 0) {
          let remainingToRestore = movement.qty;
          for (const lot of lots) {
            if (remainingToRestore <= 0) break;
            
            const restoreQty = Math.min(
              remainingToRestore, 
              lot.qty_received - lot.qty_remaining
            );
            
            if (restoreQty > 0) {
              await supabase
                .from('inventory_lots')
                .update({ qty_remaining: lot.qty_remaining + restoreQty })
                .eq('id', lot.id);
              
              remainingToRestore -= restoreQty;
            }
          }
        }
      }
    }
  };

  /**
   * Rollback inventory lot consumptions if sale creation fails.
   * CRITICAL: This ensures data consistency by restoring consumed lots.
   */
  const rollbackLotConsumptions = async (
    consumptions: Array<{ lotId: string; qty: number; unitCost: number }>
  ): Promise<void> => {
    if (consumptions.length === 0) return;
    
    console.warn('[SALE_ROLLBACK] Iniciando reversão automática de estoque:', {
      consumptionsCount: consumptions.length,
      timestamp: new Date().toISOString()
    });

    for (const consumption of consumptions) {
      try {
        // Get current lot state
        const { data: lot, error: fetchError } = await supabase
          .from('inventory_lots')
          .select('qty_remaining')
          .eq('id', consumption.lotId)
          .single();

        if (fetchError || !lot) {
          console.error('[SALE_ROLLBACK] Erro ao buscar lote para reversão:', consumption.lotId, fetchError);
          continue;
        }

        // Restore the consumed quantity
        const { error: updateError } = await supabase
          .from('inventory_lots')
          .update({ qty_remaining: lot.qty_remaining + consumption.qty })
          .eq('id', consumption.lotId);

        if (updateError) {
          console.error('[SALE_ROLLBACK] Erro ao restaurar lote:', consumption.lotId, updateError);
        } else {
          console.log('[SALE_ROLLBACK] Lote restaurado com sucesso:', {
            lotId: consumption.lotId,
            qtyRestored: consumption.qty
          });
        }
      } catch (err) {
        console.error('[SALE_ROLLBACK] Erro inesperado ao restaurar lote:', consumption.lotId, err);
      }
    }

    console.warn('[SALE_ROLLBACK] Reversão de estoque finalizada:', {
      timestamp: new Date().toISOString()
    });
  };

  // Save sale mutation (create or update)
  const saveSaleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (items.length === 0) throw new Error("Adicione pelo menos um item");
      if (!paymentMethodId && !paymentMethodType) throw new Error("Selecione o método de pagamento");

      console.log('[SALE_FLOW] Iniciando fluxo de venda:', {
        isEditing,
        saleType,
        itemsCount: items.length,
        timestamp: new Date().toISOString()
      });

      // If editing a stock sale, reverse existing movements first
      if (isEditing && editingSale && !editingSale.is_preorder) {
        console.log('[SALE_FLOW] Revertendo movimentações anteriores para edição');
        await reverseStockMovements(editingSale.id);
      }

      // Track all lot consumptions for potential rollback
      const allConsumptions: Array<{ lotId: string; qty: number; unitCost: number }> = [];
      // Store consumption info per item for later recording
      const itemConsumptions: Map<string, Array<{ lotId: string; qty: number; unitCost: number }>> = new Map();
      
      let totalCogs = 0;
      let cogsPending = false;
      let saleId: string | null = null;

      try {
        // ============================================================
        // PHASE 1: Consume inventory lots (FIFO) for stock sales
        // This happens first but can be rolled back if later steps fail
        // ============================================================
        if (saleType === "stock") {
          console.log('[SALE_FLOW] Fase 1: Consumindo lotes FIFO');
          
          for (const item of items) {
            if (!item.variantId) continue;
            
            const lotsResult = await consumeLotsForSale(user.id, "", [{ variantId: item.variantId, qty: item.qty }]);
            
            if (lotsResult.error) {
              console.error('[SALE_FLOW] Erro ao consumir lotes:', lotsResult.error);
              // Rollback any previous consumptions before throwing
              if (allConsumptions.length > 0) {
                console.warn('[SALE_FLOW] Fluxo abortado - executando rollback');
                await rollbackLotConsumptions(allConsumptions);
              }
              throw new Error(`Erro ao processar estoque: ${lotsResult.error}`);
            }
            
            // Track all consumptions for potential rollback
            allConsumptions.push(...lotsResult.consumptions);
            totalCogs += lotsResult.totalCogs;
            if (lotsResult.cogsPending) cogsPending = true;
            itemConsumptions.set(item.id, lotsResult.consumptions);
          }
          
          console.log('[SALE_FLOW] Fase 1 concluída:', {
            totalCogs,
            cogsPending,
            lotsConsumed: allConsumptions.length
          });
        }

        // ============================================================
        // PHASE 2: Create/Update the sale record
        // If this fails, we must rollback lot consumptions
        // ============================================================
        console.log('[SALE_FLOW] Fase 2: Criando registro de venda');

        // Calculate net profit with COGS (using discounted gross)
        const { netProfit, marginPercent } = calculateSaleProfit(
          grossAfterDiscount,
          feesTotal,
          shippingBrl,
          isEditing ? (editingSale?.fixed_costs_brl || 0) : fixedCostsTotal,
          totalCogs
        );

        const selectedChannel = salesChannels.find(c => c.id === channelId);
        const channelNameToStore = selectedChannel?.name || channelName || null;

        const saleData = {
          user_id: user.id,
          customer_id: selectedCustomerId || null,
          channel: channelNameToStore,
          sales_channel_id: channelId || null,
          payment_method: paymentMethodType || selectedMethod?.type || 'other',
          payment_method_id: paymentMethodId || null,
          installments: paymentMethodType === 'credit' || selectedMethod?.type === 'credit' ? installments : 1,
          gross_brl: grossTotal, // Original gross before discount
          discount_percent: discountPercent,
          discount_value_brl: discountValue,
          gross_after_discount_brl: grossAfterDiscount,
          fees_brl: feesTotal,
          shipping_brl: shippingBrl,
          fixed_costs_brl: isEditing ? (editingSale?.fixed_costs_brl || 0) : fixedCostsTotal,
          product_costs_brl: totalCogs,
          net_profit_brl: netProfit,
          margin_percent: marginPercent,
          is_preorder: saleType === 'preorder',
          cogs_pending: saleType === 'preorder' ? true : cogsPending,
          notes: notes || null,
        };

        if (isEditing && editingSale) {
          // Update existing sale
          const { error: updateError } = await supabase
            .from('sales')
            .update(saleData)
            .eq('id', editingSale.id);

          if (updateError) {
            console.error('[SALE_FLOW] Erro ao atualizar venda:', updateError);
            if (allConsumptions.length > 0) {
              console.warn('[SALE_FLOW] Fluxo abortado na Fase 2 - executando rollback');
              await rollbackLotConsumptions(allConsumptions);
            }
            throw updateError;
          }
          saleId = editingSale.id;

          // Delete existing sale items
          const { error: deleteItemsError } = await supabase
            .from('sale_items')
            .delete()
            .eq('sale_id', editingSale.id);

          if (deleteItemsError) {
            console.error('[SALE_FLOW] Erro ao deletar itens antigos:', deleteItemsError);
            // Note: Sale already updated, but items deletion failed
            // This is a partial failure state
          }
        } else {
          // Create new sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

          if (saleError) {
            console.error('[SALE_FLOW] Erro ao criar venda:', saleError);
            if (allConsumptions.length > 0) {
              console.warn('[SALE_FLOW] Fluxo abortado na Fase 2 - executando rollback');
              await rollbackLotConsumptions(allConsumptions);
            }
            throw saleError;
          }
          saleId = sale.id;
        }

        console.log('[SALE_FLOW] Fase 2 concluída - saleId:', saleId);

        // ============================================================
        // PHASE 3: Create sale items
        // If this fails, we have a partially saved sale - log for audit
        // ============================================================
        console.log('[SALE_FLOW] Fase 3: Criando itens da venda');

        const saleItems = items.map((item) => ({
          sale_id: saleId!,
          user_id: user.id,
          variant_id: item.variantId || null,
          product_label_snapshot: item.productLabel,
          uniform_snapshot: item.uniform || null,
          size_snapshot: item.size || null,
          qty: item.qty,
          unit_price_brl: item.unitPrice,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)
          .select();

        if (itemsError) {
          console.error('[SALE_FLOW] ERRO CRÍTICO: Venda criada mas itens falharam:', {
            saleId,
            error: itemsError
          });
          // At this point, sale record exists but items failed
          // We should NOT rollback lots because sale exists
          // Instead, throw to alert user but sale is partially saved
          throw new Error(`Venda registrada (ID: ${saleId}) mas erro ao salvar itens. Contate o suporte.`);
        }

        // ============================================================
        // PHASE 4: Record sale_item_lots for FIFO tracking
        // ============================================================
        if (saleType === 'stock' && insertedItems) {
          console.log('[SALE_FLOW] Fase 4: Registrando consumo de lotes');
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const insertedItem = insertedItems[i];
            const consumptions = itemConsumptions.get(item.id);
            
            if (insertedItem && consumptions && consumptions.length > 0) {
              const result = await recordSaleItemLots(user.id, insertedItem.id, consumptions);
              if (!result.success) {
                console.warn('[SALE_FLOW] Aviso: Falha ao registrar sale_item_lots:', {
                  saleItemId: insertedItem.id,
                  error: result.error
                });
                // Non-critical error - sale still valid
              }
            }
          }
        }

        // ============================================================
        // PHASE 5: Create stock movements
        // ============================================================
        if (saleType === 'stock') {
          console.log('[SALE_FLOW] Fase 5: Criando movimentações de estoque');

          const stockMovements = items
            .filter((item) => item.variantId)
            .map((item) => ({
              user_id: user.id,
              variant_id: item.variantId!,
              type: 'out',
              qty: item.qty,
              ref_type: 'sale',
              ref_id: saleId!,
            }));

          if (stockMovements.length > 0) {
            const { error: movementsError } = await supabase
              .from('stock_movements')
              .insert(stockMovements);

            if (movementsError) {
              console.warn('[SALE_FLOW] Aviso: Falha ao criar stock_movements:', {
                saleId,
                error: movementsError
              });
              // Non-critical: lots already consumed, this is just for reporting
            }
          }
        }

        // ============================================================
        // PHASE 6: Apply fixed costs (new sales only)
        // ============================================================
        if (!isEditing) {
          const appliedFixedCosts = fixedCosts.filter(fc => fc.apply);
          if (appliedFixedCosts.length > 0) {
            console.log('[SALE_FLOW] Fase 6: Aplicando custos fixos');

            const saleFixedCostsRecords = appliedFixedCosts.map((fc) => ({
              user_id: user.id,
              sale_id: saleId!,
              fixed_cost_id: fc.id,
              unit_cost_applied: fc.unitCost,
            }));

            const { error: fixedCostsError } = await supabase
              .from('sale_fixed_costs')
              .insert(saleFixedCostsRecords);

            if (fixedCostsError) {
              console.warn('[SALE_FLOW] Aviso: Falha ao aplicar custos fixos:', fixedCostsError);
            }

            for (const fc of appliedFixedCosts) {
              await supabase
                .from('fixed_costs')
                .update({ remaining_units: fc.remaining - 1 })
                .eq('id', fc.id);
            }
          }
        }

        console.log('[SALE_FLOW] Fluxo concluído com sucesso:', {
          saleId,
          timestamp: new Date().toISOString()
        });

        return { saleId: saleId!, cogsPending };

      } catch (error) {
        // This catch handles any unexpected errors not already caught
        console.error('[SALE_FLOW] Erro não tratado no fluxo:', error);
        
        // If we have consumptions and no saleId, we need to rollback
        if (allConsumptions.length > 0 && !saleId) {
          console.warn('[SALE_FLOW] Erro fatal antes da criação da venda - executando rollback');
          await rollbackLotConsumptions(allConsumptions);
        }
        
        throw error;
      }
    },
    onSuccess: ({ cogsPending }) => {
      const action = isEditing ? "atualizada" : "registrada";
      const message = saleType === 'preorder' 
        ? "Essa venda não movimentou estoque" 
        : cogsPending 
          ? `Venda ${action}. Margem ficará pendente até custo ser conhecido.`
          : `Estoque atualizado e margem calculada automaticamente`;
      
      toast({ 
        title: `Venda ${action} com sucesso`,
        description: message
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('[SALE_ERROR] Falha no fluxo de venda:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({ 
        title: `Erro ao ${isEditing ? 'atualizar' : 'registrar'} venda`, 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete sale mutation - with full stock restoration
  const deleteSaleMutation = useMutation({
    mutationFn: async () => {
      if (!editingSale || !user) throw new Error("Dados inválidos");

      const saleId = editingSale.id;
      console.log('[SALE_DELETE] Iniciando exclusão da venda:', { saleId, timestamp: new Date().toISOString() });

      // Step 1: Get existing sale_items
      const { data: existingSaleItems, error: itemsQueryError } = await supabase
        .from('sale_items')
        .select('id')
        .eq('sale_id', saleId);

      if (itemsQueryError) {
        console.error('[SALE_DELETE] Erro ao buscar itens:', itemsQueryError);
        throw itemsQueryError;
      }

      // Step 2: Get stock movements to restore
      const { data: stockMovements, error: movementsQueryError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('ref_type', 'sale')
        .eq('ref_id', saleId);

      if (movementsQueryError) {
        console.error('[SALE_DELETE] Erro ao buscar movimentos:', movementsQueryError);
        throw movementsQueryError;
      }

      console.log('[SALE_DELETE] Dados encontrados:', {
        saleItems: existingSaleItems?.length || 0,
        stockMovements: stockMovements?.length || 0
      });

      // Step 3: Restore inventory lots from sale_item_lots
      if (existingSaleItems && existingSaleItems.length > 0) {
        const saleItemIds = existingSaleItems.map(si => si.id);

        // Get sale_item_lots to know exactly which lots to restore
        const { data: saleItemLots } = await supabase
          .from('sale_item_lots')
          .select('inventory_lot_id, qty_consumed')
          .in('sale_item_id', saleItemIds);

        if (saleItemLots && saleItemLots.length > 0) {
          console.log('[SALE_DELETE] Restaurando lotes:', saleItemLots.length);
          
          for (const record of saleItemLots) {
            // Restore lot quantity manually
            const { data: lot } = await supabase
              .from('inventory_lots')
              .select('qty_remaining')
              .eq('id', record.inventory_lot_id)
              .single();

            if (lot) {
              await supabase
                .from('inventory_lots')
                .update({ qty_remaining: lot.qty_remaining + record.qty_consumed })
                .eq('id', record.inventory_lot_id);
            }
          }
        }

        // Delete sale_item_lots
        const { error: saleItemLotsError } = await supabase
          .from('sale_item_lots')
          .delete()
          .in('sale_item_id', saleItemIds);

        if (saleItemLotsError) {
          console.warn('[SALE_DELETE] Aviso ao deletar sale_item_lots:', saleItemLotsError);
        }
      }

      // Step 4: Delete stock movements
      if (stockMovements && stockMovements.length > 0) {
        const { error: deleteMovementsError } = await supabase
          .from('stock_movements')
          .delete()
          .eq('ref_type', 'sale')
          .eq('ref_id', saleId);

        if (deleteMovementsError) {
          console.error('[SALE_DELETE] Erro ao deletar movimentos:', deleteMovementsError);
          throw deleteMovementsError;
        }
        console.log('[SALE_DELETE] Movimentos deletados:', stockMovements.length);
      }

      // Step 5: Delete sale_fixed_costs
      const { error: fixedCostsError } = await supabase
        .from('sale_fixed_costs')
        .delete()
        .eq('sale_id', saleId);

      if (fixedCostsError) {
        console.warn('[SALE_DELETE] Aviso ao deletar custos fixos:', fixedCostsError);
      }

      // Step 6: Restore fixed cost units
      const { data: saleFixedCosts } = await supabase
        .from('sale_fixed_costs')
        .select('fixed_cost_id')
        .eq('sale_id', saleId);

      if (saleFixedCosts) {
        for (const sfc of saleFixedCosts) {
          const { data: fc } = await supabase
            .from('fixed_costs')
            .select('remaining_units')
            .eq('id', sfc.fixed_cost_id)
            .single();

          if (fc) {
            await supabase
              .from('fixed_costs')
              .update({ remaining_units: fc.remaining_units + 1 })
              .eq('id', sfc.fixed_cost_id);
          }
        }
      }

      // Step 7: Delete sale_items
      if (existingSaleItems && existingSaleItems.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', saleId);

        if (deleteItemsError) {
          console.error('[SALE_DELETE] Erro ao deletar itens:', deleteItemsError);
          throw deleteItemsError;
        }
        console.log('[SALE_DELETE] Itens deletados:', existingSaleItems.length);
      }

      // Step 8: Delete the sale itself
      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId)
        .eq('user_id', user.id);

      if (deleteSaleError) {
        console.error('[SALE_DELETE] Erro ao deletar venda:', deleteSaleError);
        throw deleteSaleError;
      }

      console.log('[SALE_DELETE] Venda excluída com sucesso:', { saleId, timestamp: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
      toast({ title: "Venda excluída com sucesso!" });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      console.error('[SALE_DELETE_ERROR] Falha na exclusão:', error);
      toast({ 
        title: "Erro ao excluir venda", 
        description: error.message,
        variant: "destructive" 
      });
      setShowDeleteConfirm(false);
    },
  });

  const canSubmit = 
    saleType && 
    items.length > 0 && 
    items.every((item) => item.productLabel && item.qty > 0 && item.unitPrice > 0) &&
    (paymentMethodId || paymentMethodType) &&
    (!hasStockWarning || stockWarningAcknowledged) &&
    (!isEditing || !saleType || saleType === 'preorder' || editWarningAcknowledged);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Editar Venda" : "Nova Venda"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Edit Warning */}
          {isEditing && saleType === 'stock' && !editWarningAcknowledged && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-200">
                <p className="font-medium mb-2">Editar esta venda pode alterar estoque e lucro.</p>
                <p className="text-sm text-muted-foreground mb-3">
                  As movimentações de estoque serão recalculadas e o custo será atualizado com base no FIFO atual.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditWarningAcknowledged(true)}
                  className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
                >
                  <Check size={14} className="mr-1" />
                  Entendi, continuar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Block A - Sale Type */}
          <div className="space-y-4">
            <Label className="text-label">Tipo de venda</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setSaleType('stock'); if (!isEditing) setItems([]); }}
                disabled={isEditing}
                className={cn(
                  "p-6 rounded-xl border-2 transition-all text-left",
                  saleType === 'stock' 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50",
                  isEditing && "opacity-70 cursor-not-allowed"
                )}
              >
                <Package className="w-8 h-8 mb-3 text-primary" />
                <h4 className="font-semibold text-foreground">Vender produto em estoque</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione produtos do seu estoque atual
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setSaleType('preorder'); if (!isEditing) setItems([]); }}
                disabled={isEditing}
                className={cn(
                  "p-6 rounded-xl border-2 transition-all text-left",
                  saleType === 'preorder' 
                    ? "border-accent bg-accent/10" 
                    : "border-border hover:border-accent/50",
                  isEditing && "opacity-70 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="w-8 h-8 mb-3 text-accent" />
                <h4 className="font-semibold text-foreground">Venda por encomenda</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Produto ainda não está em estoque
                </p>
              </button>
            </div>
          </div>

          {saleType && (
            <>
              {/* Block B - Products */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-label">Produtos</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={saleType === 'stock' ? addStockItem : addPreorderItem}
                    className="text-primary hover:text-primary/80"
                  >
                    <Plus size={16} className="mr-1" />
                    Adicionar item
                  </Button>
                </div>

                {items.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <p className="text-muted-foreground">
                      Clique em "Adicionar item" para incluir produtos
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-muted/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive/80 h-8 w-8 p-0"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      {saleType === 'stock' ? (
                        <Select
                          value={item.variantId || ''}
                          onValueChange={(value) => selectVariant(item.id, value)}
                        >
                          <SelectTrigger className="bg-card border-border rounded-xl">
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border rounded-xl max-h-[300px]">
                            {variantsWithStock?.filter(v => v.stock > 0 || v.id === item.variantId).map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                <div className="flex items-center gap-2">
                                  <span>{v.productLabel}</span>
                                  <span className="text-muted-foreground">
                                    {v.uniform && `— ${v.uniform}`}
                                    {v.size && ` — ${v.size}`}
                                  </span>
                                  <Badge variant="secondary" className="ml-2">
                                    {v.stock} disp.
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            placeholder="Produto (ex: Flamengo 25/26)"
                            value={item.productLabel}
                            onChange={(e) => updateItem(item.id, { productLabel: e.target.value })}
                            className="bg-card border-border rounded-xl"
                          />
                          <Input
                            placeholder="Uniforme"
                            value={item.uniform}
                            onChange={(e) => updateItem(item.id, { uniform: e.target.value })}
                            className="bg-card border-border rounded-xl"
                          />
                          <Input
                            placeholder="Tamanho"
                            value={item.size}
                            onChange={(e) => updateItem(item.id, { size: e.target.value })}
                            className="bg-card border-border rounded-xl"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                            className="bg-card border-border rounded-xl"
                          />
                          {saleType === 'stock' && item.availableStock !== undefined && (() => {
                            let effectiveStock = item.availableStock;
                            if (isEditing && item.originalVariantId === item.variantId && item.originalQty) {
                              effectiveStock += item.originalQty;
                            }
                            return item.qty > effectiveStock;
                          })() && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              Estoque insuficiente
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor unitário (R$)</Label>
                          <MoneyInput
                            value={item.unitPrice}
                            onChange={(value) => updateItem(item.id, { unitPrice: value })}
                            className="bg-card border-border rounded-xl"
                          />
                        </div>
                      </div>

                      {item.productLabel && (
                        <div className="text-sm text-muted-foreground">
                          Preview: <span className="font-medium text-foreground">{item.productLabel}</span>
                          {item.uniform && <span> — {item.uniform}</span>}
                          {item.size && <span> — {item.size}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {saleType === 'preorder' && items.length > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 bg-accent/10 p-3 rounded-xl">
                    <AlertTriangle size={16} className="text-accent" />
                    Essa venda não movimenta estoque
                  </p>
                )}

                {/* FIFO Cost Origin - Show consumed lots when editing */}
                {isEditing && saleType === 'stock' && saleItemLotsData && saleItemLotsData.length > 0 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-blue-400" />
                      <span className="font-medium text-blue-300">Origem do Custo (FIFO)</span>
                    </div>
                    <div className="space-y-2">
                      {/* Group by sale_item_id */}
                      {editingSale?.sale_items.map((saleItem) => {
                        const itemLots = saleItemLotsData.filter((lot: any) => lot.sale_item_id === saleItem.id);
                        if (itemLots.length === 0) return null;
                        
                        const itemTotalCogs = itemLots.reduce((sum: number, lot: any) => 
                          sum + (lot.qty_consumed * Number(lot.unit_cost_brl)), 0
                        );
                        
                        return (
                          <div key={saleItem.id} className="text-sm">
                            <div className="text-muted-foreground mb-1">
                              {saleItem.product_label_snapshot} 
                              {saleItem.uniform_snapshot && ` — ${saleItem.uniform_snapshot}`}
                              {saleItem.size_snapshot && ` — ${saleItem.size_snapshot}`}
                            </div>
                            {itemLots.map((lot: any) => (
                              <div key={lot.id} className="flex justify-between text-xs text-muted-foreground pl-3">
                                <span>
                                  Lote {lot.inventory_lots?.received_at 
                                    ? new Date(lot.inventory_lots.received_at).toLocaleDateString('pt-BR')
                                    : '?'
                                  }: {lot.qty_consumed}un × {formatCurrency(Number(lot.unit_cost_brl))}
                                </span>
                                <span className="font-medium text-foreground">
                                  {formatCurrency(lot.qty_consumed * Number(lot.unit_cost_brl))}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-medium pl-3 pt-1 border-t border-blue-500/20 mt-1">
                              <span>Custo total do item</span>
                              <span className="text-blue-300">{formatCurrency(itemTotalCogs)}</span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total COGS */}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-blue-500/30">
                        <span>COGS Total</span>
                        <span className="text-blue-300">
                          {formatCurrency(saleItemLotsData.reduce((sum: number, lot: any) => 
                            sum + (lot.qty_consumed * Number(lot.unit_cost_brl)), 0
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Block C - Customer */}
              <div className="space-y-4">
                <Label className="text-label">Cliente (opcional)</Label>
                
                {isCreatingCustomer ? (
                  <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                    <Input
                      placeholder="Nome do cliente"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="bg-card border-border rounded-xl"
                    />
                    <Input
                      placeholder="Telefone (opcional)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="bg-card border-border rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => createCustomerMutation.mutate()}
                        disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                        className="bg-primary hover:bg-primary/90 rounded-xl"
                      >
                        Salvar cliente
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingCustomer(false)}
                        className="rounded-xl"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="flex-1 bg-card border-border rounded-xl">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {customers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-muted-foreground" />
                              {c.name}
                              {c.phone && <span className="text-muted-foreground">({c.phone})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatingCustomer(true)}
                      className="rounded-xl border-border"
                    >
                      <Plus size={16} className="mr-1" />
                      Novo
                    </Button>
                  </div>
                )}
              </div>

              {/* Block D - Payment */}
              <div className="space-y-4">
                <Label className="text-label">Pagamento</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Canal de venda</Label>
                    {salesChannels.length > 0 ? (
                      <Select value={channelId} onValueChange={setChannelId}>
                        <SelectTrigger className="bg-card border-border rounded-xl">
                          <SelectValue placeholder="Selecione o canal" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border rounded-xl">
                          {salesChannels.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Ex: Instagram, WhatsApp..."
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        className="bg-card border-border rounded-xl"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Método de pagamento</Label>
                    {paymentMethods.length > 0 ? (
                      <Select 
                        value={paymentMethodId} 
                        onValueChange={(v) => { 
                          setPaymentMethodId(v); 
                          const method = paymentMethods.find(m => m.id === v);
                          setPaymentMethodType(method?.type || 'other');
                          setInstallments(1); 
                        }}
                      >
                        <SelectTrigger className="bg-card border-border rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border rounded-xl">
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select 
                        value={paymentMethodType} 
                        onValueChange={(v) => { setPaymentMethodType(v); setInstallments(1); }}
                      >
                        <SelectTrigger className="bg-card border-border rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border rounded-xl">
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {(paymentMethodType === 'credit' || selectedMethod?.type === 'credit') && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Parcelas</Label>
                    <Select value={String(installments)} onValueChange={(v) => setInstallments(parseInt(v))}>
                      <SelectTrigger className="bg-card border-border rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                          const fee = paymentFees?.find(
                            (f) => (f.payment_method_id === paymentMethodId || f.payment_method === 'credit') && f.installments === n
                          );
                          return (
                            <SelectItem key={n} value={String(n)}>
                              {n}x {fee && <span className="text-muted-foreground">({fee.fee_percent}% taxa)</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {feePercent > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Check size={12} className="text-primary" />
                        Taxa de {feePercent}% aplicada automaticamente
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Block E - Values */}
              <div className="space-y-4">
                <Label className="text-label">Valores</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Desconto (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={discountPercent || ''}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      placeholder="0"
                      className="bg-card border-border rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info size={12} />
                      O desconto afeta taxas e margem
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Frete de venda (R$)</Label>
                    <MoneyInput
                      value={shippingBrl}
                      onChange={setShippingBrl}
                      className="bg-card border-border rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor original</span>
                    <span className="font-medium">{formatCurrency(grossTotal)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto ({discountPercent}%)</span>
                        <span className="font-medium text-amber-500">-{formatCurrency(discountValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Valor final da venda</span>
                        <span>{formatCurrency(grossAfterDiscount)}</span>
                      </div>
                    </>
                  )}
                  {feesTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxas ({feePercent}%)</span>
                      <span className="font-medium text-destructive">-{formatCurrency(feesTotal)}</span>
                    </div>
                  )}
                  {shippingBrl > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete</span>
                      <span className="font-medium text-destructive">-{formatCurrency(shippingBrl)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                    <span>Valor líquido</span>
                    <span className="text-primary">{formatCurrency(netTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-label">Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações sobre a venda..."
                  className="bg-card border-border rounded-xl min-h-[80px]"
                />
              </div>

              {/* Stock Warning */}
              {hasStockWarning && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive">
                        Essa venda deixará o estoque negativo
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Deseja continuar mesmo assim?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-xl border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setStockWarningAcknowledged(true)}
                      >
                        {stockWarningAcknowledged ? (
                          <><Check size={14} className="mr-1" /> Confirmado</>
                        ) : (
                          "Sim, continuar"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Block F - Summary & Actions */}
              <div className={cn(
                "flex gap-3 pt-4 border-t border-border",
                isEditing && "flex-col sm:flex-row"
              )}>
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="sm:w-auto rounded-xl"
                    disabled={deleteSaleMutation.isPending || saveSaleMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir venda
                  </Button>
                )}
                <div className={cn("flex gap-3 flex-1", isEditing && "sm:justify-end")}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className={cn("rounded-xl border-border", !isEditing && "flex-1")}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveSaleMutation.mutate()}
                    disabled={!canSubmit || saveSaleMutation.isPending || deleteSaleMutation.isPending}
                    className={cn("bg-gradient-primary hover:opacity-90 text-white rounded-xl min-h-[48px]", !isEditing && "flex-1")}
                  >
                    {saveSaleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : isEditing ? (
                      "Salvar Alterações"
                    ) : (
                      "Registrar Venda"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Tem certeza que deseja excluir?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <p>Esta venda será excluída permanentemente e os impactos no estoque e margens serão aplicados.</p>
            <p className="font-semibold text-destructive">Esta ação não pode ser desfeita.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSaleMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteSaleMutation.mutate()}
            disabled={deleteSaleMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteSaleMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
