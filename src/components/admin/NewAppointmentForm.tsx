import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, cleanCPF, isValidCPF } from "@/utils/cpfValidator";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import CadastroClientePhone from "@/components/cliente/CadastroClientePhone";
import type { Client } from "@/types/client";

interface NewAppointmentFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'select-client' | 'register-client' | 'register-phone' | 'appointment';

const NewAppointmentForm = ({ onBack, onSuccess }: NewAppointmentFormProps) => {
  const [step, setStep] = useState<Step>('select-client');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneForRegistration, setPhoneForRegistration] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client => 
        client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cpf.includes(searchTerm) ||
        client.celular.includes(searchTerm)
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clients, searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nome');

      if (error) throw error;

      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep('appointment');
  };

  const handleNewClientByCPF = () => {
    setStep('register-client');
  };

  const handleNewClientByPhone = () => {
    setStep('register-phone');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    setStep('appointment');
  };

  const handleAppointmentCreated = () => {
    toast({
      title: "Agendamento criado",
      description: "O agendamento foi criado com sucesso!",
    });
    onSuccess();
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneForRegistration(formatted);
  };

  const isValidPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length >= 10;
  };

  const handlePhoneSubmit = () => {
    if (!isValidPhone(phoneForRegistration)) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido.",
        variant: "destructive",
      });
      return;
    }
    
    // Aqui vamos para o componente de cadastro com telefone
    // O CadastroClientePhone vai lidar com o cadastro completo
  };

  if (step === 'register-phone') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('select-client')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Cadastrar Novo Cliente</h1>
        </div>

        {phoneForRegistration && isValidPhone(phoneForRegistration) ? (
          <CadastroClientePhone
            phone={phoneForRegistration}
            onClientRegistered={handleClientRegistered}
            onBack={() => setStep('select-client')}
          />
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Informar Telefone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Telefone do Cliente *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phoneForRegistration}
                  onChange={handlePhoneChange}
                  maxLength={15}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('select-client')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handlePhoneSubmit}
                  disabled={!isValidPhone(phoneForRegistration)}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (step === 'appointment' && selectedClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('select-client')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Novo Agendamento</h1>
        </div>

        <div className="max-w-md mx-auto">
          <AgendamentoForm
            client={selectedClient}
            onAppointmentCreated={handleAppointmentCreated}
            onBack={() => setStep('select-client')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Agendamento</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Botões para novo cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b">
            <Button
              variant="outline"
              onClick={handleNewClientByPhone}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Cliente (Telefone)
            </Button>
            <Button
              variant="outline"
              onClick={handleNewClientByCPF}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Cliente (CPF)
            </Button>
          </div>

          {/* Lista de clientes */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <p>Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {client.nome} {client.sobrenome}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>CPF: {formatCPF(client.cpf)}</span>
                        <span>Tel: {client.celular}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewAppointmentForm;