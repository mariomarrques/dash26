import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

interface SaleCardMobileProps {
  sale: {
    id: string;
    sale_date: string;
    gross_brl: number;
    gross_after_discount_brl: number | null;
    discount_percent: number;
    net_profit_brl: number | null;
    margin_percent: number | null;
    fees_brl: number;
    shipping_brl: number;
    fixed_costs_brl: number | null;
    product_costs_brl: number | null;
    is_preorder: boolean;
    customer?: { name: string } | null;
    sales_channel?: { name: string } | null;
    payment_method_rel?: { name: string } | null;
    payment_method?: string;
    sale_items: Array<{ qty: number }>;
  };
  onClick: () => void;
}

export function SaleCardMobile({ sale, onClick }: SaleCardMobileProps) {
  const saleValue = sale.gross_after_discount_brl ?? sale.gross_brl;
  const profit = sale.net_profit_brl ?? 0;
  const margin = sale.margin_percent ?? (saleValue > 0 ? (profit / saleValue) * 100 : 0);
  const totalItems = sale.sale_items.reduce((sum, item) => sum + item.qty, 0);
  const totalCost = (sale.product_costs_brl ?? 0) + (sale.fees_brl ?? 0) + (sale.shipping_brl ?? 0) + (sale.fixed_costs_brl ?? 0);

  const channelName = sale.sales_channel?.name;
  const paymentName = sale.payment_method_rel?.name || sale.payment_method;

  return (
    <div 
      className="card-metric p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      {/* Row 1: Date + Customer */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {format(new Date(sale.sale_date), "dd MMM", { locale: ptBR })}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {sale.customer?.name || "Cliente não informado"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {/* Row 2: Value + Profit + Margin (grouped) */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold text-foreground">{formatCurrency(saleValue)}</span>
          <span className={`text-sm font-semibold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${margin >= 15 ? 'bg-primary/10 text-primary' : margin >= 0 ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
            {margin.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Row 3: Chips (Channel, Payment, Type) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {channelName && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-normal">
            {channelName}
          </Badge>
        )}
        {paymentName && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-normal">
            {paymentName}
          </Badge>
        )}
        {sale.is_preorder ? (
          <Badge variant="warning" className="text-[10px] px-2 py-0.5">Encomenda</Badge>
        ) : (
          <Badge variant="success" className="text-[10px] px-2 py-0.5">Estoque</Badge>
        )}
        {sale.discount_percent > 0 && (
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">-{sale.discount_percent}%</Badge>
        )}
      </div>

      {/* Row 4: Cost (secondary/recessed) */}
      <div className="text-[11px] text-muted-foreground/70">
        Custo total: {formatCurrency(totalCost)}
      </div>
    </div>
  );
}
