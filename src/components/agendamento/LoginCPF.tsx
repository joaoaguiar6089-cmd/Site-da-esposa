import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { isValidCPF, formatCPF } from "@/utils/cpfValidator";
import type { Client } from "@/pages/Agendamento";

interface LoginCPFProps {
  onClientFound: (client: Client) => void;
  onClientNotFound: () => void;
  onBack: () => void;
}

const LoginCPF = ({ onClientFound, onClientNotFound, onBack }: LoginCPFProps) => {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signInWithCPF } = useAuth();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.replace(/\D/g, '').length <= 11) {
      setCpf(formatCPF(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    setLoading(true);
    
    try {
      // Log security event for CPF login attempt
      await supabase.rpc('log_security_event', {
        event_type: 'cpf_login_attempt',
        event_details: { cpf: cleanCPF }
      });

      // Verificar se o CPF existe usando função segura
      const { data: cpfExists, error: checkError } = await supabase
        .rpc('check_cpf_exists', { cpf_param: cleanCPF });

      if (checkError) {
        throw checkError;
      }

      if (!cpfExists) {
        onClientNotFound();
        return;
      }

      // Se o CPF existe, fazer login seguro com CPF
      const result = await signInWithCPF(cleanCPF);
      
      if (result.error) {
        throw result.error;
      }

      // Buscar dados do cliente após autenticação bem-sucedida
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('cpf', cleanCPF)
        .single();

      if (clientError) {
        throw clientError;
      }

      onClientFound(clientData);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar cliente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Agendamento</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Digite seu CPF para acessar seus agendamentos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cpf" className="text-sm font-medium">
              CPF
            </label>
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCPFChange}
              className="mt-1"
              required
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValidCPF(cpf)}
              className="flex-1"
            >
              {loading ? "Buscando..." : "Continuar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginCPF;