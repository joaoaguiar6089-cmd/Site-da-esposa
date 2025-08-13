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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is admin using the new secure method
          setTimeout(async () => {
            try {
              const { data: adminUser } = await supabase
                .from('admin_users')
                .select('is_active')
                .eq('user_id', session.user.id)
                .single();
              
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              
              setIsAdmin(adminUser?.is_active === true && profile?.role === 'admin');
            } catch (error) {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
            }
          }, 0);
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
        const { error: signUpError } = await supabase.auth.signUp({
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
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: (await supabase.auth.getUser()).data.user?.id,
            cpf: cleanCPF,
            role: 'client'
          }]);

        if (profileError) {
          return { error: profileError };
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
      
      const { error: signUpError } = await supabase.auth.signUp({
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
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          cpf: cpf.replace(/\D/g, ''),
          role: 'client'
        }]);

      if (profileError) {
        return { error: profileError };
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