import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, TrendingDown, Minus, Eye, X } from "lucide-react";
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
import { SaleDetailsModal } from "@/components/vendas/SaleDetailsModal";
import { SaleCardMobile } from "@/components/vendas/SaleCardMobile";
import { useIsMobile } from "@/hooks/use-mobile";
import { MargensFiltersState } from "./MargensFilters";

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

interface MargensVendasProps {
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

export function MargensVendas({ filters = defaultFilters }: MargensVendasProps) {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate } = usePeriod();
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [showCostDetails, setShowCostDetails] = useState(false);
  const isMobile = useIsMobile();

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales-margins', user?.id, primaryStartDate, primaryEndDate],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sale_items(
            id,
            qty,
            unit_price_brl,
            product_label_snapshot,
            variant_id
          ),
          sale_fixed_costs(
            id,
            unit_cost_applied
          )
        `)
        .eq('user_id', user.id)
        .gte('sale_date', primaryStartDate)
        .lte('sale_date', primaryEndDate)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Apply filters to sales (only affects listing, not KPIs)
  const filteredSales = useMemo(() => {
    if (!sales) return [];

    return sales.filter((sale) => {
      const grossValue = sale.gross_after_discount_brl ?? sale.gross_brl ?? 0;
      const netProfit = sale.net_profit_brl ?? 0;
      const margin = sale.margin_percent ?? (grossValue > 0 ? (netProfit / grossValue) * 100 : 0);

      // Value filter
      if (filters.valorMin !== null && grossValue < filters.valorMin) return false;
      if (filters.valorMax !== null && grossValue > filters.valorMax) return false;

      // Profit filter
      if (filters.lucroMin !== null && netProfit < filters.lucroMin) return false;
      if (filters.lucroMax !== null && netProfit > filters.lucroMax) return false;

      // Margin filter
      if (filters.margemMin !== null && margin < filters.margemMin) return false;
      if (filters.margemMax !== null && margin > filters.margemMax) return false;

      return true;
    });
  }, [sales, filters]);

  // Calculate totals from ALL sales (unfiltered) for KPIs
  const totals = useMemo(() => {
    return sales?.reduce((acc, sale) => {
      const grossValue = sale.gross_after_discount_brl ?? sale.gross_brl ?? 0;
      const netProfit = sale.net_profit_brl ?? 0;

      return {
        gross: acc.gross + grossValue,
        profit: acc.profit + netProfit,
      };
    }, { gross: 0, profit: 0 }) || { gross: 0, profit: 0 };
  }, [sales]);

  const avgMargin = totals.gross > 0 ? (totals.profit / totals.gross) * 100 : 0;
  const totalCosts = totals.gross - totals.profit;

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
      {/* Summary Cards - Always show totals from ALL sales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-metric p-5">
          <p className="text-sm text-muted-foreground">Faturamento</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.gross)}</p>
        </div>
        
        {/* Clickable Costs Card */}
        <div 
          className={`card-metric p-5 cursor-pointer transition-all ${
            showCostDetails 
              ? 'ring-2 ring-destructive bg-destructive/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => setShowCostDetails(!showCostDetails)}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Custos Totais</p>
            {showCostDetails ? (
              <X size={14} className="text-destructive" />
            ) : (
              <Eye size={14} className="text-muted-foreground" />
            )}
          </div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalCosts)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {showCostDetails ? 'Clique para ocultar detalhes' : 'Clique para ver detalhes'}
          </p>
        </div>

        <div className="card-metric p-5 bg-gradient-to-br from-primary/10 to-accent/10">
          <p className="text-sm text-muted-foreground">Lucro Líquido</p>
          <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(totals.profit)}
          </p>
        </div>
        <div className="card-metric p-5">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Margem Média</p>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Este lucro considera todos os custos conhecidos até agora.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-2xl font-bold ${avgMargin >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatPercent(avgMargin)}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-2 text-sm">
        <Info size={16} className="text-accent flex-shrink-0" />
        <p className="text-muted-foreground">
          {showCostDetails ? (
            <span className="font-medium text-destructive">Modo detalhamento de custos ativo</span>
          ) : (
            'Margem estimada — pode mudar com novas compras ou vendas.'
          )}
          {hasActiveFilters && (
            <span className="ml-2 font-medium text-foreground">
              Exibindo {filteredSales.length} de {sales?.length || 0} vendas.
            </span>
          )}
        </p>
      </div>

      {/* Sales List - Filtered */}
      {filteredSales.length > 0 ? (
        isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <SaleCardMobile
                key={sale.id}
                sale={{
                  ...sale,
                  sale_items: sale.sale_items || [],
                }}
                onClick={() => setViewingSaleId(sale.id)}
              />
            ))}
          </div>
        ) : (
          /* Desktop: Table Layout */
          <div className="card-metric overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">
                    <span className="text-destructive">Custo Total</span>
                  </TableHead>
                  {showCostDetails && (
                    <>
                      <TableHead className="text-muted-foreground font-semibold text-right whitespace-nowrap">
                        <span className="text-destructive/70 text-xs">Produto</span>
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right whitespace-nowrap">
                        <span className="text-destructive/70 text-xs">Taxa</span>
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right whitespace-nowrap">
                        <span className="text-destructive/70 text-xs">Frete</span>
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right whitespace-nowrap">
                        <span className="text-destructive/70 text-xs">Fixos</span>
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-muted-foreground font-semibold text-right">Lucro</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Margem</TableHead>
                  {!showCostDetails && (
                    <TableHead className="text-muted-foreground font-semibold text-center">Tipo</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const grossValue = sale.gross_after_discount_brl ?? sale.gross_brl ?? 0;
                  const netProfit = sale.net_profit_brl ?? 0;
                  const margin = sale.margin_percent ?? (grossValue > 0 ? (netProfit / grossValue) * 100 : 0);
                  const hasDiscount = (sale.discount_percent ?? 0) > 0;

                  // Cost breakdown
                  const productCost = sale.product_costs_brl ?? 0;
                  const paymentFee = sale.fees_brl ?? 0;
                  const shippingCost = sale.shipping_brl ?? 0;
                  const fixedCosts = sale.fixed_costs_brl ?? 0;
                  const totalSaleCost = productCost + paymentFee + shippingCost + fixedCosts;

                  return (
                    <TableRow 
                      key={sale.id} 
                      className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setViewingSaleId(sale.id)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(sale.sale_date), "dd MMM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{sale.customer?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(grossValue)}</span>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground">
                              -{sale.discount_percent}% desc.
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(totalSaleCost)}
                      </TableCell>
                      {showCostDetails && (
                        <>
                          <TableCell className="text-right text-destructive/70 text-sm">
                            {productCost > 0 ? formatCurrency(productCost) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-destructive/70 text-sm">
                            {paymentFee > 0 ? formatCurrency(paymentFee) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-destructive/70 text-sm">
                            {shippingCost > 0 ? formatCurrency(shippingCost) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-destructive/70 text-sm">
                            {fixedCosts > 0 ? formatCurrency(fixedCosts) : '—'}
                          </TableCell>
                        </>
                      )}
                      <TableCell className={`text-right font-semibold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(netProfit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {margin > 20 ? (
                            <TrendingUp size={14} className="text-primary" />
                          ) : margin < 0 ? (
                            <TrendingDown size={14} className="text-destructive" />
                          ) : (
                            <Minus size={14} className="text-muted-foreground" />
                          )}
                          <span className={margin >= 0 ? 'text-foreground' : 'text-destructive'}>
                            {formatPercent(margin)}
                          </span>
                        </div>
                      </TableCell>
                      {!showCostDetails && (
                        <TableCell className="text-center">
                          {sale.is_preorder ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="warning">Aguardando custo</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">O lucro será calculado automaticamente quando o custo da compra for registrado.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="success">Estoque</Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="card-metric text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? "Nenhuma venda corresponde aos filtros aplicados." 
              : "Nenhuma venda neste período."}
          </p>
        </div>
      )}

      {/* Sale Details Modal */}
      <SaleDetailsModal
        open={!!viewingSaleId}
        onOpenChange={(open) => !open && setViewingSaleId(null)}
        saleId={viewingSaleId}
      />
    </div>
  );
}
