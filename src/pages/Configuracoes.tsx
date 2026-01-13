import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, CreditCard, Store, Percent, Trash2, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CreditFeesModal } from "@/components/configuracoes/CreditFeesModal";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface PaymentFee {
  id: string;
  payment_method_id: string | null;
  payment_method: string;
  installments: number;
  fee_percent: number;
  fee_fixed_brl: number;
}

interface SalesChannel {
  id: string;
  name: string;
  is_active: boolean;
}

const typeLabels: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  other: "Outro",
};

const Configuracoes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for modals
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [creditFeesModalOpen, setCreditFeesModalOpen] = useState(false);
  const [creditMethodForFees, setCreditMethodForFees] = useState<PaymentMethod | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null);
  const [editingFee, setEditingFee] = useState<PaymentFee | null>(null);
  
  // Form state
  const [methodName, setMethodName] = useState("");
  const [methodType, setMethodType] = useState("other");
  const [channelName, setChannelName] = useState("");
  const [feeMethodId, setFeeMethodId] = useState("");
  const [feeInstallments, setFeeInstallments] = useState(1);
  const [feePercent, setFeePercent] = useState(0);
  const [feeFixed, setFeeFixed] = useState(0);

  // Queries
  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!user?.id,
  });

  const { data: paymentFees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['payment-fees-config', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('payment_fees')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_method')
        .order('installments');
      if (error) throw error;
      return data as PaymentFee[];
    },
    enabled: !!user?.id,
  });

  const { data: salesChannels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['sales-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sales_channels')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data as SalesChannel[];
    },
    enabled: !!user?.id,
  });

  // Mutations
  const saveMethodMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !methodName.trim()) throw new Error("Nome obrigatório");
      
      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ name: methodName.trim(), type: methodType })
          .eq('id', editingMethod.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({ user_id: user.id, name: methodName.trim(), type: methodType });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setMethodModalOpen(false);
      resetMethodForm();
      toast({ title: editingMethod ? "Método atualizado!" : "Método criado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const toggleMethodMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });

  const saveChannelMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !channelName.trim()) throw new Error("Nome obrigatório");
      
      if (editingChannel) {
        const { error } = await supabase
          .from('sales_channels')
          .update({ name: channelName.trim() })
          .eq('id', editingChannel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sales_channels')
          .insert({ user_id: user.id, name: channelName.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-channels'] });
      setChannelModalOpen(false);
      resetChannelForm();
      toast({ title: editingChannel ? "Canal atualizado!" : "Canal criado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sales_channels')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-channels'] });
    },
  });

  const saveFeeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      // Get the payment method to determine the type
      const method = paymentMethods.find(m => m.id === feeMethodId);
      const methodType = method?.type || 'other';
      
      if (editingFee) {
        const { error } = await supabase
          .from('payment_fees')
          .update({
            payment_method_id: feeMethodId || null,
            payment_method: methodType,
            installments: methodType === 'credit' ? feeInstallments : 1,
            fee_percent: feePercent,
            fee_fixed_brl: feeFixed,
          })
          .eq('id', editingFee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_fees')
          .insert({
            user_id: user.id,
            payment_method_id: feeMethodId || null,
            payment_method: methodType,
            installments: methodType === 'credit' ? feeInstallments : 1,
            fee_percent: feePercent,
            fee_fixed_brl: feeFixed,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-fees-config'] });
      queryClient.invalidateQueries({ queryKey: ['payment-fees'] });
      setFeeModalOpen(false);
      resetFeeForm();
      toast({ title: editingFee ? "Taxa atualizada!" : "Taxa criada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const deleteFeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_fees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-fees-config'] });
      queryClient.invalidateQueries({ queryKey: ['payment-fees'] });
      toast({ title: "Taxa removida!" });
    },
  });

  // Form reset functions
  const resetMethodForm = () => {
    setMethodName("");
    setMethodType("other");
    setEditingMethod(null);
  };

  const resetChannelForm = () => {
    setChannelName("");
    setEditingChannel(null);
  };

  const resetFeeForm = () => {
    setFeeMethodId("");
    setFeeInstallments(1);
    setFeePercent(0);
    setFeeFixed(0);
    setEditingFee(null);
  };

  // Open modals with editing data
  const openEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodName(method.name);
    setMethodType(method.type);
    setMethodModalOpen(true);
  };

  const openEditChannel = (channel: SalesChannel) => {
    setEditingChannel(channel);
    setChannelName(channel.name);
    setChannelModalOpen(true);
  };

  const openEditFee = (fee: PaymentFee) => {
    setEditingFee(fee);
    setFeeMethodId(fee.payment_method_id || "");
    setFeeInstallments(fee.installments || 1);
    setFeePercent(fee.fee_percent);
    setFeeFixed(fee.fee_fixed_brl || 0);
    setFeeModalOpen(true);
  };

  const selectedMethodType = paymentMethods.find(m => m.id === feeMethodId)?.type;

  return (
    <DashboardLayout title="Configurações" subtitle="Personalize métodos de pagamento e canais">
      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="methods" className="gap-2">
            <CreditCard size={16} />
            Métodos de Pagamento
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-2">
            <Percent size={16} />
            Taxas
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Store size={16} />
            Canais de Venda
          </TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Métodos de Pagamento</h3>
              <p className="text-sm text-muted-foreground">Configure os métodos aceitos no seu negócio</p>
            </div>
            <Button onClick={() => { resetMethodForm(); setMethodModalOpen(true); }} className="gap-2">
              <Plus size={16} />
              Novo Método
            </Button>
          </div>

          <div className="grid gap-3">
            {methodsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : paymentMethods.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum método cadastrado</p>
                  <p className="text-sm">Adicione métodos de pagamento para usar nas vendas</p>
                </CardContent>
              </Card>
            ) : (
              paymentMethods.map((method) => (
                <Card key={method.id} className={`glass-card ${!method.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <Badge variant="secondary" className="text-xs">{typeLabels[method.type] || method.type}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={(checked) => toggleMethodMutation.mutate({ id: method.id, is_active: checked })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditMethod(method)}>
                          <Edit2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Taxas por Método</h3>
              <p className="text-sm text-muted-foreground">Configure taxas por método e parcelas</p>
            </div>
            <Button onClick={() => { resetFeeForm(); setFeeModalOpen(true); }} className="gap-2">
              <Plus size={16} />
              Nova Taxa
            </Button>
          </div>

          {/* Credit Card Quick Edit Section */}
          {paymentMethods.filter(m => m.type === 'credit').length > 0 && (
            <Card className="glass-card border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <CreditCard size={16} className="text-primary" />
                      Taxas de Crédito (1x a 18x)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Edite todas as parcelas de crédito de uma vez
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {paymentMethods.filter(m => m.type === 'credit' && m.is_active).map((method) => (
                      <Button
                        key={method.id}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setCreditMethodForFees(method);
                          setCreditFeesModalOpen(true);
                        }}
                      >
                        <Settings2 size={14} />
                        {method.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {feesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : paymentFees.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Percent className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma taxa cadastrada</p>
                  <p className="text-sm">Adicione taxas para calcular automaticamente nas vendas</p>
                </CardContent>
              </Card>
            ) : (
              // Group non-credit fees or show summary for credit
              paymentFees
                .filter(fee => {
                  const method = paymentMethods.find(m => m.id === fee.payment_method_id);
                  // Show non-credit fees normally, for credit show only 1x as summary
                  return method?.type !== 'credit' || fee.installments === 1;
                })
                .map((fee) => {
                  const method = paymentMethods.find(m => m.id === fee.payment_method_id);
                  const isCredit = method?.type === 'credit';
                  const creditFees = isCredit 
                    ? paymentFees.filter(f => f.payment_method_id === fee.payment_method_id)
                    : [];
                  
                  return (
                    <Card key={fee.id} className="glass-card">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {method?.name || typeLabels[fee.payment_method] || fee.payment_method}
                              {isCredit && creditFees.length > 1 && (
                                <span className="text-muted-foreground ml-2 text-sm">
                                  ({creditFees.length} parcelas configuradas)
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {isCredit ? (
                                <Badge variant="outline">1x: {fee.fee_percent}%</Badge>
                              ) : (
                                <>
                                  <Badge variant="outline">{fee.fee_percent}%</Badge>
                                  {fee.fee_fixed_brl > 0 && (
                                    <Badge variant="secondary">+ R$ {fee.fee_fixed_brl.toFixed(2)}</Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCredit ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  setCreditMethodForFees(method!);
                                  setCreditFeesModalOpen(true);
                                }}
                              >
                                <Settings2 size={14} />
                                Editar Parcelas
                              </Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEditFee(fee)}>
                                  <Edit2 size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteFeeMutation.mutate(fee.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Canais de Venda</h3>
              <p className="text-sm text-muted-foreground">Configure onde você vende seus produtos</p>
            </div>
            <Button onClick={() => { resetChannelForm(); setChannelModalOpen(true); }} className="gap-2">
              <Plus size={16} />
              Novo Canal
            </Button>
          </div>

          <div className="grid gap-3">
            {channelsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : salesChannels.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum canal cadastrado</p>
                  <p className="text-sm">Adicione canais de venda para organizar suas vendas</p>
                </CardContent>
              </Card>
            ) : (
              salesChannels.map((channel) => (
                <Card key={channel.id} className={`glass-card ${!channel.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{channel.name}</p>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={channel.is_active}
                          onCheckedChange={(checked) => toggleChannelMutation.mutate({ id: channel.id, is_active: checked })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditChannel(channel)}>
                          <Edit2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Method Modal */}
      <Dialog open={methodModalOpen} onOpenChange={setMethodModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Editar Método" : "Novo Método de Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Pix Bradesco, Crédito Visa..."
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={methodType} onValueChange={setMethodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMethodModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMethodMutation.mutate()} disabled={saveMethodMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Channel Modal */}
      <Dialog open={channelModalOpen} onOpenChange={setChannelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Editar Canal" : "Novo Canal de Venda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Instagram, Loja Física, Shopee..."
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveChannelMutation.mutate()} disabled={saveChannelMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Fee Modal */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFee ? "Editar Taxa" : "Nova Taxa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={feeMethodId} onValueChange={setFeeMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.filter(m => m.is_active).map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedMethodType === 'credit' && (
              <div className="space-y-2">
                <Label>Número de Parcelas</Label>
                <Select value={String(feeInstallments)} onValueChange={(v) => setFeeInstallments(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={feePercent}
                  onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa Fixa (R$)</Label>
                <MoneyInput
                  value={feeFixed}
                  onChange={setFeeFixed}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveFeeMutation.mutate()} disabled={saveFeeMutation.isPending || !feeMethodId}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Fees Modal */}
      {creditMethodForFees && (
        <CreditFeesModal
          open={creditFeesModalOpen}
          onOpenChange={setCreditFeesModalOpen}
          paymentMethodId={creditMethodForFees.id}
          paymentMethodName={creditMethodForFees.name}
          existingFees={paymentFees
            .filter(f => f.payment_method_id === creditMethodForFees.id)
            .map(f => ({
              id: f.id,
              installments: f.installments || 1,
              fee_percent: f.fee_percent,
              fee_fixed_brl: f.fee_fixed_brl,
            }))}
        />
      )}
    </DashboardLayout>
  );
};

export default Configuracoes;
