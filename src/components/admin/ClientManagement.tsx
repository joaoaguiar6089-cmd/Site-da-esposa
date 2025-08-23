import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Camera, User, Calendar, Phone, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, cleanCPF, isValidCPF } from "@/utils/cpfValidator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
  data_nascimento?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
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
}

const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedureResults, setProcedureResults] = useState<ProcedureResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
    celular: "",
    data_nascimento: ""
  });

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
      setAppointments(data || []);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    }
  };

  const loadProcedureResults = async () => {
    try {
      const { data, error } = await supabase
        .from("procedure_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProcedureResults(data || []);
    } catch (error) {
      console.error("Erro ao carregar resultados:", error);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidCPF(formData.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("clients").insert([
        {
          nome: formData.nome,
          sobrenome: formData.sobrenome,
          cpf: cleanCPF(formData.cpf),
          celular: formData.celular,
          data_nascimento: formData.data_nascimento || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente cadastrado com sucesso!",
      });

      setFormData({ nome: "", sobrenome: "", cpf: "", celular: "", data_nascimento: "" });
      setShowClientForm(false);
      loadClients();
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedAppointment) return;

    try {
      setLoading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedAppointment.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('procedure-results')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('procedure-results')
        .getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase
        .from('procedure_results')
        .insert([{
          appointment_id: selectedAppointment.id,
          image_url: urlData.publicUrl,
          description: resultDescription
        }]);

      if (insertError) throw insertError;

      // Atualizar status do agendamento para "realizado"
      await supabase
        .from('appointments')
        .update({ status: 'realizado' })
        .eq('id', selectedAppointment.id);

      toast({
        title: "Sucesso",
        description: "Resultado do procedimento salvo com sucesso!",
      });

      setShowResultDialog(false);
      setSelectedFile(null);
      setResultDescription("");
      loadProcedureResults();
      loadAppointments();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar resultado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      confirmado: { label: "Confirmado", variant: "default" as const },
      realizado: { label: "Realizado", variant: "default" as const },
      cancelado: { label: "Cancelado", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: "secondary" as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesStatus = statusFilter === "todos" || appointment.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      appointment.client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.client.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.procedure.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getClientAppointments = (clientId: string) => {
    return appointments.filter(apt => apt.client.id === clientId);
  };

  const getAppointmentResults = (appointmentId: string) => {
    return procedureResults.filter(result => result.appointment_id === appointmentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Clientes</h2>
        <Button onClick={() => setShowClientForm(true)}>
          <User className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Procedimentos</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Buscar por cliente ou procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="agendado">Agendados</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="realizado">Realizados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum cliente cadastrado
              </div>
            ) : (
              clients.map((client) => (
                <Card 
                  key={client.id}
                  className={`cursor-pointer transition-colors ${
                    selectedClient?.id === client.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{client.nome} {client.sobrenome}</h4>
                        <p className="text-sm text-muted-foreground">
                          CPF: {formatCPF(client.cpf)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Celular: {client.celular}
                        </p>
                        {client.data_nascimento && (
                          <p className="text-sm text-muted-foreground">
                            Nascimento: {format(new Date(client.data_nascimento), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {getClientAppointments(client.id).length} agendamentos
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Procedimentos do Cliente Selecionado ou Todos */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedClient ? 
                `Procedimentos - ${selectedClient.nome} ${selectedClient.sobrenome}` : 
                'Todos os Procedimentos'
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {filteredAppointments
              .filter(apt => !selectedClient || apt.client.id === selectedClient.id)
              .map((appointment) => {
                const results = getAppointmentResults(appointment.id);
                return (
                  <Card key={appointment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{appointment.procedure.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {appointment.client.nome} {appointment.client.sobrenome}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.appointment_time}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(appointment.status)}
                          {appointment.status === 'confirmado' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowResultDialog(true);
                              }}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Anexar Foto
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {results.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold">Resultados:</h5>
                          {results.map((result) => (
                            <div key={result.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                              <img 
                                src={result.image_url} 
                                alt="Resultado" 
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm">{result.description || "Sem descrição"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(result.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Cadastro de Cliente */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sobrenome">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  value={formData.sobrenome}
                  onChange={(e) => setFormData({...formData, sobrenome: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                value={formData.celular}
                onChange={(e) => setFormData({...formData, celular: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Anexar Resultado */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Resultado do Procedimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="result-file">Foto do Resultado</Label>
              <Input
                id="result-file"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={resultDescription}
                onChange={(e) => setResultDescription(e.target.value)}
                placeholder="Descreva os resultados do procedimento..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowResultDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFileUpload} disabled={loading || !selectedFile}>
                {loading ? "Salvando..." : "Salvar Resultado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;