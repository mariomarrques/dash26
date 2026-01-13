import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Award, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ProductMargin {
  productKey: string;
  productLabel: string;
  uniform: string;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgMargin: number;
  unitsSold: number;
}

interface MargensProdutosProps {
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

export function MargensProdutos({ filters = defaultFilters }: MargensProdutosProps) {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate } = usePeriod();
  const isMobile = useIsMobile();

  const { data: productMargins, isLoading } = useQuery({
    queryKey: ['product-margins', user?.id, primaryStartDate, primaryEndDate],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get sales in the period to filter sale_items
      const { data: salesInPeriod, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .eq('user_id', user.id)
        .gte('sale_date', primaryStartDate)
        .lte('sale_date', primaryEndDate);

      if (salesError) throw salesError;
      
      const saleIds = salesInPeriod?.map(s => s.id) || [];
      if (saleIds.length === 0) return [];

      // Get sale items only from sales in the period
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          id,
          qty,
          unit_price_brl,
          product_label_snapshot,
          uniform_snapshot,
          variant_id,
          sale:sales(
            id,
            gross_brl,
            gross_after_discount_brl,
            discount_percent,
            fees_brl,
            shipping_brl,
            product_costs_brl,
            fixed_costs_brl,
            net_profit_brl,
            margin_percent
          )
        `)
        .eq('user_id', user.id)
        .in('sale_id', saleIds);

      if (saleItemsError) throw saleItemsError;

      // Get sale_item_lots for accurate COGS per item (only for items in period)
      const saleItemIds = saleItems?.map(si => si.id) || [];
      const { data: saleItemLots, error: lotsError } = await supabase
        .from('sale_item_lots')
        .select('sale_item_id, qty_consumed, unit_cost_brl')
        .in('sale_item_id', saleItemIds.length > 0 ? saleItemIds : ['__no_match__']);

      if (lotsError) throw lotsError;

      // Map sale_item_id to total COGS
      const itemCogs = new Map<string, number>();
      saleItemLots?.forEach((sil) => {
        const current = itemCogs.get(sil.sale_item_id) || 0;
        itemCogs.set(sil.sale_item_id, current + (sil.qty_consumed * Number(sil.unit_cost_brl)));
      });

      // Aggregate by product + uniform (item real vendido)
      const productMap = new Map<string, ProductMargin>();

      saleItems?.forEach((item) => {
        const uniform = item.uniform_snapshot || "—";
        const productKey = `${item.product_label_snapshot}|||${uniform}`;
        
        const sale = item.sale;
        if (!sale) return;

        // Calculate item revenue (with discount applied proportionally)
        const itemGrossRevenue = item.qty * item.unit_price_brl;
        const saleGross = sale.gross_brl || 0;
        const saleAfterDiscount = sale.gross_after_discount_brl || saleGross;
        const discountFactor = saleGross > 0 ? saleAfterDiscount / saleGross : 1;
        const itemRevenue = itemGrossRevenue * discountFactor;

        // Get COGS for this specific item
        const itemCost = itemCogs.get(item.id) || 0;

        // Calculate proportional fees/shipping
        // Proportion of this item in the total sale
        const saleTotalGross = saleGross || 1;
        const itemProportion = itemGrossRevenue / saleTotalGross;
        const proportionalFees = (sale.fees_brl || 0) * itemProportion;
        const proportionalShipping = (sale.shipping_brl || 0) * itemProportion;
        const proportionalFixedCosts = (sale.fixed_costs_brl || 0) * itemProportion;

        const totalItemCosts = itemCost + proportionalFees + proportionalShipping + proportionalFixedCosts;
        const itemProfit = itemRevenue - totalItemCosts;

        const existing = productMap.get(productKey);
        if (existing) {
          existing.totalRevenue += itemRevenue;
          existing.totalCosts += totalItemCosts;
          existing.totalProfit += itemProfit;
          existing.unitsSold += item.qty;
        } else {
          productMap.set(productKey, {
            productKey,
            productLabel: item.product_label_snapshot,
            uniform,
            totalRevenue: itemRevenue,
            totalCosts: totalItemCosts,
            totalProfit: itemProfit,
            avgMargin: 0,
            unitsSold: item.qty,
          });
        }
      });

      // Calculate margins and sort by profit
      const products = Array.from(productMap.values());
      products.forEach((p) => {
        p.avgMargin = p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0;
      });
      
      return products.sort((a, b) => b.totalProfit - a.totalProfit);
    },
    enabled: !!user?.id,
  });

  // Apply filters
  const filteredProducts = useMemo(() => {
    if (!productMargins) return [];

    return productMargins.filter((product) => {
      // Value filter (totalRevenue)
      if (filters.valorMin !== null && product.totalRevenue < filters.valorMin) return false;
      if (filters.valorMax !== null && product.totalRevenue > filters.valorMax) return false;

      // Profit filter
      if (filters.lucroMin !== null && product.totalProfit < filters.lucroMin) return false;
      if (filters.lucroMax !== null && product.totalProfit > filters.lucroMax) return false;

      // Margin filter
      if (filters.margemMin !== null && product.avgMargin < filters.margemMin) return false;
      if (filters.margemMax !== null && product.avgMargin > filters.margemMax) return false;

      return true;
    });
  }, [productMargins, filters]);

  // Find best performers (from ALL products, not filtered)
  const bestMargin = productMargins?.reduce((best, p) => 
    p.avgMargin > (best?.avgMargin || 0) ? p : best, 
    null as ProductMargin | null
  );
  
  const bestRevenue = productMargins?.reduce((best, p) => 
    p.totalRevenue > (best?.totalRevenue || 0) ? p : best, 
    null as ProductMargin | null
  );

  const formatProductDisplay = (product: ProductMargin) => {
    if (product.uniform && product.uniform !== "—") {
      return `${product.productLabel} — ${product.uniform}`;
    }
    return product.productLabel;
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
      {/* Highlights - Always from ALL products */}
      {productMargins && productMargins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestMargin && (
            <div className="card-metric p-5 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-primary" />
                <p className="text-sm text-muted-foreground">Maior Margem</p>
              </div>
              <p className="text-lg font-bold text-foreground truncate">{formatProductDisplay(bestMargin)}</p>
              <p className="text-2xl font-bold text-primary">{formatPercent(bestMargin.avgMargin)}</p>
            </div>
          )}
          {bestRevenue && (
            <div className="card-metric p-5 bg-gradient-to-br from-accent/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-accent" />
                <p className="text-sm text-muted-foreground">Maior Faturamento</p>
              </div>
              <p className="text-lg font-bold text-foreground truncate">{formatProductDisplay(bestRevenue)}</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(bestRevenue.totalRevenue)}</p>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-2 text-sm">
        <Info size={16} className="text-muted-foreground flex-shrink-0" />
        <p className="text-muted-foreground">
          Ranking por item vendido (Produto + Uniforme). Custos proporcionais incluem COGS (FIFO), taxas e frete.
          {hasActiveFilters && (
            <span className="ml-2 font-medium text-foreground">
              Exibindo {filteredProducts.length} de {productMargins?.length || 0} produtos.
            </span>
          )}
        </p>
      </div>

      {/* Products List - Filtered */}
      {filteredProducts.length > 0 ? (
        isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-3">
            {filteredProducts.map((product, index) => (
              <div key={product.productKey} className="card-metric p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Rank, Product */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                      {index === 0 && !hasActiveFilters && (
                        <Badge variant="accent" className="text-xs">Top</Badge>
                      )}
                    </div>
                    <p className="font-medium text-foreground truncate">{product.productLabel}</p>
                    {product.uniform && product.uniform !== "—" && (
                      <p className="text-xs text-muted-foreground">{product.uniform}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.unitsSold} {product.unitsSold === 1 ? 'unidade' : 'unidades'}
                    </p>
                  </div>

                  {/* Right: Revenue, Profit, Margin */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{formatCurrency(product.totalRevenue)}</p>
                    <p className={`text-sm font-semibold ${product.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(product.totalProfit)}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {product.avgMargin > 20 && <TrendingUp size={12} className="text-primary" />}
                      <span className={`text-xs ${product.avgMargin >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatPercent(product.avgMargin)}
                      </span>
                    </div>
                  </div>
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
                  <TableHead className="text-muted-foreground font-semibold">#</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Produto</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Unidades</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Faturamento</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Lucro</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => (
                  <TableRow 
                    key={product.productKey} 
                    className="border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span>{product.productLabel}</span>
                          {product.uniform && product.uniform !== "—" && (
                            <span className="text-xs text-muted-foreground">{product.uniform}</span>
                          )}
                        </div>
                        {index === 0 && !hasActiveFilters && (
                          <Badge variant="accent" className="text-xs">Top</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{product.unitsSold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${product.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(product.totalProfit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {product.avgMargin > 20 && <TrendingUp size={14} className="text-primary" />}
                        <span className={product.avgMargin >= 0 ? 'text-foreground' : 'text-destructive'}>
                          {formatPercent(product.avgMargin)}
                        </span>
                      </div>
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
              ? "Nenhum produto corresponde aos filtros aplicados." 
              : "Nenhum produto vendido ainda."}
          </p>
        </div>
      )}
    </div>
  );
}
