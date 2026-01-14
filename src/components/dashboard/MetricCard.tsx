import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "featured" | "accent";
  subtext?: string;
  delay?: number;
  tooltip?: string;
  badge?: {
    variant: "default" | "success" | "warning" | "destructive";
    label: string;
  };
  alert?: {
    icon: React.ReactNode;
    text: string;
  };
}

export const MetricCard = ({ 
  label, 
  value, 
  trend, 
  icon,
  variant = "default",
  subtext,
  delay = 0,
  tooltip,
  badge,
  alert
}: MetricCardProps) => {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;
  const isNeutral = trend && trend.value === 0;

  const LabelWithTooltip = () => (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "text-label",
        variant === "featured" && "text-muted-foreground dark:opacity-70",
        variant === "accent" && "text-white/70"
      )}>
        {label}
      </span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={14} className={cn(
              "cursor-help transition-opacity",
              variant === "featured" 
                ? "text-muted-foreground opacity-50 hover:opacity-80" 
                : variant === "accent"
                  ? "text-white/40 hover:text-white/70"
                  : "text-muted-foreground opacity-50 hover:opacity-80"
            )} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-card border-border shadow-lg">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  if (variant === "featured") {
    return (
      <div 
        className="card-featured group animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <LabelWithTooltip />
            {icon && (
              <span className="p-2.5 rounded-xl bg-primary/15 dark:bg-white/10 text-primary dark:text-white ring-1 ring-primary/20 dark:ring-white/10">
                {icon}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-metric-lg tabular-nums text-foreground">
              {value}
            </p>

            {badge && (
              <Badge variant={badge.variant} className="text-[10px] font-bold">
                {badge.label}
              </Badge>
            )}

            {subtext && (
              <p className="text-caption opacity-60">
                {subtext}
              </p>
            )}

            {trend && (
              <div className="flex items-center gap-2.5 pt-1">
                <span className={cn(
                  "trend-badge",
                  isPositive && "trend-badge-positive",
                  isNegative && "trend-badge-negative",
                  isNeutral && "bg-muted dark:bg-white/15 text-muted-foreground dark:text-white/70"
                )}>
                  {isPositive && <TrendingUp size={13} strokeWidth={2.5} />}
                  {isNegative && <TrendingDown size={13} strokeWidth={2.5} />}
                  {isNeutral && <Minus size={13} strokeWidth={2.5} />}
                  {isPositive && "+"}
                  {trend.value}%
                </span>
                <span className="text-caption opacity-60">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "accent") {
    return (
      <div 
        className="card-accent group animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <LabelWithTooltip />
            {icon && (
              <span className="p-2.5 rounded-xl bg-white/20 ring-1 ring-white/10">
                {icon}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-metric text-white tabular-nums">
              {value}
            </p>

            {badge && (
              <Badge variant={badge.variant} className="text-[10px] font-bold bg-white/20 text-white border-white/20">
                {badge.label}
              </Badge>
            )}

            {subtext && (
              <p className="text-xs text-white/60">
                {subtext}
              </p>
            )}

            {trend && (
              <div className="flex items-center gap-2.5 pt-1">
                <span className={cn(
                  "trend-badge bg-white/20 text-white"
                )}>
                  {isPositive && <TrendingUp size={13} strokeWidth={2.5} />}
                  {isNegative && <TrendingDown size={13} strokeWidth={2.5} />}
                  {isNeutral && <Minus size={13} strokeWidth={2.5} />}
                  {isPositive && "+"}
                  {trend.value}%
                </span>
                <span className="text-sm text-white/60">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="card-metric group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <LabelWithTooltip />
        {icon && (
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-all duration-200 group-hover:ring-primary/20 group-hover:bg-primary/15">
            {icon}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-metric tabular-nums text-foreground">
          {value}
        </p>

        {badge && (
          <Badge variant={badge.variant} className="text-[10px] font-bold">
            {badge.label}
          </Badge>
        )}

        {alert && (
          <div className="flex items-center gap-1.5 text-warning">
            {alert.icon}
            <span className="text-xs font-semibold">{alert.text}</span>
          </div>
        )}

        {subtext && (
          <p className="text-caption">
            {subtext}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-2.5 pt-1">
            <span className={cn(
              "trend-badge",
              isPositive && "trend-badge-positive",
              isNegative && "trend-badge-negative",
              isNeutral && "bg-muted text-muted-foreground"
            )}>
              {isPositive && <TrendingUp size={13} strokeWidth={2.5} />}
              {isNegative && <TrendingDown size={13} strokeWidth={2.5} />}
              {isNeutral && <Minus size={13} strokeWidth={2.5} />}
              {isPositive && "+"}
              {trend.value}%
            </span>
            <span className="text-caption">
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
