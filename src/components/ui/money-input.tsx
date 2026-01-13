import * as React from "react";
import { cn } from "@/lib/utils";

interface MoneyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  currency?: "BRL" | "USD";
}

/**
 * Componente de input monetário com formatação pt-BR
 * - Exibe valor formatado com vírgula (ex: 180,00)
 * - Remove zeros à esquerda
 * - Step de R$ 10 nas setas
 * - Valor interno sempre numérico
 */
const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, currency = "BRL", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Format value for display (when not focused)
    const formatForDisplay = (val: number): string => {
      if (val === 0) return "";
      return val.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Parse display value to number
    const parseToNumber = (str: string): number => {
      if (!str || str.trim() === "") return 0;
      // Remove thousand separators (dots) and replace decimal comma with dot
      const normalized = str
        .replace(/\./g, "")
        .replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Update display value when external value changes (and not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatForDisplay(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw number for easier editing
      if (value > 0) {
        setDisplayValue(value.toString().replace(".", ","));
      } else {
        setDisplayValue("");
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const numericValue = parseToNumber(displayValue);
      onChange(numericValue);
      setDisplayValue(formatForDisplay(numericValue));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow only numbers, comma, and dot
      const sanitized = inputValue.replace(/[^\d.,]/g, "");
      setDisplayValue(sanitized);
      
      // Update parent with parsed value
      const numericValue = parseToNumber(sanitized);
      onChange(numericValue);
    };

    // Handle step buttons (arrows)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange(value + 10);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(0, value - 10));
      }
      props.onKeyDown?.(e);
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || "0,00"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
