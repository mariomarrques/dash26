import { SecondaryInsight } from "@/hooks/useDashboardData";
import { useIsMobile } from "@/hooks/use-mobile";

interface InsightCardProps {
  insight: SecondaryInsight | null | undefined;
  fallback?: string;
}

export function InsightCard({ insight, fallback = "—" }: InsightCardProps) {
  const isMobile = useIsMobile();

  if (!insight) {
    return (
      <div className="card-metric p-3 md:p-4 animate-fade-in-up">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          —
        </p>
        <p className="text-sm font-medium text-muted-foreground">
          {fallback}
        </p>
      </div>
    );
  }

  // Mobile: 2-line structure for better readability
  if (isMobile) {
    return (
      <div className="card-metric p-3 animate-fade-in-up hover:shadow-elevated transition-shadow min-h-[72px]">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
          {insight.label}
        </p>
        <p className="text-sm font-bold text-foreground leading-tight">
          {insight.value}
        </p>
        {insight.subtext && (
          <p className="text-[11px] text-primary mt-1 leading-tight">
            {insight.subtext}
          </p>
        )}
      </div>
    );
  }

  // Desktop: Original layout
  return (
    <div className="card-metric p-4 animate-fade-in-up hover:shadow-elevated transition-shadow">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {insight.label}
      </p>
      <p className="text-sm font-bold text-foreground truncate" title={insight.value}>
        {insight.value}
      </p>
      {insight.subtext && (
        <p className="text-xs text-primary mt-1">
          {insight.subtext}
        </p>
      )}
    </div>
  );
}
