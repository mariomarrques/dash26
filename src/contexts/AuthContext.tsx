import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
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

// Profile type
interface Profile {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileLoaded: boolean; // Indica se tentamos carregar o profile
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasSeeded = useRef(false);
  const initializationComplete = useRef(false);

  // Função para buscar profile (não bloqueia se falhar)
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfileLoaded(true);
      
      if (error) {
        // Profile não encontrado - não é erro crítico
        console.log('Profile not found, will use defaults');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfileLoaded(true);
      return null;
    }
  };

  // Refetch profile (exposta para uso externo)
  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Timeout de segurança: nunca ficar em loading por mais de 10 segundos
    const safetyTimeout = setTimeout(() => {
      if (loading && !initializationComplete.current && mounted) {
        console.warn('Auth initialization timeout - forcing loading to false');
        setLoading(false);
        initializationComplete.current = true;
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        // Buscar sessão inicial
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return; // Componente desmontado
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          initializationComplete.current = true;
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          // Buscar profile de forma não-bloqueante
          const profileData = await fetchProfile(initialSession.user.id);
          if (mounted) {
            setProfile(profileData);
          }

          // Seed account data (não bloqueia)
          if (!hasSeeded.current && mounted) {
            hasSeeded.current = true;
            seedAccountData(initialSession.user.id).catch(console.error);
          }
        }

        if (mounted) {
          setLoading(false);
          initializationComplete.current = true;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          initializationComplete.current = true;
        }
      }
    };

    // Listener para mudanças de auth - só ativar APÓS inicialização
    const setupAuthListener = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!mounted) return;
          
          // Ignorar eventos durante inicialização
          if (!initializationComplete.current) {
            console.log('Ignoring auth event during initialization:', event);
            return;
          }

          console.log('Auth event:', event);

          // Atualizar estado imediatamente
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            // Buscar profile
            const profileData = await fetchProfile(newSession.user.id);
            if (mounted) {
              setProfile(profileData);
            }

            // Seed se necessário
            if (!hasSeeded.current && mounted) {
              hasSeeded.current = true;
              seedAccountData(newSession.user.id).catch(console.error);
            }
          } else {
            if (mounted) {
              setProfile(null);
              setProfileLoaded(false);
            }
          }

          // Garantir que loading está false após qualquer mudança de estado
          if (mounted && initializationComplete.current) {
            setLoading(false);
          }
        }
      );
      
      return subscription;
    };

    // Inicializar primeiro, listener depois
    initializeAuth().then(() => {
      if (mounted) {
        authSubscription = setupAuthListener();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Array vazio - rodar apenas uma vez

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });

    // Se signup bem-sucedido e temos usuário, criar profile
    if (!error && data.user) {
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: name,
            updated_at: new Date().toISOString()
          });
      } catch (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

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
    try {
      // Limpar estados locais primeiro
      hasSeeded.current = false;
      setProfile(null);
      setProfileLoaded(false);
      setUser(null);
      setSession(null);
      
      // Chamar signOut do Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Mesmo com erro, garantir que o estado local está limpo
      setProfile(null);
      setProfileLoaded(false);
      setUser(null);
      setSession(null);
    }
  };

  // Atualizar nome do perfil
  const updateProfile = async (name: string) => {
    if (!user) {
      return { error: new Error('Usuário não autenticado') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        setProfile(prev => prev ? { ...prev, name } : { id: user.id, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }

      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      profileLoaded,
      loading, 
      signUp, 
      signIn, 
      signOut, 
      updateProfile,
      refetchProfile 
    }}>
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

// Varredura completa concluída: estabilidade restaurada, seed demo corrigido e painel55 eliminado do Dash 26
