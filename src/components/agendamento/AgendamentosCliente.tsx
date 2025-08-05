import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/pages/Agendamento";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  procedures: {
    name: string;
    description: string;
    duration: number;
    price: number;
  };
}

interface AgendamentosClienteProps {
  client: Client;
  onNewAppointment: () => void;
  onBack: () => void;
}

const AgendamentosCliente = ({ client, onNewAppointment, onBack }: AgendamentosClienteProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          notes,
          procedures (
            name,
            description,
            duration,
            price
          )
        `)
        .eq('client_id', client.id)
        .order('appointment_date', { ascending: true });

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

  useEffect(() => {
    loadAppointments();
  }, [client.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado':
        return 'bg-blue-100 text-blue-800';
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'realizado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'agendado':
        return 'Agendado';
      case 'confirmado':
        return 'Confirmado';
      case 'cancelado':
        return 'Cancelado';
      case 'realizado':
        return 'Realizado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">Carregando agendamentos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-center gap-2 mb-2">
          <User className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl">Meus Agendamentos</CardTitle>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">
            {client.nome} {client.sobrenome}
          </p>
          <p className="text-sm text-muted-foreground">
            CPF: {client.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não possui agendamentos
            </p>
            <Button onClick={onNewAppointment} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Agendar Procedimento
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{appointment.procedures.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/agendamento?edit=${appointment.id}`}
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(appointment.appointment_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(appointment.appointment_time)}
                    </div>
                  </div>
                  
                  {appointment.procedures.description && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.procedures.description}
                    </p>
                  )}
                  
                  {appointment.notes && (
                    <div className="text-sm">
                      <span className="font-medium">Observações:</span> {appointment.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Button 
              onClick={onNewAppointment} 
              className="w-full flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgendamentosCliente;