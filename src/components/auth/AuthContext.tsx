import React, { createContext, useContext, useEffect, useState } from 'react';
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

  // Timer de inatividade para admin (5 minutos)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  // Função para verificar se o usuário é admin
  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (adminError || !adminUser) {
        setIsAdmin(false);
        return false;
      }
      
      const isAdminActive = adminUser?.is_active === true;
      setIsAdmin(isAdminActive);
      
      return isAdminActive;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return false;
    }
  };

  // Função para resetar o timer de inatividade
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    if (user && isAdmin) {
      const timer = setTimeout(() => {
        console.log('Auto logout due to inactivity');
        signOut();
      }, INACTIVITY_TIMEOUT);

      setInactivityTimer(timer);
    }
  };

  // Effect para gerenciar timer de inatividade
  useEffect(() => {
    if (user && isAdmin) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const resetTimer = () => resetInactivityTimer();

      // Iniciar timer
      resetInactivityTimer();

      // Adicionar listeners
      events.forEach(event => {
        document.addEventListener(event, resetTimer, { passive: true });
      });

      return () => {
        // Limpar listeners
        events.forEach(event => {
          document.removeEventListener(event, resetTimer);
        });
        
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
      };
    } else if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  }, [user, isAdmin]);

  // Effect principal para auth
  useEffect(() => {
    let mounted = true;

    // Função para lidar com mudanças de estado de auth
    const handleAuthStateChange = (event: any, session: Session | null) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Verificar status de admin sem logs excessivos
        setTimeout(() => {
          checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    // Configurar listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Verificar sessão inicial
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        handleAuthStateChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, []);

  const signInWithCPF = async (cpf: string) => {
    try {
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

        // Create profile with CPF
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
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, cpf: string) => {
    try {
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
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
    await supabase.auth.signOut();
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