import React, { createContext, useContext, useState, ReactNode } from "react";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths, differenceInDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PeriodFilterValue {
  primary: DateRange;
  comparison?: DateRange;
  label: string;
}

interface PeriodContextType {
  period: PeriodFilterValue;
  setPeriod: (value: PeriodFilterValue) => void;
  // Convenience getters for SQL queries
  primaryStartDate: string;
  primaryEndDate: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  hasComparison: boolean;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

// Helper to get comparison period automatically if not provided
export const getAutoComparisonPeriod = (primary: DateRange): DateRange => {
  const daysDiff = differenceInDays(primary.to, primary.from) + 1;
  return {
    from: startOfDay(subDays(primary.from, daysDiff)),
    to: endOfDay(subDays(primary.from, 1))
  };
};

// Helper to get initial period value
export const getDefaultPeriodValue = (): PeriodFilterValue => {
  const today = new Date();
  return {
    primary: { from: startOfMonth(today), to: endOfMonth(today) },
    label: 'Mês atual'
  };
};

// Format date to YYYY-MM-DD for SQL queries
const formatDateForSQL = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

interface PeriodProviderProps {
  children: ReactNode;
}

export const PeriodProvider = ({ children }: PeriodProviderProps) => {
  const [period, setPeriod] = useState<PeriodFilterValue>(getDefaultPeriodValue);

  const primaryStartDate = formatDateForSQL(period.primary.from);
  const primaryEndDate = formatDateForSQL(period.primary.to);
  
  const comparisonStartDate = period.comparison 
    ? formatDateForSQL(period.comparison.from) 
    : undefined;
  const comparisonEndDate = period.comparison 
    ? formatDateForSQL(period.comparison.to) 
    : undefined;

  const value: PeriodContextType = {
    period,
    setPeriod,
    primaryStartDate,
    primaryEndDate,
    comparisonStartDate,
    comparisonEndDate,
    hasComparison: !!period.comparison
  };

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
};

export const usePeriod = (): PeriodContextType => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
};
