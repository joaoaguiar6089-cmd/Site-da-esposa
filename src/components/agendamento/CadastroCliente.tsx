import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidCPF, formatCPF, cleanCPF } from "@/utils/cpfValidator";
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
      if (cleanCPF(value).length <= 11) {
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
    
    console.log('🔍 DEBUG: Iniciando cadastro...');
    console.log('🔍 DEBUG: Dados do formulário:', formData);
    
    const cpfLimpo = cleanCPF(formData.cpf);
    const cleanPhone = formData.celular.replace(/\D/g, '');
    
    console.log('🔍 DEBUG: CPF limpo:', cpfLimpo);
    console.log('🔍 DEBUG: Telefone limpo:', cleanPhone);
    console.log('🔍 DEBUG: CPF válido?', isValidCPF(formData.cpf));
    
    if (!isValidCPF(formData.cpf)) {
      console.log('❌ DEBUG: Falha na validação do CPF');
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      console.log('❌ DEBUG: Falha na validação do telefone');
      toast({
        title: "Celular inválido",
        description: "Por favor, digite um número de celular válido.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ DEBUG: Validações passaram, iniciando inserção no banco...');
    setLoading(true);
    
    try {
      console.log('🔍 DEBUG: Tentando inserir no Supabase...');
      // Inserir cliente diretamente
      const { data, error } = await supabase
        .from('clients')
        .insert({
          cpf: cpfLimpo,
          nome: formData.nome.trim(),
          sobrenome: formData.sobrenome.trim(),
          celular: cleanPhone,
        })
        .select()
        .single();

      console.log('🔍 DEBUG: Resposta do Supabase:', { data, error });

      if (error) {
        console.log('❌ DEBUG: Erro do Supabase:', error);
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
      
      console.log('✅ DEBUG: Cadastro realizado com sucesso!');
      toast({
        title: "Cadastro realizado!",
        description: "Seus dados foram salvos com sucesso.",
      });

      onClientRegistered(data);
    } catch (error) {
      console.error('❌ DEBUG: Erro ao cadastrar cliente:', error);
      console.error('❌ DEBUG: Tipo do erro:', typeof error);
      console.error('❌ DEBUG: Detalhes do erro:', JSON.stringify(error, null, 2));
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