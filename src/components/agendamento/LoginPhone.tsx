import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/client";

interface LoginPhoneProps {
  onClientFound: (client: Client) => void;
  onClientNotFound: (phone: string) => void;
  onBack: () => void;
}

const LoginPhone = ({ onClientFound, onClientNotFound, onBack }: LoginPhoneProps) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      setPhone(formatPhone(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Salvar o telefone na sessão para uso posterior
    sessionStorage.setItem('booking_phone', cleanPhone);
    
    setLoading(true);
    
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('celular', cleanPhone)
        .maybeSingle();

      if (error) throw error;

      if (client) {
        // Cliente encontrado, confirma agendamento automaticamente
        onClientFound(client);
      } else {
        // Cliente não encontrado, precisa cadastrar
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Phone className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Confirmar Agendamento</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Digite seu número de celular para confirmar o agendamento
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginPhone;