import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/client";

interface CadastroClientePhoneProps {
  phone: string;
  onClientRegistered: (client: Client) => void;
  onBack: () => void;
}

const CadastroClientePhone = ({ phone, onClientRegistered, onBack }: CadastroClientePhoneProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatCPF(value) }));
      }
    } else {
      const cleanValue = value.replace(/[0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
    }
  };

  const isValidForm = () => {
    const cleanCPF = formData.cpf.replace(/\D/g, '');
    return (
      formData.nome.trim().length >= 2 &&
      formData.sobrenome.trim().length >= 2 &&
      cleanCPF.length === 11
    );
  };

  const sendWelcomeMessage = async (clientData: Client) => {
    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: clientData.celular,
          message: `🎉 Bem-vindo(a) à Clínica Dra. Karoline Ferreira!\n\n${clientData.nome}, seu cadastro foi realizado com sucesso!\n\n🔐 Sua senha para futuros logins é seu CPF (apenas números): ${clientData.cpf}\n\n📱 Use seu número de celular para fazer login na Área do Cliente.\n\nEstamos prontos para cuidar da sua beleza e bem-estar! ✨`
        }
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem de boas-vindas:', error);
      // Não falha o cadastro se a mensagem não for enviada
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidForm()) {
      toast({
        title: "Formulário incompleto",
        description: "Preencha todos os campos corretamente.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const cleanCPF = formData.cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      // Verificar se CPF já existe
      const { data: existingClient } = await supabase
        .from('clients')
        .select('cpf')
        .eq('cpf', cleanCPF)
        .maybeSingle();

      if (existingClient) {
        toast({
          title: "CPF já cadastrado",
          description: "Este CPF já está cadastrado em nosso sistema.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          nome: formData.nome.trim(),
          sobrenome: formData.sobrenome.trim(),
          cpf: cleanCPF,
          celular: cleanPhone,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Enviar mensagem de boas-vindas via WhatsApp
      await sendWelcomeMessage(data);

      toast({
        title: "Cadastro realizado!",
        description: "Seu cadastro foi realizado com sucesso. Uma mensagem de boas-vindas foi enviada para seu WhatsApp.",
      });

      onClientRegistered(data);
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      
      if (error.code === '23505') {
        toast({
          title: "CPF já cadastrado",
          description: "Este CPF já está cadastrado em nosso sistema.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro no cadastro",
          description: "Ocorreu um erro ao realizar o cadastro. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
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
          Complete seus dados para criar sua conta
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone-display" className="text-sm font-medium block mb-2">
              Celular
            </label>
            <Input
              id="phone-display"
              type="text"
              value={formatPhone(phone)}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label htmlFor="nome" className="text-sm font-medium block mb-2">
              Nome
            </label>
            <Input
              id="nome"
              name="nome"
              type="text"
              placeholder="Digite seu nome"
              value={formData.nome}
              onChange={handleInputChange}
              required
              style={{
                fontSize: '16px',
                WebkitTransform: 'scale(1)',
              }}
            />
          </div>

          <div>
            <label htmlFor="sobrenome" className="text-sm font-medium block mb-2">
              Sobrenome
            </label>
            <Input
              id="sobrenome"
              name="sobrenome"
              type="text"
              placeholder="Digite seu sobrenome"
              value={formData.sobrenome}
              onChange={handleInputChange}
              required
              style={{
                fontSize: '16px',
                WebkitTransform: 'scale(1)',
              }}
            />
          </div>

          <div>
            <label htmlFor="cpf" className="text-sm font-medium block mb-2">
              CPF
            </label>
            <Input
              id="cpf"
              name="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={handleInputChange}
              required
              autoComplete="off"
              inputMode="numeric"
              style={{
                fontSize: '16px',
                WebkitTransform: 'scale(1)',
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={!isValidForm() || submitting}
              className="flex-1"
            >
              {submitting ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CadastroClientePhone;