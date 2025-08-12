import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, Phone, Trash2, Search, MessageCircle, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Professional {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
  professional_id: string | null;
  client: {
    nome: string;
    sobrenome: string;
    cpf: string;
    celular: string;
  };
  procedure: {
    name: string;
    price: number;
    duration: number;
  };
  professional?: {
    id: string;
    name: string;
  } | null;
}

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [professionalFilter, setProfessionalFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients!appointments_client_id_fkey(nome, sobrenome, cpf, celular),
          procedures!appointments_procedure_id_fkey(name, price, duration),
          professionals(id, name)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(apt => ({
        ...apt,
        client: apt.clients,
        procedure: apt.procedures,
        professional: apt.professionals
      })) || [];
      
      setAppointments(formattedData);
      setFilteredAppointments(formattedData);
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

  const loadProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadProfessionals();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [statusFilter, dateFilter, professionalFilter, searchTerm, appointments]);

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filtro por profissional
    if (professionalFilter !== 'todos') {
      if (professionalFilter === 'sem_profissional') {
        filtered = filtered.filter(apt => !apt.professional_id);
      } else {
        filtered = filtered.filter(apt => apt.professional_id === professionalFilter);
      }
    }

    // Filtro por data
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (dateFilter === 'hoje') {
      filtered = filtered.filter(apt => apt.appointment_date === today);
    } else if (dateFilter === 'amanha') {
      filtered = filtered.filter(apt => apt.appointment_date === tomorrow);
    } else if (dateFilter === 'semana') {
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      filtered = filtered.filter(apt => apt.appointment_date >= today && apt.appointment_date <= weekFromNow);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.client.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.client.cpf.includes(searchTerm) ||
        apt.client.celular.includes(searchTerm) ||
        apt.procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.professional?.name && apt.professional.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status do agendamento foi atualizado com sucesso.",
      });

      loadAppointments();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Agendamento excluído",
        description: "Agendamento foi excluído com sucesso.",
      });

      loadAppointments();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir agendamento.",
        variant: "destructive",
      });
    }
  };

  const sendWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = `Olá ${clientName}! Este é um lembrete do seu agendamento na clínica da Dra. Karoline Ferreira. Em caso de dúvidas, entre em contato conosco.`;
    const whatsappUrl = `https://wa.me/55${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      agendado: "default",
      confirmado: "secondary",
      realizado: "outline",
      cancelado: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status}
      </Badge>
    );
  };

  // Paginação
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <div className="text-center">Carregando agendamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Agendamentos</h2>
        <p className="text-muted-foreground">Gerencie todos os agendamentos da clínica</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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

          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos profissionais</SelectItem>
              <SelectItem value="sem_profissional">Sem profissional</SelectItem>
              {professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  {professional.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="amanha">Amanhã</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={loadAppointments} variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Lista de agendamentos */}
      <div className="grid gap-4">
        {paginatedAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Nenhum agendamento encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          paginatedAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {appointment.client.nome} {appointment.client.sobrenome}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Phone className="w-4 h-4" />
                      {appointment.client.celular}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2">
                          <strong>Procedimento:</strong> {appointment.procedure.name}
                        </div>
                        <div className="mb-2">
                          <strong>Valor:</strong> R$ {appointment.procedure.price?.toFixed(2)}
                        </div>
                        <div className="mb-2">
                          <strong>Profissional:</strong> {appointment.professional?.name || 'Não atribuído'}
                        </div>
                      </div>
                    </div>
                    {appointment.notes && (
                      <div className="mt-3 p-2 bg-muted rounded">
                        <strong>Observações:</strong> {appointment.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Select
                      value={appointment.status}
                      onValueChange={(value) => updateStatus(appointment.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/agendamento?edit=${appointment.id}`)}
                        className="flex items-center gap-1 flex-1"
                      >
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendWhatsApp(appointment.client.celular, appointment.client.nome)}
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAppointment(appointment.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;