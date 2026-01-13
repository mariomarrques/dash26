import { useState } from "react";
import { TeamProfitability } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamProfitRankingProps {
  data: TeamProfitability[] | undefined;
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

const getProfitColor = (profit: number) => {
  if (profit > 0) return "text-emerald-600 dark:text-emerald-400";
  if (profit < 0) return "text-red-500 dark:text-red-400";
  return "text-muted-foreground";
};

const getRankBadge = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
};

export function TeamProfitRanking({ data, isLoading }: TeamProfitRankingProps) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  if (isLoading) {
    return (
      <div className="card-metric p-4 md:p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card-metric p-4 md:p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">Times mais lucrativos</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhuma venda no período
        </p>
      </div>
    );
  }

  const visibleItems = expanded ? data.slice(0, 5) : data.slice(0, 3);
  const hasMore = data.length > 5;

  return (
    <>
      <div className="card-metric p-4 md:p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Times mais lucrativos</h3>
          </div>
          {data.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} className="mr-1" />
                  Menos
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="mr-1" />
                  Mais
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2.5">
          {visibleItems.map((team, index) => (
            <div
              key={`${team.team}-${team.season}`}
              className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm w-6 flex-shrink-0">{getRankBadge(index)}</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {team.displayName}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-sm font-semibold ${getProfitColor(team.profit)}`}>
                  {formatCurrency(team.profit)}
                </span>
                {team.hasPending && (
                  <span className="text-xs text-amber-500" title="Custo pendente">*</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <Button
            variant="link"
            size="sm"
            className="w-full mt-3 text-xs h-7"
            onClick={() => setShowAll(true)}
          >
            Ver todos ({data.length} times)
          </Button>
        )}
      </div>

      {/* Full list dialog */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy size={20} className="text-primary" />
              Ranking de Lucro por Time
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 mt-4">
            {data.map((team, index) => (
              <div
                key={`${team.team}-${team.season}`}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm w-6 flex-shrink-0 font-medium">
                    {getRankBadge(index)}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {team.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-sm font-bold ${getProfitColor(team.profit)}`}>
                    {formatCurrency(team.profit)}
                  </span>
                  {team.hasPending && (
                    <span className="text-xs text-amber-500" title="Custo pendente">*</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.some(t => t.hasPending) && (
            <p className="text-xs text-muted-foreground mt-4">
              * Valores marcados têm custo de produto pendente
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
