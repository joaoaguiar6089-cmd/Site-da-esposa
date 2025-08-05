import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminAuthProps {
  onAuth: () => void;
}

const AdminAuth = ({ onAuth }: AdminAuthProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = () => {
    setLoading(true);
    
    // Senha simples para demonstração - em produção usar hash seguro
    if (password === "admin123") {
      localStorage.setItem("admin_authenticated", "true");
      onAuth();
      toast({
        title: "Acesso autorizado",
        description: "Bem-vinda à área administrativa!",
      });
    } else {
      toast({
        title: "Acesso negado",
        description: "Senha incorreta.",
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
            disabled={loading || !password}
          >
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;