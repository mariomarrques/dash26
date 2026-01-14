import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusChangeDropdown } from "./StatusChangeDropdown";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  comprado: "Comprado",
  enviado: "Enviado",
  chegou: "Chegou",
};

interface PurchaseCardMobileProps {
  purchase: {
    id: string;
    order_date: string;
    source: string;
    status: string;
    shipping_mode: string | null;
    freight_brl: number;
    extra_fees_brl: number;
    arrival_tax_brl: number | null;
    suppliers: { name: string } | null;
    purchase_items: Array<{
      id: string;
      qty: number;
      unit_cost_value: number;
      unit_cost_currency: string;
      usd_to_brl_rate: number | null;
      variant_id: string | null;
    }>;
  };
  onEdit: () => void;
  onClick: () => void;
}

export function PurchaseCardMobile({ purchase, onEdit, onClick }: PurchaseCardMobileProps) {
  const totalItems = purchase.purchase_items.reduce((sum, item) => sum + item.qty, 0);
  
  const calculateTotal = () => {
    let itemsTotal = 0;
    for (const item of purchase.purchase_items) {
      const unitCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
        ? item.unit_cost_value * item.usd_to_brl_rate
        : item.unit_cost_value;
      itemsTotal += unitCostBrl * item.qty;
    }
    const fees = purchase.freight_brl + purchase.extra_fees_brl + (purchase.arrival_tax_brl || 0);
    return itemsTotal + fees;
  };

  const hasPendingTax = purchase.source === "china" && 
    (purchase.shipping_mode === "offline" || purchase.shipping_mode === "cssbuy") && 
    purchase.arrival_tax_brl === null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('[data-status-dropdown]') || target.closest('button')) {
      return;
    }
    onClick();
  };

  return (
    <div 
      className="card-metric p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={handleCardClick}
    >
      {/* Row 1: Date + Origin + Total */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(new Date(purchase.order_date), "dd MMM", { locale: ptBR })}
          </span>
          <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 rounded-md">
            {purchase.source}
          </Badge>
        </div>
        <p className="font-bold text-foreground text-sm">
          R$ {calculateTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Row 2: Supplier + Items */}
      <div className="mb-3">
        <p className="font-medium text-foreground text-sm truncate">
          {purchase.suppliers?.name || "Fornecedor não informado"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalItems} {totalItems === 1 ? 'peça' : 'peças'}
        </p>
      </div>

      {/* Row 3: Status chip (clickable area) + Edit button */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div 
          className="flex items-center gap-2" 
          data-status-dropdown
          onClick={(e) => e.stopPropagation()}
        >
          <StatusChangeDropdown
            purchaseId={purchase.id}
            currentStatus={purchase.status}
            source={purchase.source}
            shippingMode={purchase.shipping_mode}
            freightBrl={purchase.freight_brl}
            extraFeesBrl={purchase.extra_fees_brl}
            arrivalTaxBrl={purchase.arrival_tax_brl}
            purchaseItems={purchase.purchase_items}
          />
          {hasPendingTax && (
            <Badge variant="warning" className="text-[10px] px-2 py-0.5">Taxa pendente</Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
