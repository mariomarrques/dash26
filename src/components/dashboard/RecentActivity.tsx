import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Package, Truck, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RecentActivityItem } from "@/hooks/useDashboardData";
import { SaleDetailsModal } from "@/components/vendas/SaleDetailsModal";
import { EditPurchaseModal } from "@/components/compras/EditPurchaseModal";
import { StockEntryModal } from "@/components/estoque/StockEntryModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecentActivityProps {
  activities: RecentActivityItem[];
  isLoading: boolean;
}

const getActivityIcon = (type: RecentActivityItem["type"]) => {
  switch (type) {
    case "sale":
      return <TrendingUp size={16} className="text-white" />;
    case "purchase":
      return <Truck size={16} className="text-white" />;
    case "stock":
      return <Package size={16} className="text-white" />;
  }
};

const getActivityBg = (type: RecentActivityItem["type"]) => {
  switch (type) {
    case "sale":
      return "bg-gradient-success";
    case "purchase":
      return "bg-gradient-warm";
    case "stock":
      return "bg-gradient-primary";
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

export const RecentActivity = ({ activities, isLoading }: RecentActivityProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Modal states
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Fetch purchase data when needed
  const { data: selectedPurchase } = useQuery({
    queryKey: ['purchase-for-activity', selectedPurchaseId],
    queryFn: async () => {
      if (!selectedPurchaseId || !user?.id) return null;

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_date,
          source,
          status,
          shipping_mode,
          freight_brl,
          extra_fees_brl,
          arrival_tax_brl,
          stock_posted,
          suppliers(name, type),
          purchase_items(
            id,
            qty,
            unit_cost_value,
            unit_cost_currency,
            usd_to_brl_rate,
            product_variants(id)
          )
        `)
        .eq('id', selectedPurchaseId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPurchaseId && !!user?.id,
  });

  // Fetch stock item data for the modal
  const { data: selectedStockItem } = useQuery({
    queryKey: ['stock-item-for-activity', selectedVariantId],
    queryFn: async () => {
      if (!selectedVariantId || !user?.id) return null;

      // Get variant info
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          id,
          size,
          uniform,
          product:products(label)
        `)
        .eq('id', selectedVariantId)
        .single();

      if (variantError) throw variantError;

      // Get stock quantity
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('qty, type')
        .eq('variant_id', selectedVariantId)
        .eq('user_id', user.id);

      if (movError) throw movError;

      const quantity = movements?.reduce((sum, m) => {
        if (m.type === 'in') return sum + m.qty;
        if (m.type === 'out') return sum - m.qty;
        return sum + m.qty;
      }, 0) || 0;

      // Get average cost from inventory lots
      const { data: lots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('qty_remaining, unit_cost_brl')
        .eq('variant_id', selectedVariantId)
        .eq('user_id', user.id)
        .gt('qty_remaining', 0);

      if (lotsError) throw lotsError;

      let avgCost: number | null = null;
      if (lots && lots.length > 0) {
        const totalQty = lots.reduce((sum, l) => sum + l.qty_remaining, 0);
        const totalCost = lots.reduce((sum, l) => sum + (l.qty_remaining * Number(l.unit_cost_brl)), 0);
        avgCost = totalQty > 0 ? totalCost / totalQty : null;
      }

      return {
        variant_id: selectedVariantId,
        product_label: variant?.product?.label || 'Produto',
        size: variant?.size || null,
        uniform: variant?.uniform || null,
        quantity,
        avg_cost_brl: avgCost,
      };
    },
    enabled: !!selectedVariantId && !!user?.id,
  });

  const handleActivityClick = (activity: RecentActivityItem) => {
    if (!activity.refId) return;

    switch (activity.type) {
      case 'sale':
        setSelectedSaleId(activity.refId);
        break;
      case 'purchase':
        setSelectedPurchaseId(activity.refId);
        break;
      case 'stock':
        if (activity.variantId) {
          setSelectedVariantId(activity.variantId);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="card-metric animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground text-lg">Atividade Recente</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2 rounded-lg" />
                <Skeleton className="h-3 w-32 mb-1 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card-metric animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground text-lg">Atividade Recente</h3>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
            <Package size={28} className="text-white" />
          </div>
          <p className="text-muted-foreground">
            Nenhuma atividade ainda. Registre sua primeira venda ou compra!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-metric animate-fade-in">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="font-bold text-foreground text-base md:text-lg">Atividade Recente</h3>
        </div>

        <div className="space-y-1 md:space-y-2">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className={cn(
                "rounded-xl transition-all duration-200",
                "animate-fade-in group",
                activity.refId && "cursor-pointer hover:bg-muted/60 active:bg-muted/80",
                isMobile ? "p-3" : "flex items-start gap-4 p-3"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Mobile Layout: Stacked structure */}
              {isMobile ? (
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft",
                    getActivityBg(activity.type)
                  )}>
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Line 1: Type + quantity (strong) */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {activity.title}
                      </p>
                      {/* Value on right */}
                      {activity.value !== undefined && (
                        <span className={cn(
                          "text-sm font-bold tabular-nums flex-shrink-0",
                          activity.valueType === 'positive' && "text-metric-positive",
                          activity.valueType === 'negative' && "text-metric-negative",
                          activity.valueType === 'neutral' && "text-muted-foreground"
                        )}>
                          {activity.valueType === 'positive' ? '+' : ''}
                          {formatCurrency(activity.value)}
                        </span>
                      )}
                    </div>
                    
                    {/* Line 2: Details (light) */}
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {activity.subtitle}
                    </p>
                    
                    {/* Line 3: Time */}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(activity.date), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>

                  {/* Chevron */}
                  {activity.refId && (
                    <ChevronRight 
                      size={16} 
                      className="text-muted-foreground/40 flex-shrink-0 mt-0.5" 
                    />
                  )}
                </div>
              ) : (
                /* Desktop Layout: Original horizontal */
                <>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft mt-0.5",
                    getActivityBg(activity.type)
                  )}>
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {activity.title}
                      </p>
                      {activity.badge && (
                        <Badge 
                          variant={activity.badgeVariant || 'secondary'} 
                          className="text-xs"
                        >
                          {activity.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(activity.date), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {activity.value !== undefined && (
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        activity.valueType === 'positive' && "text-metric-positive",
                        activity.valueType === 'negative' && "text-metric-negative",
                        activity.valueType === 'neutral' && "text-muted-foreground"
                      )}>
                        {activity.valueType === 'positive' ? '+' : ''}
                        {formatCurrency(activity.value)}
                      </span>
                    )}
                    {activity.refId && (
                      <ChevronRight 
                        size={16} 
                        className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" 
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && setSelectedSaleId(null)}
        saleId={selectedSaleId}
      />

      {/* Edit Purchase Modal */}
      <EditPurchaseModal
        open={!!selectedPurchaseId && !!selectedPurchase}
        onOpenChange={(open) => !open && setSelectedPurchaseId(null)}
        purchase={selectedPurchase as any}
      />

      {/* Stock Entry Modal */}
      <StockEntryModal
        open={!!selectedVariantId && !!selectedStockItem}
        onOpenChange={(open) => !open && setSelectedVariantId(null)}
        stockItem={selectedStockItem as any}
      />
    </>
  );
};