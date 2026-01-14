import { SalesChartData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SalesChartProps {
  data: SalesChartData[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `R$${(value / 1000).toFixed(1)}k`;
  }
  return `R$${value}`;
};

export function SalesChart({ data, isLoading }: SalesChartProps) {
  const [showComparison, setShowComparison] = useState(false);

  if (isLoading) {
    return (
      <div className="card-metric">
        <Skeleton className="h-5 w-40 mb-4 rounded" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  const hasData = data.some(d => d.current > 0 || d.previous > 0);

  if (!hasData) {
    return (
      <div className="card-metric">
        <h3 className="text-label mb-4">
          Vendas no Período
        </h3>
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Sem dados suficientes para este período.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-metric">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-label">
          Vendas no Período
        </h3>
        <div className="flex items-center gap-2">
          <Switch 
            id="comparison" 
            checked={showComparison}
            onCheckedChange={setShowComparison}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="comparison" className="text-xs text-muted-foreground cursor-pointer font-medium">
            Comparar
          </Label>
        </div>
      </div>
      
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.5}
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                fontSize: '12px',
                fontWeight: '500'
              }}
              formatter={(value: number) => [
                new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(value),
              ]}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            {showComparison && (
              <>
                <Area
                  type="monotone"
                  dataKey="previous"
                  name="Mês anterior"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorPrevious)"
                  activeDot={{ r: 4, fill: 'hsl(var(--muted-foreground))' }}
                />
              </>
            )}
            <Area
              type="monotone"
              dataKey="current"
              name="Mês atual"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#colorCurrent)"
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2 }}
            />
            {showComparison && <Legend wrapperStyle={{ fontSize: '11px' }} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
