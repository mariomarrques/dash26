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
  'hsl(var(--success))',
  'hsl(var(--muted-foreground))',
];

export function PaymentChart({ data, isLoading }: PaymentChartProps) {
  if (isLoading) {
    return (
      <div className="card-metric h-full">
        <Skeleton className="h-4 w-40 mb-5 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card-metric h-full">
        <h3 className="text-label mb-5">
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
    <div className="card-metric h-full">
      <h3 className="text-label mb-5">
        Métodos de Pagamento
      </h3>
      
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.method} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {item.percent}%
              </span>
            </div>
            <div className="relative h-9 bg-muted/40 rounded-lg overflow-hidden ring-1 ring-border/50">
              <div 
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out group-hover:brightness-110"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  background: COLORS[index % COLORS.length]
                }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-bold text-white drop-shadow-sm">
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

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
