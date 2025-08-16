import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/pages/Agendamento";

interface CadastroClienteProps {
  cpf: string;
  onClientRegistered: (client: Client) => void;
  onBack: () => void;
}

const CadastroCliente = ({ cpf, onClientRegistered, onBack }: CadastroClienteProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    celular: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 10) {
      return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'celular') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 11) {
        setFormData(prev => ({
          ...prev,
          [field]: formatPhone(value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const isValidForm = () => {
    const phoneNumbers = formData.celular.replace(/\D/g, '');
    return (
      formData.nome.trim().length >= 2 &&
      formData.sobrenome.trim().length >= 2 &&
      phoneNumbers.length >= 10 &&
      phoneNumbers.length <= 11
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidForm()) {
      toast({
        title: "Dados inválidos",
        description: "Verifique se todos os campos estão preenchidos corretamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const phoneNumbers = formData.celular.replace(/\D/g, '');
      
      const clientData = {
        cpf: cpf,
        nome: formData.nome.trim(),
        sobrenome: formData.sobrenome.trim(),
        celular: phoneNumbers,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      toast({
        title: "Cadastro realizado!",
        description: "Seus dados foram salvos com sucesso.",
      });

      onClientRegistered(data);
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      
      let message = "Erro ao realizar cadastro. Tente novamente.";
      if (error?.code === '23505') {
        message = "Este CPF já está cadastrado no sistema.";
      }
      
      toast({
        title: "Erro",
        description: message,
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
          <UserPlus className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Novo Cadastro</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Complete seus dados para continuar
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              CPF
            </label>
            <Input
              type="text"
              value={formatCPF(cpf)}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label htmlFor="nome" className="text-sm font-medium block mb-2">
              Nome *
            </label>
            <Input
              id="nome"
              type="text"
              placeholder="Seu nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>

          <div>
            <label htmlFor="sobrenome" className="text-sm font-medium block mb-2">
              Sobrenome *
            </label>
            <Input
              id="sobrenome"
              type="text"
              placeholder="Seu sobrenome"
              value={formData.sobrenome}
              onChange={(e) => handleInputChange('sobrenome', e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>

          <div>
            <label htmlFor="celular" className="text-sm font-medium block mb-2">
              Celular *
            </label>
            <Input
              id="celular"
              type="tel"
              placeholder="(00) 00000-0000"
              value={formData.celular}
              onChange={(e) => handleInputChange('celular', e.target.value)}
              required
              autoComplete="tel"
              inputMode="numeric"
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
              disabled={loading || !isValidForm()}
              className="flex-1"
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CadastroCliente;