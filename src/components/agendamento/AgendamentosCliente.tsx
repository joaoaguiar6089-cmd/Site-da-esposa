import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Clock, Plus, User, Phone, Edit, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState(client.celular);
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const navigate = useNavigate();
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

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const handlePhoneUpdate = async () => {
    if (!newPhone.trim()) {
      toast({
        title: "Erro",
        description: "O telefone não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ celular: newPhone.replace(/\D/g, '') })
        .eq('id', client.id);

      if (error) throw error;

      // Atualizar o cliente localmente
      client.celular = newPhone.replace(/\D/g, '');
      
      toast({
        title: "Sucesso",
        description: "Telefone atualizado com sucesso!",
      });
      setIsEditingPhone(false);
    } catch (error) {
      console.error('Erro ao atualizar telefone:', error);
      toast({
        title: "Erro", 
        description: "Erro ao atualizar telefone.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string, appointmentData: Appointment) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Notificar proprietária sobre o cancelamento via WhatsApp e Email
      try {
        const ownerNotifyPromise = supabase.functions.invoke('notify-owner', {
          body: {
            type: 'cancelamento',
            clientName: `${client.nome} ${client.sobrenome}`,
            clientPhone: client.celular,
            appointmentDate: appointmentData.appointment_date,
            appointmentTime: appointmentData.appointment_time,
            procedureName: appointmentData.procedures.name
          }
        });

        const emailNotifyPromise = supabase.functions.invoke('notify-admins', {
          body: {
            type: 'cancelamento',
            clientName: `${client.nome} ${client.sobrenome}`,
            clientPhone: client.celular,
            appointmentDate: appointmentData.appointment_date,
            appointmentTime: appointmentData.appointment_time,
            procedureName: appointmentData.procedures.name,
            professionalName: 'Dra. Karoline Ferreira'
          }
        });

        await Promise.allSettled([ownerNotifyPromise, emailNotifyPromise]);
      } catch (notificationError) {
        console.error('Erro ao notificar proprietária:', notificationError);
      }

      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso.",
      });

      // Atualizar a lista localmente primeiro para feedback imediato
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.id === appointmentId 
            ? { ...app, status: 'cancelado' }
            : app
        )
      );

      // Depois recarregar do banco para garantir consistência
      setTimeout(() => {
        loadAppointments();
      }, 500);
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento. Tente novamente.",
        variant: "destructive",
      });
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
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {client.nome} {client.sobrenome}
          </p>
          <p className="text-sm text-muted-foreground">
            CPF: {client.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formatPhone(client.celular)}
            </span>
            <Dialog open={isEditingPhone} onOpenChange={setIsEditingPhone}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Edit className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Telefone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Novo telefone</label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePhoneUpdate}
                      disabled={updatingPhone}
                      className="flex-1"
                    >
                      {updatingPhone ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditingPhone(false);
                        setNewPhone(client.celular);
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                       {appointment.status === 'agendado' && (
                         <>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => navigate(`/agendamento?edit=${appointment.id}`)}
                           >
                             Alterar
                           </Button>
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="outline" size="sm">
                                 <X className="w-4 h-4" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Não cancelar</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => handleCancelAppointment(appointment.id, appointment)}
                                   className="bg-red-600 hover:bg-red-700"
                                 >
                                   Sim, cancelar
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </>
                       )}
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