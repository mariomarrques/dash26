import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Default channels
const DEFAULT_CHANNELS = ['WhatsApp', 'Instagram', 'Influencer', 'Loja'];

// Default payment methods with their types
const DEFAULT_METHODS = [
  { name: 'PIX', type: 'pix' },
  { name: 'Crédito', type: 'credit' },
  { name: 'Débito', type: 'debit' },
  { name: 'Dinheiro', type: 'cash' },
];

// Default fees
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
    { installments: 13, fee_percent: 12.40 },
    { installments: 14, fee_percent: 12.40 },
    { installments: 15, fee_percent: 12.40 },
    { installments: 16, fee_percent: 12.40 },
    { installments: 17, fee_percent: 12.40 },
    { installments: 18, fee_percent: 12.40 },
  ],
};

const seedAccountData = async (userId: string) => {
  try {
    const [channelsResult, methodsResult] = await Promise.all([
      supabase.from('sales_channels').select('id').eq('user_id', userId).limit(1),
      supabase.from('payment_methods').select('id').eq('user_id', userId).limit(1),
    ]);

    const hasChannels = (channelsResult.data?.length || 0) > 0;
    const hasMethods = (methodsResult.data?.length || 0) > 0;

    if (hasChannels && hasMethods) return;

    if (!hasChannels) {
      const channelsToInsert = DEFAULT_CHANNELS.map(name => ({
        user_id: userId,
        name,
        is_active: true,
      }));
      await supabase.from('sales_channels').insert(channelsToInsert);
    }

    if (!hasMethods) {
      for (const method of DEFAULT_METHODS) {
        const { data: insertedMethod, error: methodError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: userId,
            name: method.name,
            type: method.type,
            is_active: true,
          })
          .select('id')
          .single();

        if (methodError || !insertedMethod) continue;

        const fees = DEFAULT_FEES[method.type] || [];
        if (fees.length > 0) {
          const feesToInsert = fees.map(fee => ({
            user_id: userId,
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
  } catch (error) {
    console.error('Error seeding account:', error);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasSeeded = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Run seed after authentication (deferred to avoid deadlock)
        if (session?.user && !hasSeeded.current) {
          hasSeeded.current = true;
          setTimeout(() => {
            seedAccountData(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Also seed on initial session check
      if (session?.user && !hasSeeded.current) {
        hasSeeded.current = true;
        setTimeout(() => {
          seedAccountData(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    hasSeeded.current = false; // Reset on signout
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
