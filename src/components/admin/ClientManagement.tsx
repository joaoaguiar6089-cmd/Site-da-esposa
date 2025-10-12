import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, ArrowLeft, Users, Filter, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF } from "@/utils/cpfValidator";
import ClientsList from "./ClientsList";
import ClientDetail from "./ClientDetail";
import NewClientDialog from "./NewClientDialog";
import ActivePackagesTab from "./ActivePackagesTab";

interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
  data_nascimento?: string;
  cidade?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  session_number?: number;
  total_sessions?: number;
  payment_status?: string;
  payment_method?: string;
  payment_value?: number;
  procedure: {
    name: string;
    duration: number;
    price: number;
  };
  client: {
    id: string;
    nome: string;
    sobrenome: string;
  };
}

interface ProcedureResult {
  id: string;
  appointment_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  procedure_name?: string;
}

const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedureResults, setProcedureResults] = useState<ProcedureResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("todos");

  const { toast } = useToast();

  useEffect(() => {
    loadClients();
    loadAppointments();
    loadProcedureResults();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          procedure:procedures(name, duration, price),
          client:clients(id, nome, sobrenome)
        `)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data as any || []);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    }
  };

  const loadProcedureResults = async () => {
    try {
      const { data, error } = await supabase
        .from("procedure_results")
        .select(`
          *,
          appointment:appointments!inner(
            procedure:procedures(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const resultsWithProcedure = data?.map(result => ({
        ...result,
        procedure_name: result.appointment?.procedure?.name
      })) || [];
      
      setProcedureResults(resultsWithProcedure);
    } catch (error) {
      console.error("Erro ao carregar resultados:", error);
    }
  };

  // Filtrar clientes baseado na busca e status
  const filteredClients = clients.filter(client => {
    const clientAppointments = appointments.filter(apt => apt.client.id === client.id);
    
    const matchesSearch = searchTerm === "" || 
      client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cpf.includes(searchTerm) ||
      client.celular.includes(searchTerm) ||
      clientAppointments.some(apt => 
        apt.procedure.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    if (statusFilter === "todos") return matchesSearch;
    
    const hasStatus = clientAppointments.some(apt => apt.status === statusFilter);
    return matchesSearch && hasStatus;
  });

  const getClientAppointments = (clientId: string) => {
    return appointments.filter(apt => apt.client.id === clientId);
  };

  const getClientResults = (clientId: string) => {
    const clientAppointmentIds = appointments
      .filter(apt => apt.client.id === clientId)
      .map(apt => apt.id);
    
    return procedureResults.filter(result => 
      clientAppointmentIds.includes(result.appointment_id)
    );
  };

  const handleClientCreated = () => {
    loadClients();
    setShowNewClientDialog(false);
  };

  const handleClientUpdated = () => {
    loadClients();
    if (selectedClient) {
      // Atualizar dados do cliente selecionado
      const updatedClient = clients.find(c => c.id === selectedClient.id);
      if (updatedClient) {
        setSelectedClient(updatedClient);
      }
    }
  };

  const handleAppointmentUpdated = () => {
    loadAppointments();
    loadProcedureResults();
  };

  const handleResultUploaded = () => {
    loadProcedureResults();
  };

  // Se um cliente está selecionado, mostrar a ficha detalhada
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        appointments={getClientAppointments(selectedClient.id)}
        results={getClientResults(selectedClient.id)}
        onBack={() => setSelectedClient(null)}
        onClientUpdated={handleClientUpdated}
        onAppointmentUpdated={handleAppointmentUpdated}
        onResultUploaded={handleResultUploaded}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold text-foreground">Gestão de Clientes</h2>
            <p className="text-muted-foreground">Gerencie seus clientes e visualize seus históricos</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowNewClientDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Todos os Clientes
          </TabsTrigger>
          <TabsTrigger value="pacotes" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes em Andamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-6 mt-6">
          {/* Filtros e Busca */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, CPF, telefone ou procedimento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="agendado">Agendados</SelectItem>
                      <SelectItem value="confirmado">Confirmados</SelectItem>
                      <SelectItem value="realizado">Realizados</SelectItem>
                      <SelectItem value="cancelado">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Clientes */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Clientes</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientsList
                clients={filteredClients}
                appointments={appointments}
                onClientSelect={setSelectedClient}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacotes" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Clientes com Pacotes em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivePackagesTab onClientSelect={(clientId) => {
                const client = clients.find(c => c.id === clientId);
                if (client) setSelectedClient(client);
              }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Novo Cliente */}
      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
};

export default ClientManagement;