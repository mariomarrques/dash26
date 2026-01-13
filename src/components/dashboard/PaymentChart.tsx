import { PaymentDistribution } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentChartProps {
  data: PaymentDistribution[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
];

export function PaymentChart({ data, isLoading }: PaymentChartProps) {
  if (isLoading) {
    return (
      <div className="card-metric p-6 h-full">
        <Skeleton className="h-5 w-40 mb-4 rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card-metric p-6 h-full">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
          Métodos de Pagamento
        </h3>
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground text-sm">
            Sem dados suficientes.
          </p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="card-metric p-6 h-full">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
        Métodos de Pagamento
      </h3>
      
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.method} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {item.percent}%
              </span>
            </div>
            <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  background: COLORS[index % COLORS.length]
                }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-medium text-white drop-shadow">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
