import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

// Default channels
const DEFAULT_CHANNELS = ['WhatsApp', 'Instagram', 'Influencer', 'Loja'];

// Default payment methods with their types
const DEFAULT_METHODS = [
  { name: 'PIX', type: 'pix' },
  { name: 'Crédito', type: 'credit' },
  { name: 'Débito', type: 'debit' },
  { name: 'Dinheiro', type: 'cash' },
];

// Default fees - PIX and Débito use installments = 1
const DEFAULT_FEES: Record<string, { installments: number; fee_percent: number }[]> = {
  pix: [{ installments: 1, fee_percent: 0 }],
  debit: [{ installments: 1, fee_percent: 1.37 }],
  credit: [
    { installments: 1, fee_percent: 3.15 },
    { installments: 2, fee_percent: 5.39 },
    { installments: 3, fee_percent: 6.12 },
    { installments: 4, fee_percent: 6.85 },
    { installments: 5, fee_percent: 7.57 },
    { installments: 6, fee_percent: 8.28 },
    { installments: 7, fee_percent: 8.99 },
    { installments: 8, fee_percent: 9.69 },
    { installments: 9, fee_percent: 10.38 },
    { installments: 10, fee_percent: 11.06 },
    { installments: 11, fee_percent: 11.74 },
    { installments: 12, fee_percent: 12.40 },
    // 13x-18x default to 12x rate
    { installments: 13, fee_percent: 12.40 },
    { installments: 14, fee_percent: 12.40 },
    { installments: 15, fee_percent: 12.40 },
    { installments: 16, fee_percent: 12.40 },
    { installments: 17, fee_percent: 12.40 },
    { installments: 18, fee_percent: 12.40 },
  ],
};

export const useAccountSeed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasSeeded = useRef(false);

  useEffect(() => {
    if (!user?.id || hasSeeded.current) return;

    const seedAccount = async () => {
      try {
        // Check if user already has any channels or methods (avoid re-seeding)
        const [channelsResult, methodsResult] = await Promise.all([
          supabase.from('sales_channels').select('id').eq('user_id', user.id).limit(1),
          supabase.from('payment_methods').select('id').eq('user_id', user.id).limit(1),
        ]);

        const hasChannels = (channelsResult.data?.length || 0) > 0;
        const hasMethods = (methodsResult.data?.length || 0) > 0;

        // If user already has data, skip seeding
        if (hasChannels && hasMethods) {
          hasSeeded.current = true;
          return;
        }

        // Seed channels if missing
        if (!hasChannels) {
          const channelsToInsert = DEFAULT_CHANNELS.map(name => ({
            user_id: user.id,
            name,
            is_active: true,
          }));
          await supabase.from('sales_channels').insert(channelsToInsert);
        }

        // Seed methods and fees if missing
        if (!hasMethods) {
          for (const method of DEFAULT_METHODS) {
            // Insert method
            const { data: insertedMethod, error: methodError } = await supabase
              .from('payment_methods')
              .insert({
                user_id: user.id,
                name: method.name,
                type: method.type,
                is_active: true,
              })
              .select('id')
              .single();

            if (methodError || !insertedMethod) continue;

            // Insert fees for this method
            const fees = DEFAULT_FEES[method.type] || [];
            if (fees.length > 0) {
              const feesToInsert = fees.map(fee => ({
                user_id: user.id,
                payment_method_id: insertedMethod.id,
                payment_method: method.type,
                installments: fee.installments,
                fee_percent: fee.fee_percent,
                fee_fixed_brl: 0,
              }));
              await supabase.from('payment_fees').insert(feesToInsert);
            }
          }
        }

        hasSeeded.current = true;
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['sales-channels'] });
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
        queryClient.invalidateQueries({ queryKey: ['payment-fees'] });
        queryClient.invalidateQueries({ queryKey: ['payment-fees-config'] });
      } catch (error) {
        console.error('Error seeding account:', error);
      }
    };

    seedAccount();
  }, [user?.id, queryClient]);
};
