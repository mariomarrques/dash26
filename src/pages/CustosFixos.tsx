import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Package, AlertTriangle, Trash2, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const CustosFixos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalUnits, setTotalUnits] = useState<number>(1);

  const resetForm = () => {
    setName("");
    setTotalCost(0);
    setTotalUnits(1);
  };

  // Fetch fixed costs
  const { data: fixedCosts, isLoading } = useQuery({
    queryKey: ['fixed-costs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!name.trim()) throw new Error("Nome é obrigatório");
      if (totalUnits <= 0) throw new Error("Quantidade deve ser maior que zero");
      if (totalCost <= 0) throw new Error("Valor deve ser maior que zero");

      const { data, error } = await supabase
        .from('fixed_costs')
        .insert({
          user_id: user.id,
          name: name.trim(),
          total_cost_brl: totalCost,
          total_units: totalUnits,
          remaining_units: totalUnits,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      // Invalidar dashboard para atualizar métricas (custos afetam lucro)
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['secondary-insights'] });
      queryClient.invalidateQueries({ queryKey: ['team-profitability'] });
      toast({ title: "Custo fixo cadastrado com sucesso" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao cadastrar", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fixed_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      // Invalidar dashboard para atualizar métricas (custos afetam lucro)
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['secondary-insights'] });
      queryClient.invalidateQueries({ queryKey: ['team-profitability'] });
      toast({ title: "Custo fixo removido" });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao remover", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const unitCostPreview = totalUnits > 0 ? totalCost / totalUnits : 0;

  return (
    <DashboardLayout
      title="Custos Fixos"
      subtitle="Gerencie custos consumíveis por venda"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Como funciona?</p>
            <p className="text-muted-foreground mt-1">
              Custos fixos são diluídos automaticamente em cada venda (1 unidade por venda). 
              Exemplos: sacolas, etiquetas, brindes, embalagens.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex justify-end">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
          >
            <Plus size={18} />
            Novo Custo Fixo
          </Button>
        </div>

        {/* Costs Table */}
        <div className="card-metric overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : fixedCosts && fixedCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Nome</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Custo Total</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Qtd. Comprada</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Custo/Unidade</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Restante</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedCosts.map((cost) => (
                  <TableRow 
                    key={cost.id} 
                    className="border-border hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cost.total_cost_brl)}</TableCell>
                    <TableCell className="text-center">{cost.total_units}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(cost.unit_cost_brl)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cost.remaining_units === 0 ? "text-destructive" : ""}>
                        {cost.remaining_units}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {cost.remaining_units === 0 ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle size={12} />
                              Esgotado
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Este custo acabou. Cadastre um novo lote.
                          </TooltipContent>
                        </Tooltip>
                      ) : cost.remaining_units <= 5 ? (
                        <Badge variant="warning">Baixo</Badge>
                      ) : (
                        <Badge variant="success">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(cost.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
                <Package size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                Nenhum custo fixo cadastrado
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Cadastre custos consumíveis como sacolas, etiquetas e embalagens. 
                Eles serão diluídos automaticamente nas suas vendas.
              </p>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-xl gap-2"
              >
                <Plus size={18} />
                Cadastrar primeiro custo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Custo Fixo</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-label">Nome do custo</Label>
              <Input
                placeholder="Ex: Sacola personalizada"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-label">Valor total pago (R$)</Label>
                <MoneyInput
                  value={totalCost}
                  onChange={setTotalCost}
                  className="bg-background border-border rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Quantidade comprada</Label>
                <Input
                  type="number"
                  min={1}
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(parseInt(e.target.value) || 1)}
                  className="bg-background border-border rounded-xl"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Custo por unidade:</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(unitCostPreview)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Esse valor será diluído em cada venda
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="flex-1 rounded-xl border-border"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || totalUnits <= 0 || totalCost <= 0 || createMutation.isPending}
                className="flex-1 bg-gradient-primary hover:opacity-90 text-white rounded-xl"
              >
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover custo fixo?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O histórico de aplicação em vendas será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CustosFixos;
