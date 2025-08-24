import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/client";

interface LoginClienteProps {
  onClientFound: (client: Client) => void;
  onClientNotFound: (phone: string) => void;
  onBack: () => void;
}

const LoginCliente = ({ onClientFound, onClientNotFound, onBack }: LoginClienteProps) => {
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const isValidPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 11 && /^[1-9]\d{10}$/.test(numbers);
  };

  const isValidCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11 && /^\d{11}$/.test(numbers);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      setPhone(formatPhone(value));
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      setCpf(numbers);
    }
  };

  const checkPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPhone(phone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD e 9 dígitos.",
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    setLoading(true);
    
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('celular', cleanPhone)
        .maybeSingle();

      if (error) throw error;

      if (client) {
        setExistingClient(client);
        setShowPassword(true);
      } else {
        onClientNotFound(cleanPhone);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar telefone. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCPF(cpf) || !existingClient) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (existingClient.cpf === cleanCPF) {
      onClientFound(existingClient);
    } else {
      toast({
        title: "CPF incorreto",
        description: "O CPF digitado não confere com o cadastro.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <User className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Área do Cliente</CardTitle>
        </div>
        <p className="text-muted-foreground">
          {!showPassword 
            ? "Digite seu número de celular para acessar sua conta"
            : "Digite sua senha (CPF) para entrar"
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showPassword ? (
          <form onSubmit={checkPhone} className="space-y-4">
            <div>
              <label htmlFor="phone" className="text-sm font-medium block mb-2">
                Celular
              </label>
              <Input
                id="phone"
                type="text"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                required
                autoComplete="tel"
                inputMode="numeric"
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
                disabled={loading || !isValidPhone(phone)}
                className="flex-1"
              >
                {loading ? "Verificando..." : "Continuar"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="phone-display" className="text-sm font-medium block mb-2">
                Celular
              </label>
              <Input
                id="phone-display"
                type="text"
                value={phone}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div>
              <label htmlFor="cpf" className="text-sm font-medium block mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Senha (CPF)
              </label>
              <Input
                id="cpf"
                type="password"
                placeholder="Digite seu CPF (apenas números)"
                value={cpf}
                onChange={handleCPFChange}
                required
                autoComplete="off"
                inputMode="numeric"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPassword(false);
                  setCpf("");
                  setExistingClient(null);
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={!isValidCPF(cpf)}
                className="flex-1"
              >
                Entrar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginCliente;