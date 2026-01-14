import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Edit2, Save, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { createInventoryLots, recalculateLotsForTax, fixMissingInventoryData } from "@/hooks/useInventoryLots";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  comprado: "Comprado",
  enviado: "Enviado",
  chegou: "Chegou",
};

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  comprado: "bg-blue-100 text-blue-800",
  enviado: "bg-amber-100 text-amber-800",
  chegou: "bg-emerald-100 text-emerald-800",
};

export default function CompraDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showTaxModal, setShowTaxModal] = useState(false);
  const [arrivalTax, setArrivalTax] = useState("");
  const [newStatus, setNewStatus] = useState<string | null>(null);

  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ["purchase_order", id],
    queryFn: async () => {
      if (!id) throw new Error("ID não encontrado");
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers(name, type),
          purchase_items(
            id,
            qty,
            unit_cost_value,
            unit_cost_currency,
            usd_to_brl_rate,
            product_variants(
              id,
              uniform,
              size,
              products(label, country, team)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!id || !user) throw new Error("Dados inválidos");

      // CRITICAL: Fetch fresh data from the database to avoid stale closure issues
      const { data: currentPurchase, error: fetchError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_items(
            id, qty, unit_cost_value, unit_cost_currency, usd_to_brl_rate,
            product_variants(id)
          )
        `)
        .eq("id", id)
        .single();

      if (fetchError || !currentPurchase) {
        throw new Error("Erro ao buscar pedido atualizado");
      }

      // Check if we should post stock (only when changing to "chegou" and not already posted)
      const shouldPostStock = status === "chegou" && !currentPurchase.stock_posted;

      // Update status (and stock_posted if posting stock)
      const updateData: { status: string; stock_posted?: boolean } = { status };
      if (shouldPostStock) {
        updateData.stock_posted = true;
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Create stock movements and inventory lots only if not already posted (idempotent)
      if (shouldPostStock) {
        const stockMovements = currentPurchase.purchase_items
          .filter((item: any) => item.product_variants?.id)
          .map((item: any) => ({
            user_id: user.id,
            variant_id: item.product_variants.id,
            type: "in",
            qty: item.qty,
            ref_type: "purchase",
            ref_id: id,
          }));

        if (stockMovements.length > 0) {
          const { error: stockError } = await supabase
            .from("stock_movements")
            .insert(stockMovements);

          if (stockError) {
            // Revert stock_posted if stock movements failed
            await supabase
              .from("purchase_orders")
              .update({ stock_posted: false })
              .eq("id", id);
            throw stockError;
          }
        }

        // Create inventory lots for FIFO cost tracking
        const lotsResult = await createInventoryLots(user.id, {
          id: currentPurchase.id,
          freight_brl: currentPurchase.freight_brl,
          extra_fees_brl: currentPurchase.extra_fees_brl,
          arrival_tax_brl: currentPurchase.arrival_tax_brl,
          source: currentPurchase.source,
          shipping_mode: currentPurchase.shipping_mode,
          purchase_items: currentPurchase.purchase_items.map((item: any) => ({
            id: item.id,
            qty: item.qty,
            unit_cost_value: item.unit_cost_value,
            unit_cost_currency: item.unit_cost_currency,
            usd_to_brl_rate: item.usd_to_brl_rate,
            product_variants: item.product_variants,
          })),
        });

        if (!lotsResult.success) {
          console.error("Error creating inventory lots:", lotsResult.error);
          // Don't throw - lots creation failure shouldn't block status update
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order", id] });
      queryClient.invalidateQueries({ 
        queryKey: ["purchase_orders"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock_movements"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["inventory_lots"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock"],
        refetchType: 'active'
      });
      toast({ title: "Status atualizado!" });
      setNewStatus(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const updateTaxMutation = useMutation({
    mutationFn: async (taxValue: number) => {
      if (!id || !purchase || !user) throw new Error("Dados inválidos");

      const { error } = await supabase
        .from("purchase_orders")
        .update({ arrival_tax_brl: taxValue })
        .eq("id", id);

      if (error) throw error;

      // Recalculate or create inventory lots with the new tax
      await recalculateLotsForTax(user.id, id, taxValue, {
        id: purchase.id,
        freight_brl: purchase.freight_brl,
        extra_fees_brl: purchase.extra_fees_brl,
        arrival_tax_brl: taxValue,
        source: purchase.source,
        shipping_mode: purchase.shipping_mode,
        purchase_items: purchase.purchase_items.map((item: any) => ({
          id: item.id,
          qty: item.qty,
          unit_cost_value: item.unit_cost_value,
          unit_cost_currency: item.unit_cost_currency,
          usd_to_brl_rate: item.usd_to_brl_rate,
          product_variants: item.product_variants,
        })),
      });

      // Also update stock_posted to true if it wasn't
      if (!purchase.stock_posted) {
        await supabase
          .from("purchase_orders")
          .update({ stock_posted: true })
          .eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order", id] });
      queryClient.invalidateQueries({ 
        queryKey: ["purchase_orders"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["inventory_lots"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock_movements"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Taxa adicionada!" });
      setShowTaxModal(false);
      setArrivalTax("");
    },
    onError: () => {
      toast({ title: "Erro ao salvar taxa", variant: "destructive" });
    },
  });

  // Mutation to fix missing inventory data for legacy purchases
  const fixInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!purchase || !user) throw new Error("Dados inválidos");

      return await fixMissingInventoryData(user.id, {
        id: purchase.id,
        freight_brl: purchase.freight_brl,
        extra_fees_brl: purchase.extra_fees_brl,
        arrival_tax_brl: purchase.arrival_tax_brl,
        source: purchase.source,
        shipping_mode: purchase.shipping_mode,
        stock_posted: purchase.stock_posted,
        purchase_items: purchase.purchase_items.map((item: any) => ({
          id: item.id,
          qty: item.qty,
          unit_cost_value: item.unit_cost_value,
          unit_cost_currency: item.unit_cost_currency,
          usd_to_brl_rate: item.usd_to_brl_rate,
          product_variants: item.product_variants,
        })),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order", id] });
      queryClient.invalidateQueries({ 
        queryKey: ["purchase_orders"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["inventory_lots"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock_movements"],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["stock"],
        refetchType: 'active'
      });
      
      if (result.success) {
        toast({ 
          title: "Estoque corrigido!", 
          description: `${result.stockMovementsCreated > 0 ? `${result.stockMovementsCreated} movimentações criadas. ` : ""}${result.lotsCreated ? "Lotes de custo criados." : ""}` 
        });
      } else {
        toast({ title: "Erro ao corrigir", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao corrigir estoque", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Compra">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !purchase) {
    return (
      <DashboardLayout title="Compra">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p>Pedido não encontrado.</p>
          <Button variant="link" onClick={() => navigate("/compras")}>
            Voltar para compras
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate totals
  const totalPieces = purchase.purchase_items.reduce((sum: number, item: any) => sum + item.qty, 0);
  const extraCosts = purchase.freight_brl + purchase.extra_fees_brl + (purchase.arrival_tax_brl || 0);
  const rateioPerPiece = totalPieces > 0 ? extraCosts / totalPieces : 0;

  let itemsTotal = 0;
  for (const item of purchase.purchase_items) {
    const unitCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
      ? item.unit_cost_value * item.usd_to_brl_rate
      : item.unit_cost_value;
    itemsTotal += unitCostBrl * item.qty;
  }
  const grandTotal = itemsTotal + extraCosts;

  const showOfflineTaxButton = 
    purchase.source === "china" && 
    (purchase.shipping_mode === "offline" || purchase.shipping_mode === "cssbuy") && 
    purchase.arrival_tax_brl === null;

  return (
    <DashboardLayout title="Detalhe da Compra">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/compras")}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Pedido de {format(new Date(purchase.order_date), "dd/MM/yyyy")}
              </h1>
              <p className="text-muted-foreground">
                {purchase.suppliers?.name || "Sem fornecedor"} • {purchase.source.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[purchase.status]}>
              {statusLabels[purchase.status]}
            </Badge>
            {showOfflineTaxButton && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Taxa pendente
              </Badge>
            )}
          </div>
        </div>

        {/* Alert for inconsistent purchases (arrived but not posted to stock) */}
        {purchase.status === "chegou" && !purchase.stock_posted && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Estoque não registrado
                  </p>
                  <p className="text-sm text-red-600">
                    Este pedido está marcado como "Chegou" mas o estoque e custos não foram registrados corretamente.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-red-300 text-red-800 hover:bg-red-100"
                  onClick={() => fixInventoryMutation.mutate()}
                  disabled={fixInventoryMutation.isPending}
                >
                  {fixInventoryMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-800 mr-2" />
                  ) : (
                    <Package size={16} className="mr-2" />
                  )}
                  Corrigir Estoque
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Tax pending */}
        {showOfflineTaxButton && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-800">Taxa Brasil pendente</p>
                  <p className="text-sm text-amber-600">
                    Você pode adicionar a taxa quando o pacote chegar no Brasil.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => setShowTaxModal(true)}
                >
                  <Edit2 size={16} className="mr-2" />
                  Adicionar Taxa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Update */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atualizar Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select 
                value={newStatus || purchase.status} 
                onValueChange={setNewStatus}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="comprado">Comprado</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="chegou">Chegou</SelectItem>
                </SelectContent>
              </Select>
              {newStatus && newStatus !== purchase.status && (
                <Button 
                  onClick={() => updateStatusMutation.mutate(newStatus)}
                  disabled={updateStatusMutation.isPending}
                >
                  <Save size={16} className="mr-2" />
                  Salvar
                </Button>
              )}
            </div>
            {/* Show warning when changing FROM "chegou" to another status if stock was already posted */}
            {purchase.status === "chegou" && newStatus && newStatus !== "chegou" && purchase.stock_posted && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                Este pedido já foi lançado no estoque. Alterar o status não remove entradas automaticamente.
              </p>
            )}
            {/* Show info when changing TO "chegou" and stock not yet posted */}
            {newStatus === "chegou" && purchase.status !== "chegou" && !purchase.stock_posted && (
              <p className="text-sm text-muted-foreground mt-2">
                <Package size={14} className="inline mr-1" />
                Ao marcar como "Chegou", as peças serão adicionadas ao estoque automaticamente.
              </p>
            )}
            {/* Show info when changing TO "chegou" but stock was already posted before */}
            {newStatus === "chegou" && purchase.status !== "chegou" && purchase.stock_posted && (
              <p className="text-sm text-muted-foreground mt-2">
                <Package size={14} className="inline mr-1" />
                O estoque deste pedido já foi registrado anteriormente. Nenhuma entrada nova será criada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Costs Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custos do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Frete</p>
                <p className="text-lg font-semibold">R$ {purchase.freight_brl.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxas Extras</p>
                <p className="text-lg font-semibold">R$ {purchase.extra_fees_brl.toFixed(2)}</p>
              </div>
              {purchase.source === "china" && (purchase.shipping_mode === "offline" || purchase.shipping_mode === "cssbuy") && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {purchase.shipping_mode === "cssbuy" ? "Taxa" : "Taxa Brasil"}
                  </p>
                  <p className="text-lg font-semibold">
                    {purchase.arrival_tax_brl !== null 
                      ? `R$ ${purchase.arrival_tax_brl.toFixed(2)}`
                      : <span className="text-amber-600">Pendente</span>
                    }
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Rateio/peça</p>
                <p className="text-lg font-semibold">R$ {rateioPerPiece.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens ({totalPieces} peças)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto</TableHead>
                  <TableHead>Uniforme</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">+ Rateio</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.purchase_items.map((item: any) => {
                  const variant = item.product_variants;
                  const product = variant?.products;
                  const unitCostBrl = item.unit_cost_currency === "USD" && item.usd_to_brl_rate
                    ? item.unit_cost_value * item.usd_to_brl_rate
                    : item.unit_cost_value;
                  const realCost = unitCostBrl + rateioPerPiece;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {product?.label || "—"}
                        {product?.team && <span className="text-muted-foreground text-xs ml-2">({product.team})</span>}
                      </TableCell>
                      <TableCell>{variant?.uniform || "—"}</TableCell>
                      <TableCell>{variant?.size || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.unit_cost_currency === "USD" && (
                          <span className="text-xs text-muted-foreground mr-1">
                            ${item.unit_cost_value.toFixed(2)} →
                          </span>
                        )}
                        R$ {unitCostBrl.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        + R$ {rateioPerPiece.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        R$ {realCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Grand Total */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total do Pedido</p>
                <p className="text-sm text-muted-foreground">{totalPieces} peças</p>
              </div>
              <p className="text-3xl font-bold text-primary tabular-nums">
                R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {purchase.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{purchase.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tax Modal */}
      <Dialog open={showTaxModal} onOpenChange={setShowTaxModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Taxa Brasil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Informe o valor da taxa cobrada quando o pacote chegou no Brasil.
            </p>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <MoneyInput
                value={parseFloat(arrivalTax) || 0}
                onChange={(value) => setArrivalTax(value.toString())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaxModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => updateTaxMutation.mutate(parseFloat(arrivalTax) || 0)}
              disabled={updateTaxMutation.isPending || !arrivalTax}
            >
              Salvar Taxa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}