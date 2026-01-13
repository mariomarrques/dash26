import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

export const MonthSelector = ({ selectedMonth, onMonthChange }: MonthSelectorProps) => {
  const currentDate = new Date();

  const goToPreviousMonth = () => {
    onMonthChange(subMonths(selectedMonth, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(addMonths(selectedMonth, 1));
  };

  const isCurrentMonth = isSameMonth(selectedMonth, currentDate);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPreviousMonth}
        className="p-2 rounded-lg hover:bg-muted transition-smooth"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={20} className="text-muted-foreground" />
      </button>

      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 min-w-[180px] justify-center",
        isCurrentMonth && "ring-2 ring-primary/20"
      )}>
        <Calendar size={16} className="text-primary" />
        <span className="font-semibold text-foreground capitalize">
          {format(selectedMonth, 'MMMM', { locale: ptBR })}
        </span>
        <span className="text-muted-foreground">
          {format(selectedMonth, 'yyyy')}
        </span>
      </div>

      <button
        onClick={goToNextMonth}
        className="p-2 rounded-lg hover:bg-muted transition-smooth"
        aria-label="Próximo mês"
      >
        <ChevronRight size={20} className="text-muted-foreground" />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={() => onMonthChange(new Date())}
          className="text-sm text-primary font-medium hover:underline ml-2 transition-smooth"
        >
          Hoje
        </button>
      )}
    </div>
  );
};
