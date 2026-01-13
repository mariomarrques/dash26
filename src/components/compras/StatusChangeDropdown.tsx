import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2, AlertCircle, Package, Truck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createInventoryLots } from "@/hooks/useInventoryLots";

interface PurchaseItem {
  id: string;
  qty: number;
  unit_cost_value: number;
  unit_cost_currency: string;
  usd_to_brl_rate: number | null;
  product_variants?: { id: string };
}

interface StatusChangeDropdownProps {
  purchaseId: string;
  currentStatus: string;
  source: string;
  shippingMode: string | null;
  freightBrl: number;
  extraFeesBrl: number;
  arrivalTaxBrl: number | null;
  purchaseItems: PurchaseItem[];
  onStatusChange?: () => void;
}

const statusLabels: Record<string, string> = {
  comprado: "Comprado",
  enviado: "Enviado",
  chegou: "Chegou",
};

const statusColors: Record<string, string> = {
  rascunho: "secondary",
  comprado: "default",
  enviado: "warning",
  chegou: "success",
};

const statusIcons: Record<string, React.ReactNode> = {
  comprado: <Package className="w-4 h-4" />,
  enviado: <Truck className="w-4 h-4" />,
  chegou: <CheckCircle className="w-4 h-4" />,
};

export function StatusChangeDropdown({
  purchaseId,
  currentStatus,
  source,
  shippingMode,
  freightBrl,
  extraFeesBrl,
  arrivalTaxBrl,
  purchaseItems,
  onStatusChange,
}: StatusChangeDropdownProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch fresh data to avoid stale state
      const { data: freshOrder, error: fetchError } = await supabase
        .from("purchase_orders")
        .select("stock_posted, status")
        .eq("id", purchaseId)
        .single();

      if (fetchError) throw fetchError;

      // Update the status
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ status: newStatus })
        .eq("id", purchaseId);

      if (updateError) throw updateError;

      // If changing to "chegou" and stock not yet posted, create stock entries
      if (newStatus === "chegou" && !freshOrder.stock_posted) {
        // Create stock movements
        const stockMovements = purchaseItems
          .filter((item) => item.product_variants?.id)
          .map((item) => ({
            user_id: user.id,
            variant_id: item.product_variants!.id,
            type: "in",
            qty: item.qty,
            ref_type: "purchase",
            ref_id: purchaseId,
          }));

        if (stockMovements.length > 0) {
          const { error: stockError } = await supabase
            .from("stock_movements")
            .insert(stockMovements);

          if (stockError) throw stockError;
        }

        // Create inventory lots
        const lotsResult = await createInventoryLots(user.id, {
          id: purchaseId,
          freight_brl: freightBrl,
          extra_fees_brl: extraFeesBrl,
          arrival_tax_brl: arrivalTaxBrl,
          source: source,
          shipping_mode: shippingMode,
          purchase_items: purchaseItems,
        });

        if (!lotsResult.success) {
          throw new Error(lotsResult.error);
        }

        // Mark as stock_posted
        const { error: postedError } = await supabase
          .from("purchase_orders")
          .update({ stock_posted: true })
          .eq("id", purchaseId);

        if (postedError) throw postedError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_lots"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: `Status alterado para "${statusLabels[pendingStatus!]}"` });
      setShowConfirmDialog(false);
      setPendingStatus(null);
      onStatusChange?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao alterar status", 
        description: error.message,
        variant: "destructive" 
      });
      setShowConfirmDialog(false);
      setPendingStatus(null);
    },
  });

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const availableStatuses = ["comprado", "enviado", "chegou"].filter(
    (s) => s !== currentStatus
  );

  const willAffectStock = pendingStatus === "chegou";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge 
              variant={statusColors[currentStatus] as any}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {statusLabels[currentStatus] || currentStatus}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {availableStatuses.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusSelect(status);
              }}
              className="gap-2 cursor-pointer"
            >
              {statusIcons[status]}
              {statusLabels[status]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirmar alteração de status
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>
                Você está prestes a alterar o status deste pedido para{" "}
                <strong>"{statusLabels[pendingStatus || ""]}"</strong>.
              </p>
              {willAffectStock && (
                <p className="font-medium text-amber-600">
                  ⚠️ Isso irá adicionar as camisas deste pedido ao estoque.
                </p>
              )}
              <p>Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={statusMutation.isPending}
              onClick={(e) => e.stopPropagation()}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                if (pendingStatus) {
                  statusMutation.mutate(pendingStatus);
                }
              }}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
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