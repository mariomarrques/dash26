import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface MargensFiltersState {
  valorMin: number | null;
  valorMax: number | null;
  lucroMin: number | null;
  lucroMax: number | null;
  margemMin: number | null;
  margemMax: number | null;
}

interface MargensFiltersProps {
  filters: MargensFiltersState;
  onFiltersChange: (filters: MargensFiltersState) => void;
}

const initialFilters: MargensFiltersState = {
  valorMin: null,
  valorMax: null,
  lucroMin: null,
  lucroMax: null,
  margemMin: null,
  margemMax: null,
};

export function MargensFilters({ filters, onFiltersChange }: MargensFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  const handleChange = (field: keyof MargensFiltersState, value: string) => {
    const numValue = value === "" ? null : parseFloat(value.replace(",", "."));
    onFiltersChange({
      ...filters,
      [field]: isNaN(numValue as number) ? null : numValue,
    });
  };

  const clearFilters = () => {
    onFiltersChange(initialFilters);
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "";
    return value.toString().replace(".", ",");
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-border rounded-xl hover:bg-muted/50"
          >
            <Filter size={16} />
            Filtros Avançados
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                Ativo
              </span>
            )}
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
            Limpar filtros
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="p-4 bg-card border border-border rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Valor Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Valor (R$)
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Mín"
                    value={formatValue(filters.valorMin)}
                    onChange={(e) => handleChange("valorMin", e.target.value)}
                    className="bg-background border-border rounded-lg text-sm"
                  />
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="relative flex-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Máx"
                    value={formatValue(filters.valorMax)}
                    onChange={(e) => handleChange("valorMax", e.target.value)}
                    className="bg-background border-border rounded-lg text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: 500 a 1000 para vendas grandes
              </p>
            </div>

            {/* Lucro Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Lucro (R$)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Mín"
                  value={formatValue(filters.lucroMin)}
                  onChange={(e) => handleChange("lucroMin", e.target.value)}
                  className="bg-background border-border rounded-lg text-sm flex-1"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Máx"
                  value={formatValue(filters.lucroMax)}
                  onChange={(e) => handleChange("lucroMax", e.target.value)}
                  className="bg-background border-border rounded-lg text-sm flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: acima de 200 para lucros altos
              </p>
            </div>

            {/* Margem Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Margem (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Mín"
                  value={formatValue(filters.margemMin)}
                  onChange={(e) => handleChange("margemMin", e.target.value)}
                  className="bg-background border-border rounded-lg text-sm flex-1"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Máx"
                  value={formatValue(filters.margemMax)}
                  onChange={(e) => handleChange("margemMax", e.target.value)}
                  className="bg-background border-border rounded-lg text-sm flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: abaixo de 30% para alertas
              </p>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { initialFilters };
