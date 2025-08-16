import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/client";

interface LoginCPFProps {
  onClientFound: (client: Client) => void;
  onClientNotFound: (cpf: string) => void;
  onBack: () => void;
}

const LoginCPF = ({ onClientFound, onClientNotFound, onBack }: LoginCPFProps) => {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
  };

  const isValidCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const cpfNumbers = cpf.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('cpf', cpfNumbers)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar cliente:', error);
        throw error;
      }

      if (data && data.id) {
        console.log('Cliente encontrado:', data);
        onClientFound(data);
      } else {
        console.log('Cliente não encontrado para CPF:', cpfNumbers);
        onClientNotFound(cpfNumbers);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar CPF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <User className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Agendamento</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Digite seu CPF para continuar
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cpf" className="text-sm font-medium block mb-2">
              CPF *
            </label>
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => handleCPFChange(e.target.value)}
              required
              inputMode="numeric"
              autoComplete="off"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
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
              {loading ? "Verificando..." : "Continuar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginCPF;