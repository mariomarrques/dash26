import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, Users, ChevronDown, ChevronUp, ArrowLeft, Crown, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SaleDetailsModal } from "@/components/vendas/SaleDetailsModal";
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

interface CustomerMargin {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  avgTicket: number;
  sales: Array<{
    id: string;
    sale_date: string;
    gross_after_discount_brl: number | null;
    gross_brl: number;
    net_profit_brl: number | null;
    margin_percent: number | null;
  }>;
}

interface MargensClientesProps {
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

type SortField = 'profit' | 'revenue' | 'margin' | 'sales';

export function MargensClientes({ filters = defaultFilters }: MargensClientesProps) {
  const { user } = useAuth();
  const { primaryStartDate, primaryEndDate } = usePeriod();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMargin | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const isMobile = useIsMobile();

  const { data: customerMargins, isLoading } = useQuery({
    queryKey: ['customer-margins', user?.id, primaryStartDate, primaryEndDate],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_date,
          customer_id,
          gross_brl,
          gross_after_discount_brl,
          net_profit_brl,
          margin_percent,
          customer:customers(id, name)
        `)
        .eq('user_id', user.id)
        .gte('sale_date', primaryStartDate)
        .lte('sale_date', primaryEndDate)
        .not('customer_id', 'is', null)
        .order('sale_date', { ascending: false });

      if (error) throw error;

      // Group by customer
      const customerMap = new Map<string, CustomerMargin>();

      sales?.forEach((sale) => {
        if (!sale.customer) return;

        const customerId = sale.customer.id;
        const grossValue = sale.gross_after_discount_brl ?? sale.gross_brl ?? 0;
        const netProfit = sale.net_profit_brl ?? 0;

        const existing = customerMap.get(customerId);
        if (existing) {
          existing.totalSales += 1;
          existing.totalRevenue += grossValue;
          existing.totalProfit += netProfit;
          existing.sales.push({
            id: sale.id,
            sale_date: sale.sale_date,
            gross_after_discount_brl: sale.gross_after_discount_brl,
            gross_brl: sale.gross_brl,
            net_profit_brl: sale.net_profit_brl,
            margin_percent: sale.margin_percent,
          });
        } else {
          customerMap.set(customerId, {
            customerId,
            customerName: sale.customer.name,
            totalSales: 1,
            totalRevenue: grossValue,
            totalProfit: netProfit,
            avgMargin: 0,
            avgTicket: 0,
            sales: [{
              id: sale.id,
              sale_date: sale.sale_date,
              gross_after_discount_brl: sale.gross_after_discount_brl,
              gross_brl: sale.gross_brl,
              net_profit_brl: sale.net_profit_brl,
              margin_percent: sale.margin_percent,
            }],
          });
        }
      });

      // Calculate averages
      const customers = Array.from(customerMap.values());
      customers.forEach((c) => {
        c.avgMargin = c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0;
        c.avgTicket = c.totalSales > 0 ? c.totalRevenue / c.totalSales : 0;
      });

      return customers;
    },
    enabled: !!user?.id,
  });

  // Apply filters
  const filteredCustomers = useMemo(() => {
    if (!customerMargins) return [];

    return customerMargins.filter((customer) => {
      // Value filter (totalRevenue)
      if (filters.valorMin !== null && customer.totalRevenue < filters.valorMin) return false;
      if (filters.valorMax !== null && customer.totalRevenue > filters.valorMax) return false;

      // Profit filter
      if (filters.lucroMin !== null && customer.totalProfit < filters.lucroMin) return false;
      if (filters.lucroMax !== null && customer.totalProfit > filters.lucroMax) return false;

      // Margin filter
      if (filters.margemMin !== null && customer.avgMargin < filters.margemMin) return false;
      if (filters.margemMax !== null && customer.avgMargin > filters.margemMax) return false;

      return true;
    });
  }, [customerMargins, filters]);

  // Sort customers
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'profit':
          comparison = a.totalProfit - b.totalProfit;
          break;
        case 'revenue':
          comparison = a.totalRevenue - b.totalRevenue;
          break;
        case 'margin':
          comparison = a.avgMargin - b.avgMargin;
          break;
        case 'sales':
          comparison = a.totalSales - b.totalSales;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }, [filteredCustomers, sortField, sortDirection]);

  // Find best performers
  const bestProfit = customerMargins?.reduce((best, c) => 
    c.totalProfit > (best?.totalProfit || 0) ? c : best, 
    null as CustomerMargin | null
  );
  
  const bestMargin = customerMargins?.reduce((best, c) => 
    c.avgMargin > (best?.avgMargin || 0) ? c : best, 
    null as CustomerMargin | null
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'desc' ? 
      <ChevronDown size={14} className="inline ml-1" /> : 
      <ChevronUp size={14} className="inline ml-1" />;
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

  // Customer detail view
  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedCustomer(null)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <div>
            <h3 className="text-xl font-bold text-foreground">{selectedCustomer.customerName}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCustomer.totalSales} {selectedCustomer.totalSales === 1 ? 'compra' : 'compras'} • 
              Lucro total: {formatCurrency(selectedCustomer.totalProfit)}
            </p>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-metric p-4">
            <p className="text-sm text-muted-foreground">Faturamento</p>
            <p className="text-xl font-bold">{formatCurrency(selectedCustomer.totalRevenue)}</p>
          </div>
          <div className="card-metric p-4">
            <p className="text-sm text-muted-foreground">Lucro</p>
            <p className={`text-xl font-bold ${selectedCustomer.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(selectedCustomer.totalProfit)}
            </p>
          </div>
          <div className="card-metric p-4">
            <p className="text-sm text-muted-foreground">Margem Média</p>
            <p className={`text-xl font-bold ${selectedCustomer.avgMargin >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatPercent(selectedCustomer.avgMargin)}
            </p>
          </div>
          <div className="card-metric p-4">
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-xl font-bold">{formatCurrency(selectedCustomer.avgTicket)}</p>
          </div>
        </div>

        {/* Sales list */}
        <div className="card-metric overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Valor</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Lucro</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-center">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCustomer.sales.map((sale) => {
                const grossValue = sale.gross_after_discount_brl ?? sale.gross_brl ?? 0;
                const netProfit = sale.net_profit_brl ?? 0;
                const margin = sale.margin_percent ?? (grossValue > 0 ? (netProfit / grossValue) * 100 : 0);

                return (
                  <TableRow 
                    key={sale.id} 
                    className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setViewingSaleId(sale.id)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(sale.sale_date), "dd MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(grossValue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(netProfit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={margin >= 0 ? 'text-foreground' : 'text-destructive'}>
                        {formatPercent(margin)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <SaleDetailsModal
          open={!!viewingSaleId}
          onOpenChange={(open) => !open && setViewingSaleId(null)}
          saleId={viewingSaleId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Highlights */}
      {customerMargins && customerMargins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestProfit && (
            <div className="card-metric p-5 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} className="text-primary" />
                <p className="text-sm text-muted-foreground">Cliente Mais Lucrativo</p>
              </div>
              <p className="text-lg font-bold text-foreground truncate">{bestProfit.customerName}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(bestProfit.totalProfit)}</p>
              <p className="text-xs text-muted-foreground mt-1">{bestProfit.totalSales} compras</p>
            </div>
          )}
          {bestMargin && (
            <div className="card-metric p-5 bg-gradient-to-br from-accent/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-accent" />
                <p className="text-sm text-muted-foreground">Maior Margem</p>
              </div>
              <p className="text-lg font-bold text-foreground truncate">{bestMargin.customerName}</p>
              <p className="text-2xl font-bold text-accent">{formatPercent(bestMargin.avgMargin)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ticket médio: {formatCurrency(bestMargin.avgTicket)}</p>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-2 text-sm">
        <Info size={16} className="text-muted-foreground flex-shrink-0" />
        <p className="text-muted-foreground">
          Análise por cliente. Clique em um cliente para ver todas as vendas.
          {hasActiveFilters && (
            <span className="ml-2 font-medium text-foreground">
              Exibindo {filteredCustomers.length} de {customerMargins?.length || 0} clientes.
            </span>
          )}
        </p>
      </div>

      {/* Customers List */}
      {sortedCustomers.length > 0 ? (
        isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-3">
            {sortedCustomers.map((customer, index) => (
              <div 
                key={customer.customerId} 
                className="card-metric p-4 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Rank, Customer, Sales count */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                      {index === 0 && sortField === 'profit' && !hasActiveFilters && (
                        <Badge variant="accent" className="text-xs">Top</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-muted-foreground flex-shrink-0" />
                      <p className="font-medium text-foreground truncate">{customer.customerName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {customer.totalSales} {customer.totalSales === 1 ? 'compra' : 'compras'} • 
                      Ticket: {formatCurrency(customer.avgTicket)}
                    </p>
                  </div>

                  {/* Right: Revenue, Profit, Margin */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{formatCurrency(customer.totalRevenue)}</p>
                    <p className={`text-sm font-semibold ${customer.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(customer.totalProfit)}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {customer.avgMargin > 20 && <TrendingUp size={12} className="text-primary" />}
                      <span className={`text-xs ${customer.avgMargin >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatPercent(customer.avgMargin)}
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
                  <TableHead className="text-muted-foreground font-semibold">Cliente</TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('sales')}
                  >
                    Compras<SortIndicator field="sales" />
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('revenue')}
                  >
                    Faturamento<SortIndicator field="revenue" />
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('profit')}
                  >
                    Lucro<SortIndicator field="profit" />
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('margin')}
                  >
                    Margem<SortIndicator field="margin" />
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((customer, index) => (
                  <TableRow 
                    key={customer.customerId} 
                    className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-muted-foreground" />
                        <span>{customer.customerName}</span>
                        {index === 0 && sortField === 'profit' && !hasActiveFilters && (
                          <Badge variant="accent" className="text-xs">Top</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.totalSales}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalRevenue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${customer.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(customer.totalProfit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {customer.avgMargin > 20 && <TrendingUp size={14} className="text-primary" />}
                        <span className={customer.avgMargin >= 0 ? 'text-foreground' : 'text-destructive'}>
                          {formatPercent(customer.avgMargin)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(customer.avgTicket)}
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
              ? "Nenhum cliente corresponde aos filtros aplicados." 
              : "Nenhum cliente com vendas neste período."}
          </p>
        </div>
      )}
    </div>
  );
}
