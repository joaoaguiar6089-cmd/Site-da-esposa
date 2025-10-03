import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } fro          <NewBookingFlow
            onBack={() => setStep('select-client')}
            onSuccess={onSuccess}
            adminMode={true}
            initialClient={selectedClient}
            sendNotification={sendNotification}
            selectedDate={selectedDate}
          />ponents/ui/select";
import { ArrowLeft, Search, Plus, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, cleanCPF, isValidCPF } from "@/utils/cpfValidator";
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
import CadastroClientePhone from "@/components/cliente/CadastroClientePhone";
import type { Client } from "@/types/client";

interface NewAppointmentFormProps {
  onBack: () => void;
  onSuccess: () => void;
  selectedDate?: Date;
}

type Step = 'select-client' | 'register-new-client' | 'appointment';

const NewAppointmentForm = ({ onBack, onSuccess, selectedDate }: NewAppointmentFormProps) => {
  const [step, setStep] = useState<Step>('select-client');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome: "",
    sobrenome: "",
    celular: "",
    cpf: "",
    data_nascimento: "",
    cidade: ""
  });
  const [sendNotification, setSendNotification] = useState(true);
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

  const handleNewClient = () => {
    setStep('register-new-client');
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

  const handleNewClientInputChange = (field: string, value: string) => {
    if (field === 'celular') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 11) {
        value = formatPhone(value);
      } else {
        return; // Não permite mais de 11 dígitos
      }
    } else if (field === 'cpf') {
      value = formatCPF(value);
    } else if (field === 'nome' || field === 'sobrenome') {
      // Remove números e caracteres especiais, permite apenas letras e espaços
      value = value.replace(/[^\p{L}\s]/gu, '');
    }
    
    setNewClientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isValidNewClientForm = () => {
    const { nome, sobrenome, celular } = newClientData;
    const phoneNumbers = celular.replace(/\D/g, '');
    return nome.trim().length >= 2 && 
           sobrenome.trim().length >= 2 && 
           phoneNumbers.length >= 10 && 
           phoneNumbers.length <= 11;
  };

  const handleNewClientSubmit = async () => {
    if (!isValidNewClientForm()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha Nome, Sobrenome e Celular corretamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Limpar e validar CPF se fornecido
      let cpfToSave = cleanCPF(newClientData.cpf);
      if (cpfToSave && !isValidCPF(cpfToSave)) {
        toast({
          title: "CPF inválido",
          description: "Por favor, insira um CPF válido ou deixe em branco.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Se CPF não foi fornecido, gerar um temporário
      if (!cpfToSave) {
        cpfToSave = `temp_${Date.now()}`;
      }

      const clientData = {
        nome: newClientData.nome.trim(),
        sobrenome: newClientData.sobrenome.trim(),
        celular: newClientData.celular.trim(),
        cpf: cpfToSave,
        data_nascimento: newClientData.data_nascimento.trim() || null,
        cidade: newClientData.cidade.trim() || null
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cliente cadastrado",
        description: "Cliente cadastrado com sucesso!",
      });

      setSelectedClient(data);
      setStep('appointment');
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      
      let errorMessage = "Erro ao cadastrar cliente. Tente novamente.";
      if (error.code === '23505') {
        errorMessage = "Este CPF já está cadastrado no sistema.";
      } else if (error.code === '23514') {
        errorMessage = "Dados inválidos. Verifique o CPF e outros campos.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'register-new-client') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('select-client')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Cadastrar Novo Cliente</h1>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome do cliente"
                value={newClientData.nome}
                onChange={(e) => handleNewClientInputChange('nome', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="sobrenome">Sobrenome *</Label>
              <Input
                id="sobrenome"
                type="text"
                placeholder="Sobrenome do cliente"
                value={newClientData.sobrenome}
                onChange={(e) => handleNewClientInputChange('sobrenome', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="celular">Celular *</Label>
              <Input
                id="celular"
                type="tel"
                placeholder="(00) 00000-0000"
                value={newClientData.celular}
                onChange={(e) => handleNewClientInputChange('celular', e.target.value)}
                maxLength={15}
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={newClientData.cpf}
                onChange={(e) => handleNewClientInputChange('cpf', e.target.value)}
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento (opcional)</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={newClientData.data_nascimento}
                onChange={(e) => handleNewClientInputChange('data_nascimento', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade (opcional)</Label>
              <Input
                id="cidade"
                type="text"
                placeholder="Cidade do cliente"
                value={newClientData.cidade}
                onChange={(e) => handleNewClientInputChange('cidade', e.target.value)}
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
                onClick={handleNewClientSubmit}
                disabled={!isValidNewClientForm() || loading}
                className="flex-1"
              >
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
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

        <div className="max-w-5xl mx-auto space-y-4 w-full">
          {/* Opção para notificar cliente */}
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <Checkbox 
              id="send-notification" 
              checked={sendNotification}
              onCheckedChange={(checked) => setSendNotification(checked === true)}
            />
            <label 
              htmlFor="send-notification" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enviar notificação WhatsApp para o cliente
            </label>
          </div>
          
          <AgendamentoForm
            client={selectedClient}
            onAppointmentCreated={handleAppointmentCreated}
            onBack={() => setStep('select-client')}
            selectedDate={selectedDate}
            adminMode={true}
            sendNotification={sendNotification}
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

          {/* Botão para novo cliente */}
          <div className="pb-4 border-b">
            <Button
              variant="outline"
              onClick={handleNewClient}
              className="flex items-center gap-2 w-full"
            >
              <Plus className="h-4 w-4" />
              NOVO CLIENTE
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
