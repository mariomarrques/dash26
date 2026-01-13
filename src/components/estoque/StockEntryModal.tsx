import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  History, 
  Trash2, 
  AlertTriangle, 
  Package, 
  Loader2,
  ShieldAlert,
  Info,
  Edit2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StockItem {
  variant_id: string;
  product_label: string;
  size: string | null;
  uniform: string | null;
  quantity: number;
  avg_cost_brl: number | null;
}

interface StockEntry {
  id: string;
  movement_date: string;
  qty: number;
  ref_type: string | null;
  ref_id: string | null;
  purchase_order_id: string | null;
  inventory_lot_id: string | null;
  unit_cost_brl: number | null;
  qty_consumed: number;
  can_remove: boolean;
}

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItem: StockItem | null;
}

export function StockEntryModal({ open, onOpenChange, stockItem }: StockEntryModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [confirmEntry, setConfirmEntry] = useState<StockEntry | null>(null);

  // Fetch stock entries (movements + lots) for this variant
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['stock-entries', stockItem?.variant_id],
    queryFn: async () => {
      if (!stockItem?.variant_id || !user?.id) return [];

      // Get stock movements of type 'in' for this variant
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('id, movement_date, qty, ref_type, ref_id')
        .eq('variant_id', stockItem.variant_id)
        .eq('user_id', user.id)
        .eq('type', 'in')
        .order('movement_date', { ascending: false });

      if (movError) throw movError;

      // Get inventory lots for this variant
      const { data: lots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('id, purchase_order_id, purchase_item_id, qty_received, qty_remaining, unit_cost_brl, received_at')
        .eq('variant_id', stockItem.variant_id)
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      if (lotsError) throw lotsError;

      // Map movements to entries, enriching with lot data
      const entries: StockEntry[] = (movements || []).map(mov => {
        // Find corresponding lot (by purchase_order_id = ref_id)
        const lot = lots?.find(l => l.purchase_order_id === mov.ref_id);
        
        const qtyConsumed = lot ? lot.qty_received - lot.qty_remaining : 0;
        const canRemove = lot ? lot.qty_remaining === lot.qty_received : true;

        return {
          id: mov.id,
          movement_date: mov.movement_date,
          qty: mov.qty,
          ref_type: mov.ref_type,
          ref_id: mov.ref_id,
          purchase_order_id: lot?.purchase_order_id || mov.ref_id,
          inventory_lot_id: lot?.id || null,
          unit_cost_brl: lot?.unit_cost_brl ? Number(lot.unit_cost_brl) : null,
          qty_consumed: qtyConsumed,
          can_remove: canRemove,
        };
      });

      return entries;
    },
    enabled: open && !!stockItem?.variant_id && !!user?.id,
  });

  const removeEntryMutation = useMutation({
    mutationFn: async (entry: StockEntry) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!entry.purchase_order_id) throw new Error("Pedido de compra não identificado");

      const purchaseOrderId = entry.purchase_order_id;

      // First, check ALL lots for this purchase order to see if ANY have been consumed
      const { data: allLots, error: lotsCheckError } = await supabase
        .from('inventory_lots')
        .select('id, qty_received, qty_remaining, variant_id')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('user_id', user.id);

      if (lotsCheckError) throw lotsCheckError;

      // Check if any lot has been partially consumed
      const consumedLot = allLots?.find(lot => lot.qty_received !== lot.qty_remaining);
      if (consumedLot) {
        throw new Error("Este pedido já teve itens vendidos e não pode ter suas entradas removidas.");
      }

      // Remove ALL stock movements for this purchase order
      const { error: movError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('ref_id', purchaseOrderId)
        .eq('ref_type', 'purchase')
        .eq('type', 'in')
        .eq('user_id', user.id);

      if (movError) throw movError;

      // Remove ALL inventory lots for this purchase order
      const { error: lotError } = await supabase
        .from('inventory_lots')
        .delete()
        .eq('purchase_order_id', purchaseOrderId)
        .eq('user_id', user.id);

      if (lotError) throw lotError;

      // Reset the purchase order: stock_posted = false and status = 'enviado'
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({ 
          stock_posted: false,
          status: 'enviado'
        })
        .eq('id', purchaseOrderId)
        .eq('user_id', user.id);

      if (orderError) throw orderError;

      return { purchaseOrderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ 
        title: "Entradas removidas com sucesso",
        description: "O pedido voltou para o status 'Enviado' e poderá ser lançado novamente." 
      });
      setConfirmEntry(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao remover entradas", 
        description: error.message,
        variant: "destructive" 
      });
      setConfirmEntry(null);
    },
  });

  if (!stockItem) return null;

  const totalEntries = entries.reduce((sum, e) => sum + e.qty, 0);

  // Check if any entry for this order has been consumed
  const canRemoveOrder = (entry: StockEntry) => {
    if (!entry.purchase_order_id) return entry.can_remove;
    // All entries from the same order share removal eligibility
    const orderEntries = entries.filter(e => e.purchase_order_id === entry.purchase_order_id);
    return orderEntries.every(e => e.can_remove);
  };

  // Get total qty for the order
  const getOrderTotalQty = (entry: StockEntry) => {
    if (!entry.purchase_order_id) return entry.qty;
    const orderEntries = entries.filter(e => e.purchase_order_id === entry.purchase_order_id);
    return orderEntries.reduce((sum, e) => sum + e.qty, 0);
  };

  // Get total consumed for the order
  const getOrderTotalConsumed = (entry: StockEntry) => {
    if (!entry.purchase_order_id) return entry.qty_consumed;
    const orderEntries = entries.filter(e => e.purchase_order_id === entry.purchase_order_id);
    return orderEntries.reduce((sum, e) => sum + e.qty_consumed, 0);
  };

  // Group entries by purchase_order_id for display purposes
  const uniqueOrders = entries.reduce((acc, entry) => {
    const orderId = entry.purchase_order_id || entry.id;
    if (!acc.find(e => (e.purchase_order_id || e.id) === orderId)) {
      acc.push(entry);
    }
    return acc;
  }, [] as StockEntry[]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Detalhes do Estoque
            </DialogTitle>
          </DialogHeader>

          {/* Item info */}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="font-medium">{stockItem.product_label}</p>
            <div className="flex gap-2 mt-1">
              {stockItem.size && (
                <Badge variant="secondary" className="text-xs">Tam: {stockItem.size}</Badge>
              )}
              {stockItem.uniform && (
                <Badge variant="outline" className="text-xs">{stockItem.uniform}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Saldo atual: <span className="font-bold text-foreground">{stockItem.quantity} un</span>
            </p>
            {stockItem.avg_cost_brl !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Custo médio (ref.): R$ {stockItem.avg_cost_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un
              </p>
            )}
          </div>

          {/* Info: FIFO explanation */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-blue-700 text-xs">
              O custo médio é apenas uma referência visual. O lucro real das vendas é sempre calculado pelo <strong>custo FIFO</strong> das compras.
            </p>
          </div>

          {/* Quick action: Adjust stock - scrolls to entries section */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3">
            <Edit2 className="w-4 h-4" />
            <span>Para corrigir o saldo, utilize a lista de entradas abaixo para remover lançamentos incorretos.</span>
          </div>

          {/* Warning banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ação corretiva</p>
              <p className="text-amber-600">
                Ao remover, TODAS as entradas do pedido serão removidas e ele voltará para o status "Enviado".
              </p>
            </div>
          </div>

          {/* Entries list */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma entrada registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">+{entry.qty} un</span>
                        <Badge variant="outline" className="text-xs">
                          {entry.ref_type === 'purchase' ? 'Compra' : 'Manual'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.movement_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      {entry.unit_cost_brl !== null && (
                        <p className="text-xs text-muted-foreground">
                          Custo: R$ {entry.unit_cost_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /un
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!canRemoveOrder(entry) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Em uso</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              {getOrderTotalConsumed(entry)} un já foram vendidas deste pedido. Não é possível remover.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmEntry(entry)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            Total de entradas: {totalEntries} un
          </p>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmEntry} onOpenChange={(open) => !open && setConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Remover entradas do pedido
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta ação irá remover <strong>TODAS</strong> as entradas de estoque deste pedido
                  e o pedido voltará para o status <strong>"Enviado"</strong>.
                </p>
                <p>
                  Isso permitirá que o estoque seja lançado novamente quando o pedido for marcado como "Chegou".
                </p>
                {confirmEntry && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground">
                      {getOrderTotalQty(confirmEntry)} un de {stockItem.product_label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Entrada de {format(new Date(confirmEntry.movement_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                <p className="font-medium text-foreground">Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmEntry && removeEntryMutation.mutate(confirmEntry)}
              disabled={removeEntryMutation.isPending}
            >
              {removeEntryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Confirmar remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
