import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MargensFiltersState } from "./MargensFilters";
import { useIsMobile } from "@/hooks/use-mobile";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

interface PurchaseOrderMargin {
  id: string;
  orderDate: string;
  source: string;
  status: string;
  supplierName?: string;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  margin: number;
  itemsInStock: number;
  itemsSold: number;
  isFullySold: boolean;
}

interface MargensPedidosProps {
  filters?: MargensFiltersState;
}

const defaultFilters: MargensFiltersState = {
  valorMin: null,
  valorMax: null,
  lucroMin: null,
  lucroMax: null,
  margemMin: null,
  margemMax: null,
};

export function MargensPedidos({ filters = defaultFilters }: MargensPedidosProps) {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate } = usePeriod();
  const isMobile = useIsMobile();

  const { data: orderMargins, isLoading } = useQuery({
    queryKey: ['purchase-order-margins', user?.id, primaryStartDate, primaryEndDate],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all purchase orders with their costs
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_date,
          source,
          status,
          freight_brl,
          extra_fees_brl,
          arrival_tax_brl,
          supplier:suppliers(name),
          purchase_items(
            id,
            variant_id,
            qty,
            unit_cost_value,
            unit_cost_currency,
            usd_to_brl_rate
          )
        `)
        .eq('user_id', user.id)
        .gte('order_date', primaryStartDate)
        .lte('order_date', primaryEndDate)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all inventory lots to know which order they belong to
      const { data: lots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('id, purchase_order_id, qty_received, qty_remaining, unit_cost_brl')
        .eq('user_id', user.id);

      if (lotsError) throw lotsError;

      // Get sale_item_lots to track actual consumption per lot
      const { data: saleItemLots, error: saleItemLotsError } = await supabase
        .from('sale_item_lots')
        .select(`
          id,
          inventory_lot_id,
          qty_consumed,
          unit_cost_brl,
          sale_item:sale_items(
            id,
            qty,
            unit_price_brl,
            sale:sales(
              id,
              gross_brl,
              gross_after_discount_brl,
              discount_percent,
              fees_brl,
              shipping_brl,
              fixed_costs_brl
            )
          )
        `)
        .eq('user_id', user.id);

      if (saleItemLotsError) throw saleItemLotsError;

      // Create a map of lot_id -> purchase_order_id
      const lotToPurchase = new Map<string, string>();
      const purchaseLots = new Map<string, { totalReceived: number; totalRemaining: number }>();
      
      lots?.forEach((lot) => {
        lotToPurchase.set(lot.id, lot.purchase_order_id);
        const existing = purchaseLots.get(lot.purchase_order_id) || { totalReceived: 0, totalRemaining: 0 };
        existing.totalReceived += lot.qty_received;
        existing.totalRemaining += lot.qty_remaining;
        purchaseLots.set(lot.purchase_order_id, existing);
      });

      // Calculate revenue and costs attributed to each purchase order
      const purchaseRevenue = new Map<string, number>();
      const purchaseCogs = new Map<string, number>();

      saleItemLots?.forEach((sil) => {
        const purchaseOrderId = lotToPurchase.get(sil.inventory_lot_id);
        if (!purchaseOrderId) return;

        const saleItem = sil.sale_item;
        if (!saleItem?.sale) return;

        const sale = saleItem.sale;
        const saleItemQty = saleItem.qty;
        const saleItemRevenue = saleItem.qty * saleItem.unit_price_brl;

        // Calculate the proportional revenue from this lot consumption
        // If sale has discount, apply proportionally
        const grossAfterDiscount = sale.gross_after_discount_brl || sale.gross_brl;
        const discountFactor = grossAfterDiscount / sale.gross_brl;
        
        // Proportion of the sale item that this lot consumption represents
        const proportion = sil.qty_consumed / saleItemQty;
        
        // Revenue attributed to this lot consumption (with discount applied)
        const attributedRevenue = saleItemRevenue * proportion * discountFactor;
        
        // Cost attributed to this consumption
        const attributedCost = sil.qty_consumed * Number(sil.unit_cost_brl);

        const currentRevenue = purchaseRevenue.get(purchaseOrderId) || 0;
        purchaseRevenue.set(purchaseOrderId, currentRevenue + attributedRevenue);

        const currentCogs = purchaseCogs.get(purchaseOrderId) || 0;
        purchaseCogs.set(purchaseOrderId, currentCogs + attributedCost);
      });

      // Process orders
      const result: PurchaseOrderMargin[] = [];

      orders?.forEach((order) => {
        // Calculate total cost of order (items + extras)
        let itemsCost = 0;
        let totalItemsQty = 0;

        order.purchase_items?.forEach((item) => {
          const costBrl = item.unit_cost_currency === 'USD' && item.usd_to_brl_rate
            ? item.unit_cost_value * item.usd_to_brl_rate
            : item.unit_cost_value;
          
          itemsCost += costBrl * item.qty;
          totalItemsQty += item.qty;
        });

        const totalCost = itemsCost + 
          (order.freight_brl || 0) + 
          (order.extra_fees_brl || 0) + 
          (order.arrival_tax_brl || 0);

        const lotInfo = purchaseLots.get(order.id) || { totalReceived: 0, totalRemaining: 0 };
        const soldQty = lotInfo.totalReceived - lotInfo.totalRemaining;
        const revenue = purchaseRevenue.get(order.id) || 0;
        
        // For profit calculation: revenue - proportional cost of items sold
        // We use the COGS tracked in sale_item_lots
        const cogs = purchaseCogs.get(order.id) || 0;
        
        const profit = revenue - cogs;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const isFullySold = soldQty >= totalItemsQty;

        result.push({
          id: order.id,
          orderDate: order.order_date,
          source: order.source,
          status: order.status,
          supplierName: order.supplier?.name,
          totalCost,
          totalRevenue: revenue,
          totalProfit: profit,
          margin,
          itemsInStock: totalItemsQty - soldQty,
          itemsSold: soldQty,
          isFullySold,
        });
      });

      return result;
    },
    enabled: !!user?.id,
  });

  // Apply filters
  const filteredOrders = useMemo(() => {
    if (!orderMargins) return [];

    return orderMargins.filter((order) => {
      // Value filter (totalRevenue)
      if (filters.valorMin !== null && order.totalRevenue < filters.valorMin) return false;
      if (filters.valorMax !== null && order.totalRevenue > filters.valorMax) return false;

      // Profit filter
      if (filters.lucroMin !== null && order.totalProfit < filters.lucroMin) return false;
      if (filters.lucroMax !== null && order.totalProfit > filters.lucroMax) return false;

      // Margin filter
      if (filters.margemMin !== null && order.margin < filters.margemMin) return false;
      if (filters.margemMax !== null && order.margin > filters.margemMax) return false;

      return true;
    });
  }, [orderMargins, filters]);

  const getSourceLabel = (source: string) => {
    return source === 'china' ? 'China' : 'Brasil';
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-2 text-sm">
        <Info size={16} className="text-muted-foreground flex-shrink-0" />
        <p className="text-muted-foreground">
          Receita atribuída por FIFO: cada venda é vinculada ao lote de origem. Pedidos com estoque restante mostram lucro parcial.
          {hasActiveFilters && (
            <span className="ml-2 font-medium text-foreground">
              Exibindo {filteredOrders.length} de {orderMargins?.length || 0} pedidos.
            </span>
          )}
        </p>
      </div>

      {/* Orders List - Filtered */}
      {filteredOrders.length > 0 ? (
        isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="card-metric p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Date, Supplier, Origin */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.orderDate), "dd MMM yy", { locale: ptBR })}
                      </span>
                      <Badge variant={order.source === 'china' ? 'accent' : 'secondary'} className="text-xs">
                        {getSourceLabel(order.source)}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground truncate">
                      {order.supplierName || "Fornecedor não informado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Custo: <span className="text-destructive">{formatCurrency(order.totalCost)}</span>
                    </p>
                  </div>

                  {/* Right: Revenue, Profit, Margin */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">
                      {order.totalRevenue > 0 ? formatCurrency(order.totalRevenue) : "—"}
                    </p>
                    <p className={`text-sm font-semibold ${order.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {order.totalRevenue > 0 ? formatCurrency(order.totalProfit) : "—"}
                    </p>
                    {order.totalRevenue > 0 && (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {order.margin > 20 && order.isFullySold && <TrendingUp size={12} className="text-primary" />}
                        <span className={`text-xs ${order.margin >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {formatPercent(order.margin)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Status */}
                <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
                  {!order.isFullySold ? (
                    <Badge variant="warning" className="gap-1 text-xs">
                      <Package size={12} />
                      {order.itemsInStock} em estoque
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-xs">Vendido</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: Table Layout */
          <div className="card-metric overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Fornecedor</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Origem</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Custo</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Receita</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Lucro</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Margem</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(order.orderDate), "dd MMM yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{order.supplierName || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={order.source === 'china' ? 'accent' : 'secondary'}>
                        {getSourceLabel(order.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(order.totalCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.totalRevenue > 0 ? formatCurrency(order.totalRevenue) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${order.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {order.totalRevenue > 0 ? formatCurrency(order.totalProfit) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.totalRevenue > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {order.margin > 20 && order.isFullySold && (
                            <TrendingUp size={14} className="text-primary" />
                          )}
                          <span className={order.margin >= 0 ? 'text-foreground' : 'text-destructive'}>
                            {formatPercent(order.margin)}
                          </span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {!order.isFullySold ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="warning" className="gap-1">
                              <Package size={12} />
                              {order.itemsInStock} em estoque
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Pedido ainda não totalmente vendido. 
                              {order.itemsSold} vendidos de {order.itemsSold + order.itemsInStock}.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="success">Vendido</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="card-metric text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? "Nenhum pedido corresponde aos filtros aplicados." 
              : "Nenhum pedido de compra registrado."}
          </p>
        </div>
      )}
    </div>
  );
}
