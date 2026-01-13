import { cn } from "@/lib/utils";
import { Package, ShoppingBag, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickStatsData {
  stockItems: number;
  salesToday: number;
  lowStockCount: number;
}

interface QuickStatsProps {
  stats?: QuickStatsData;
  isLoading: boolean;
}

export const QuickStats = ({ stats, isLoading }: QuickStatsProps) => {
  if (isLoading) {
    return (
      <div className="card-metric animate-fade-in">
        <h3 className="font-bold text-foreground text-lg mb-6">Visão Rápida</h3>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-4 rounded-2xl bg-muted/50">
              <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
              <Skeleton className="h-8 w-12 mx-auto mb-2 rounded-lg" />
              <Skeleton className="h-3 w-16 mx-auto rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: "Itens em estoque",
      value: stats?.stockItems || 0,
      icon: <Package size={20} className="text-white" />,
      alert: false,
      gradient: "bg-gradient-primary"
    },
    {
      label: "Vendas hoje",
      value: stats?.salesToday || 0,
      icon: <ShoppingBag size={20} className="text-white" />,
      alert: false,
      gradient: "bg-gradient-success"
    },
    {
      label: "Estoque baixo",
      value: stats?.lowStockCount || 0,
      icon: <AlertTriangle size={20} className="text-white" />,
      alert: (stats?.lowStockCount || 0) > 0,
      gradient: "bg-gradient-warm"
    }
  ];

  return (
    <div className="card-metric animate-fade-in">
      <h3 className="font-bold text-foreground text-lg mb-6">Visão Rápida</h3>
      
      <div className="grid grid-cols-3 gap-4">
        {statItems.map((stat, index) => (
          <div 
            key={stat.label}
            className={cn(
              "text-center p-4 rounded-2xl transition-all duration-300 hover:scale-105",
              stat.alert ? "bg-accent/10" : "bg-muted/50",
              "animate-scale-in"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-soft",
              stat.gradient
            )}>
              {stat.icon}
            </div>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              stat.alert && stat.value > 0 && "text-accent"
            )}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
