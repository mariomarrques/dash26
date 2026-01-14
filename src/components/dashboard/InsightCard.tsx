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
      <div className="card-metric animate-fade-in-up">
        <p className="text-label mb-1.5">
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
      <div className="card-metric animate-fade-in-up min-h-[76px] group">
        <p className="text-label mb-2">
          {insight.label}
        </p>
        <p className="text-sm font-bold text-foreground leading-tight">
          {insight.value}
        </p>
        {insight.subtext && (
          <p className="text-[11px] font-semibold text-primary mt-1.5 leading-tight">
            {insight.subtext}
          </p>
        )}
      </div>
    );
  }

  // Desktop: Original layout
  return (
    <div className="card-metric animate-fade-in-up group">
      <p className="text-label mb-1.5">
        {insight.label}
      </p>
      <p className="text-sm font-bold text-foreground truncate" title={insight.value}>
        {insight.value}
      </p>
      {insight.subtext && (
        <p className="text-xs font-semibold text-primary mt-1.5">
          {insight.subtext}
        </p>
      )}
    </div>
  );
}

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
