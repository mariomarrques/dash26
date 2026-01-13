import { SalesChartData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
      <div className="card-metric p-6">
        <Skeleton className="h-5 w-40 mb-4 rounded" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  const hasData = data.some(d => d.current > 0 || d.previous > 0);

  if (!hasData) {
    return (
      <div className="card-metric p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
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
    <div className="card-metric p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Vendas no Período
        </h3>
        <div className="flex items-center gap-2">
          <Switch 
            id="comparison" 
            checked={showComparison}
            onCheckedChange={setShowComparison}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="comparison" className="text-xs text-muted-foreground cursor-pointer">
            Comparar
          </Label>
        </div>
      </div>
      
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
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
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              formatter={(value: number) => [
                new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(value),
              ]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="previous"
                name="Mês anterior"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--muted-foreground))' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="current"
              name="Mês atual"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2 }}
            />
            {showComparison && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
