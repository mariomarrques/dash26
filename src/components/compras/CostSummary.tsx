import { Card, CardContent } from "@/components/ui/card";
import { PurchaseItem } from "./PurchaseItemsList";

interface CostSummaryProps {
  items: PurchaseItem[];
  freightBrl: number;
  extraFeesBrl: number;
  arrivalTaxBrl: number;
}

export function CostSummary({ items, freightBrl, extraFeesBrl, arrivalTaxBrl }: CostSummaryProps) {
  const totalPieces = items.reduce((sum, item) => sum + item.qty, 0);
  const extraCosts = freightBrl + extraFeesBrl + arrivalTaxBrl;
  const rateioPerPiece = totalPieces > 0 ? extraCosts / totalPieces : 0;

  let itemsSubtotal = 0;
  for (const item of items) {
    const unitCostBrl = item.currency === "USD" 
      ? item.unitCost * item.usdToBrlRate 
      : item.unitCost;
    itemsSubtotal += unitCostBrl * item.qty;
  }

  const grandTotal = itemsSubtotal + extraCosts;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="py-6">
        <h3 className="text-lg font-semibold mb-4">Resumo do Pedido</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total de itens</span>
            <span className="font-medium">{items.length}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total de peças</span>
            <span className="font-medium">{totalPieces}</span>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal produtos</span>
              <span className="tabular-nums">
                R$ {itemsSubtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {freightBrl > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="tabular-nums">
                  R$ {freightBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {extraFeesBrl > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxas extras</span>
                <span className="tabular-nums">
                  R$ {extraFeesBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {arrivalTaxBrl > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa Brasil</span>
                <span className="tabular-nums">
                  R$ {arrivalTaxBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {extraCosts > 0 && totalPieces > 0 && (
            <div className="flex justify-between text-sm bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground">Rateio por peça</span>
              <span className="font-medium tabular-nums">
                R$ {rateioPerPiece.toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-semibold">Total Estimado</span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}