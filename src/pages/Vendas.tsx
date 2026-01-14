import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingBag, Pencil, Settings } from "lucide-react";
import { SaleCardMobile } from "@/components/vendas/SaleCardMobile";
import { SalesFilterSheet } from "@/components/vendas/SalesFilterSheet";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";
import { SaleDetailsModal } from "@/components/vendas/SaleDetailsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

interface SaleData {
  id: string;
  sale_date: string;
  customer_id: string | null;
  channel: string | null;
  sales_channel_id: string | null;
  payment_method: string;
  payment_method_id: string | null;
  installments: number | null;
  gross_brl: number;
  discount_percent: number;
  discount_value_brl: number;
  gross_after_discount_brl: number | null;
  fees_brl: number;
  shipping_brl: number;
  fixed_costs_brl: number | null;
  product_costs_brl: number | null;
  net_profit_brl: number | null;
  margin_percent: number | null;
  is_preorder: boolean;
  notes: string | null;
  customer?: { name: string } | null;
  sales_channel?: { name: string } | null;
  payment_method_rel?: { name: string } | null;
  sale_items: Array<{
    id: string;
    variant_id: string | null;
    qty: number;
    unit_price_brl: number;
    product_label_snapshot: string;
    uniform_snapshot: string | null;
    size_snapshot: string | null;
  }>;
}

interface SalesChannel {
  id: string;
  name: string;
  is_active: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

const Vendas = () => {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate } = usePeriod();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleData | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch user's sales channels
  const { data: salesChannels = [] } = useQuery({
    queryKey: ['sales-channels-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sales_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as SalesChannel[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!user?.id,
  });

  const isUserReady = !!user?.id;
  
  const { data: sales, isLoading: salesLoading, isFetching, refetch } = useQuery({
    queryKey: ['sales', user?.id, primaryStartDate, primaryEndDate, channelFilter, paymentFilter, typeFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sales_channel:sales_channels(name),
          payment_method_rel:payment_methods(name),
          sale_items(
            id,
            variant_id,
            qty,
            unit_price_brl,
            product_label_snapshot,
            uniform_snapshot,
            size_snapshot
          )
        `)
        .eq('user_id', user.id)
        .gte('sale_date', primaryStartDate)
        .lte('sale_date', primaryEndDate)
        .order('sale_date', { ascending: false });

      // Filter by sales_channel_id instead of channel text
      if (channelFilter !== "all") {
        query = query.eq('sales_channel_id', channelFilter);
      }
      // Filter by payment_method_id instead of payment_method text
      if (paymentFilter !== "all") {
        query = query.eq('payment_method_id', paymentFilter);
      }
      if (typeFilter === "stock") {
        query = query.eq('is_preorder', false);
      } else if (typeFilter === "preorder") {
        query = query.eq('is_preorder', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SaleData[];
    },
    enabled: isUserReady,
  });
  
  // isLoading só é true quando está carregando E o usuário está pronto
  const isLoading = isUserReady ? (salesLoading || isFetching) : false;

  const handleViewSale = (saleId: string) => {
    setViewingSaleId(saleId);
  };

  const handleEditFromDetails = () => {
    // Find the sale and open edit modal
    const saleToEdit = sales?.find(s => s.id === viewingSaleId);
    if (saleToEdit) {
      setViewingSaleId(null);
      setEditingSale(saleToEdit);
      setIsModalOpen(true);
    }
  };

  const handleEditSale = (sale: SaleData) => {
    setEditingSale(sale);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSale(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModal();
  };

  // Check if user has no channels or payment methods configured
  const noChannelsConfigured = salesChannels.length === 0;
  const noMethodsConfigured = paymentMethods.length === 0;

  return (
    <DashboardLayout
      title="Vendas"
      subtitle="Gerencie suas vendas"
    >
      <div className="space-y-4 md:space-y-6">
        {/* Header Actions - Mobile: Filter button | Desktop: Dropdowns */}
        {isMobile ? (
          <div className="flex items-center justify-between">
            <SalesFilterSheet
              channelFilter={channelFilter}
              paymentFilter={paymentFilter}
              typeFilter={typeFilter}
              onChannelChange={setChannelFilter}
              onPaymentChange={setPaymentFilter}
              onTypeChange={setTypeFilter}
              salesChannels={salesChannels}
              paymentMethods={paymentMethods}
            />
          </div>
        ) : (
          <div className="flex flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border rounded-xl">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="all">Todos os canais</SelectItem>
                  {noChannelsConfigured ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      <p className="font-medium">Nenhum canal</p>
                      <Link to="/configuracoes" className="text-primary hover:underline flex items-center gap-1 mt-1">
                        <Settings size={12} /> Configurar
                      </Link>
                    </div>
                  ) : (
                    salesChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border rounded-xl">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="all">Todos</SelectItem>
                  {noMethodsConfigured ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      <p className="font-medium">Nenhum método</p>
                      <Link to="/configuracoes" className="text-primary hover:underline flex items-center gap-1 mt-1">
                        <Settings size={12} /> Configurar
                      </Link>
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border rounded-xl">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="stock">Em estoque</SelectItem>
                  <SelectItem value="preorder">Encomenda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => { setEditingSale(null); setIsModalOpen(true); }}
              className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
            >
              <Plus size={18} />
              Nova Venda
            </Button>
          </div>
        )}

        {/* Sales Content */}
        <div className="card-metric overflow-hidden md:block hidden">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sales && sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Canal</TableHead>
                  <TableHead className="text-muted-foreground font-semibold hidden lg:table-cell">Pagamento</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Custo</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Lucro</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Margem</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Tipo</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const saleValue = sale.gross_after_discount_brl ?? sale.gross_brl;
                  const profit = sale.net_profit_brl ?? 0;
                  const totalCost = (sale.product_costs_brl ?? 0) + (sale.fees_brl ?? 0) + (sale.shipping_brl ?? 0) + (sale.fixed_costs_brl ?? 0);
                  const margin = sale.margin_percent ?? (saleValue > 0 ? (profit / saleValue) * 100 : 0);
                  
                  return (
                    <TableRow 
                      key={sale.id} 
                      className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewSale(sale.id)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(sale.sale_date), "dd MMM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {sale.customer?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {sale.sales_channel?.name || sale.channel || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-foreground">
                          {sale.payment_method_rel?.name || sale.payment_method}
                          {sale.installments && sale.installments > 1 && (
                            <span className="text-muted-foreground ml-1">
                              ({sale.installments}x)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold">{formatCurrency(saleValue)}</span>
                          {sale.discount_percent > 0 && (
                            <span className="text-xs text-muted-foreground">
                              -{sale.discount_percent}% desc.
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(totalCost)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={margin >= 0 ? 'text-foreground' : 'text-destructive'}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.is_preorder ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="warning" className="font-medium">
                                Aguardando custo
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                O lucro será calculado automaticamente quando o custo da compra for registrado.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="success" className="font-medium">
                            Estoque
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSale(sale);
                          }}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          title="Editar"
                        >
                          <Pencil size={16} className="text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
                <ShoppingBag size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                Nenhuma venda registrada ainda
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Registre sua primeira venda para começar a acompanhar seu faturamento.
              </p>
              <Button 
                onClick={() => { setEditingSale(null); setIsModalOpen(true); }}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
              >
                <Plus size={18} />
                Registrar primeira venda
              </Button>
            </div>
          )}
        </div>

        {/* Mobile: Card Layout */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : sales && sales.length > 0 ? (
            sales.map((sale) => (
              <SaleCardMobile
                key={sale.id}
                sale={sale}
                onClick={() => handleViewSale(sale.id)}
              />
            ))
          ) : (
            <div className="card-metric text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
                <ShoppingBag size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Nenhuma venda
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Registre sua primeira venda
              </p>
              <Button 
                onClick={() => { setEditingSale(null); setIsModalOpen(true); }}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
              >
                <Plus size={18} />
                Nova Venda
              </Button>
            </div>
          )}
        </div>
      </div>

      <NovaVendaModal 
        open={isModalOpen} 
        onOpenChange={(open) => { if (!open) handleCloseModal(); else setIsModalOpen(true); }}
        onSuccess={handleSuccess}
        editingSale={editingSale}
      />

      <SaleDetailsModal
        open={!!viewingSaleId}
        onOpenChange={(open) => !open && setViewingSaleId(null)}
        saleId={viewingSaleId}
        onEditClick={handleEditFromDetails}
      />

      {/* FAB for mobile */}
      <FloatingActionButton
        onNewSale={() => { setEditingSale(null); setIsModalOpen(true); }}
        onNewPurchase={() => navigate('/compras/nova')}
      />
    </DashboardLayout>
  );
};

export default Vendas;
