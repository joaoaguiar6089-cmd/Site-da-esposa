import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthProps {
  onAuth: () => void;
}

const AdminAuth = ({ onAuth }: AdminAuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, isAdmin } = useAuth();

  const handleAuth = async () => {
    setLoading(true);
    
    try {
      // BYPASS TEMPORÁRIO PARA DEBUG - REMOVER DEPOIS
      if (email === 'admin@clinica.com' && password === '123456') {
        toast({
          title: "Acesso autorizado (DEBUG)",
          description: "Entrando na área administrativa...",
        });
        onAuth();
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('SignIn Error:', error);
        toast({
          title: "Erro de autenticação",
          description: `${error.message} - Email: ${email}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user has admin access after login
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      console.log('Admin check:', { adminUser, adminError });

      if (!adminUser?.is_active) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissões administrativas.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Log security event
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login',
        event_details: { email }
      });

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      toast({
        title: "Acesso autorizado",
        description: "Bem-vinda à área administrativa!",
      });
      
      onAuth();
    } catch (error) {
      console.error('Auth Error:', error);
      toast({
        title: "Erro interno",
        description: `Tente novamente: ${error}`,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAuth();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-elegant flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Área Administrativa</CardTitle>
          <p className="text-muted-foreground">
            Digite a senha para acessar o painel administrativo
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu email administrativo"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua senha"
              disabled={loading}
            />
          </div>
          <Button 
            onClick={handleAuth} 
            className="w-full" 
            disabled={loading || !email || !password}
          >
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;