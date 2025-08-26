import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Phone, Edit, Trash2, Search, MessageSquare, Filter, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  clients: {
    id: string;
    nome: string;
    sobrenome: string;
    celular: string;
    cpf: string;
  };
  procedures: {
    name: string;
    duration: number;
    price: number;
  };
  professionals?: {
    name: string;
  } | null;
}

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const { toast } = useToast();

  // Carregar todos os agendamentos
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          notes,
          clients (
            id,
            nome,
            sobrenome,
            celular,
            cpf
          ),
          procedures (
            name,
            duration,
            price
          ),
          professionals (
            name
          )
        `)
        .order('appointment_date')
        .order('appointment_time');

      if (error) throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar agendamentos
  useEffect(() => {
    let filtered = [...appointments];

    if (statusFilter !== "todos") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.clients.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clients.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clients.cpf.includes(searchTerm) ||
        apt.clients.celular.includes(searchTerm) ||
        apt.procedures.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, statusFilter, searchTerm]);

  useEffect(() => {
    loadAppointments();
  }, []);

  // Abrir detalhes do agendamento
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  // Abrir formulário de edição
  const handleEditAppointment = () => {
    if (selectedAppointment) {
      setEditingAppointment(selectedAppointment.id);
      setShowEditForm(true);
      setDialogOpen(false);
    }
  };

  // Fechar formulário de edição e voltar à lista
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingAppointment(null);
    setSelectedAppointment(null);
    loadAppointments(); // Recarregar dados após edição
  };

  // Callback para quando agendamento for atualizado
  const handleAppointmentUpdated = () => {
    toast({
      title: "Agendamento atualizado",
      description: "O agendamento foi atualizado com sucesso.",
    });
    handleCloseEditForm();
  };

  // Handlers para novo agendamento
  const handleNewAppointmentSuccess = () => {
    setShowNewAppointmentForm(false);
    loadAppointments();
  };

  // Atualizar status do agendamento
  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status do agendamento atualizado com sucesso.",
      });

      loadAppointments();
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do agendamento.",
        variant: "destructive",
      });
    }
  };

  // Deletar agendamento
  const deleteAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Agendamento deletado",
        description: "Agendamento foi removido com sucesso.",
      });

      loadAppointments();
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar agendamento.",
        variant: "destructive",
      });
    }
  };

  // Enviar WhatsApp
  const sendWhatsApp = (phone: string, appointmentData: Appointment) => {
    const message = `Olá! Este é um lembrete sobre seu agendamento:
    
📅 Data: ${format(parseISO(appointmentData.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
⏰ Horário: ${appointmentData.appointment_time}
💉 Procedimento: ${appointmentData.procedures.name}
📍 Local: Dra. Karoline Ferreira - Estética e Saúde

Aguardamos você!`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  // Badge de status
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'agendado': { label: 'Agendado', variant: 'default' as const },
      'confirmado': { label: 'Confirmado', variant: 'secondary' as const },
      'realizado': { label: 'Realizado', variant: 'default' as const },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // Se estiver no modo de novo agendamento
  if (showNewAppointmentForm) {
    return (
      <NewAppointmentForm
        onBack={() => setShowNewAppointmentForm(false)}
        onSuccess={handleNewAppointmentSuccess}
      />
    );
  }

  // Se estiver no modo de edição, mostrar o formulário
  if (showEditForm && selectedAppointment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Editar Agendamento</h1>
        </div>
        
        <div className="max-w-md mx-auto">
          <AgendamentoForm
            client={selectedAppointment.clients}
            onAppointmentCreated={handleAppointmentUpdated}
            onBack={handleCloseEditForm}
            editingId={editingAppointment || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Lista de Agendamentos</h1>
        </div>
        <Button 
          onClick={() => setShowNewAppointmentForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou procedimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={loadAppointments} variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Lista de agendamentos */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Nenhum agendamento encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2" onClick={() => handleAppointmentClick(appointment)}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {appointment.clients.nome} {appointment.clients.sobrenome}
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {appointment.appointment_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {appointment.clients.celular}
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-primary">
                      {appointment.procedures.name}
                    </p>
                    
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Observações:</strong> {appointment.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsApp(appointment.clients.celular, appointment);
                      }}
                      className="flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(appointment);
                        handleEditAppointment();
                      }}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAppointment(appointment.id);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de detalhes do agendamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Data:</strong>
                  <p>{format(parseISO(selectedAppointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <strong>Horário:</strong>
                  <p>{selectedAppointment.appointment_time}</p>
                </div>
              </div>

              <div>
                <strong>Cliente:</strong>
                <p>{selectedAppointment.clients.nome} {selectedAppointment.clients.sobrenome}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAppointment.clients.celular}
                </p>
              </div>

              <div>
                <strong>Procedimento:</strong>
                <p>{selectedAppointment.procedures.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAppointment.procedures.duration}min - R$ {selectedAppointment.procedures.price?.toFixed(2)}
                </p>
              </div>

              {selectedAppointment.professionals && (
                <div>
                  <strong>Profissional:</strong>
                  <p>{selectedAppointment.professionals.name}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <strong>Observações:</strong>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              <div>
                <strong>Status:</strong>
                <div className="mt-1">
                  {getStatusBadge(selectedAppointment.status)}
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendWhatsApp(selectedAppointment.clients.celular, selectedAppointment)}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleEditAppointment}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>

                {selectedAppointment.status !== 'confirmado' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmado')}
                  >
                    Confirmar
                  </Button>
                )}

                {selectedAppointment.status !== 'realizado' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'realizado')}
                  >
                    Marcar como Realizado
                  </Button>
                )}

                {selectedAppointment.status !== 'cancelado' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelado')}
                  >
                    Cancelar
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteAppointment(selectedAppointment.id)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Deletar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsList;