import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown, Check, GitCompareArrows, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PeriodFilterValue {
  primary: DateRange;
  comparison?: DateRange;
  label: string;
}

type QuickPeriod = 'today' | 'last7days' | 'last30days' | 'currentMonth' | 'previousMonth';

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
}

const QUICK_PERIODS: { id: QuickPeriod; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'last7days', label: 'Últimos 7 dias' },
  { id: 'last30days', label: 'Últimos 30 dias' },
  { id: 'currentMonth', label: 'Mês atual' },
  { id: 'previousMonth', label: 'Mês anterior' },
];

const getQuickPeriodDates = (period: QuickPeriod): DateRange => {
  const today = new Date();
  
  switch (period) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case 'last7days':
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case 'last30days':
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    case 'currentMonth':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'previousMonth':
      const prevMonth = subMonths(today, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    default:
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
};

const getComparisonPeriod = (primary: DateRange): DateRange => {
  const daysDiff = Math.ceil((primary.to.getTime() - primary.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return {
    from: startOfDay(subDays(primary.from, daysDiff)),
    to: endOfDay(subDays(primary.from, 1))
  };
};

const formatDateRange = (range: DateRange): string => {
  if (isSameDay(range.from, range.to)) {
    return format(range.from, "dd/MM/yyyy", { locale: ptBR });
  }
  
  // Check if it's a full month
  const monthStart = startOfMonth(range.from);
  const monthEnd = endOfMonth(range.from);
  if (isSameDay(range.from, monthStart) && isSameDay(range.to, monthEnd)) {
    return format(range.from, "MMMM yyyy", { locale: ptBR });
  }
  
  return `${format(range.from, "dd/MM", { locale: ptBR })} - ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [selectedQuickPeriod, setSelectedQuickPeriod] = useState<QuickPeriod | null>('currentMonth');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.primary.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.primary.to);
  const [compareEnabled, setCompareEnabled] = useState(!!value.comparison);
  const [comparisonRange, setComparisonRange] = useState<DateRange | undefined>(value.comparison);
  
  // Pending state for "Apply" button
  const [pendingPrimary, setPendingPrimary] = useState<DateRange>(value.primary);
  const [pendingLabel, setPendingLabel] = useState(value.label);
  
  useEffect(() => {
    if (selectedQuickPeriod && mode === 'quick') {
      const dates = getQuickPeriodDates(selectedQuickPeriod);
      setPendingPrimary(dates);
      const periodInfo = QUICK_PERIODS.find(p => p.id === selectedQuickPeriod);
      setPendingLabel(periodInfo?.label || 'Período');
      
      if (compareEnabled) {
        setComparisonRange(getComparisonPeriod(dates));
      }
    }
  }, [selectedQuickPeriod, mode, compareEnabled]);
  
  useEffect(() => {
    if (mode === 'custom' && customFrom && customTo) {
      const dates = { from: startOfDay(customFrom), to: endOfDay(customTo) };
      setPendingPrimary(dates);
      setPendingLabel('Período personalizado');
      
      if (compareEnabled) {
        setComparisonRange(getComparisonPeriod(dates));
      }
    }
  }, [customFrom, customTo, mode, compareEnabled]);
  
  const handleApply = () => {
    onChange({
      primary: pendingPrimary,
      comparison: compareEnabled ? comparisonRange : undefined,
      label: pendingLabel
    });
    setIsOpen(false);
  };
  
  const handleQuickPeriodSelect = (period: QuickPeriod) => {
    setSelectedQuickPeriod(period);
    setMode('quick');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between gap-2 min-w-[200px] bg-muted/50 border-border hover:bg-muted",
            value.comparison && "ring-2 ring-primary/20"
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-primary" />
            <span className="font-medium capitalize">{value.label}</span>
          </div>
          {value.comparison && (
            <Badge variant="secondary" className="text-xs ml-2">
              <GitCompareArrows size={12} className="mr-1" />
              Comparando
            </Badge>
          )}
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="p-4 space-y-4 min-w-[320px]">
          {/* Quick Periods */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Períodos rápidos
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PERIODS.map((period) => (
                <Button
                  key={period.id}
                  variant={selectedQuickPeriod === period.id && mode === 'quick' ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-sm"
                  onClick={() => handleQuickPeriodSelect(period.id)}
                >
                  {selectedQuickPeriod === period.id && mode === 'quick' && (
                    <Check size={14} className="mr-1" />
                  )}
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-border" />
          
          {/* Custom Range */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Intervalo personalizado
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customFrom && "text-muted-foreground"
                      )}
                      onClick={() => setMode('custom')}
                    >
                      <CalendarIcon size={14} className="mr-2" />
                      {customFrom ? format(customFrom, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={(date) => {
                        setCustomFrom(date);
                        setMode('custom');
                        setSelectedQuickPeriod(null);
                      }}
                      disabled={(date) => customTo ? date > customTo : false}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customTo && "text-muted-foreground"
                      )}
                      onClick={() => setMode('custom')}
                    >
                      <CalendarIcon size={14} className="mr-2" />
                      {customTo ? format(customTo, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={(date) => {
                        setCustomTo(date);
                        setMode('custom');
                        setSelectedQuickPeriod(null);
                      }}
                      disabled={(date) => customFrom ? date < customFrom : false}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-border" />
          
          {/* Comparison Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompareArrows size={16} className="text-muted-foreground" />
                <Label className="text-sm font-medium">Comparar com período anterior</Label>
              </div>
              <Switch
                checked={compareEnabled}
                onCheckedChange={(checked) => {
                  setCompareEnabled(checked);
                  if (checked) {
                    setComparisonRange(getComparisonPeriod(pendingPrimary));
                  }
                }}
              />
            </div>
            
            {compareEnabled && comparisonRange && (
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Comparando com: {formatDateRange(comparisonRange)}
                </p>
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t border-border" />
          
          {/* Preview & Apply */}
          <div className="space-y-3">
            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Período selecionado:</p>
              <p className="text-sm font-medium text-foreground">
                {formatDateRange(pendingPrimary)}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleApply}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to get initial period value
export const getDefaultPeriodValue = (): PeriodFilterValue => {
  const today = new Date();
  return {
    primary: { from: startOfMonth(today), to: endOfMonth(today) },
    label: 'Mês atual'
  };
};
