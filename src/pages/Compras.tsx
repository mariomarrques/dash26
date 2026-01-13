import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ShoppingCart, AlertCircle, Package, Filter, X, Edit2, Copy, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseCardMobile } from "@/components/compras/PurchaseCardMobile";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditPurchaseModal } from "@/components/compras/EditPurchaseModal";
import { StatusChangeDropdown } from "@/components/compras/StatusChangeDropdown";
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";

interface PurchaseOrder {
  id: string;
  order_date: string;
  created_at: string;
  source: string;
  status: string;
  shipping_mode: string | null;
  freight_brl: number;
  extra_fees_brl: number;
  arrival_tax_brl: number | null;
  notes: string | null;
  supplier_id: string | null;
  stock_posted: boolean;
  suppliers: { name: string; type: string } | null;
  purchase_items: Array<{
    id: string;
    qty: number;
    unit_cost_value: number;
    unit_cost_currency: string;
    usd_to_brl_rate: number | null;
    variant_id: string | null;
    product_variants?: {
      id: string;
      size: string | null;
      uniform: string | null;
      products?: {
        id: string;
        label: string;
        country: string | null;
        team: string | null;
        team_id: string | null;
        season: string | null;
      } | null;
    } | null;
  }>;
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  comprado: "Comprado",
  enviado: "Enviado",
  chegou: "Chegou",
};

export default function Compras() {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate, period } = usePeriod();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Local filters (status, source) - period comes from global context
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  
  // Edit modal state
  const [editPurchase, setEditPurchase] = useState<PurchaseOrder | null>(null);
  
  // Nova Venda modal for FAB
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);

  const hasActiveFilter = statusFilter !== "all" || sourceFilter !== "all";

  const { data: purchases, isLoading, error } = useQuery({
    queryKey: ["purchase_orders", user?.id, primaryStartDate, primaryEndDate, statusFilter, sourceFilter],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers(name, type),
          purchase_items(id, qty, unit_cost_value, unit_cost_currency, usd_to_brl_rate, variant_id, product_variants(id, size, uniform, products(id, label, country, team, team_id, season)))
        `)
        .eq("user_id", user.id)
        .gte("order_date", primaryStartDate)
        .lte("order_date", primaryEndDate)
        .order("order_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!user,
  });

  const calculateTotal = (purchase: PurchaseOrder) => {
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

  const totalItems = (purchase: PurchaseOrder) => {
    return purchase.purchase_items.reduce((sum, item) => sum + item.qty, 0);
  };

  if (error) {
    return (
      <DashboardLayout title="Compras">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p>Não foi possível carregar as compras. Tente novamente.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Compras">
      <div className="space-y-4 md:space-y-6">
        {/* Header - Desktop only (mobile uses DashboardLayout title + FAB) */}
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Compras</h1>
              <p className="text-muted-foreground">Gerencie seus pedidos de compra</p>
            </div>
            <Button onClick={() => navigate("/compras/nova")} className="gap-2">
              <Plus size={18} />
              Nova compra
            </Button>
          </div>
        )}

        {/* Mobile: Period chip + Filter indicator */}
        {isMobile && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs px-2.5 py-1 rounded-lg font-normal">
              📅 {period.label}
            </Badge>
            {hasActiveFilter && (
              <Badge 
                variant="secondary" 
                className="text-xs px-2.5 py-1 rounded-lg font-normal gap-1 cursor-pointer"
                onClick={() => {
                  setStatusFilter("all");
                  setSourceFilter("all");
                }}
              >
                Filtros ativos
                <X size={12} />
              </Badge>
            )}
          </div>
        )}

        {/* Filter Active Indicator - Desktop only */}
        {!isMobile && hasActiveFilter && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Filter size={16} />
              <span>
                Filtros ativos
                {statusFilter !== "all" && ` • ${statusLabels[statusFilter]}`}
                {sourceFilter !== "all" && ` • ${sourceFilter}`}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1"
              onClick={() => {
                setStatusFilter("all");
                setSourceFilter("all");
              }}
            >
              <X size={14} />
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Info Banner - Period - Desktop only */}
        {!isMobile && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center gap-2 text-sm">
            <Info size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              Exibindo compras do período: <span className="font-medium text-foreground">{period.label}</span>
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg">Todos</SelectItem>
                <SelectItem value="rascunho" className="rounded-lg">Rascunho</SelectItem>
                <SelectItem value="comprado" className="rounded-lg">Comprado</SelectItem>
                <SelectItem value="enviado" className="rounded-lg">Enviado</SelectItem>
                <SelectItem value="chegou" className="rounded-lg">Chegou</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Origem</span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg">Todas</SelectItem>
                <SelectItem value="china" className="rounded-lg">China</SelectItem>
                <SelectItem value="brasil" className="rounded-lg">Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        {isLoading ? (
          <div className="hidden md:flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : purchases && purchases.length > 0 ? (
          <div className="card-metric overflow-hidden p-0 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Fornecedor</TableHead>
                  <TableHead className="font-semibold">Origem</TableHead>
                  <TableHead className="font-semibold">Peças</TableHead>
                  <TableHead className="font-semibold">Total Estimado</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow 
                    key={purchase.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/compras/${purchase.id}`)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(purchase.order_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {purchase.suppliers?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize rounded-lg">
                        {purchase.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{totalItems(purchase)}</TableCell>
                    <TableCell className="font-bold tabular-nums">
                      R$ {calculateTotal(purchase).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
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
                        {purchase.source === "china" && 
                         purchase.shipping_mode === "offline" && 
                         purchase.arrival_tax_brl === null && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="warning">
                                Taxa pendente
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                Taxa Brasil pendente — sua margem será estimada até o valor real ser informado.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/compras/nova", { 
                                    state: { duplicateFrom: purchase } 
                                  });
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicar compra</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPurchase(purchase);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="card-metric hidden md:flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-white" />
            </div>
            <p className="text-muted-foreground text-center max-w-sm">
              Sem compras neste período.<br />
              Clique em "Nova compra" para registrar seu primeiro pedido.
            </p>
          </div>
        )}

        {/* Mobile: Card Layout */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : purchases && purchases.length > 0 ? (
            purchases.map((purchase) => (
              <PurchaseCardMobile
                key={purchase.id}
                purchase={purchase}
                onEdit={() => setEditPurchase(purchase)}
                onClick={() => navigate(`/compras/${purchase.id}`)}
              />
            ))
          ) : (
            <div className="card-metric text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Nenhuma compra
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Registre sua primeira compra
              </p>
              <Button 
                onClick={() => navigate("/compras/nova")}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
              >
                <Plus size={18} />
                Nova Compra
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Purchase Modal */}
      <EditPurchaseModal
        open={!!editPurchase}
        onOpenChange={(open) => !open && setEditPurchase(null)}
        purchase={editPurchase}
      />

      {/* Nova Venda Modal for FAB */}
      <NovaVendaModal 
        open={isVendaModalOpen} 
        onOpenChange={setIsVendaModalOpen}
        onSuccess={() => setIsVendaModalOpen(false)}
      />

      {/* FAB for mobile */}
      <FloatingActionButton
        onNewSale={() => setIsVendaModalOpen(true)}
        onNewPurchase={() => navigate('/compras/nova')}
      />
    </DashboardLayout>
  );
}
