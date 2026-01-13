import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface CreditFeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethodId: string;
  paymentMethodName: string;
  existingFees: Array<{
    id: string;
    installments: number;
    fee_percent: number;
    fee_fixed_brl: number;
  }>;
}

export const CreditFeesModal = ({
  open,
  onOpenChange,
  paymentMethodId,
  paymentMethodName,
  existingFees,
}: CreditFeesModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fees, setFees] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize fees from existing data
  useEffect(() => {
    if (open) {
      const feeMap: Record<number, number> = {};
      // Initialize all 18 installments with 0
      for (let i = 1; i <= 18; i++) {
        feeMap[i] = 0;
      }
      // Override with existing fees
      existingFees.forEach(fee => {
        if (fee.installments >= 1 && fee.installments <= 18) {
          feeMap[fee.installments] = fee.fee_percent;
        }
      });
      setFees(feeMap);
    }
  }, [open, existingFees]);

  const handleFeeChange = (installments: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFees(prev => ({ ...prev, [installments]: numValue }));
  };

  const handleSave = async () => {
    if (!user?.id || !paymentMethodId) return;

    setIsSaving(true);
    try {
      // Delete all existing credit fees for this method
      await supabase
        .from('payment_fees')
        .delete()
        .eq('user_id', user.id)
        .eq('payment_method_id', paymentMethodId);

      // Insert all 18 installments
      const feesToInsert = Object.entries(fees).map(([installments, fee_percent]) => ({
        user_id: user.id,
        payment_method_id: paymentMethodId,
        payment_method: 'credit',
        installments: parseInt(installments),
        fee_percent,
        fee_fixed_brl: 0,
      }));

      const { error } = await supabase.from('payment_fees').insert(feesToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['payment-fees'] });
      queryClient.invalidateQueries({ queryKey: ['payment-fees-config'] });
      toast({ title: 'Taxas de crédito atualizadas!' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving credit fees:', error);
      toast({ title: 'Erro ao salvar taxas', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPercent = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Taxas de {paymentMethodName} (1x a 18x)</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3 py-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(installments => (
              <div key={installments} className="flex items-center gap-3">
                <Label className="w-12 text-right font-medium">{installments}x</Label>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={fees[installments] ?? 0}
                    onChange={(e) => handleFeeChange(installments, e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Todas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
