import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
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
}

const Admin = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const { toast } = useToast();

  const loadAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          clients!appointments_client_id_fkey(nome, sobrenome, cpf, celular),
          procedures!appointments_procedure_id_fkey(name, price, duration)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (filter !== 'todos') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(apt => ({
        ...apt,
        client: apt.clients,
        procedure: apt.procedures
      })) || [];
      
      setAppointments(formattedData);
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

  useEffect(() => {
    loadAppointments();
  }, [filter]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-elegant p-8">
        <div className="container mx-auto">
          <div className="text-center">Carregando agendamentos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-elegant p-8">
      <div className="container mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Administração - Agendamentos
          </h1>
          
          <div className="flex gap-4 items-center">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={loadAppointments} variant="outline">
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p>Nenhum agendamento encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{appointment.appointment_time}</span>
                      </div>
                      <div className="mb-2">
                        <strong>Procedimento:</strong> {appointment.procedure.name}
                      </div>
                      <div className="mb-2">
                        <strong>Valor:</strong> R$ {appointment.procedure.price?.toFixed(2)}
                      </div>
                      {appointment.notes && (
                        <div>
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
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAppointment(appointment.id)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;