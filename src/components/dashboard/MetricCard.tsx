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
        variant === "featured" && "text-white/60",
        variant === "accent" && "text-white/70"
      )}>
        {label}
      </span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={14} className={cn(
              "cursor-help",
              variant === "featured" || variant === "accent" 
                ? "text-white/40" 
                : "text-muted-foreground"
            )} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
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
          <div className="flex items-start justify-between mb-4">
            <LabelWithTooltip />
            {icon && (
              <span className="p-2.5 rounded-xl bg-white/10">
                {icon}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-metric-lg text-white tabular-nums">
              {value}
            </p>

            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.label}
              </Badge>
            )}

            {subtext && (
              <p className="text-caption text-white/50">
                {subtext}
              </p>
            )}

            {trend && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  "trend-badge",
                  isPositive && "trend-badge-positive",
                  isNegative && "trend-badge-negative",
                  isNeutral && "bg-white/20 text-white"
                )}>
                  {isPositive && <TrendingUp size={14} />}
                  {isNegative && <TrendingDown size={14} />}
                  {isNeutral && <Minus size={14} />}
                  {isPositive && "+"}
                  {trend.value}%
                </span>
                <span className="text-caption text-white/60">
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
        <div className="flex items-start justify-between mb-4">
          <LabelWithTooltip />
          {icon && (
            <span className="p-2.5 rounded-xl bg-white/20">
              {icon}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-metric text-white tabular-nums">
            {value}
          </p>

          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
          )}

          {subtext && (
            <p className="text-xs text-white/60">
              {subtext}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "trend-badge bg-white/20 text-white"
              )}>
                {isPositive && <TrendingUp size={14} />}
                {isNegative && <TrendingDown size={14} />}
                {isNeutral && <Minus size={14} />}
                {isPositive && "+"}
                {trend.value}%
              </span>
              <span className="text-sm text-white/70">
                {trend.label}
              </span>
            </div>
          )}
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
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-metric tabular-nums text-foreground">
          {value}
        </p>

        {badge && (
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        )}

        {alert && (
          <div className="flex items-center gap-1.5 text-warning">
            {alert.icon}
            <span className="text-xs font-medium">{alert.text}</span>
          </div>
        )}

        {subtext && (
          <p className="text-caption">
            {subtext}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "trend-badge",
              isPositive && "trend-badge-positive",
              isNegative && "trend-badge-negative",
              isNeutral && "bg-muted text-muted-foreground"
            )}>
              {isPositive && <TrendingUp size={14} />}
              {isNegative && <TrendingDown size={14} />}
              {isNeutral && <Minus size={14} />}
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
