import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "sacmariomarques@gmail.com";

interface AuditVariant {
  variant_id: string;
  product_label: string;
  uniform: string | null;
  size: string | null;
  lots_qty_remaining: number;
  stock_movements_balance: number;
  expected_stock: number;
  discrepancy: number;
  has_negative_stock: boolean;
  has_discrepancy: boolean;
}

interface InconsistentLot {
  lot_id: string;
  variant_id: string;
  product_label: string;
  qty_received: number;
  qty_remaining: number;
  issue: string;
}

interface AuditResult {
  timestamp: string;
  user_id: string;
  summary: {
    total_variants_audited: number;
    variants_with_negative_stock: number;
    variants_with_discrepancies: number;
    inconsistent_lots: number;
  };
  variants: AuditVariant[];
  inconsistent_lots: InconsistentLot[];
}

/**
 * Hook de auditoria de estoque - APENAS PARA ADMINISTRADORES
 * 
 * Uso via console do navegador:
 * 1. Importe o hook em qualquer componente ou use o window.__stockAudit
 * 2. Execute: await window.__stockAudit.runAudit()
 * 
 * Funções disponíveis:
 * - runAudit(): Executa auditoria completa
 * - checkNegativeStock(): Verifica apenas estoques negativos
 * - checkDiscrepancies(): Verifica divergências entre lotes e movimentos
 */
export function useStockAudit() {
  const { user } = useAuth();

  const isAdmin = (): boolean => {
    if (!user?.email) return false;
    return user.email === ADMIN_EMAIL;
  };

  const assertAdmin = (): void => {
    if (!isAdmin()) {
      console.error("❌ Acesso negado: função restrita ao administrador");
      throw new Error("Unauthorized");
    }
  };

  /**
   * Executa auditoria completa do estoque
   */
  const runAudit = async (): Promise<AuditResult | null> => {
    try {
      assertAdmin();
      console.log("🔍 Iniciando auditoria de estoque...");
      console.log(`📅 Timestamp: ${new Date().toISOString()}`);
      console.log(`👤 Usuário: ${user?.email}`);

      // 1. Buscar todos os lotes de inventário com dados do produto
      const { data: lots, error: lotsError } = await supabase
        .from("inventory_lots")
        .select(`
          id,
          variant_id,
          qty_received,
          qty_remaining,
          product_variants!inner(
            id,
            uniform,
            size,
            products!inner(label)
          )
        `);

      if (lotsError) throw lotsError;

      // 2. Buscar todos os movimentos de estoque
      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select("variant_id, type, qty");

      if (movementsError) throw movementsError;

      // 3. Calcular saldo por variante baseado em movimentos
      const movementBalances: Record<string, number> = {};
      movements?.forEach((mov) => {
        if (!movementBalances[mov.variant_id]) {
          movementBalances[mov.variant_id] = 0;
        }
        if (mov.type === "entrada") {
          movementBalances[mov.variant_id] += mov.qty;
        } else if (mov.type === "saida") {
          movementBalances[mov.variant_id] -= mov.qty;
        }
      });

      // 4. Agregar lotes por variante
      const variantLots: Record<string, {
        qty_remaining: number;
        product_label: string;
        uniform: string | null;
        size: string | null;
      }> = {};

      const inconsistentLots: InconsistentLot[] = [];

      lots?.forEach((lot: any) => {
        const variantId = lot.variant_id;
        const productLabel = lot.product_variants?.products?.label || "Desconhecido";
        const uniform = lot.product_variants?.uniform;
        const size = lot.product_variants?.size;

        // Verificar inconsistências no lote
        if (lot.qty_remaining < 0) {
          inconsistentLots.push({
            lot_id: lot.id,
            variant_id: variantId,
            product_label: productLabel,
            qty_received: lot.qty_received,
            qty_remaining: lot.qty_remaining,
            issue: "qty_remaining negativo"
          });
        }

        if (lot.qty_remaining > lot.qty_received) {
          inconsistentLots.push({
            lot_id: lot.id,
            variant_id: variantId,
            product_label: productLabel,
            qty_received: lot.qty_received,
            qty_remaining: lot.qty_remaining,
            issue: "qty_remaining maior que qty_received"
          });
        }

        if (!variantLots[variantId]) {
          variantLots[variantId] = {
            qty_remaining: 0,
            product_label: productLabel,
            uniform: uniform,
            size: size
          };
        }
        variantLots[variantId].qty_remaining += lot.qty_remaining;
      });

      // 5. Gerar relatório de auditoria
      const auditVariants: AuditVariant[] = [];
      const allVariantIds = new Set([
        ...Object.keys(variantLots),
        ...Object.keys(movementBalances)
      ]);

      allVariantIds.forEach((variantId) => {
        const lotsQty = variantLots[variantId]?.qty_remaining || 0;
        const movementsQty = movementBalances[variantId] || 0;
        const discrepancy = lotsQty - movementsQty;

        auditVariants.push({
          variant_id: variantId,
          product_label: variantLots[variantId]?.product_label || "Desconhecido",
          uniform: variantLots[variantId]?.uniform || null,
          size: variantLots[variantId]?.size || null,
          lots_qty_remaining: lotsQty,
          stock_movements_balance: movementsQty,
          expected_stock: movementsQty,
          discrepancy: discrepancy,
          has_negative_stock: lotsQty < 0,
          has_discrepancy: Math.abs(discrepancy) > 0
        });
      });

      const result: AuditResult = {
        timestamp: new Date().toISOString(),
        user_id: user?.id || "",
        summary: {
          total_variants_audited: auditVariants.length,
          variants_with_negative_stock: auditVariants.filter(v => v.has_negative_stock).length,
          variants_with_discrepancies: auditVariants.filter(v => v.has_discrepancy).length,
          inconsistent_lots: inconsistentLots.length
        },
        variants: auditVariants,
        inconsistent_lots: inconsistentLots
      };

      // 6. Log formatado no console
      console.log("\n========================================");
      console.log("📊 RELATÓRIO DE AUDITORIA DE ESTOQUE");
      console.log("========================================\n");
      
      console.log("📈 RESUMO:");
      console.table(result.summary);

      if (result.summary.variants_with_negative_stock > 0) {
        console.log("\n⚠️ VARIANTES COM ESTOQUE NEGATIVO:");
        console.table(auditVariants.filter(v => v.has_negative_stock));
      }

      if (result.summary.variants_with_discrepancies > 0) {
        console.log("\n⚠️ VARIANTES COM DIVERGÊNCIAS:");
        console.table(auditVariants.filter(v => v.has_discrepancy));
      }

      if (inconsistentLots.length > 0) {
        console.log("\n🚨 LOTES INCONSISTENTES:");
        console.table(inconsistentLots);
      }

      if (
        result.summary.variants_with_negative_stock === 0 &&
        result.summary.variants_with_discrepancies === 0 &&
        inconsistentLots.length === 0
      ) {
        console.log("\n✅ Nenhum problema encontrado! Estoque consistente.");
      }

      console.log("\n========================================");
      console.log("🔍 Auditoria concluída com sucesso!");
      console.log("========================================\n");

      return result;
    } catch (error) {
      if ((error as Error).message !== "Unauthorized") {
        console.error("❌ Erro na auditoria:", error);
      }
      return null;
    }
  };

  /**
   * Verifica apenas variantes com estoque negativo
   */
  const checkNegativeStock = async () => {
    try {
      assertAdmin();
      console.log("🔍 Verificando estoques negativos...");

      const { data: lots, error } = await supabase
        .from("inventory_lots")
        .select(`
          variant_id,
          qty_remaining,
          product_variants!inner(
            uniform,
            size,
            products!inner(label)
          )
        `)
        .lt("qty_remaining", 0);

      if (error) throw error;

      if (!lots || lots.length === 0) {
        console.log("✅ Nenhum lote com quantidade negativa encontrado.");
        return [];
      }

      console.log(`⚠️ Encontrados ${lots.length} lotes com quantidade negativa:`);
      console.table(lots.map((l: any) => ({
        variant_id: l.variant_id,
        product: l.product_variants?.products?.label,
        uniform: l.product_variants?.uniform,
        size: l.product_variants?.size,
        qty_remaining: l.qty_remaining
      })));

      return lots;
    } catch (error) {
      if ((error as Error).message !== "Unauthorized") {
        console.error("❌ Erro:", error);
      }
      return null;
    }
  };

  /**
   * Verifica divergências entre qty_remaining dos lotes e movimentos
   */
  const checkDiscrepancies = async () => {
    const result = await runAudit();
    if (!result) return null;

    const discrepancies = result.variants.filter(v => v.has_discrepancy);
    
    if (discrepancies.length === 0) {
      console.log("✅ Nenhuma divergência encontrada.");
    }

    return discrepancies;
  };

  return {
    isAdmin,
    runAudit,
    checkNegativeStock,
    checkDiscrepancies
  };
}

// Expor globalmente para uso via console (apenas em desenvolvimento)
if (typeof window !== "undefined") {
  (window as any).__stockAuditInfo = `
╔═══════════════════════════════════════════════════════════╗
║           🔐 FERRAMENTA DE AUDITORIA DE ESTOQUE           ║
╠═══════════════════════════════════════════════════════════╣
║  Acesso restrito ao administrador.                        ║
║                                                           ║
║  Para usar, acesse a página /estoque e execute no         ║
║  console do navegador:                                    ║
║                                                           ║
║  > await window.__stockAudit.runAudit()                   ║
║  > await window.__stockAudit.checkNegativeStock()         ║
║  > await window.__stockAudit.checkDiscrepancies()         ║
╚═══════════════════════════════════════════════════════════╝
`;
  console.log((window as any).__stockAuditInfo);
}
