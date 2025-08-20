import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signInWithCPF: (cpf: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, cpf: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Aumentar timeout de inatividade para 30 minutos para admin
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAdminRef = useRef(false);
  const userRef = useRef<User | null>(null);

  // Atualizar refs quando states mudarem
  useEffect(() => {
    isAdminRef.current = isAdmin;
    userRef.current = user;
  }, [isAdmin, user]);

  // Função para verificar se o usuário é admin
  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      console.log('Checking admin status for user:', userId);
      
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('user_id', userId)
        .single();
      
      if (adminError) {
        console.log('Admin check error (user not admin):', adminError);
        setIsAdmin(false);
        return false;
      }
      
      const isAdminActive = adminUser?.is_active === true;
      console.log('Admin status result:', isAdminActive);
      setIsAdmin(isAdminActive);
      
      return isAdminActive;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return false;
    }
  }, []);

  // Função para resetar o timer de inatividade
  const resetInactivityTimer = useCallback(() => {
    // Só ativar timer se usuário for admin
    if (!isAdminRef.current || !userRef.current) {
      return;
    }

    // Limpar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Criar novo timer
    inactivityTimerRef.current = setTimeout(async () => {
      console.log('Auto logout due to inactivity');
      await signOut();
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Função para limpar timer
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Effect para gerenciar timer de inatividade
  useEffect(() => {
    if (user && isAdmin) {
      // Usuário admin logado - iniciar timer
      resetInactivityTimer();
      
      // Adicionar listeners para atividade
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
      });

      return () => {
        // Cleanup
        events.forEach(event => {
          document.removeEventListener(event, resetInactivityTimer);
        });
      };
    } else {
      // Usuário não admin ou deslogado - limpar timer
      clearInactivityTimer();
    }

    return clearInactivityTimer;
  }, [user, isAdmin, resetInactivityTimer, clearInactivityTimer]);

  // Effect principal para gerenciar auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Primeiro, verificar sessão existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await checkAdminStatus(session.user.id);
          } else {
            setIsAdmin(false);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
        
        if (!loading) {
          setLoading(false);
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInactivityTimer();
    };
  }, [checkAdminStatus, clearInactivityTimer]);

  const signInWithCPF = async (cpf: string) => {
    try {
      setLoading(true);
      
      // Clean CPF and validate format
      const cleanCPF = cpf.replace(/\D/g, '');
      
      if (cleanCPF.length !== 11) {
        return { error: new Error('CPF deve ter 11 dígitos') };
      }
      
      const tempEmail = `${cleanCPF}@cliente.agendamento.com`;
      
      // Generate a simple secure password based on CPF
      const securePassword = `cpf_${cleanCPF}_${btoa(cleanCPF).slice(0, 8)}`;
      
      // Try to sign in first
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: securePassword,
      });

      if (signInError) {
        // If sign in fails, create the account with secure password
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: securePassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          return { error: signUpError };
        }

        // Create profile with CPF if user was created
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              user_id: signUpData.user.id,
              cpf: cleanCPF,
              role: 'client'
            }]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't return error here as user is created
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, cpf: string) => {
    try {
      setLoading(true);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) {
        return { error: signUpError };
      }

      // Create profile
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: signUpData.user.id,
            cpf: cpf.replace(/\D/g, ''),
            role: 'client'
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't return error as user is created
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      clearInactivityTimer();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    signInWithCPF,
    signUp,
    signIn,
    signOut,
    isAdmin,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};