import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

interface ResumoAuthProps {
  onAuth: () => void;
}

const ResumoAuth = ({ onAuth }: ResumoAuthProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar credenciais usando função do banco
      const { data, error } = await supabase.rpc('verify_resumo_credentials', {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error('Erro ao verificar credenciais:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar credenciais. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário ou senha inválidos.",
          variant: "destructive",
        });
        return;
      }

      // Registrar login bem-sucedido
      await supabase.rpc('log_resumo_login', {
        p_username: username
      });

      // Armazenar sessão local (não usa Supabase Auth)
      sessionStorage.setItem('resumo_authenticated', 'true');
      sessionStorage.setItem('resumo_username', username);

      toast({
        title: "Login realizado",
        description: "Bem-vindo à área de resumos!",
      });

      onAuth();
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Área de Resumos</CardTitle>
          <CardDescription>
            Acesso exclusivo para visualização de resumos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="enfesteta.karoline"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Autenticando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumoAuth;
