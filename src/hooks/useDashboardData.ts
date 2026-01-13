import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, startOfDay, endOfDay, eachDayOfInterval, subDays, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// Date range type for advanced filtering
export interface DateRange {
  from: Date;
  to: Date;
}

export interface PeriodFilter {
  primary: DateRange;
  comparison?: DateRange;
}

export interface DashboardMetrics {
  revenue: number;
  profit: number;
  stockItems: number;
  cashAvailable: number;
  revenueTrend: number;
  profitTrend: number;
  marginPercent: number;
  totalCosts: number;
  lowStockAlert: boolean;
  lowStockCount: number;
  hasPendingCogs: boolean;
}

export interface RecentActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'stock';
  title: string;
  subtitle: string;
  value?: number;
  valueType?: 'positive' | 'negative' | 'neutral';
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'accent' | 'secondary';
  date: string;
  refId?: string; // ID for opening modals (sale_id, purchase_order_id, or variant_id)
  variantId?: string; // For stock adjustments
}

export interface QuickStatsData {
  stockItems: number;
  salesToday: number;
  lowStockCount: number;
}

export interface SecondaryInsight {
  label: string;
  value: string;
  subtext?: string;
}

export interface SalesChartData {
  date: string;
  label: string;
  current: number;
  previous: number;
}

export interface PaymentDistribution {
  method: string;
  label: string;
  value: number;
  percent: number;
}

export interface TeamProfitability {
  team: string;
  season: string;
  displayName: string;
  profit: number;
  hasPending: boolean;
}

// Helper to get comparison period automatically if not provided
const getAutoComparisonPeriod = (primary: DateRange): DateRange => {
  const daysDiff = differenceInDays(primary.to, primary.from) + 1;
  return {
    from: startOfDay(subDays(primary.from, daysDiff)),
    to: endOfDay(subDays(primary.from, 1))
  };
};

export const useDashboardMetrics = (period: PeriodFilter) => {
  const { user } = useAuth();
  const primaryStart = format(period.primary.from, 'yyyy-MM-dd');
  const primaryEnd = format(period.primary.to, 'yyyy-MM-dd');
  
  // Use provided comparison or auto-generate
  const compPeriod = period.comparison || getAutoComparisonPeriod(period.primary);
  const compStart = format(compPeriod.from, 'yyyy-MM-dd');
  const compEnd = format(compPeriod.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-metrics', primaryStart, primaryEnd, compStart, compEnd, user?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Current period sales - using stored net_profit_brl as source of truth (same as /margens)
      const { data: currentSales, error: salesError } = await supabase
        .from('sales')
        .select('gross_brl, gross_after_discount_brl, net_profit_brl, cogs_pending')
        .eq('user_id', user.id)
        .gte('sale_date', primaryStart)
        .lte('sale_date', primaryEnd);

      if (salesError) throw salesError;

      // Check if any sale has pending COGS
      const hasPendingCogs = currentSales?.some(s => s.cogs_pending) || false;

      // Comparison period sales for trend - also using stored net_profit_brl
      const { data: prevSales, error: prevSalesError } = await supabase
        .from('sales')
        .select('gross_brl, gross_after_discount_brl, net_profit_brl')
        .eq('user_id', user.id)
        .gte('sale_date', compStart)
        .lte('sale_date', compEnd);

      if (prevSalesError) throw prevSalesError;

      // Stock movements
      const { data: stockMovements, error: stockError } = await supabase
        .from('stock_movements')
        .select('qty, type, variant_id')
        .eq('user_id', user.id);

      if (stockError) throw stockError;

      // Calculate current period metrics using the same logic as /margens
      // Revenue = gross_after_discount_brl (or fallback to gross_brl)
      // Profit = net_profit_brl (pre-calculated, includes ALL costs)
      const revenue = currentSales?.reduce((sum, s) => 
        sum + Number(s.gross_after_discount_brl ?? s.gross_brl ?? 0), 0) || 0;
      const profit = currentSales?.reduce((sum, s) => 
        sum + Number(s.net_profit_brl ?? 0), 0) || 0;
      const totalCosts = revenue - profit;
      const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Previous period calculations - same logic as current period
      const prevRevenue = prevSales?.reduce((sum, s) => 
        sum + Number(s.gross_after_discount_brl ?? s.gross_brl ?? 0), 0) || 0;
      const prevProfit = prevSales?.reduce((sum, s) => 
        sum + Number(s.net_profit_brl ?? 0), 0) || 0;

      // Calculate stock total
      const stockItems = stockMovements?.reduce((sum, m) => {
        if (m.type === 'in') return sum + m.qty;
        if (m.type === 'out') return sum - m.qty;
        return sum + m.qty;
      }, 0) || 0;

      // Check for low stock alerts
      const variantStockMap = new Map<string, number>();
      stockMovements?.forEach(m => {
        const current = variantStockMap.get(m.variant_id) || 0;
        if (m.type === 'in') variantStockMap.set(m.variant_id, current + m.qty);
        else if (m.type === 'out') variantStockMap.set(m.variant_id, current - m.qty);
      });
      
      let lowStockCount = 0;
      variantStockMap.forEach((qty) => {
        if (qty <= 2 && qty >= 0) lowStockCount++;
      });

      // Calculate trends
      const revenueTrend = prevRevenue > 0 
        ? Number(((revenue - prevRevenue) / prevRevenue * 100).toFixed(1))
        : revenue > 0 ? 100 : 0;
      const profitTrend = prevProfit > 0 
        ? Number(((profit - prevProfit) / prevProfit * 100).toFixed(1))
        : profit > 0 ? 100 : 0;

      return {
        revenue,
        profit,
        stockItems,
        cashAvailable: profit,
        revenueTrend,
        profitTrend,
        marginPercent,
        totalCosts,
        lowStockAlert: lowStockCount > 0,
        lowStockCount,
        hasPendingCogs
      };
    },
    enabled: !!user?.id
  });
};

export const useSecondaryInsights = (period: PeriodFilter) => {
  const { user } = useAuth();
  const primaryStart = format(period.primary.from, 'yyyy-MM-dd');
  const primaryEnd = format(period.primary.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['secondary-insights', primaryStart, primaryEnd, user?.id],
    queryFn: async (): Promise<{
      topProduct: SecondaryInsight | null;
      mostProfitable: SecondaryInsight | null;
      bestDay: SecondaryInsight | null;
      topPaymentMethod: SecondaryInsight | null;
    }> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get all sales with items for this period - include uniform_snapshot for proper grouping
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          sale_date,
          gross_brl,
          fees_brl,
          shipping_brl,
          product_costs_brl,
          fixed_costs_brl,
          net_profit_brl,
          cogs_pending,
          payment_method,
          sale_items(product_label_snapshot, uniform_snapshot, qty, unit_price_brl)
        `)
        .eq('user_id', user.id)
        .gte('sale_date', primaryStart)
        .lte('sale_date', primaryEnd);

      if (salesError) throw salesError;

      if (!sales || sales.length === 0) {
        return { topProduct: null, mostProfitable: null, bestDay: null, topPaymentMethod: null };
      }

      // Group by product + uniform (the real item sold)
      // Key format: "product_label|uniform"
      const itemQty = new Map<string, { qty: number; label: string; uniform: string }>();
      const itemProfit = new Map<string, { profit: number; hasPending: boolean; label: string; uniform: string }>();
      
      sales.forEach(sale => {
        const saleProfit = Number(sale.net_profit_brl || 0);
        const itemCount = sale.sale_items?.length || 1;
        const profitPerItem = saleProfit / itemCount;
        const hasPending = sale.cogs_pending;

        sale.sale_items?.forEach((item: { product_label_snapshot: string; uniform_snapshot: string | null; qty: number; unit_price_brl: number }) => {
          const productLabel = item.product_label_snapshot;
          const uniform = item.uniform_snapshot || '';
          const key = `${productLabel}|${uniform}`;
          
          // Update quantity
          const existingQty = itemQty.get(key);
          if (existingQty) {
            existingQty.qty += item.qty;
          } else {
            itemQty.set(key, { qty: item.qty, label: productLabel, uniform });
          }
          
          // Update profit
          const existingProfit = itemProfit.get(key);
          if (existingProfit) {
            existingProfit.profit += profitPerItem;
            existingProfit.hasPending = existingProfit.hasPending || hasPending;
          } else {
            itemProfit.set(key, { profit: profitPerItem, hasPending, label: productLabel, uniform });
          }
        });
      });

      // Format display name: "Product — Uniform"
      const formatItemName = (label: string, uniform: string): string => {
        if (uniform) {
          return `${label} — ${uniform}`;
        }
        return label;
      };

      // Find top product by quantity
      let topProduct: SecondaryInsight | null = null;
      let maxQty = 0;
      itemQty.forEach((data) => {
        if (data.qty > maxQty) {
          maxQty = data.qty;
          const fullName = formatItemName(data.label, data.uniform);
          topProduct = {
            label: 'Mais Vendido',
            value: fullName.length > 30 ? fullName.substring(0, 30) + '...' : fullName,
            subtext: `${data.qty} unidades vendidas`
          };
        }
      });

      // Most profitable item (by real profit)
      let mostProfitable: SecondaryInsight | null = null;
      let maxProfit = -Infinity;
      itemProfit.forEach((data) => {
        if (data.profit > maxProfit) {
          maxProfit = data.profit;
          const fullName = formatItemName(data.label, data.uniform);
          const formattedProfit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.profit);
          mostProfitable = {
            label: 'Mais Lucrativo',
            value: fullName.length > 30 ? fullName.substring(0, 30) + '...' : fullName,
            subtext: data.hasPending ? `${formattedProfit} de lucro (estimado)` : `${formattedProfit} de lucro`
          };
        }
      });

      // Best day by revenue
      const dayRevenue = new Map<string, number>();
      sales.forEach(sale => {
        const day = sale.sale_date;
        dayRevenue.set(day, (dayRevenue.get(day) || 0) + Number(sale.gross_brl));
      });

      let bestDay: SecondaryInsight | null = null;
      let maxDayRevenue = 0;
      dayRevenue.forEach((rev, day) => {
        if (rev > maxDayRevenue) {
          maxDayRevenue = rev;
          bestDay = {
            label: 'Melhor Dia',
            value: format(new Date(day), 'dd/MM'),
            subtext: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rev)
          };
        }
      });

      // Top payment method
      const paymentCount = new Map<string, number>();
      sales.forEach(sale => {
        paymentCount.set(sale.payment_method, (paymentCount.get(sale.payment_method) || 0) + 1);
      });

      const paymentLabels: Record<string, string> = {
        pix: 'Pix',
        debit: 'Débito',
        credit: 'Crédito'
      };

      let topPaymentMethod: SecondaryInsight | null = null;
      let maxPayment = 0;
      paymentCount.forEach((count, method) => {
        if (count > maxPayment) {
          maxPayment = count;
          const percent = Math.round((count / sales.length) * 100);
          topPaymentMethod = {
            label: 'Pagamento Preferido',
            value: paymentLabels[method] || method,
            subtext: `${percent}% das vendas`
          };
        }
      });

      return { topProduct, mostProfitable, bestDay, topPaymentMethod };
    },
    enabled: !!user?.id
  });
};

export const useSalesChart = (period: PeriodFilter) => {
  const { user } = useAuth();
  const primaryStart = format(period.primary.from, 'yyyy-MM-dd');
  const primaryEnd = format(period.primary.to, 'yyyy-MM-dd');
  
  // Use provided comparison or auto-generate
  const compPeriod = period.comparison || getAutoComparisonPeriod(period.primary);
  const compStart = format(compPeriod.from, 'yyyy-MM-dd');
  const compEnd = format(compPeriod.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['sales-chart', primaryStart, primaryEnd, compStart, compEnd, user?.id],
    queryFn: async (): Promise<SalesChartData[]> => {
      if (!user?.id) return [];

      // Current period sales
      const { data: currentSales, error: currentError } = await supabase
        .from('sales')
        .select('sale_date, gross_brl')
        .eq('user_id', user.id)
        .gte('sale_date', primaryStart)
        .lte('sale_date', primaryEnd);

      if (currentError) throw currentError;

      // Comparison period sales
      const { data: prevSales, error: prevError } = await supabase
        .from('sales')
        .select('sale_date, gross_brl')
        .eq('user_id', user.id)
        .gte('sale_date', compStart)
        .lte('sale_date', compEnd);

      if (prevError) throw prevError;

      // Create daily aggregates
      const days = eachDayOfInterval({ start: period.primary.from, end: period.primary.to });
      
      const currentByDay = new Map<number, number>();
      currentSales?.forEach(s => {
        const day = new Date(s.sale_date).getDate();
        currentByDay.set(day, (currentByDay.get(day) || 0) + Number(s.gross_brl));
      });

      const prevByDay = new Map<number, number>();
      prevSales?.forEach(s => {
        const day = new Date(s.sale_date).getDate();
        prevByDay.set(day, (prevByDay.get(day) || 0) + Number(s.gross_brl));
      });

      return days.map(d => {
        const day = d.getDate();
        return {
          date: format(d, 'dd'),
          label: format(d, 'dd'),
          current: currentByDay.get(day) || 0,
          previous: prevByDay.get(day) || 0
        };
      });
    },
    enabled: !!user?.id
  });
};

export const usePaymentDistribution = (period: PeriodFilter) => {
  const { user } = useAuth();
  const primaryStart = format(period.primary.from, 'yyyy-MM-dd');
  const primaryEnd = format(period.primary.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['payment-distribution', primaryStart, primaryEnd, user?.id],
    queryFn: async (): Promise<PaymentDistribution[]> => {
      if (!user?.id) return [];

      const { data: sales, error } = await supabase
        .from('sales')
        .select('payment_method, gross_brl')
        .eq('user_id', user.id)
        .gte('sale_date', primaryStart)
        .lte('sale_date', primaryEnd);

      if (error) throw error;

      const paymentLabels: Record<string, string> = {
        pix: 'Pix',
        debit: 'Débito',
        credit: 'Crédito'
      };

      const distribution = new Map<string, number>();
      let total = 0;

      sales?.forEach(s => {
        const value = Number(s.gross_brl);
        distribution.set(s.payment_method, (distribution.get(s.payment_method) || 0) + value);
        total += value;
      });

      const result: PaymentDistribution[] = [];
      distribution.forEach((value, method) => {
        result.push({
          method,
          label: paymentLabels[method] || method,
          value,
          percent: total > 0 ? Math.round((value / total) * 100) : 0
        });
      });

      return result.sort((a, b) => b.value - a.value);
    },
    enabled: !!user?.id
  });
};

export const useRecentActivity = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async (): Promise<RecentActivityItem[]> => {
      if (!user?.id) return [];

      const activities: RecentActivityItem[] = [];

      // Get sales with more context
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, 
          sale_date, 
          gross_brl, 
          gross_after_discount_brl,
          net_profit_brl,
          payment_method,
          customer:customers(name),
          sales_channel:sales_channels(name),
          payment_method_rel:payment_methods(name),
          sale_items(qty)
        `)
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })
        .limit(5);

      if (salesError) throw salesError;

      sales?.forEach(sale => {
        const totalQty = sale.sale_items?.reduce((sum, item) => sum + item.qty, 0) || 0;
        const customerName = sale.customer?.name || 'cliente anônimo';
        const channelName = sale.sales_channel?.name || '';
        const paymentName = sale.payment_method_rel?.name || sale.payment_method || '';
        const netValue = Number(sale.net_profit_brl ?? sale.gross_after_discount_brl ?? sale.gross_brl ?? 0);

        // Build contextual title: VERBO + QUANTIDADE
        const itemWord = totalQty === 1 ? 'camisa' : 'camisas';
        const title = `Venda · ${totalQty} ${itemWord}`;
        
        // Build contextual subtitle
        let subtitle = `para ${customerName}`;
        if (channelName) {
          subtitle += ` via ${channelName}`;
        }
        if (paymentName) {
          subtitle += ` (${paymentName})`;
        }

        activities.push({
          id: sale.id,
          type: 'sale',
          title,
          subtitle,
          value: netValue,
          valueType: 'positive',
          date: sale.sale_date,
          refId: sale.id
        });
      });

      // Get purchases with more context
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchase_orders')
        .select(`
          id, 
          order_date, 
          source, 
          status,
          supplier:suppliers(name),
          purchase_items(qty)
        `)
        .eq('user_id', user.id)
        .order('order_date', { ascending: false })
        .limit(5);

      if (purchasesError) throw purchasesError;

      purchases?.forEach(purchase => {
        const totalQty = purchase.purchase_items?.reduce((sum, item) => sum + item.qty, 0) || 0;
        const sourceLabel = purchase.source === 'china' ? 'China' : 'Brasil';
        const supplierName = purchase.supplier?.name || '';
        
        // Status labels
        const statusLabels: Record<string, string> = {
          'rascunho': 'rascunho',
          'enviado': 'enviado',
          'chegou': 'chegou'
        };
        const statusLabel = statusLabels[purchase.status] || purchase.status;
        
        // Build contextual title: VERBO + QUANTIDADE
        const purchaseItemWord = totalQty === 1 ? 'peça' : 'peças';
        const title = `Compra ${sourceLabel} · ${totalQty} ${purchaseItemWord}`;
        
        // Build contextual subtitle
        let subtitle = statusLabel;
        if (supplierName) {
          subtitle += ` · ${supplierName}`;
        }

        // Badge based on status
        let badge: string | undefined;
        let badgeVariant: 'success' | 'warning' | 'accent' | 'secondary' | undefined;
        if (purchase.status === 'chegou') {
          badge = 'Chegou';
          badgeVariant = 'success';
        } else if (purchase.status === 'enviado') {
          badge = 'Em trânsito';
          badgeVariant = 'warning';
        }

        activities.push({
          id: purchase.id,
          type: 'purchase',
          title,
          subtitle,
          badge,
          badgeVariant,
          date: purchase.order_date,
          refId: purchase.id
        });
      });

      // Get stock adjustments
      const { data: stockMovements, error: stockError } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_date,
          qty,
          type,
          ref_type,
          variant_id,
          variant:product_variants(
            id,
            size,
            uniform,
            product:products(label)
          )
        `)
        .eq('user_id', user.id)
        .in('type', ['adjustment', 'out'])
        .is('ref_type', null)
        .order('movement_date', { ascending: false })
        .limit(3);

      if (!stockError && stockMovements) {
        stockMovements.forEach(movement => {
          const variant = movement.variant;
          const productLabel = variant?.product?.label || 'Produto';
          const uniform = variant?.uniform || '';
          const size = variant?.size || '';
          
          let productName = productLabel;
          if (uniform) productName += ` — ${uniform}`;
          if (size) productName += ` (${size})`;

          const isNegative = movement.qty < 0 || movement.type === 'out';
          const qty = Math.abs(movement.qty);
          
          activities.push({
            id: movement.id,
            type: 'stock',
            title: 'Ajuste de estoque',
            subtitle: `${isNegative ? '−' : '+'}${qty} unidades de ${productName}`,
            valueType: isNegative ? 'negative' : 'neutral',
            date: movement.movement_date,
            refId: movement.variant_id,
            variantId: movement.variant_id
          });
        });
      }

      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);
    },
    enabled: !!user?.id
  });
};

export const useQuickStats = () => {
  const { user } = useAuth();
  const today = new Date();
  const todayStart = format(startOfDay(today), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['quick-stats', todayStart, user?.id],
    queryFn: async (): Promise<QuickStatsData> => {
      if (!user?.id) return { stockItems: 0, salesToday: 0, lowStockCount: 0 };

      const { data: stockMovements, error: stockError } = await supabase
        .from('stock_movements')
        .select('qty, type, variant_id')
        .eq('user_id', user.id);

      if (stockError) throw stockError;

      const stockItems = stockMovements?.reduce((sum, m) => {
        if (m.type === 'in') return sum + m.qty;
        if (m.type === 'out') return sum - m.qty;
        return sum + m.qty;
      }, 0) || 0;

      const { data: salesToday, error: salesTodayError } = await supabase
        .from('sales')
        .select('id')
        .eq('user_id', user.id)
        .eq('sale_date', todayStart);

      if (salesTodayError) throw salesTodayError;

      const variantStockMap = new Map<string, number>();
      stockMovements?.forEach(m => {
        const current = variantStockMap.get(m.variant_id) || 0;
        if (m.type === 'in') variantStockMap.set(m.variant_id, current + m.qty);
        else if (m.type === 'out') variantStockMap.set(m.variant_id, current - m.qty);
      });

      let lowStockCount = 0;
      variantStockMap.forEach((qty) => {
        if (qty <= 2 && qty >= 0) lowStockCount++;
      });

      return {
        stockItems,
        salesToday: salesToday?.length || 0,
        lowStockCount
      };
    },
    enabled: !!user?.id
  });
};

export const useTeamProfitability = (period: PeriodFilter) => {
  const { user } = useAuth();
  const primaryStart = format(period.primary.from, 'yyyy-MM-dd');
  const primaryEnd = format(period.primary.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['team-profitability', primaryStart, primaryEnd, user?.id],
    queryFn: async (): Promise<TeamProfitability[]> => {
      if (!user?.id) return [];

      // Get sales with items joined to variants and products
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          net_profit_brl,
          cogs_pending,
          sale_items(
            qty,
            variant_id,
            product_label_snapshot
          )
        `)
        .eq('user_id', user.id)
        .gte('sale_date', primaryStart)
        .lte('sale_date', primaryEnd);

      if (salesError) throw salesError;

      if (!sales || sales.length === 0) return [];

      // Get all variant IDs from sales
      const variantIds = new Set<string>();
      sales.forEach(sale => {
        sale.sale_items?.forEach((item: { variant_id: string | null }) => {
          if (item.variant_id) variantIds.add(item.variant_id);
        });
      });

      // Fetch products through variants
      let productMap = new Map<string, { team: string; season: string }>();
      
      if (variantIds.size > 0) {
        const { data: variants, error: variantsError } = await supabase
          .from('product_variants')
          .select('id, product_id')
          .in('id', Array.from(variantIds));

        if (variantsError) throw variantsError;

        const productIds = [...new Set(variants?.map(v => v.product_id) || [])];
        
        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, team, season, label')
            .in('id', productIds);

          if (productsError) throw productsError;

          // Map variant_id -> product info
          const productById = new Map(products?.map(p => [p.id, p]) || []);
          variants?.forEach(v => {
            const product = productById.get(v.product_id);
            if (product) {
              productMap.set(v.id, { 
                team: product.team || product.label, 
                season: product.season || '' 
              });
            }
          });
        }
      }

      // Aggregate profit by team + season
      const teamProfit = new Map<string, { team: string; season: string; profit: number; hasPending: boolean }>();

      sales.forEach(sale => {
        const saleProfit = Number(sale.net_profit_brl || 0);
        const itemCount = sale.sale_items?.length || 1;
        const profitPerItem = saleProfit / itemCount;
        const hasPending = sale.cogs_pending;

        sale.sale_items?.forEach((item: { variant_id: string | null; product_label_snapshot: string }) => {
          let team: string;
          let season: string;

          if (item.variant_id && productMap.has(item.variant_id)) {
            const productInfo = productMap.get(item.variant_id)!;
            team = productInfo.team;
            season = productInfo.season;
          } else {
            // Fallback: parse from product_label_snapshot (format: "Team Season")
            const parts = item.product_label_snapshot.split(' ');
            season = parts.pop() || '';
            team = parts.join(' ') || item.product_label_snapshot;
          }

          const key = `${team}|${season}`;
          const existing = teamProfit.get(key);
          
          if (existing) {
            existing.profit += profitPerItem;
            existing.hasPending = existing.hasPending || hasPending;
          } else {
            teamProfit.set(key, { team, season, profit: profitPerItem, hasPending });
          }
        });
      });

      // Convert to array and sort by profit descending
      const result: TeamProfitability[] = [];
      teamProfit.forEach((data) => {
        result.push({
          team: data.team,
          season: data.season,
          displayName: data.season ? `${data.team} ${data.season}` : data.team,
          profit: data.profit,
          hasPending: data.hasPending
        });
      });

      return result.sort((a, b) => b.profit - a.profit);
    },
    enabled: !!user?.id
  });
};
