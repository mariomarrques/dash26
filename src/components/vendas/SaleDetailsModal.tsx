import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Pencil, 
  Package, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  User,
  CreditCard,
  Store,
  Calendar,
  FileText,
  Truck,
  Tag,
  Layers,
  Info,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  onEditClick?: () => void;
}

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

export function SaleDetailsModal({ 
  open, 
  onOpenChange, 
  saleId,
  onEditClick 
}: SaleDetailsModalProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Fetch complete sale data with defensive error handling
  const { data: sale, isLoading: saleLoading, isError: saleError } = useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: async () => {
      if (!saleId || !user?.id) return null;

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, phone),
          sales_channel:sales_channels(id, name),
          payment_method_rel:payment_methods(id, name, type),
          sale_items(
            id,
            variant_id,
            qty,
            unit_price_brl,
            product_label_snapshot,
            uniform_snapshot,
            size_snapshot
          ),
          sale_fixed_costs(
            id,
            unit_cost_applied,
            fixed_cost:fixed_costs(id, name)
          )
        `)
        .eq('id', saleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sale details:', error);
        throw error;
      }
      return data;
    },
    enabled: !!saleId && !!user?.id && open,
    retry: 1,
  });

  // Fetch FIFO lot consumption details
  const { data: lotConsumption } = useQuery({
    queryKey: ['sale-lot-consumption', saleId],
    queryFn: async () => {
      if (!saleId || !user?.id) return [];

      try {
        const { data: saleItems, error: itemsError } = await supabase
          .from('sale_items')
          .select('id')
          .eq('sale_id', saleId);

        if (itemsError || !saleItems || saleItems.length === 0) return [];

        const saleItemIds = saleItems.map(si => si.id);

        const { data, error } = await supabase
          .from('sale_item_lots')
          .select(`
            id,
            sale_item_id,
            inventory_lot_id,
            qty_consumed,
            unit_cost_brl,
            inventory_lots (
              id,
              received_at,
              purchase_order_id,
              purchase_orders:purchase_order_id (
                id,
                order_date,
                source,
                suppliers:supplier_id (
                  name
                )
              )
            )
          `)
          .in('sale_item_id', saleItemIds);

        if (error) {
          console.warn('Could not fetch lot consumption (legacy sale):', error);
          return [];
        }
        return data || [];
      } catch (e) {
        console.warn('Error fetching lot consumption:', e);
        return [];
      }
    },
    enabled: !!saleId && !!user?.id && open && !!sale,
    retry: false,
  });

  const isLoading = saleLoading;
  
  const isLegacySale = sale && (!lotConsumption || lotConsumption.length === 0) && !sale.is_preorder && (sale.sale_items?.length || 0) > 0;
  const hasDetailedCosts = sale && (lotConsumption && lotConsumption.length > 0);

  // Calculate derived values
  const grossValue = sale?.gross_brl || 0;
  const discountPercent = sale?.discount_percent || 0;
  const discountValue = sale?.discount_value_brl || 0;
  const grossAfterDiscount = sale?.gross_after_discount_brl ?? grossValue;
  const fees = sale?.fees_brl || 0;
  const shipping = sale?.shipping_brl || 0;
  const productCosts = sale?.product_costs_brl || 0;
  const fixedCosts = sale?.fixed_costs_brl || 0;
  const netProfit = sale?.net_profit_brl || 0;
  const margin = sale?.margin_percent ?? (grossAfterDiscount > 0 ? (netProfit / grossAfterDiscount) * 100 : 0);
  const totalCosts = fees + shipping + productCosts + fixedCosts;
  const hasPendingCogs = sale?.cogs_pending;

  // Group lot consumption by sale_item_id
  const lotsByItem = sale?.sale_items?.reduce((acc, item) => {
    const itemLots = lotConsumption?.filter((lot: any) => lot.sale_item_id === item.id) || [];
    acc[item.id] = itemLots;
    return acc;
  }, {} as Record<string, any[]>) || {};

  const handleEditClick = () => {
    onOpenChange(false);
    onEditClick?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-card",
        isMobile && "max-w-full h-[95vh] rounded-t-2xl rounded-b-none"
      )}>
        {/* Compact Header - Mobile optimized */}
        <DialogHeader className={cn(
          "px-4 py-3 border-b border-border bg-muted/30",
          !isMobile && "px-6 py-4"
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn(
                "font-bold text-foreground",
                isMobile ? "text-lg" : "text-xl"
              )}>
                Detalhes da Venda
              </DialogTitle>
              {sale && (
                <div className={cn(
                  "flex items-center gap-2 mt-1.5",
                  isMobile && "flex-wrap"
                )}>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={12} />
                    {format(new Date(sale.sale_date), isMobile ? "dd/MM/yy" : "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Badge 
                    variant={sale.is_preorder ? "warning" : "success"} 
                    className="text-xs px-1.5 py-0"
                  >
                    {sale.is_preorder ? "Encomenda" : "Estoque"}
                  </Badge>
                  {hasPendingCogs && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="warning" className="gap-0.5 text-xs px-1.5 py-0">
                          <AlertTriangle size={10} />
                          Pendente
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          Algum lote consumido ainda não tem a Taxa Brasil registrada.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
            {onEditClick && !isMobile && (
              <Button 
                onClick={handleEditClick}
                className="gap-2"
                variant="outline"
                size="sm"
              >
                <Pencil size={14} />
                Editar Venda
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className={cn(
          "max-h-[calc(90vh-80px)]",
          isMobile && "max-h-[calc(95vh-60px)]"
        )}>
          <div className={cn(
            "p-4 space-y-4",
            !isMobile && "p-6 space-y-6"
          )}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : saleError ? (
              <div className="text-center py-8 space-y-3">
                <AlertTriangle size={40} className="mx-auto text-destructive/60" />
                <p className="text-sm text-muted-foreground">Erro ao carregar venda.</p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            ) : sale ? (
              <>
                {/* Legacy Sale Warning - Compact on mobile */}
                {isLegacySale && (
                  <div className={cn(
                    "flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg",
                    isMobile ? "p-2.5 text-xs" : "p-4"
                  )}>
                    <Info size={isMobile ? 14 : 18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={cn("font-medium text-foreground", isMobile && "text-xs")}>
                        Venda anterior à atualização
                      </p>
                      {!isMobile && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Algumas informações avançadas podem não estar disponíveis.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* MOBILE: Quick Summary Block - Key metrics at a glance */}
                {isMobile && (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-xl">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Recebido</p>
                      <p className="font-bold text-sm text-foreground">{formatCurrency(grossAfterDiscount)}</p>
                    </div>
                    <div className="text-center border-x border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Lucro</p>
                      <p className={cn(
                        "font-bold text-sm",
                        netProfit >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {formatCurrency(netProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Margem</p>
                      <p className={cn(
                        "font-bold text-sm",
                        margin >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {formatPercent(margin)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sale Summary - Compact on mobile */}
                <section className="space-y-3">
                  <h3 className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5",
                    !isMobile && "gap-2"
                  )}>
                    <FileText size={isMobile ? 12 : 16} />
                    Resumo da Venda
                  </h3>
                  
                  {isMobile ? (
                    /* Mobile: Compact vertical list */
                    <div className="bg-muted/30 rounded-lg divide-y divide-border">
                      <div className="flex justify-between items-center p-2.5">
                        <span className="text-xs text-muted-foreground">Valor bruto</span>
                        <span className="text-sm font-medium">{formatCurrency(grossValue)}</span>
                      </div>
                      {discountPercent > 0 && (
                        <div className="flex justify-between items-center p-2.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Tag size={10} />
                            Desconto ({discountPercent}%)
                          </span>
                          <span className="text-sm text-destructive">-{formatCurrency(discountValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-2.5 bg-primary/5">
                        <span className="text-xs font-medium">Valor recebido</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(grossAfterDiscount)}</span>
                      </div>
                      {sale.customer && (
                        <div className="flex justify-between items-center p-2.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User size={10} />
                            Cliente
                          </span>
                          <span className="text-sm">{sale.customer.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-2.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CreditCard size={10} />
                          Pagamento
                        </span>
                        <span className="text-sm">
                          {sale.payment_method_rel?.name || sale.payment_method}
                          {sale.installments && sale.installments > 1 && ` (${sale.installments}x)`}
                        </span>
                      </div>
                      {(sale.sales_channel || sale.channel) && (
                        <div className="flex justify-between items-center p-2.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Store size={10} />
                            Canal
                          </span>
                          <span className="text-sm">{sale.sales_channel?.name || sale.channel}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Desktop: Original 2-column grid */
                    <div className="grid grid-cols-2 gap-4">
                      <div className="card-metric p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Valor bruto</span>
                          <span className="font-bold text-foreground">{formatCurrency(grossValue)}</span>
                        </div>
                        {discountPercent > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Tag size={12} />
                              Desconto ({discountPercent}%)
                            </span>
                            <span className="text-destructive">-{formatCurrency(discountValue)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Valor recebido</span>
                          <span className="font-bold text-lg text-primary">{formatCurrency(grossAfterDiscount)}</span>
                        </div>
                      </div>

                      <div className="card-metric p-4 space-y-3">
                        {sale.customer && (
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-muted-foreground" />
                            <span className="text-sm font-medium">{sale.customer.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <CreditCard size={14} className="text-muted-foreground" />
                          <span className="text-sm">
                            {sale.payment_method_rel?.name || sale.payment_method}
                            {sale.installments && sale.installments > 1 && (
                              <span className="text-muted-foreground"> ({sale.installments}x)</span>
                            )}
                          </span>
                        </div>
                        {(sale.sales_channel || sale.channel) && (
                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-muted-foreground" />
                            <span className="text-sm">{sale.sales_channel?.name || sale.channel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {sale.notes && (
                    <div className={cn(
                      "p-2.5 bg-muted/50 rounded-lg",
                      !isMobile && "p-3"
                    )}>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Obs:</span> {sale.notes}
                      </p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Items Sold - Compact on mobile */}
                <section className="space-y-3">
                  <h3 className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5",
                    !isMobile && "gap-2"
                  )}>
                    <Package size={isMobile ? 12 : 16} />
                    Itens ({sale.sale_items?.length || 0})
                  </h3>
                  <div className={cn("space-y-2", !isMobile && "space-y-3")}>
                    {sale.sale_items && sale.sale_items.length > 0 ? (
                      sale.sale_items.map((item) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "bg-muted/30 rounded-lg",
                            isMobile ? "p-2.5" : "card-metric p-4"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "font-medium text-foreground truncate",
                                isMobile ? "text-sm" : "text-base"
                              )}>
                                {item.product_label_snapshot || 'Produto não identificado'}
                              </p>
                              <div className={cn(
                                "flex items-center gap-1.5 text-muted-foreground",
                                isMobile ? "text-xs mt-0.5" : "text-sm mt-1"
                              )}>
                                {item.uniform_snapshot && (
                                  <span>{item.uniform_snapshot}</span>
                                )}
                                {item.size_snapshot && (
                                  <>
                                    <span>·</span>
                                    <span>Tam. {item.size_snapshot}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={cn(
                                "text-muted-foreground",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                {item.qty || 1}× {formatCurrency(item.unit_price_brl || 0)}
                              </p>
                              <p className={cn(
                                "font-bold text-foreground",
                                isMobile ? "text-sm" : "text-base"
                              )}>
                                {formatCurrency((item.qty || 1) * (item.unit_price_brl || 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        Nenhum item registrado.
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Stock Origin (FIFO) - Compact on mobile */}
                {!sale.is_preorder && lotConsumption && lotConsumption.length > 0 && (
                  <>
                    <section className="space-y-3">
                      <h3 className={cn(
                        "text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5",
                        !isMobile && "gap-2"
                      )}>
                        <Layers size={isMobile ? 12 : 16} />
                        Origem (FIFO)
                      </h3>
                      
                      {!isMobile && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-muted-foreground flex items-start gap-2">
                          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                          <p>
                            Cada unidade vendida foi retirada do lote mais antigo disponível, 
                            garantindo rastreabilidade e custo real.
                          </p>
                        </div>
                      )}
                      
                      <div className={cn("space-y-3", isMobile && "space-y-2")}>
                        {sale.sale_items?.map((item) => {
                          const itemLots = lotsByItem[item.id] || [];
                          if (itemLots.length === 0) return null;

                          return (
                            <div 
                              key={item.id} 
                              className={cn(
                                "bg-muted/30 rounded-lg",
                                isMobile ? "p-2.5" : "card-metric p-4"
                              )}
                            >
                              <p className={cn(
                                "font-medium text-foreground mb-2",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                {item.product_label_snapshot}
                                {item.uniform_snapshot && ` — ${item.uniform_snapshot}`}
                              </p>
                              <div className={cn("space-y-1.5", !isMobile && "space-y-2")}>
                                {itemLots.map((lot: any) => {
                                  const purchaseOrder = lot.inventory_lots?.purchase_orders;
                                  const supplier = purchaseOrder?.suppliers?.name;
                                  const arrivalDate = lot.inventory_lots?.received_at;
                                  
                                  return (
                                    <div 
                                      key={lot.id} 
                                      className={cn(
                                        "flex items-center justify-between bg-background/50 rounded-md",
                                        isMobile ? "p-2 text-xs" : "p-3 text-sm"
                                      )}
                                    >
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <Truck size={isMobile ? 10 : 12} className="text-muted-foreground flex-shrink-0" />
                                          <span className="text-muted-foreground truncate">
                                            {supplier || 'Fornecedor não identificado'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground opacity-70">
                                          <Calendar size={isMobile ? 8 : 10} className="flex-shrink-0" />
                                          <span className={isMobile ? "text-[10px]" : "text-xs"}>
                                            {arrivalDate 
                                              ? format(new Date(arrivalDate), "dd/MM/yy", { locale: ptBR })
                                              : '—'
                                            }
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="text-muted-foreground">
                                          {lot.qty_consumed}× {formatCurrency(Number(lot.unit_cost_brl))}
                                        </p>
                                        <p className="font-medium text-foreground">
                                          {formatCurrency(lot.qty_consumed * Number(lot.unit_cost_brl))}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                    <Separator />
                  </>
                )}

                {/* Financial Breakdown - Reorganized for mobile */}
                <section className="space-y-3">
                  <h3 className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5",
                    !isMobile && "gap-2"
                  )}>
                    <DollarSign size={isMobile ? 12 : 16} />
                    Cálculo Financeiro
                  </h3>
                  
                  <div className={cn(
                    "bg-muted/30 rounded-lg",
                    isMobile ? "p-3 space-y-3" : "card-metric p-4 space-y-4"
                  )}>
                    {/* Revenue Section */}
                    <div>
                      <p className={cn(
                        "font-semibold text-muted-foreground uppercase mb-1.5",
                        isMobile ? "text-[10px]" : "text-xs mb-2"
                      )}>Receita</p>
                      <div className="space-y-1">
                        <div className={cn(
                          "flex justify-between",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          <span className="text-muted-foreground">Valor bruto</span>
                          <span className="text-foreground">{formatCurrency(grossValue)}</span>
                        </div>
                        {discountValue > 0 && (
                          <div className={cn(
                            "flex justify-between",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            <span className="text-muted-foreground">(-) Desconto</span>
                            <span className="text-destructive">-{formatCurrency(discountValue)}</span>
                          </div>
                        )}
                        <div className={cn(
                          "flex justify-between font-medium pt-1 border-t border-border",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          <span className="text-foreground">Receita líquida</span>
                          <span className="text-foreground">{formatCurrency(grossAfterDiscount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Costs Section */}
                    <div>
                      <p className={cn(
                        "font-semibold text-muted-foreground uppercase mb-1.5",
                        isMobile ? "text-[10px]" : "text-xs mb-2"
                      )}>Custos</p>
                      <div className="space-y-1">
                        <div className={cn(
                          "flex justify-between",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          <span className="text-muted-foreground flex items-center gap-1">
                            Produto (FIFO)
                            {hasPendingCogs && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle size={10} className="text-accent" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Custo parcial — Taxa Brasil pendente</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                          <span className="text-destructive">-{formatCurrency(productCosts)}</span>
                        </div>
                        <div className={cn(
                          "flex justify-between",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          <span className="text-muted-foreground">Taxa pagamento</span>
                          <span className="text-destructive">-{formatCurrency(fees)}</span>
                        </div>
                        {shipping > 0 && (
                          <div className={cn(
                            "flex justify-between",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            <span className="text-muted-foreground">Frete</span>
                            <span className="text-destructive">-{formatCurrency(shipping)}</span>
                          </div>
                        )}
                        {fixedCosts > 0 && (
                          <div className={cn(
                            "flex justify-between",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            <span className="text-muted-foreground flex items-center gap-1">
                              Custos fixos
                              {sale.sale_fixed_costs && sale.sale_fixed_costs.length > 0 && !isMobile && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info size={10} className="text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      {sale.sale_fixed_costs.map((fc: any) => (
                                        <p key={fc.id}>
                                          {fc.fixed_cost?.name}: {formatCurrency(fc.unit_cost_applied)}
                                        </p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                            <span className="text-destructive">-{formatCurrency(fixedCosts)}</span>
                          </div>
                        )}
                        <div className={cn(
                          "flex justify-between font-medium pt-1 border-t border-border",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          <span className="text-foreground">Total custos</span>
                          <span className="text-destructive">-{formatCurrency(totalCosts)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Result Section - Highlighted */}
                    <div className={cn(
                      "pt-2 border-t-2 border-border",
                      isMobile && "pt-3"
                    )}>
                      <p className={cn(
                        "font-semibold text-muted-foreground uppercase mb-2",
                        isMobile ? "text-[10px]" : "text-xs"
                      )}>Resultado</p>
                      <div className={cn(
                        "grid grid-cols-2 gap-2",
                        !isMobile && "gap-4"
                      )}>
                        <div className={cn(
                          "rounded-lg",
                          isMobile ? "p-2" : "p-3",
                          netProfit >= 0 ? "bg-primary/10" : "bg-destructive/10"
                        )}>
                          <p className={cn(
                            "text-muted-foreground mb-0.5",
                            isMobile ? "text-[10px]" : "text-xs"
                          )}>Lucro Líquido</p>
                          <p className={cn(
                            "font-bold",
                            isMobile ? "text-base" : "text-xl",
                            netProfit >= 0 ? "text-primary" : "text-destructive"
                          )}>
                            {formatCurrency(netProfit)}
                          </p>
                        </div>
                        <div className={cn(
                          "rounded-lg",
                          isMobile ? "p-2" : "p-3",
                          margin >= 0 ? "bg-primary/10" : "bg-destructive/10"
                        )}>
                          <p className={cn(
                            "text-muted-foreground mb-0.5",
                            isMobile ? "text-[10px]" : "text-xs"
                          )}>Margem</p>
                          <div className="flex items-center gap-1">
                            {margin >= 20 ? (
                              <TrendingUp size={isMobile ? 14 : 18} className="text-primary" />
                            ) : margin < 0 ? (
                              <TrendingDown size={isMobile ? 14 : 18} className="text-destructive" />
                            ) : null}
                            <p className={cn(
                              "font-bold",
                              isMobile ? "text-base" : "text-xl",
                              margin >= 0 ? "text-primary" : "text-destructive"
                            )}>
                              {formatPercent(margin)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Mobile: Edit button at bottom */}
                {isMobile && onEditClick && (
                  <Button 
                    onClick={handleEditClick}
                    variant="outline"
                    className="w-full gap-2 mt-2"
                    size="sm"
                  >
                    <Pencil size={14} />
                    Editar Venda
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Package size={40} className="mx-auto text-muted-foreground/40" />
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Venda não encontrada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Não foi possível localizar os dados desta venda.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
