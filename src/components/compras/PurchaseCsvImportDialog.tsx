import { ChangeEvent, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, FileUp, Loader2, RefreshCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildPurchaseCsvImportPayload,
  formatPurchaseCsvIssue,
  parsePurchaseCsvImport,
  PurchaseCsvImportError,
  PurchaseCsvImportPreview,
  PurchaseCsvIssue,
} from "@/lib/purchase-csv-import";

interface PurchaseCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  purchaseOrderIds?: string[];
  count?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function PurchaseCsvImportDialog({ open, onOpenChange }: PurchaseCsvImportDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<PurchaseCsvImportPreview | null>(null);
  const [issues, setIssues] = useState<PurchaseCsvIssue[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isLotsPreviewOpen, setIsLotsPreviewOpen] = useState(false);

  const resetState = () => {
    setPreview(null);
    setIssues([]);
    setSelectedFileName("");
    setIsLotsPreviewOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error("Nenhum CSV validado para importar.");
      }

      const payload = buildPurchaseCsvImportPayload(preview);
      const { data, error } = await withTimeout(
        supabase.rpc("import_purchase_orders_csv", {
          p_groups: payload,
        }),
        20000,
        "A importação demorou mais do que o esperado. Verifique se a função SQL `public.import_purchase_orders_csv(jsonb)` existe e está operante.",
      );

      if (error) throw error;
      return (data ?? {}) as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });

      toast({
        title: "Importação concluída",
        description: `${result.count ?? preview?.summary.purchaseCount ?? 0} compra(s) criada(s) com sucesso.`,
      });

      handleOpenChange(false);
      navigate("/compras");
    },
    onError: (error: Error) => {
      const description = formatImportError(error);
      toast({
        title: "Erro ao importar CSV",
        description,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setPreview(null);
    setIssues([]);

    try {
      const text = await file.text();
      const nextPreview = parsePurchaseCsvImport(text, file.name);
      setPreview(nextPreview);
      setIsLotsPreviewOpen(false);
      toast({
        title: "CSV validado",
        description: `${nextPreview.summary.purchaseCount} lote(s) pronto(s) para importação.`,
      });
    } catch (error) {
      if (error instanceof PurchaseCsvImportError) {
        setIssues(error.issues);
        return;
      }

      const message = error instanceof Error ? error.message : "Não foi possível ler o CSV.";
      setIssues([
        {
          line: 1,
          column: "header",
          message,
        },
      ]);
    }
  };

  const hasErrors = issues.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar compras por CSV
          </DialogTitle>
          <DialogDescription>
            O importador agrupa por `fornecedor + lote`, cria uma compra por lote e mantém origem `China` e modo de envio `Offline` quando o CSV vier sem esses campos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 pr-4">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">Arquivo CSV</p>
                    <p className="text-sm text-muted-foreground">
                      Header obrigatório: fornecedor, lote, data_pedido, origem, status, modo_envio, frete, taxa_remessa, temporada, pais, time, versao, uniforme, tamanho, personalizacao, quantidade, preco_unitario
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={resetState}>
                    <RefreshCcw className="h-4 w-4" />
                    Limpar arquivo
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                />
                {selectedFileName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileUp className="h-4 w-4" />
                    <span>{selectedFileName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {!preview && !hasErrors && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Selecione um CSV para validar e gerar o preview</p>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Cada lote precisa manter `data_pedido`, `origem`, `status`, `modo_envio`, `frete` e `taxa_remessa` consistentes em todas as linhas do mesmo `fornecedor + lote`.
                  </p>
                </CardContent>
              </Card>
            )}

            {hasErrors && (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    CSV com erros ({issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72 rounded-md border">
                    <div className="space-y-2 p-4 text-sm">
                      {issues.map((issue, index) => (
                        <div key={`${issue.line}-${issue.column}-${index}`} className="rounded-md bg-destructive/5 p-3 text-destructive">
                          {formatPurchaseCsvIssue(issue)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {preview && (
              <div className="space-y-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                      Preview validado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-5">
                    <MetricCard label="Compras" value={preview.summary.purchaseCount.toString()} />
                    <MetricCard label="Itens" value={preview.summary.totalItems.toString()} />
                    <MetricCard label="Peças" value={preview.summary.totalPieces.toString()} />
                    <MetricCard label="Subtotal" value={formatCurrency(preview.summary.subtotalProducts)} />
                    <MetricCard label="Total estimado" value={formatCurrency(preview.summary.totalEstimated)} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Lotes que serão criados</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {preview.summary.purchaseCount} lote(s) agrupado(s) por fornecedor + lote.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsLotsPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver lotes
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => importMutation.mutate()} disabled={!preview || importMutation.isPending} className="gap-2">
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Confirmar importação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {preview && (
        <Dialog open={isLotsPreviewOpen} onOpenChange={setIsLotsPreviewOpen}>
          <DialogContent className="flex max-h-[88vh] max-w-6xl flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Lotes que serão criados</DialogTitle>
              <DialogDescription>
                Visualização detalhada dos {preview.summary.purchaseCount} lote(s) antes da importação.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 pr-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label="Compras" value={preview.summary.purchaseCount.toString()} />
                  <MetricCard label="Itens" value={preview.summary.totalItems.toString()} />
                  <MetricCard label="Peças" value={preview.summary.totalPieces.toString()} />
                  <MetricCard label="Total estimado" value={formatCurrency(preview.summary.totalEstimated)} />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Itens</TableHead>
                        <TableHead className="text-right">Peças</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Total estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.groups.map((group) => (
                        <TableRow key={group.key}>
                          <TableCell>
                            <div className="font-medium">{group.supplierName}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {group.lot}
                            </Badge>
                          </TableCell>
                          <TableCell>{group.orderDate}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{group.statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{group.totalItems}</TableCell>
                          <TableCell className="text-right">{group.totalPieces}</TableCell>
                          <TableCell className="text-right">{formatCurrency(group.subtotalProducts)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(group.totalEstimated)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLotsPreviewOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/80 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

function formatImportError(error: Error): string {
  const message = error.message || "Erro desconhecido ao importar CSV.";

  if (message.includes("Could not find the function public.import_purchase_orders_csv")) {
    return "A função SQL `public.import_purchase_orders_csv(jsonb)` não foi encontrada no schema cache do Supabase. Reaplique a migration correta e remova a versão manual que usa a tabela `purchases`.";
  }

  if (message.includes("A importação demorou mais do que o esperado")) {
    return message;
  }

  return message;
}
