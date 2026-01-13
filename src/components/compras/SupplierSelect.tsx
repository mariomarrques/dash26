import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SupplierSelectProps {
  value: string | null;
  onChange: (id: string | null, type: string) => void;
}

export function SupplierSelect({ value, onChange }: SupplierSelectProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("china");

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createSupplierMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!newName.trim()) throw new Error("Nome é obrigatório");

      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          type: newType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onChange(data.id, data.type);
      setShowModal(false);
      setNewName("");
      setNewType("china");
      toast({ title: "Fornecedor criado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleChange = (supplierId: string) => {
    if (supplierId === "__new__") {
      setShowModal(true);
      return;
    }
    const supplier = suppliers?.find((s) => s.id === supplierId);
    onChange(supplierId, supplier?.type || "china");
  };

  const selectedSupplier = suppliers?.find((s) => s.id === value);

  return (
    <>
      <Select value={value || ""} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um fornecedor">
            {selectedSupplier && (
              <span className="flex items-center gap-2">
                <Store size={14} className="text-muted-foreground" />
                {selectedSupplier.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
          ) : suppliers && suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                <span className="flex items-center gap-2">
                  {supplier.name}
                  <span className="text-xs text-muted-foreground capitalize">
                    ({supplier.type})
                  </span>
                </span>
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              Sem fornecedores ainda
            </div>
          )}
          <div className="border-t border-border mt-1 pt-1">
            <button
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-primary hover:bg-muted rounded-sm transition-colors"
              onClick={() => setShowModal(true)}
            >
              <Plus size={14} />
              Adicionar fornecedor
            </button>
          </div>
        </SelectContent>
      </Select>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Fornecedor *</Label>
              <Input
                placeholder="Ex: Fornecedor XYZ"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <RadioGroup value={newType} onValueChange={setNewType} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="china" id="type-china" />
                  <Label htmlFor="type-china" className="font-normal cursor-pointer">
                    China
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="brasil" id="type-brasil" />
                  <Label htmlFor="type-brasil" className="font-normal cursor-pointer">
                    Brasil
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createSupplierMutation.mutate()}
              disabled={createSupplierMutation.isPending || !newName.trim()}
            >
              {createSupplierMutation.isPending ? "Criando..." : "Criar Fornecedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}