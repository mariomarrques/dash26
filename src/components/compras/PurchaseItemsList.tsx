import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Trash2, Package, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface PurchaseItem {
  id: string;
  qty: number;
  season: string;
  country: string;
  team: string;
  teamId: string | null;
  customTeam: boolean;
  productLabel: string;
  uniform: string;
  size: string;
  unitCost: number;
  currency: "BRL" | "USD";
  usdToBrlRate: number;
}

interface PurchaseItemsListProps {
  items: PurchaseItem[];
  onChange: (items: PurchaseItem[]) => void;
  extraCostsPerPiece: number;
}

const UNIFORM_SUGGESTIONS = ["Home I", "Away II", "Third III", "Treino I", "Treino II", "Pré-Jogo"];
const SIZE_SUGGESTIONS = ["S", "M", "L", "XL", "XXL", "XXXL"];
const SEASON_SUGGESTIONS = ["24/25", "25/26", "26/27"];
const DEFAULT_SEASON = "25/26";

export function PurchaseItemsList({ items, onChange, extraCostsPerPiece }: PurchaseItemsListProps) {
  const { user } = useAuth();
  const [lastUsdRate, setLastUsdRate] = useState<number>(5.5);

  // Fetch teams from global teams table
  const { data: teams } = useQuery({
    queryKey: ["teams_global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, country, name, league")
        .eq("is_active", true)
        .order("country")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get unique countries from teams
  const countries = [...new Set(teams?.map((t) => t.country) || [])].sort();
  
  // Get teams filtered by country
  const getTeamsForCountry = (country: string) => 
    teams?.filter((t) => t.country === country) || [];

  const addItem = () => {
    const newItem: PurchaseItem = {
      id: crypto.randomUUID(),
      qty: 1,
      season: DEFAULT_SEASON,
      country: "",
      team: "",
      teamId: null,
      customTeam: false,
      productLabel: "",
      uniform: "",
      size: "",
      unitCost: 0,
      currency: "BRL",
      usdToBrlRate: lastUsdRate,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<PurchaseItem>) => {
    onChange(items.map((item) => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, ...updates };
      
      // Auto-generate product label when team or season changes
      if ('team' in updates || 'season' in updates) {
        const team = updates.team !== undefined ? updates.team : item.team;
        const season = updates.season !== undefined ? updates.season : item.season;
        if (team) {
          updatedItem.productLabel = `${team} ${season}`;
        }
      }
      
      return updatedItem;
    }));
    
    // Track last USD rate for new items
    if (updates.usdToBrlRate) {
      setLastUsdRate(updates.usdToBrlRate);
    }
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const duplicateItem = (id: string) => {
    const itemToDuplicate = items.find((item) => item.id === id);
    if (!itemToDuplicate) return;
    
    const itemIndex = items.findIndex((item) => item.id === id);
    const duplicatedItem: PurchaseItem = {
      ...itemToDuplicate,
      id: crypto.randomUUID(),
      qty: 1, // Start with quantity 1
    };
    
    // Insert duplicated item right after the original
    const newItems = [...items];
    newItems.splice(itemIndex + 1, 0, duplicatedItem);
    onChange(newItems);
    
    toast.success("Item duplicado — ajuste apenas o que mudou.");
  };

  const incrementQty = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) updateItem(id, { qty: item.qty + 1 });
  };

  const decrementQty = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item && item.qty > 1) updateItem(id, { qty: item.qty - 1 });
  };

  const handleTeamSelect = (itemId: string, value: string) => {
    if (value === "__custom__") {
      updateItem(itemId, { team: "", teamId: null, customTeam: true });
    } else {
      const selectedTeam = teams?.find((t) => t.id === value);
      if (selectedTeam) {
        updateItem(itemId, { 
          team: selectedTeam.name, 
          teamId: selectedTeam.id,
          customTeam: false 
        });
      }
    }
  };

  const handleCountryChange = (itemId: string, country: string) => {
    // Reset team when country changes
    updateItem(itemId, { 
      country, 
      team: "", 
      teamId: null, 
      customTeam: false,
      productLabel: ""
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">
          Adicione itens para calcular o total.
        </p>
        <Button onClick={addItem} className="gap-2">
          <Plus size={18} />
          Adicionar item
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        As sugestões não limitam suas escolhas. Você pode digitar livremente.
      </p>
      
      {items.map((item, index) => {
        const unitCostBrl = item.currency === "USD" 
          ? item.unitCost * item.usdToBrlRate 
          : item.unitCost;
        const realCost = unitCostBrl + extraCostsPerPiece;
        const availableTeams = getTeamsForCountry(item.country);

        return (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                Item {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => duplicateItem(item.id)}
                  title="Duplicar item"
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  title="Remover item"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Season */}
              <div className="space-y-2">
                <Label>Temporada</Label>
                <Input
                  list={`seasons-${item.id}`}
                  placeholder="Ex: 25/26"
                  value={item.season}
                  onChange={(e) => updateItem(item.id, { season: e.target.value })}
                />
                <datalist id={`seasons-${item.id}`}>
                  {SEASON_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label>País do Time</Label>
                <Input
                  list={`countries-${item.id}`}
                  placeholder="Ex: Brasil"
                  value={item.country}
                  onChange={(e) => handleCountryChange(item.id, e.target.value)}
                />
                <datalist id={`countries-${item.id}`}>
                  {countries.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Team Selection */}
              <div className="space-y-2">
                <Label>Time</Label>
                {!item.customTeam && item.country && availableTeams.length > 0 ? (
                  <Select
                    value={item.teamId || ""}
                    onValueChange={(value) => handleTeamSelect(item.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o time" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__" className="text-primary font-medium">
                        Não encontrei meu time...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite o nome do time"
                      value={item.team}
                      onChange={(e) => updateItem(item.id, { 
                        team: e.target.value, 
                        teamId: null,
                        customTeam: true 
                      })}
                    />
                    {item.customTeam && item.country && availableTeams.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => updateItem(item.id, { customTeam: false, team: "", teamId: null })}
                      >
                        ← Voltar para lista de times
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Uniform */}
              <div className="space-y-2">
                <Label>Uniforme</Label>
                <Input
                  list={`uniforms-${item.id}`}
                  placeholder="Ex: Home I"
                  value={item.uniform}
                  onChange={(e) => updateItem(item.id, { uniform: e.target.value })}
                />
                <datalist id={`uniforms-${item.id}`}>
                  {UNIFORM_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label>Tamanho</Label>
                <Input
                  list={`sizes-${item.id}`}
                  placeholder="Ex: M"
                  value={item.size}
                  onChange={(e) => updateItem(item.id, { size: e.target.value })}
                />
                <datalist id={`sizes-${item.id}`}>
                  {SIZE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Quantity with stepper */}
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => decrementQty(item.id)}
                    disabled={item.qty <= 1}
                  >
                    <Minus size={14} />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                    className="w-20 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => incrementQty(item.id)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label>Preço Unitário</Label>
                <div className="flex gap-2">
                  <Select
                    value={item.currency}
                    onValueChange={(v: "BRL" | "USD") => updateItem(item.id, { currency: v })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">R$</SelectItem>
                      <SelectItem value="USD">US$</SelectItem>
                    </SelectContent>
                  </Select>
                  <MoneyInput
                    value={item.unitCost}
                    onChange={(value) => updateItem(item.id, { unitCost: value })}
                    currency={item.currency}
                  />
                </div>
              </div>

              {item.currency === "USD" && (
                <div className="space-y-2">
                  <Label>Cotação USD→BRL</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.usdToBrlRate || ""}
                    onChange={(e) => updateItem(item.id, { usdToBrlRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            {/* Product Label Preview */}
            {item.productLabel && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Produto: </span>
                <span className="text-sm font-medium">
                  {item.productLabel}
                  {item.uniform && ` — ${item.uniform}`}
                  {item.size && ` — ${item.size}`}
                </span>
              </div>
            )}

            {/* Cost Preview */}
            {item.unitCost > 0 && (
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>Base: R$ {unitCostBrl.toFixed(2)}</span>
                  {extraCostsPerPiece > 0 && (
                    <span>+ Rateio: R$ {extraCostsPerPiece.toFixed(2)}</span>
                  )}
                </div>
                <div className="font-semibold text-foreground">
                  Custo real: R$ {realCost.toFixed(2)} × {item.qty} = R$ {(realCost * item.qty).toFixed(2)}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button onClick={addItem} variant="outline" className="w-full gap-2">
        <Plus size={18} />
        Adicionar item
      </Button>
    </div>
  );
}
