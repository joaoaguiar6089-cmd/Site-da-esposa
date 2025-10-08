import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, User, Phone, Edit, Trash2, MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatLocationBlock } from "@/utils/location";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  city_id?: string | null;
  notes?: string;
  city_settings?: {
    city_name?: string | null;
    clinic_name?: string | null;
    address?: string | null;
    map_url?: string | null;
  } | null;
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

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
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
          city_id,
          notes,
          city_settings:city_settings (
            city_name
          ),
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
        description: "Erro ao carregar agendamentos do calendário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar agendamentos do dia selecionado
  useEffect(() => {
    const dayAppts = appointments.filter(apt => 
      isSameDay(parseISO(apt.appointment_date), selectedDate)
    ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    
    setDayAppointments(dayAppts);
  }, [appointments, selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, []);

  // Verificar se uma data tem agendamentos
  const hasAppointments = (date: Date) => {
    return appointments.some(apt => isSameDay(parseISO(apt.appointment_date), date));
  };

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

  // Fechar formulário de edição e voltar ao calendário
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
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (*),
          procedures (name, price, duration),
          city_settings (city_name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const wasConfirmed = appointmentData?.status === 'confirmado';
      const isCanceling = newStatus === 'cancelado';

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      const formatDateToBrazil = (dateString: string) => {
        if (!dateString) return '';

        try {
          if (dateString.includes('-') && dateString.length === 10) {
            const [year, month, day] = dateString.split('-');
            if (year && month && day) {
              return `${day}/${month}/${year}`;
            }
          }
          return dateString;
        } catch (error) {
          return dateString;
        }
      };

      const buildFallbackMessage = (
        heading: string,
        intro: string,
        outro: string,
        templateData?: { message?: string | null; variables?: unknown | null },
      ) => {
        const detailsLines = [
          `- Data: ${formatDateToBrazil(appointmentData.appointment_date)}`,
          `- Horário: ${appointmentData.appointment_time}`,
          `- Procedimento: ${appointmentData.procedures.name}`,
        ];

        if (appointmentData.notes) {
          detailsLines.push(`- Observações: ${appointmentData.notes}`);
        }

        const locationBlock = formatLocationBlock(
          (templateData as any)?.variables,
          appointmentData.city_settings,
          {
            defaultCityName: appointmentData.city_settings?.city_name || 'Tefé-AM',
            defaultClinicName: 'Clínica Dra. Karoline Ferreira',
          },
        );

        if (locationBlock) {
          locationBlock.split('\n').forEach((line) => detailsLines.push(line));
        }

        const fallback = [
          heading,
          '',
          `Olá ${appointmentData.clients.nome}!`,
          '',
          intro,
          detailsLines.join('\n'),
          '',
          outro,
        ].join('\n');

        return (templateData as any)?.message || fallback;
      };

      if (newStatus === 'confirmado' && appointmentData) {
        try {
          console.log('=== CONFIRMAÇÃO DE STATUS - AdminCalendar ===');
          
          // Buscar template do banco (mesmo usado nos outros formulários)
          const { data: templateData, error: templateError } = await supabase
            .from('whatsapp_templates')
            .select('template_content')
            .eq('template_type', 'agendamento_cliente')
            .single();

          console.log('Template encontrado:', templateData);
          console.log('Template error:', templateError);

          let message = '';
          
          if (templateData?.template_content) {
            // Usar o template do banco com substituição de variáveis
            const notes = appointmentData.notes ? `\n📝 Observações: ${appointmentData.notes}` : '';
            const cityName = appointmentData.city_settings?.city_name || '';
            const clinicLocation = `📍 Clínica Dra. Karoline Ferreira — ${cityName}`;

            // Preparar variáveis para substituição
            const variables = {
              clientName: appointmentData.clients.nome,
              appointmentDate: formatDateToBrazil(appointmentData.appointment_date),
              appointmentTime: appointmentData.appointment_time,
              procedureName: appointmentData.procedures.name,
              notes: notes,
              clinicLocation: clinicLocation,
              cityName: cityName,
              clinicName: 'Clínica Dra. Karoline Ferreira',
              specifications: ''
            };

            console.log('Variáveis preparadas:', variables);

            // Substituir todas as variáveis no template
            message = templateData.template_content;
            Object.entries(variables).forEach(([key, value]) => {
              const regex = new RegExp(`\\{${key}\\}`, 'g');
              message = message.replace(regex, value || '');
            });
          } else {
            // Fallback caso não encontre o template
            const notes = appointmentData.notes ? `\n📝 Observações: ${appointmentData.notes}` : '';
            const cityName = appointmentData.city_settings?.city_name || '';
            const clinicLocation = `📍 Clínica Dra. Karoline Ferreira — ${cityName}`;
            
            message = `🩺 *Agendamento Confirmado*

Olá ${appointmentData.clients.nome}!

📅 Data: ${formatDateToBrazil(appointmentData.appointment_date)}
⏰ Horário: ${appointmentData.appointment_time}
💉 Procedimento: ${appointmentData.procedures.name}${notes}

${clinicLocation}

✨ Aguardamos você!`;
          }

          console.log('Mensagem final:', message);

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: appointmentData.clients.celular,
              message,
            },
          });

          console.log('Notificação de confirmação enviada para:', appointmentData.clients.celular);
        } catch (notificationError) {
          console.error('Erro ao enviar notificação de confirmação:', notificationError);
        }
      }

      if (wasConfirmed && isCanceling && appointmentData) {
        try {
          const { data: templateData } = await supabase.functions.invoke('get-whatsapp-template', {
            body: {
              templateType: 'cancelamento_cliente',
              cityId: appointmentData.city_id,
              variables: {
                clientName: appointmentData.clients.nome,
                appointmentDate: formatDateToBrazil(appointmentData.appointment_date),
                appointmentTime: appointmentData.appointment_time,
                procedureName: appointmentData.procedures.name,
                notes: appointmentData.notes ? `\nObservações: ${appointmentData.notes}` : '',
              },
            },
          });

          const message = buildFallbackMessage(
            '❌ *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '📞 Para reagendar, entre em contato conosco.',
            templateData as any,
          );

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: appointmentData.clients.celular,
              message,
            },
          });

          console.log('Notificação de cancelamento enviada para:', appointmentData.clients.celular);
        } catch (notificationError) {
          console.error('Erro ao enviar notificação de cancelamento:', notificationError);
        }
      }

      toast({
        title: 'Status atualizado',
        description: 'Status do agendamento atualizado com sucesso.',
      });

      loadAppointments();
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do agendamento.',
        variant: 'destructive',
      });
    }
  };

  // Deletar agendamento
  const deleteAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este agendamento? Esta ação também removerá todos os logs de lembrete associados.')) return;

    try {
      // Primeiro, buscar dados do agendamento para notificação
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (*),
          procedures (name, price, duration),
          city_settings (city_name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do agendamento:', fetchError);
        // Continue com a deleção mesmo se não conseguir buscar os dados
      }

      // Se conseguiu buscar os dados e o agendamento estava confirmado, enviar notificação de cancelamento
      if (appointmentData && appointmentData.status === 'confirmado') {
        try {
          console.log('=== ENVIANDO NOTIFICAÇÃO DE CANCELAMENTO (DELETE - CALENDAR) ===');
          
          const formatDateToBrazil = (dateString: string) => {
            if (!dateString) return '';
            try {
              if (dateString.includes('-') && dateString.length === 10) {
                const [year, month, day] = dateString.split('-');
                if (year && month && day) {
                  return `${day}/${month}/${year}`;
                }
              }
              return dateString;
            } catch (error) {
              return dateString;
            }
          };

          const { data: templateData } = await supabase.functions.invoke('get-whatsapp-template', {
            body: {
              templateType: 'cancelamento_cliente',
              cityId: appointmentData.city_id,
              variables: {
                clientName: appointmentData.clients.nome,
                appointmentDate: formatDateToBrazil(appointmentData.appointment_date),
                appointmentTime: appointmentData.appointment_time,
                procedureName: appointmentData.procedures.name,
                notes: appointmentData.notes ? `\nObservações: ${appointmentData.notes}` : '',
              },
            },
          });

          const buildFallbackMessage = (
            heading: string,
            intro: string,
            outro: string,
            templateData?: { message?: string | null; variables?: unknown | null },
          ) => {
            const detailsLines = [
              `- Data: ${formatDateToBrazil(appointmentData.appointment_date)}`,
              `- Horário: ${appointmentData.appointment_time}`,
              `- Procedimento: ${appointmentData.procedures.name}`,
            ];

            if (appointmentData.notes) {
              detailsLines.push(`- Observações: ${appointmentData.notes}`);
            }

            const fallback = [
              heading,
              '',
              `Olá ${appointmentData.clients.nome}!`,
              '',
              intro,
              detailsLines.join('\n'),
              '',
              outro,
            ].join('\n');

            return (templateData as any)?.message || fallback;
          };

          const message = buildFallbackMessage(
            '❌ *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '📞 Para reagendar, entre em contato conosco.',
            templateData as any,
          );

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: appointmentData.clients.celular,
              message,
            },
          });

          console.log('Notificação de cancelamento enviada para:', appointmentData.clients.celular);
        } catch (notificationError) {
          console.error('Erro ao enviar notificação de cancelamento:', notificationError);
          // Continue com a deleção mesmo se a notificação falhar
        }
      }

      // Deletar os logs de lembrete relacionados
      const { error: reminderError } = await supabase
        .from('reminder_logs')
        .delete()
        .eq('appointment_id', id);

      if (reminderError) {
        console.error('Erro ao deletar logs de lembrete:', reminderError);
        // Continue mesmo se houver erro ao deletar logs, pois podem não existir
      }

      // Depois, deletar o agendamento
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Agendamento deletado",
        description: appointmentData?.status === 'confirmado' 
          ? "Agendamento foi removido e cliente foi notificado." 
          : "Agendamento foi removido com sucesso.",
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
          <p>Carregando calendário...</p>
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
        selectedDate={selectedDate}
      />
    );
  }

  // Se estiver no modo de edição, mostrar o formulário
  if (showEditForm && selectedAppointment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Editar Agendamento</h1>
        </div>
        
        <div className="max-w-5xl mx-auto w-full">
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
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Calendário de Agendamentos</h1>
        </div>
        <Button 
          onClick={() => setShowNewAppointmentForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Selecione uma data</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border w-full"
              locale={ptBR}
              modifiers={{
                hasAppointments: (date) => hasAppointments(date)
              }}
              modifiersClassNames={{
                hasAppointments: "bg-primary/20 font-bold"
              }}
            />
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 bg-primary/20 rounded"></div>
              <span>Dias com agendamentos</span>
            </div>
          </CardContent>
        </Card>

        {/* Agendamentos do dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum agendamento para este dia
              </p>
            ) : (
              <div className="space-y-3">
                {dayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      appointment.status === 'confirmado' ? "bg-green-500 text-white hover:bg-green-600" : "hover:bg-muted/50"
                    )}
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {appointment.appointment_time}
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                    <p className="text-sm font-medium">
                      {appointment.clients.nome} {appointment.clients.sobrenome}
                    </p>
                    <p className="text-xs">
                      {appointment.procedures.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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

export default AdminCalendar;

