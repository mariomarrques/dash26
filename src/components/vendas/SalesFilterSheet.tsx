import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SalesChannel {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface SalesFilterSheetProps {
  channelFilter: string;
  paymentFilter: string;
  typeFilter: string;
  onChannelChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  salesChannels: SalesChannel[];
  paymentMethods: PaymentMethod[];
}

export function SalesFilterSheet({
  channelFilter,
  paymentFilter,
  typeFilter,
  onChannelChange,
  onPaymentChange,
  onTypeChange,
  salesChannels,
  paymentMethods,
}: SalesFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [localChannel, setLocalChannel] = useState(channelFilter);
  const [localPayment, setLocalPayment] = useState(paymentFilter);
  const [localType, setLocalType] = useState(typeFilter);

  // Sync local state when props change
  useEffect(() => {
    setLocalChannel(channelFilter);
    setLocalPayment(paymentFilter);
    setLocalType(typeFilter);
  }, [channelFilter, paymentFilter, typeFilter]);

  const hasActiveFilters = channelFilter !== "all" || paymentFilter !== "all" || typeFilter !== "all";
  const activeFilterCount = [channelFilter, paymentFilter, typeFilter].filter(f => f !== "all").length;

  const handleApply = () => {
    onChannelChange(localChannel);
    onPaymentChange(localPayment);
    onTypeChange(localType);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalChannel("all");
    setLocalPayment("all");
    setLocalType("all");
    onChannelChange("all");
    onPaymentChange("all");
    onTypeChange("all");
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9">
          <Filter size={16} />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-background">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">Filtros</DrawerTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground gap-1 h-8"
              >
                <X size={14} />
                Limpar
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-5">
          {/* Channel Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Canal de Venda</label>
            <Select value={localChannel} onValueChange={setLocalChannel}>
              <SelectTrigger className="w-full bg-card border-border rounded-xl h-11">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-xl">
                <SelectItem value="all">Todos os canais</SelectItem>
                {salesChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Método de Pagamento</label>
            <Select value={localPayment} onValueChange={setLocalPayment}>
              <SelectTrigger className="w-full bg-card border-border rounded-xl h-11">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-xl">
                <SelectItem value="all">Todos os métodos</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de Venda</label>
            <Select value={localType} onValueChange={setLocalType}>
              <SelectTrigger className="w-full bg-card border-border rounded-xl h-11">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-xl">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="stock">Em estoque</SelectItem>
                <SelectItem value="preorder">Encomenda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DrawerFooter className="border-t border-border pt-4">
          <Button onClick={handleApply} className="w-full h-11 rounded-xl">
            Aplicar Filtros
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-11 rounded-xl">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
