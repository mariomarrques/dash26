import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { TeamProfitRanking } from "@/components/dashboard/TeamProfitRanking";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePeriod } from "@/contexts/PeriodContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Plus, 
  ShoppingCart, 
  Percent,
  AlertTriangle,
  Info,
  ChevronDown
} from "lucide-react";
import { 
  useDashboardMetrics, 
  useRecentActivity, 
  useSecondaryInsights,
  useSalesChart,
  usePaymentDistribution,
  useTeamProfitability,
  PeriodFilter as PeriodFilterType
} from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const Index = () => {
  const navigate = useNavigate();
  const { period } = usePeriod();
  const isMobile = useIsMobile();
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [openChart, setOpenChart] = useState<string | null>(null);
  const { shouldShowOnboarding, completeOnboarding } = useOnboarding();
  const [runTour, setRunTour] = useState(false);
  
  // Convert to hook format
  const hookPeriod: PeriodFilterType = {
    primary: period.primary,
    comparison: period.comparison
  };
  
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError, 
    refetch: refetchMetrics,
    isFetching: metricsFetching 
  } = useDashboardMetrics(hookPeriod);
  const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useRecentActivity();
  const { data: insights, isLoading: insightsLoading } = useSecondaryInsights(hookPeriod);
  const { data: salesChartData, isLoading: chartLoading } = useSalesChart(hookPeriod);
  const { data: paymentData, isLoading: paymentLoading } = usePaymentDistribution(hookPeriod);
  const { data: teamProfitData, isLoading: teamProfitLoading } = useTeamProfitability(hookPeriod);

  // Start tour after component mounts and data is loaded
  useEffect(() => {
    if (shouldShowOnboarding && !metricsLoading) {
      // Small delay to ensure DOM elements are ready
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowOnboarding, metricsLoading]);

  const hasError = metricsError;
  // Considerar como "sem dados" apenas quando metrics foi carregado e está vazio
  const hasNoData = !metricsLoading && !metricsFetching && metrics && metrics.revenue === 0 && metrics.stockItems === 0;
  const isComparing = !!period.comparison;

  const handleVendaSuccess = () => {
    refetchMetrics();
    refetchActivity();
    setIsVendaModalOpen(false);
  };

  // Margin badge color
  const getMarginBadge = (margin: number) => {
    if (margin >= 30) return { variant: "success" as const, label: "Excelente" };
    if (margin >= 15) return { variant: "default" as const, label: "Bom" };
    if (margin >= 0) return { variant: "warning" as const, label: "Atenção" };
    return { variant: "destructive" as const, label: "Negativo" };
  };

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Visão executiva do seu negócio"
    >
      <div className="space-y-6 md:space-y-8">
        {/* Quick Actions - Desktop only */}
        {!isMobile && (
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex flex-row gap-3 items-center">
              <Button 
                onClick={() => setIsVendaModalOpen(true)}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2 h-11 px-5"
                data-tour="btn-nova-venda"
              >
                <Plus size={18} />
                Nova Venda
              </Button>
              <Button 
                onClick={() => navigate('/compras/nova')}
                variant="outline"
                className="border-border hover:bg-muted rounded-xl gap-2 h-11 px-5"
              >
                <ShoppingCart size={18} />
                Nova Compra
              </Button>
            </div>
            
            {/* Info tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                  <Info size={16} />
                  <span>Dados do período selecionado</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Todos os valores consideram os custos registrados até agora. 
                  Resultados podem mudar com novas vendas ou ajustes.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Comparison indicator */}
        {isComparing && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-primary flex items-center gap-2">
            <Info size={16} />
            <span>Comparando com período anterior — variações exibidas nos KPIs</span>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="card-metric text-center py-6 md:py-8 border-destructive/20 bg-destructive/5 animate-fade-in">
            <p className="text-destructive font-medium text-sm md:text-base mb-3">
              Não foi possível carregar os dados. 
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                refetchMetrics();
                refetchActivity();
              }}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Level 1: Main KPIs - "Como está o mês?" - Single column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-tour="dashboard-kpis">
          {metricsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-metric">
                  <Skeleton className="h-4 w-24 mb-4 rounded-lg" />
                  <Skeleton className="h-10 w-32 mb-2 rounded-lg" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              ))}
            </>
          ) : (
            <>
              <MetricCard
                label="FATURAMENTO"
                value={formatCurrency(metrics?.revenue || 0)}
                trend={{ 
                  value: metrics?.revenueTrend || 0, 
                  label: "vs mês anterior" 
                }}
                icon={<TrendingUp size={20} className="text-white" />}
                variant="featured"
                delay={0}
              />
              <MetricCard
                label="LUCRO LÍQUIDO"
                value={formatCurrency(metrics?.profit || 0)}
                trend={{ 
                  value: metrics?.profitTrend || 0, 
                  label: "vs mês anterior" 
                }}
                icon={<DollarSign size={20} className="text-white" />}
                variant="accent"
                tooltip={metrics?.hasPendingCogs 
                  ? "Algumas vendas têm custo de produto pendente. O lucro será recalculado automaticamente."
                  : "Lucro = Faturamento - taxas - fretes - custos fixos - custos de produto"
                }
                badge={metrics?.hasPendingCogs ? { variant: "warning" as const, label: "Estimado" } : undefined}
                delay={100}
              />
              <MetricCard
                label="MARGEM MÉDIA"
                value={`${(metrics?.marginPercent || 0).toFixed(1)}%`}
                icon={<Percent size={20} />}
                badge={metrics?.hasPendingCogs 
                  ? { variant: "warning" as const, label: "Estimado" }
                  : (metrics ? getMarginBadge(metrics.marginPercent) : undefined)
                }
                tooltip={metrics?.hasPendingCogs 
                  ? "Margem estimada. Custos pendentes serão atualizados quando taxas de importação forem registradas."
                  : "Margem = Lucro ÷ Faturamento × 100"
                }
                delay={200}
              />
              <MetricCard
                label="ITENS EM ESTOQUE"
                value={String(metrics?.stockItems || 0)}
                icon={<Package size={20} />}
                alert={metrics?.lowStockAlert && metrics?.lowStockCount ? {
                  icon: <AlertTriangle size={14} />,
                  text: `${metrics.lowStockCount} produto${metrics.lowStockCount === 1 ? '' : 's'} com estoque baixo`
                } : undefined}
                delay={300}
              />
            </>
          )}
        </div>

        {/* Level 2: Secondary Insights - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {insightsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-metric p-3 md:p-4">
                  <Skeleton className="h-3 w-16 md:w-20 mb-2 rounded" />
                  <Skeleton className="h-4 md:h-5 w-20 md:w-28 mb-1 rounded" />
                  <Skeleton className="h-3 w-12 md:w-16 rounded" />
                </div>
              ))}
            </>
          ) : (
            <>
              <InsightCard insight={insights?.topProduct} fallback="Nenhuma venda" />
              <InsightCard insight={insights?.mostProfitable} fallback="Nenhuma venda" />
              <InsightCard insight={insights?.bestDay} fallback="Sem dados" />
              <InsightCard insight={insights?.topPaymentMethod} fallback="Sem dados" />
            </>
          )}
        </div>

        {/* Charts Section - Collapsible on mobile */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sales Chart - 2 columns */}
          <div className="lg:col-span-2">
            <SalesChart data={salesChartData || []} isLoading={chartLoading} />
          </div>
          
          {/* Payment Distribution */}
          <div>
            <PaymentChart data={paymentData || []} isLoading={paymentLoading} />
          </div>

          {/* Team Profit Ranking */}
          <div>
            <TeamProfitRanking data={teamProfitData} isLoading={teamProfitLoading} />
          </div>
        </div>

        {/* Mobile Charts - Accordion (only one open at a time) */}
        <div className="md:hidden space-y-2">
          {/* Sales Chart */}
          <div className="card-metric overflow-hidden">
            <button
              onClick={() => setOpenChart(openChart === 'sales' ? null : 'sales')}
              className="w-full flex items-center justify-between p-3 font-semibold text-foreground text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📈</span>
                <span>Gráfico de Vendas</span>
              </div>
              <ChevronDown 
                size={18} 
                className={`transition-transform duration-200 text-muted-foreground ${openChart === 'sales' ? 'rotate-180' : ''}`} 
              />
            </button>
            {openChart === 'sales' && (
              <div className="px-3 pb-3 animate-fade-in">
                <SalesChart data={salesChartData || []} isLoading={chartLoading} />
              </div>
            )}
          </div>
          
          {/* Payment Distribution */}
          <div className="card-metric overflow-hidden">
            <button
              onClick={() => setOpenChart(openChart === 'payment' ? null : 'payment')}
              className="w-full flex items-center justify-between p-3 font-semibold text-foreground text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <span>Distribuição de Pagamentos</span>
              </div>
              <ChevronDown 
                size={18} 
                className={`transition-transform duration-200 text-muted-foreground ${openChart === 'payment' ? 'rotate-180' : ''}`} 
              />
            </button>
            {openChart === 'payment' && (
              <div className="px-3 pb-3 animate-fade-in">
                <PaymentChart data={paymentData || []} isLoading={paymentLoading} />
              </div>
            )}
          </div>

          {/* Team Profit Ranking on mobile */}
          <TeamProfitRanking data={teamProfitData} isLoading={teamProfitLoading} />
        </div>

        {/* Level 3: Recent Activity - Drill-down */}
        <div>
          <RecentActivity 
            activities={recentActivity || []} 
            isLoading={activityLoading} 
          />
        </div>

        {/* Empty State */}
        {!metricsLoading && hasNoData && (
          <div className="card-metric text-center py-12 md:py-16 animate-fade-in-up">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary mx-auto mb-4 md:mb-6 flex items-center justify-center">
              <TrendingUp size={28} className="text-white md:hidden" />
              <TrendingUp size={32} className="text-white hidden md:block" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 md:mb-3">
              Sem dados suficientes para este período
            </h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto px-4">
              Quando você registrar sua primeira compra ou venda, tudo aparece aqui. 
              Seu painel vai ganhar vida!
            </p>
          </div>
        )}
      </div>

      <NovaVendaModal 
        open={isVendaModalOpen} 
        onOpenChange={setIsVendaModalOpen}
        onSuccess={handleVendaSuccess}
      />

      {/* FAB for mobile */}
      <FloatingActionButton
        onNewSale={() => setIsVendaModalOpen(true)}
        onNewPurchase={() => navigate('/compras/nova')}
      />

      {/* Onboarding Tour */}
      <OnboardingTour 
        run={runTour}
        onComplete={() => {
          setRunTour(false);
          completeOnboarding();
        }}
      />
    </DashboardLayout>
  );
};

export default Index;
