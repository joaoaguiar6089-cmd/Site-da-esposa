import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/pages/Agendamento";

interface CadastroClienteProps {
  onClientRegistered: (client: Client) => void;
  onBack: () => void;
}

const CadastroCliente = ({ onClientRegistered, onBack }: CadastroClienteProps) => {
  const [formData, setFormData] = useState({
    cpf: "",
    nome: "",
    sobrenome: "",
    celular: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const match = numbers.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return numbers;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const match = numbers.match(/^(\d{2})(\d{4,5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return numbers;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf') {
      if (value.replace(/\D/g, '').length <= 11) {
        formattedValue = formatCPF(value);
      } else {
        return;
      }
    } else if (field === 'celular') {
      if (value.replace(/\D/g, '').length <= 11) {
        formattedValue = formatPhone(value);
      } else {
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCPF = formData.cpf.replace(/\D/g, '');
    const cleanPhone = formData.celular.replace(/\D/g, '');
    
    console.log('Cadastro - Dados do formulário:', { 
      cpf: formData.cpf, 
      cleanCPF, 
      nome: formData.nome, 
      sobrenome: formData.sobrenome,
      celular: formData.celular,
      cleanPhone 
    });
    
    if (cleanCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Celular inválido",
        description: "Por favor, digite um número de celular válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Cadastro - Inserindo cliente no banco...');
      
      // Inserir cliente diretamente sem autenticação
      const { data, error } = await supabase
        .from('clients')
        .insert({
          cpf: cleanCPF,
          nome: formData.nome.trim(),
          sobrenome: formData.sobrenome.trim(),
          celular: cleanPhone,
        })
        .select()
        .single();

      console.log('Cadastro - Resultado da inserção:', { data, error });

      if (error) {
        console.error('Cadastro - Erro ao inserir:', error);
        if (error.code === '23505') {
          toast({
            title: "CPF já cadastrado",
            description: "Este CPF já está cadastrado no sistema.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      console.log('Cadastro - Cliente cadastrado com sucesso:', data);
      
      toast({
        title: "Cadastro realizado!",
        description: "Seus dados foram salvos com sucesso.",
      });

      onClientRegistered(data);
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar cadastro. Tente novamente.",
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
          <UserPlus className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl">Novo Cadastro</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Preencha seus dados para continuar
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cpf" className="text-sm font-medium">
              CPF *
            </label>
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="nome" className="text-sm font-medium">
              Nome *
            </label>
            <Input
              id="nome"
              type="text"
              placeholder="Seu nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="sobrenome" className="text-sm font-medium">
              Sobrenome *
            </label>
            <Input
              id="sobrenome"
              type="text"
              placeholder="Seu sobrenome"
              value={formData.sobrenome}
              onChange={(e) => handleInputChange('sobrenome', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="celular" className="text-sm font-medium">
              Celular *
            </label>
            <Input
              id="celular"
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.celular}
              onChange={(e) => handleInputChange('celular', e.target.value)}
              className="mt-1"
              required
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
              disabled={loading}
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