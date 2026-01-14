import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStockAudit } from "@/hooks/useStockAudit";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Search, AlertTriangle, Truck, Info, ChevronRight, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StockEntryModal } from "@/components/estoque/StockEntryModal";
import { Button } from "@/components/ui/button";

interface StockItem {
  variant_id: string;
  product_label: string;
  size: string | null;
  uniform: string | null;
  quantity: number;
  avg_cost_brl: number | null;
  total_value_brl: number;
  status: 'available' | 'low' | 'out';
  hasPendingCost: boolean;
}

interface IncomingItem {
  variant_id: string;
  product_label: string;
  size: string | null;
  uniform: string | null;
  quantity: number;
  order_status: string;
}

const Estoque = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);
  const [entriesModalOpen, setEntriesModalOpen] = useState(false);

  // Hook de auditoria de estoque (admin only)
  const stockAudit = useStockAudit();

  // Expor funções de auditoria no window para uso via console (apenas admin)
  useEffect(() => {
    if (stockAudit.isAdmin()) {
      (window as any).__stockAudit = {
        runAudit: stockAudit.runAudit,
        checkNegativeStock: stockAudit.checkNegativeStock,
        checkDiscrepancies: stockAudit.checkDiscrepancies
      };
      console.log("🔐 Ferramentas de auditoria disponíveis. Digite: await window.__stockAudit.runAudit()");
    }
    return () => {
      delete (window as any).__stockAudit;
    };
  }, [stockAudit]);

  const isUserReady = !!user?.id;
  
  // Query stock from stock_movements ONLY (source of truth for quantity)
  // and inventory_lots for cost (source of truth for FIFO cost)
  const { data: stockItems = [], isLoading: stockLoading, isFetching } = useQuery({
    queryKey: ['stock', user?.id, showZeroStock],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all stock movements grouped by variant - THIS IS THE ONLY SOURCE FOR QUANTITY
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select(`
          variant_id,
          qty,
          type,
          product_variants (
            id,
            size,
            uniform,
            products (
              label
            )
          )
        `)
        .eq('user_id', user.id);

      if (movError) throw movError;

      // Get inventory lots for cost calculation (source of truth for FIFO cost)
      const { data: inventoryLots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('variant_id, qty_remaining, unit_cost_brl, cost_pending_tax')
        .eq('user_id', user.id)
        .gt('qty_remaining', 0);

      if (lotsError) throw lotsError;

      // Aggregate stock by variant - sum ALL qty (in = positive, out = negative)
      const stockMap = new Map<string, StockItem>();

      movements?.forEach((mov) => {
        const variantId = mov.variant_id;
        const variant = mov.product_variants as any;
        
        if (!variant) return;

        const existing = stockMap.get(variantId) || {
          variant_id: variantId,
          product_label: variant.products?.label || 'Produto',
          size: variant.size,
          uniform: variant.uniform,
          quantity: 0,
          avg_cost_brl: null,
          total_value_brl: 0,
          status: 'out' as const,
          hasPendingCost: false
        };

        // qty handling: 'in' is positive, 'out' is negative
        if (mov.type === 'in') {
          existing.quantity += mov.qty;
        } else if (mov.type === 'out') {
          existing.quantity -= mov.qty;
        } else {
          existing.quantity += mov.qty; // adjust can be positive or negative
        }

        stockMap.set(variantId, existing);
      });

      // Calculate weighted average cost per variant from inventory_lots (FIFO remaining)
      const lotsByVariant = new Map<string, { totalValue: number; totalQty: number; hasPending: boolean }>();
      
      inventoryLots?.forEach((lot) => {
        const variantId = lot.variant_id;
        const existing = lotsByVariant.get(variantId) || { totalValue: 0, totalQty: 0, hasPending: false };
        
        existing.totalValue += Number(lot.qty_remaining) * Number(lot.unit_cost_brl);
        existing.totalQty += Number(lot.qty_remaining);
        
        if (lot.cost_pending_tax) {
          existing.hasPending = true;
        }
        
        lotsByVariant.set(variantId, existing);
      });

      // Apply weighted average cost to stock items
      lotsByVariant.forEach((data, variantId) => {
        const stockItem = stockMap.get(variantId);
        if (stockItem && data.totalQty > 0) {
          stockItem.avg_cost_brl = data.totalValue / data.totalQty;
          stockItem.total_value_brl = data.totalValue;
          stockItem.hasPendingCost = data.hasPending;
        }
      });

      // Determine status for each item
      stockMap.forEach((item) => {
        if (item.quantity <= 0) {
          item.status = 'out';
        } else if (item.quantity <= 2) {
          item.status = 'low';
        } else {
          item.status = 'available';
        }
      });

      // Filter based on showZeroStock toggle
      return Array.from(stockMap.values()).filter(item => 
        showZeroStock ? true : item.quantity > 0
      );
    },
    enabled: isUserReady
  });
  
  // isLoading só é true quando está carregando E o usuário está pronto
  const isLoading = isUserReady ? (stockLoading || isFetching) : false;

  // Query items "on the way" (purchase orders not yet arrived)
  const { data: incomingItems = [] } = useQuery({
    queryKey: ['incoming-stock', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('purchase_items')
        .select(`
          variant_id,
          qty,
          product_variants (
            id,
            size,
            uniform,
            products (
              label
            )
          ),
          purchase_orders!inner (
            status
          )
        `)
        .eq('user_id', user.id)
        .in('purchase_orders.status', ['comprado', 'enviado']);

      if (error) throw error;

      // Group by variant
      const incomingMap = new Map<string, IncomingItem>();

      data?.forEach((item) => {
        const variantId = item.variant_id;
        const variant = item.product_variants as any;
        const order = item.purchase_orders as any;
        
        if (!variant || !variantId) return;

        const existing = incomingMap.get(variantId) || {
          variant_id: variantId,
          product_label: variant.products?.label || 'Produto',
          size: variant.size,
          uniform: variant.uniform,
          quantity: 0,
          order_status: order?.status || ''
        };

        existing.quantity += item.qty;
        incomingMap.set(variantId, existing);
      });

      return Array.from(incomingMap.values());
    },
    enabled: isUserReady
  });

  const filteredItems = stockItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.product_label.toLowerCase().includes(searchLower) ||
      item.size?.toLowerCase().includes(searchLower) ||
      item.uniform?.toLowerCase().includes(searchLower)
    );
  });

  const totalItems = filteredItems.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const totalValue = filteredItems.reduce((sum, item) => sum + item.total_value_brl, 0);
  const lowStockCount = filteredItems.filter(item => item.status === 'low').length;
  const totalIncoming = incomingItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasPendingCosts = filteredItems.some(item => item.hasPendingCost);

  const getStatusBadge = (status: StockItem['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Disponível</Badge>;
      case 'low':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Estoque baixo</Badge>;
      case 'out':
        return <Badge variant="destructive">Sem estoque</Badge>;
    }
  };

  const handleItemClick = (item: StockItem) => {
    setSelectedVariant(item);
    setEntriesModalOpen(true);
  };

  return (
    <DashboardLayout title="Estoque" subtitle="Visualize e gerencie seu inventário">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Disponível</p>
                    <p className="text-2xl font-bold text-foreground">{totalItems} peças</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <span className="text-accent font-bold">R$</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-foreground">
                          {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {hasPendingCosts && (
                          <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                            Parcial
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          {hasPendingCosts 
                            ? "Calculado com custo médio ponderado dos lotes em estoque. Alguns custos estão pendentes de taxa Brasil."
                            : "Calculado com custo médio ponderado real dos lotes ainda em estoque (FIFO)."}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>

            {lowStockCount > 0 && (
              <Card className="glass-card border-warning/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                      <p className="text-2xl font-bold text-warning">{lowStockCount} produtos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {totalIncoming > 0 && (
              <Card className="glass-card border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">A Caminho</p>
                      <p className="text-2xl font-bold text-blue-400">{totalIncoming} peças</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isMobile ? "Buscar no estoque…" : "Buscar por produto, tamanho ou uniforme..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-zero"
                checked={showZeroStock}
                onCheckedChange={setShowZeroStock}
              />
              <Label htmlFor="show-zero" className="text-sm text-muted-foreground">
                Mostrar saldo zero
              </Label>
            </div>
          </div>

          {/* Items on the way (separate section) */}
          {incomingItems.length > 0 && (
            <Card className="glass-card border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-400" />
                  Itens a Caminho
                  <Badge variant="secondary" className="ml-2">{totalIncoming} peças</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estes itens ainda não estão disponíveis. Serão adicionados quando a compra chegar.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {incomingItems.map((item) => (
                    <div
                      key={item.variant_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{item.product_label}</p>
                        <div className="flex gap-1 mt-1">
                          {item.size && (
                            <Badge variant="secondary" className="text-xs">
                              {item.size}
                            </Badge>
                          )}
                          {item.uniform && (
                            <Badge variant="outline" className="text-xs">
                              {item.uniform}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-400">{item.quantity} un</p>
                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">
                          {item.order_status === 'enviado' ? 'Enviado' : 'Comprado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Produtos em Estoque
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Saldo calculado a partir das movimentações. <span className="font-semibold">Custo médio (referência)</span> — o lucro real das vendas é sempre calculado pelo custo FIFO das compras.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum produto em estoque</p>
                  <p className="text-sm">Registre compras e marque como "chegou" para adicionar itens ao estoque</p>
                </div>
              ) : (
              <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.variant_id}
                      onClick={() => handleItemClick(item)}
                      className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group active:scale-[0.99]"
                    >
                      {/* Mobile Layout */}
                      {isMobile ? (
                        <div>
                          {/* Row 1: Product label */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="font-medium text-foreground text-sm leading-tight">
                              {item.product_label}
                            </p>
                            <p className={`text-lg font-bold flex-shrink-0 ${
                              item.status === 'low' ? 'text-warning' : 
                              item.status === 'out' ? 'text-destructive' : 'text-foreground'
                            }`}>
                              {item.quantity} un
                            </p>
                          </div>
                          
                          {/* Row 2: Chips (size + uniform) */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {item.size && (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                Tam: {item.size}
                              </Badge>
                            )}
                            {item.uniform && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                {item.uniform}
                              </Badge>
                            )}
                            {item.status === 'low' && (
                              <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-2 py-0.5">
                                Estoque baixo
                              </Badge>
                            )}
                            {item.hasPendingCost && (
                              <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-2 py-0.5">
                                Custo parcial
                              </Badge>
                            )}
                          </div>
                          
                          {/* Row 3: Average cost (secondary) */}
                          <p className="text-[11px] text-muted-foreground/70">
                            Custo médio (ref.): {item.avg_cost_brl !== null 
                              ? `R$ ${item.avg_cost_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un`
                              : '—'
                            }
                          </p>
                        </div>
                      ) : (
                        /* Desktop Layout */
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{item.product_label}</p>
                              {getStatusBadge(item.status)}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {item.size && (
                                <Badge variant="secondary" className="text-xs">
                                  Tam: {item.size}
                                </Badge>
                              )}
                              {item.uniform && (
                                <Badge variant="outline" className="text-xs">
                                  {item.uniform}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                item.status === 'low' ? 'text-warning' : 
                                item.status === 'out' ? 'text-destructive' : 'text-foreground'
                              }`}>
                                {item.quantity} un
                              </p>
                              <div className="flex items-center gap-1 justify-end">
                                {item.hasPendingCost && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs px-1">
                                        ~
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs max-w-xs">Taxa Brasil pendente — sua margem será estimada até o valor real ser informado.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm text-muted-foreground cursor-help">
                                      Custo médio (ref.): {item.avg_cost_brl !== null 
                                        ? `R$ ${item.avg_cost_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un`
                                        : '—'
                                      }
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs max-w-xs">
                                      Este valor é apenas uma média visual. O lucro real das vendas é sempre calculado pelo custo FIFO das compras.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Todos os valores consideram os custos e movimentações registrados até agora. Resultados podem mudar com novas compras ou vendas.
          </p>
        </div>

        {/* Stock Entry Modal */}
        <StockEntryModal
          open={entriesModalOpen}
          onOpenChange={setEntriesModalOpen}
          stockItem={selectedVariant}
        />
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default Estoque;
