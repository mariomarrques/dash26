import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, Loader2, Trash2, Package, Truck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { recalculateLotsForTax, createInventoryLots } from "@/hooks/useInventoryLots";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  order_date: string;
  source: string;
  status: string;
  shipping_mode: string | null;
  freight_brl: number;
  extra_fees_brl: number;
  arrival_tax_brl: number | null;
  stock_posted?: boolean;
  suppliers: { name: string; type: string } | null;
  purchase_items: Array<{
    id: string;
    qty: number;
    unit_cost_value: number;
    unit_cost_currency: string;
    usd_to_brl_rate: number | null;
    product_variants?: { id: string };
  }>;
}

interface EditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseOrder | null;
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  comprado: "Comprado",
  enviado: "Enviado",
  chegou: "Chegou",
};

const statusOptions = [
  { value: "comprado", label: "Comprado", icon: Package },
  { value: "enviado", label: "Enviado", icon: Truck },
  { value: "chegou", label: "Chegou", icon: CheckCircle },
];

export function EditPurchaseModal({ open, onOpenChange, purchase }: EditPurchaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [arrivalTax, setArrivalTax] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open && purchase) {
      setArrivalTax(purchase.arrival_tax_brl || 0);
      setSelectedStatus(purchase.status);
      setShowDeleteConfirm(false);
      setShowStatusConfirm(false);
    }
  }, [open, purchase]);

  const isOfflinePending = 
    purchase?.source === "china" && 
    purchase?.shipping_mode === "offline" && 
    purchase?.arrival_tax_brl === null;

  const canEditTax = 
    purchase?.source === "china" && 
    purchase?.shipping_mode === "offline";

  const updateTaxMutation = useMutation({
    mutationFn: async () => {
      if (!purchase || !user) throw new Error("Dados inválidos");

      const { error } = await supabase
        .from("purchase_orders")
        .update({ arrival_tax_brl: arrivalTax })
        .eq("id", purchase.id);

      if (error) throw error;

      // Recalculate or create inventory lots with the new tax
      await recalculateLotsForTax(user.id, purchase.id, arrivalTax, {
        id: purchase.id,
        freight_brl: purchase.freight_brl,
        extra_fees_brl: purchase.extra_fees_brl,
        arrival_tax_brl: arrivalTax,
        source: purchase.source,
        shipping_mode: purchase.shipping_mode,
        purchase_items: purchase.purchase_items.map((item) => ({
          id: item.id,
          qty: item.qty,
          unit_cost_value: item.unit_cost_value,
          unit_cost_currency: item.unit_cost_currency,
          usd_to_brl_rate: item.usd_to_brl_rate,
          product_variants: item.product_variants,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_order", purchase?.id] });
      queryClient.invalidateQueries({ queryKey: ["inventory_lots"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Taxa Brasil atualizada!" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar taxa", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!purchase || !user) throw new Error("Dados inválidos");

      // Fetch fresh data to avoid stale state
      const { data: freshOrder, error: fetchError } = await supabase
        .from("purchase_orders")
        .select("stock_posted, status")
        .eq("id", purchase.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the status
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ status: newStatus })
        .eq("id", purchase.id);

      if (updateError) throw updateError;

      // If changing to "chegou" and stock not yet posted, create stock entries
      if (newStatus === "chegou" && !freshOrder.stock_posted) {
        // Create stock movements
        const stockMovements = purchase.purchase_items
          .filter((item) => item.product_variants?.id)
          .map((item) => ({
            user_id: user.id,
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

          if (stockError) throw stockError;
        }

        // Create inventory lots
        const lotsResult = await createInventoryLots(user.id, {
          id: purchase.id,
          freight_brl: purchase.freight_brl,
          extra_fees_brl: purchase.extra_fees_brl,
          arrival_tax_brl: purchase.arrival_tax_brl,
          source: purchase.source,
          shipping_mode: purchase.shipping_mode,
          purchase_items: purchase.purchase_items,
        });

        if (!lotsResult.success) {
          throw new Error(lotsResult.error);
        }

        // Mark as stock_posted
        const { error: postedError } = await supabase
          .from("purchase_orders")
          .update({ stock_posted: true })
          .eq("id", purchase.id);

        if (postedError) throw postedError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_lots"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: `Status alterado para "${statusLabels[selectedStatus]}"` });
      setShowStatusConfirm(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao alterar status", 
        description: error.message,
        variant: "destructive" 
      });
      setShowStatusConfirm(false);
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!purchase || !user) throw new Error("Dados inválidos");

      const purchaseId = purchase.id;
      const hasStock = purchase.status === "chegou";

      // If purchase has stock posted, check if any items were sold
      if (hasStock) {
        const { data: lots } = await supabase
          .from("inventory_lots")
          .select("id, qty_received, qty_remaining")
          .eq("purchase_order_id", purchaseId)
          .eq("user_id", user.id);

        if (lots && lots.length > 0) {
          // Check if any lot has been consumed
          const hasConsumedLots = lots.some(lot => lot.qty_remaining < lot.qty_received);
          
          if (hasConsumedLots) {
            throw new Error("ITEMS_SOLD");
          }

          // Remove stock_movements first
          const { error: movementsError } = await supabase
            .from("stock_movements")
            .delete()
            .eq("ref_id", purchaseId)
            .eq("ref_type", "purchase")
            .eq("type", "in")
            .eq("user_id", user.id);

          if (movementsError) throw movementsError;

          // Remove inventory_lots
          const { error: lotsError } = await supabase
            .from("inventory_lots")
            .delete()
            .eq("purchase_order_id", purchaseId)
            .eq("user_id", user.id);

          if (lotsError) throw lotsError;
        }
      }

      // Delete purchase_items
      const { error: itemsError } = await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_order_id", purchaseId)
        .eq("user_id", user.id);

      if (itemsError) throw itemsError;

      // Delete purchase_order
      const { error: orderError } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", purchaseId)
        .eq("user_id", user.id);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_lots"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Compra excluída com sucesso!" });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (error.message === "ITEMS_SOLD") {
        toast({ 
          title: "Não é possível excluir", 
          description: "Esta compra já teve itens vendidos e não pode ser excluída.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Erro ao excluir compra", variant: "destructive" });
      }
      setShowDeleteConfirm(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    // Only show confirmation if status actually changed
    if (newStatus !== purchase?.status) {
      setShowStatusConfirm(true);
    }
  };

  if (!purchase) return null;

  const totalPieces = purchase.purchase_items.reduce((sum, item) => sum + item.qty, 0);
  const extraCosts = purchase.freight_brl + purchase.extra_fees_brl + arrivalTax;
  const rateioPerPiece = totalPieces > 0 ? extraCosts / totalPieces : 0;

  let itemsTotal = 0;
  for (const item of purchase.purchase_items) {
    const unitCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
      ? item.unit_cost_value * item.usd_to_brl_rate
      : item.unit_cost_value;
    itemsTotal += unitCostBrl * item.qty;
  }
  const grandTotal = itemsTotal + extraCosts;

  const hasPostedStock = purchase.status === "chegou";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Compra</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">{format(new Date(purchase.order_date), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="font-medium">{purchase.suppliers?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origem</p>
                <Badge variant="outline" className="capitalize">
                  {purchase.source}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modo de Envio</p>
                <p className="font-medium capitalize">{purchase.shipping_mode || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peças</p>
                <p className="font-medium">{totalPieces}</p>
              </div>
            </div>

            {/* Editable Status Field */}
            <div className="space-y-2">
              <Label htmlFor="status-select">Status do pedido</Label>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger id="status-select" className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Costs */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produtos</span>
                <span className="font-medium">R$ {itemsTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-medium">R$ {purchase.freight_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxas Extra</span>
                <span className="font-medium">R$ {purchase.extra_fees_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Editable tax field */}
            {canEditTax && (
              <div className="space-y-2 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <Label htmlFor="arrival-tax" className="font-medium text-amber-800">
                    Taxa Brasil (R$)
                  </Label>
                </div>
                <p className="text-xs text-amber-600 mb-2">
                  {isOfflinePending 
                    ? "Esta taxa ainda não foi informada. Adicione quando o pacote chegar no Brasil."
                    : "Você pode editar a taxa se precisar corrigir o valor."}
                </p>
                <MoneyInput
                  id="arrival-tax"
                  value={arrivalTax}
                  onChange={setArrivalTax}
                  className="bg-background"
                />
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Custo adicional/peça</span>
                <span className="font-medium">R$ {rateioPerPiece.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Estimado</span>
                <span className="font-bold text-primary">R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!canEditTax && (
              <p className="text-sm text-muted-foreground text-center">
                Esta compra não é do tipo China Offline, portanto a taxa Brasil não é editável.
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir compra
            </Button>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {canEditTax && (
                <Button 
                  onClick={() => updateTaxMutation.mutate()}
                  disabled={updateTaxMutation.isPending || arrivalTax === (purchase.arrival_tax_brl || 0)}
                >
                  {updateTaxMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Excluir compra permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>Esta ação irá excluir permanentemente esta compra.</p>
              {hasPostedStock && (
                <p className="font-medium text-amber-600">
                  ⚠️ Como o pedido está marcado como "Chegou", as camisas desse pedido serão removidas do estoque.
                </p>
              )}
              <p className="font-semibold text-destructive">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePurchaseMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePurchaseMutation.mutate()}
              disabled={deletePurchaseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePurchaseMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir compra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showStatusConfirm} onOpenChange={(open) => {
        setShowStatusConfirm(open);
        if (!open) {
          setSelectedStatus(purchase.status);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirmar alteração de status
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>
                Você está prestes a alterar o status deste pedido para{" "}
                <strong>"{statusLabels[selectedStatus]}"</strong>.
              </p>
              {selectedStatus === "chegou" && (
                <p className="font-medium text-amber-600">
                  ⚠️ Isso irá adicionar as camisas deste pedido ao estoque.
                </p>
              )}
              <p>Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatusMutation.mutate(selectedStatus)}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
