import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, AlertCircle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SupplierSelect } from "@/components/compras/SupplierSelect";
import { PurchaseItemsList, PurchaseItem } from "@/components/compras/PurchaseItemsList";
import { CostSummary } from "@/components/compras/CostSummary";

// Interface for duplicated purchase data from location state
interface DuplicatePurchaseData {
  id: string;
  source: string;
  shipping_mode: string | null;
  freight_brl: number;
  extra_fees_brl: number;
  arrival_tax_brl: number | null;
  notes: string | null;
  supplier_id: string | null;
  suppliers: { name: string; type: string } | null;
  purchase_items: Array<{
    id: string;
    qty: number;
    unit_cost_value: number;
    unit_cost_currency: string;
    usd_to_brl_rate: number | null;
    variant_id: string | null;
    product_variants?: {
      id: string;
      size: string | null;
      uniform: string | null;
      products?: {
        id: string;
        label: string;
        country: string | null;
        team: string | null;
        team_id: string | null;
        season: string | null;
      } | null;
    } | null;
  }>;
}

export default function NovaCompra() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if we're duplicating a purchase
  const duplicateFrom = (location.state as { duplicateFrom?: DuplicatePurchaseData } | null)?.duplicateFrom;

  // Form state - initialized from duplicateFrom if available
  const [supplierId, setSupplierId] = useState<string | null>(duplicateFrom?.supplier_id || null);
  const [supplierType, setSupplierType] = useState<string>(duplicateFrom?.suppliers?.type || "china");
  const [source, setSource] = useState<string>(duplicateFrom?.source || "china");
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState<string>("comprado"); // Always start as "comprado" for new purchases
  const [notes, setNotes] = useState(duplicateFrom?.notes || "");
  
  // Shipping & fees - initialized from duplicateFrom if available
  const [shippingMode, setShippingMode] = useState<string>(duplicateFrom?.shipping_mode || "remessa");
  const [freightBrl, setFreightBrl] = useState<string>(duplicateFrom?.freight_brl?.toString() || "");
  const [extraFeesBrl, setExtraFeesBrl] = useState<string>(duplicateFrom?.extra_fees_brl?.toString() || "");
  const [arrivalTaxBrl, setArrivalTaxBrl] = useState<string>(""); // Never copy arrival_tax_brl - it's specific to each shipment

  // Items - initialized from duplicateFrom if available
  const [items, setItems] = useState<PurchaseItem[]>(() => {
    if (!duplicateFrom?.purchase_items) return [];
    
    return duplicateFrom.purchase_items.map((item) => {
      const product = item.product_variants?.products;
      const variant = item.product_variants;
      
      return {
        id: crypto.randomUUID(), // NEW ID - never reuse
        qty: item.qty,
        season: product?.season || "25/26",
        country: product?.country || "",
        team: product?.team || "",
        teamId: product?.team_id || null,
        customTeam: !product?.team_id,
        productLabel: product?.label || "",
        uniform: variant?.uniform || "",
        size: variant?.size || "",
        unitCost: item.unit_cost_value,
        currency: (item.unit_cost_currency as "BRL" | "USD") || "BRL",
        usdToBrlRate: item.usd_to_brl_rate || 5.5,
      };
    });
  });

  // Update source when supplier type changes
  useEffect(() => {
    setSource(supplierType);
  }, [supplierType]);

  const handleSupplierChange = (id: string | null, type: string) => {
    setSupplierId(id);
    setSupplierType(type);
  };

  const createPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (items.length === 0) throw new Error("Adicione pelo menos um item");

      // 1. Create or get product variants for each item
      const variantIds: string[] = [];
      
      for (const item of items) {
        // If custom team (not from global list), create it in teams table
        let teamId = item.teamId;
        if (item.customTeam && item.team && item.country) {
          // Check if team already exists for this country
          const { data: existingTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("country", item.country)
            .eq("name", item.team)
            .maybeSingle();
          
          if (existingTeam) {
            teamId = existingTeam.id;
          } else {
            // Create new team
            const { data: newTeam, error: teamError } = await supabase
              .from("teams")
              .insert({
                country: item.country,
                name: item.team,
                league: null,
                is_active: true,
                user_id: user.id,
              })
              .select("id")
              .single();
            
            if (teamError) throw teamError;
            teamId = newTeam.id;
          }
        }

        // Check if product exists
        let { data: existingProduct } = await supabase
          .from("products")
          .select("id")
          .eq("user_id", user.id)
          .eq("label", item.productLabel)
          .maybeSingle();

        let productId: string;
        
        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          // Create new product with team_id and season
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert({
              user_id: user.id,
              label: item.productLabel,
              country: item.country || null,
              team: item.team || null,
              team_id: teamId,
              season: item.season || null,
            })
            .select("id")
            .single();
          
          if (productError) throw productError;
          productId = newProduct.id;
        }

        // Check if variant exists
        let { data: existingVariant } = await supabase
          .from("product_variants")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", productId)
          .eq("uniform", item.uniform || "")
          .eq("size", item.size || "")
          .maybeSingle();

        if (existingVariant) {
          variantIds.push(existingVariant.id);
        } else {
          // Create new variant
          const { data: newVariant, error: variantError } = await supabase
            .from("product_variants")
            .insert({
              user_id: user.id,
              product_id: productId,
              uniform: item.uniform || null,
              size: item.size || null,
            })
            .select("id")
            .single();
          
          if (variantError) throw variantError;
          variantIds.push(newVariant.id);
        }
      }

      // 2. Create purchase order
      const { data: purchaseOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          user_id: user.id,
          supplier_id: supplierId,
          source,
          shipping_mode: source === "china" ? shippingMode : null,
          status,
          order_date: orderDate,
          freight_brl: parseFloat(freightBrl) || 0,
          extra_fees_brl: parseFloat(extraFeesBrl) || 0,
          arrival_tax_brl: source === "china" && shippingMode === "offline" 
            ? (arrivalTaxBrl ? parseFloat(arrivalTaxBrl) : null)
            : null,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // 3. Create purchase items
      const purchaseItems = items.map((item, index) => ({
        user_id: user.id,
        purchase_order_id: purchaseOrder.id,
        variant_id: variantIds[index],
        qty: item.qty,
        unit_cost_currency: item.currency,
        unit_cost_value: item.unitCost,
        usd_to_brl_rate: item.currency === "USD" ? item.usdToBrlRate : null,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(purchaseItems);

      if (itemsError) throw itemsError;

      // 4. If status is "chegou", create stock movements
      if (status === "chegou") {
        const stockMovements = items.map((item, index) => ({
          user_id: user.id,
          variant_id: variantIds[index],
          type: "in",
          qty: item.qty,
          ref_type: "purchase",
          ref_id: purchaseOrder.id,
        }));

        const { error: stockError } = await supabase
          .from("stock_movements")
          .insert(stockMovements);

        if (stockError) throw stockError;
      }

      return purchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      toast({
        title: "Compra registrada!",
        description: "O pedido foi salvo com sucesso.",
      });
      navigate("/compras");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!supplierId) {
      toast({
        title: "Fornecedor obrigatório",
        description: "Selecione ou adicione um fornecedor.",
        variant: "destructive",
      });
      return;
    }
    if (items.length === 0) {
      toast({
        title: "Adicione itens",
        description: "Adicione pelo menos um item ao pedido.",
        variant: "destructive",
      });
      return;
    }
    createPurchaseMutation.mutate();
  };

  // Calculate totals for summary
  const totalPieces = items.reduce((sum, item) => sum + item.qty, 0);
  const extraCosts = (parseFloat(freightBrl) || 0) + (parseFloat(extraFeesBrl) || 0) + (parseFloat(arrivalTaxBrl) || 0);

  return (
    <DashboardLayout title="Nova Compra">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/compras")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Compra</h1>
            <p className="text-muted-foreground">Registre um novo pedido de compra</p>
          </div>
        </div>

        {/* Bloco A - Informações do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Pedido</CardTitle>
            <CardDescription>Dados básicos da compra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <SupplierSelect 
                  value={supplierId} 
                  onChange={handleSupplierChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="china">China</SelectItem>
                    <SelectItem value="brasil">Brasil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Pedido</Label>
                <Input 
                  type="date" 
                  value={orderDate} 
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="comprado">Comprado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="chegou">Chegou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                placeholder="Anotações sobre o pedido..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloco B - Envio e Taxas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Envio e Taxas</CardTitle>
            <CardDescription>
              Custos extras do pedido (serão rateados entre as peças)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {source === "china" && (
              <div className="space-y-3">
                <Label>Modo de Envio</Label>
                <RadioGroup value={shippingMode} onValueChange={setShippingMode} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="remessa" id="remessa" />
                    <Label htmlFor="remessa" className="font-normal cursor-pointer">
                      Remessa Conforme
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="offline" id="offline" />
                    <Label htmlFor="offline" className="font-normal cursor-pointer">
                      Offline
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frete (R$)</Label>
                <MoneyInput 
                  value={parseFloat(freightBrl) || 0}
                  onChange={(value) => setFreightBrl(value.toString())}
                />
              </div>

              {source === "china" && shippingMode === "remessa" && (
                <div className="space-y-2">
                  <Label>Taxa Remessa (R$)</Label>
                  <MoneyInput 
                    value={parseFloat(extraFeesBrl) || 0}
                    onChange={(value) => setExtraFeesBrl(value.toString())}
                  />
                </div>
              )}

              {source === "china" && shippingMode === "offline" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Taxa Brasil (R$)
                    <Badge variant="outline" className="text-xs font-normal">opcional</Badge>
                  </Label>
                  <MoneyInput 
                    value={parseFloat(arrivalTaxBrl) || 0}
                    onChange={(value) => setArrivalTaxBrl(value.toString())}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info size={12} />
                    Você pode adicionar essa taxa depois, quando o pacote chegar.
                  </p>
                </div>
              )}

              {source === "brasil" && (
                <div className="space-y-2">
                  <Label>Outras Taxas (R$)</Label>
                  <MoneyInput 
                    value={parseFloat(extraFeesBrl) || 0}
                    onChange={(value) => setExtraFeesBrl(value.toString())}
                  />
                </div>
              )}
            </div>

            {(parseFloat(freightBrl) > 0 || parseFloat(extraFeesBrl) > 0 || parseFloat(arrivalTaxBrl) > 0) && totalPieces > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Info size={16} />
                <span>
                  Esses custos serão rateados automaticamente: 
                  <strong className="text-foreground ml-1">
                    R$ {(extraCosts / totalPieces).toFixed(2)} por peça
                  </strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco C - Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
            <CardDescription>
              Adicione os produtos que você está comprando
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseItemsList 
              items={items} 
              onChange={setItems}
              extraCostsPerPiece={totalPieces > 0 ? extraCosts / totalPieces : 0}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        {items.length > 0 && (
          <CostSummary 
            items={items}
            freightBrl={parseFloat(freightBrl) || 0}
            extraFeesBrl={parseFloat(extraFeesBrl) || 0}
            arrivalTaxBrl={parseFloat(arrivalTaxBrl) || 0}
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate("/compras")}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={createPurchaseMutation.isPending}
            className="gap-2 min-h-[44px]"
          >
            {createPurchaseMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Compra
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}