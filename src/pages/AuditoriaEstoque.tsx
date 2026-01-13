import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStockAudit } from "@/hooks/useStockAudit";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Loader2,
  ClipboardList,
  Package,
  Database
} from "lucide-react";
import { toast } from "sonner";

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

const AuditoriaEstoque = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stockAudit = useStockAudit();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; stats?: any; credentials?: any; message?: string } | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  // VERIFICAÇÃO DE SEGURANÇA - Camada de UI
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Redirecionar se não for admin
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("Acesso não autorizado");
      navigate("/");
    }
  }, [user, isAdmin, navigate]);

  // VERIFICAÇÃO DE SEGURANÇA - Camada de execução
  const handleRunAudit = async () => {
    // Revalidar permissão antes de executar
    if (user?.email !== ADMIN_EMAIL) {
      console.error("❌ Tentativa de acesso não autorizado à auditoria");
      toast.error("Permissão negada");
      return;
    }

    // Verificar também via hook (dupla checagem)
    if (!stockAudit.isAdmin()) {
      console.error("❌ Falha na verificação de admin via hook");
      toast.error("Permissão negada");
      return;
    }

    setIsRunning(true);
    setHasRun(true);

    try {
      const auditResult = await stockAudit.runAudit();
      setResult(auditResult);
      
      if (auditResult) {
        const { summary } = auditResult;
        if (
          summary.variants_with_negative_stock === 0 &&
          summary.variants_with_discrepancies === 0 &&
          summary.inconsistent_lots === 0
        ) {
          toast.success("Auditoria concluída - Nenhum problema encontrado!");
        } else {
          toast.warning(`Auditoria concluída - ${summary.variants_with_negative_stock + summary.variants_with_discrepancies + summary.inconsistent_lots} problema(s) encontrado(s)`);
        }
      }
    } catch (error) {
      console.error("Erro na auditoria:", error);
      toast.error("Erro ao executar auditoria");
    } finally {
      setIsRunning(false);
    }
  };

  // Executar seed de dados demo
  const handleSeedDemoData = async () => {
    if (user?.email !== ADMIN_EMAIL) {
      toast.error("Permissão negada");
      return;
    }

    setIsSeedingDemo(true);
    setSeedResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const response = await supabase.functions.invoke('seed-demo-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSeedResult(response.data);
      
      if (response.data?.success) {
        toast.success("Dados demo criados com sucesso!");
      } else {
        toast.error(response.data?.error || "Erro ao criar dados demo");
      }
    } catch (error) {
      console.error("Erro no seed:", error);
      toast.error("Erro ao executar seed de dados demo");
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Não renderizar nada se não for admin
  if (!isAdmin) {
    return null;
  }

  const problemVariants = result?.variants.filter(v => v.has_negative_stock || v.has_discrepancy) || [];
  const healthyVariants = result?.variants.filter(v => !v.has_negative_stock && !v.has_discrepancy) || [];

  return (
    <DashboardLayout 
      title="Auditoria de Estoque" 
      subtitle="Ferramenta interna de diagnóstico - Acesso restrito"
    >
      <div className="space-y-6">
        {/* Header com aviso de segurança */}
        <Card className="glass-card border-warning/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Ferramenta Administrativa</h3>
                <p className="text-sm text-muted-foreground">
                  Esta funcionalidade é exclusiva do administrador. Todas as operações são somente leitura
                  e não alteram dados do sistema.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Usuário: {user?.email}
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Autorizado
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de execução */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Executar Auditoria
            </CardTitle>
            <CardDescription>
              Verifica consistência de estoque, lotes e movimentações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRunAudit}
              disabled={isRunning}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executando auditoria...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Auditoria Completa
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Seed Demo Data */}
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Seed de Dados Demo
            </CardTitle>
            <CardDescription>
              Cria uma conta demo com 6 meses de dados simulados (vendas, compras, estoque)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSeedDemoData}
              disabled={isSeedingDemo}
              variant="outline"
              className="w-full sm:w-auto"
              size="lg"
            >
              {isSeedingDemo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando dados demo...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Criar Conta Demo
                </>
              )}
            </Button>

            {seedResult && (
              <div className={`p-4 rounded-lg ${seedResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                {seedResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{seedResult.message}</span>
                    </div>
                    
                    {seedResult.credentials && (
                      <div className="bg-background/50 rounded-lg p-3 space-y-1">
                        <p className="text-sm font-medium text-foreground">Credenciais da conta demo:</p>
                        <p className="text-sm text-muted-foreground">
                          Email: <span className="font-mono text-primary">{seedResult.credentials.email}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Senha: <span className="font-mono text-primary">{seedResult.credentials.password}</span>
                        </p>
                      </div>
                    )}

                    {seedResult.stats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div className="bg-background/50 rounded p-2 text-center">
                          <p className="text-muted-foreground">Fornecedores</p>
                          <p className="font-bold text-foreground">{seedResult.stats.suppliers}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2 text-center">
                          <p className="text-muted-foreground">Produtos</p>
                          <p className="font-bold text-foreground">{seedResult.stats.products}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2 text-center">
                          <p className="text-muted-foreground">Compras</p>
                          <p className="font-bold text-foreground">{seedResult.stats.purchaseOrders}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2 text-center">
                          <p className="text-muted-foreground">Vendas</p>
                          <p className="font-bold text-foreground">{seedResult.stats.sales}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-5 h-5" />
                    <span>{seedResult.message || 'Erro ao criar dados demo'}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* Resultados */}
        {hasRun && result && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variantes Auditadas</p>
                      <p className="text-2xl font-bold text-foreground">{result.summary.total_variants_audited}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`glass-card ${result.summary.variants_with_negative_stock > 0 ? 'border-destructive/50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      result.summary.variants_with_negative_stock > 0 ? 'bg-destructive/20' : 'bg-green-500/20'
                    }`}>
                      {result.summary.variants_with_negative_stock > 0 ? (
                        <XCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Negativo</p>
                      <p className={`text-2xl font-bold ${
                        result.summary.variants_with_negative_stock > 0 ? 'text-destructive' : 'text-green-400'
                      }`}>
                        {result.summary.variants_with_negative_stock}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`glass-card ${result.summary.variants_with_discrepancies > 0 ? 'border-warning/50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      result.summary.variants_with_discrepancies > 0 ? 'bg-warning/20' : 'bg-green-500/20'
                    }`}>
                      {result.summary.variants_with_discrepancies > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Divergências</p>
                      <p className={`text-2xl font-bold ${
                        result.summary.variants_with_discrepancies > 0 ? 'text-warning' : 'text-green-400'
                      }`}>
                        {result.summary.variants_with_discrepancies}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`glass-card ${result.summary.inconsistent_lots > 0 ? 'border-destructive/50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      result.summary.inconsistent_lots > 0 ? 'bg-destructive/20' : 'bg-green-500/20'
                    }`}>
                      {result.summary.inconsistent_lots > 0 ? (
                        <XCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lotes Inconsistentes</p>
                      <p className={`text-2xl font-bold ${
                        result.summary.inconsistent_lots > 0 ? 'text-destructive' : 'text-green-400'
                      }`}>
                        {result.summary.inconsistent_lots}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Problemas encontrados */}
            {problemVariants.length > 0 && (
              <Card className="glass-card border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Problemas Encontrados ({problemVariants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {problemVariants.map((variant) => (
                        <div 
                          key={variant.variant_id}
                          className="p-4 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">{variant.product_label}</p>
                              <div className="flex gap-2 mt-1">
                                {variant.size && <Badge variant="secondary" className="text-xs">{variant.size}</Badge>}
                                {variant.uniform && <Badge variant="outline" className="text-xs">{variant.uniform}</Badge>}
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              {variant.has_negative_stock && (
                                <Badge variant="destructive" className="text-xs">
                                  Estoque negativo: {variant.lots_qty_remaining}
                                </Badge>
                              )}
                              {variant.has_discrepancy && (
                                <Badge className="bg-warning/20 text-warning border-warning/30 text-xs block">
                                  Divergência: {variant.discrepancy > 0 ? '+' : ''}{variant.discrepancy}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="text-xs uppercase tracking-wide">Lotes (qty_remaining)</span>
                              <p className="font-mono text-foreground">{variant.lots_qty_remaining}</p>
                            </div>
                            <div>
                              <span className="text-xs uppercase tracking-wide">Movimentações (saldo)</span>
                              <p className="font-mono text-foreground">{variant.stock_movements_balance}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Lotes inconsistentes */}
            {result.inconsistent_lots.length > 0 && (
              <Card className="glass-card border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <XCircle className="w-5 h-5" />
                    Lotes Inconsistentes ({result.inconsistent_lots.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {result.inconsistent_lots.map((lot) => (
                        <div 
                          key={lot.lot_id}
                          className="p-4 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{lot.product_label}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-1">
                                Lote: {lot.lot_id.slice(0, 8)}...
                              </p>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              {lot.issue}
                            </Badge>
                          </div>
                          <div className="mt-2 flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Recebido: <span className="text-foreground font-medium">{lot.qty_received}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Restante: <span className="text-destructive font-medium">{lot.qty_remaining}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Sucesso - tudo OK */}
            {problemVariants.length === 0 && result.inconsistent_lots.length === 0 && (
              <Card className="glass-card border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-400">Estoque Consistente</h3>
                      <p className="text-sm text-muted-foreground">
                        Nenhum problema foi encontrado. Todos os lotes e movimentações estão alinhados.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground text-center">
              Auditoria executada em: {new Date(result.timestamp).toLocaleString('pt-BR')}
            </p>
          </>
        )}

        {/* Estado inicial */}
        {!hasRun && (
          <Card className="glass-card">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Clique em "Iniciar Auditoria" para começar</p>
                <p className="text-sm mt-1">
                  A auditoria verificará a consistência de todo o estoque
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditoriaEstoque;
