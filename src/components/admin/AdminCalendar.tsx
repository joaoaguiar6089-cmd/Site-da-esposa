import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, User, Phone, Edit, Trash2, MessageSquare, Plus, CheckCircle, DollarSign } from "lucide-react";
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
  payment_status?: string | null;
  payment_method?: string | null;
  payment_value?: number | null;
  payment_installments?: number | null;
  payment_notes?: string | null;
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

interface AdminCalendarProps {
  initialDate?: Date;
}

const AdminCalendar = ({ initialDate }: AdminCalendarProps = {}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sendCancelNotification, setSendCancelNotification] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentInstallments, setPaymentInstallments] = useState("1");
  const [paymentNotes, setPaymentNotes] = useState("");
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
          payment_status,
          payment_method,
          payment_value,
          payment_installments,
          payment_notes,
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

      setAppointments((data as any) || []);
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

  // Determinar a cor do dia baseado nos status de pagamento
  const getDayPaymentStatus = (date: Date) => {
    const dayAppts = appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), date));
    
    if (dayAppts.length === 0) return null;

    // Verificar se é futuro
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (dateOnly > todayOnly) {
      return 'future';
    }

    // Verificar se tem pagamentos passados (data/hora já passou)
    const pastAppts = dayAppts.filter(apt => isAppointmentPast(apt));
    
    if (pastAppts.length === 0) {
      return 'future'; // Se não passou ainda, considerar futuro
    }

    // Verificar status de pagamento dos agendamentos passados
    const hasPaymentInfo = pastAppts.some(apt => apt.payment_status && apt.payment_status !== 'aguardando');
    
    if (!hasPaymentInfo) {
      return 'no-payment-info'; // Asterisco
    }

    const hasUnpaid = pastAppts.some(apt => apt.payment_status === 'nao_pago');
    const hasPartial = pastAppts.some(apt => apt.payment_status === 'pago_parcialmente');
    const hasPaid = pastAppts.some(apt => apt.payment_status === 'pago');

    // Priorizar o pior status
    if (hasUnpaid) {
      return 'unpaid'; // Vermelho
    }
    
    if (hasPartial) {
      return 'partial'; // Amarelo
    }

    if (hasPaid && pastAppts.every(apt => apt.payment_status === 'pago')) {
      return 'paid'; // Verde (todos pagos)
    }

    return 'no-payment-info';
  };

  // Obter classe CSS do dia baseado no status de pagamento
  const getDayClassName = (date: Date) => {
    const status = getDayPaymentStatus(date);
    
    switch (status) {
      case 'future':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'paid':
        return 'bg-green-100 hover:bg-green-200 font-semibold';
      case 'unpaid':
        return 'bg-red-100 hover:bg-red-200 font-semibold';
      case 'partial':
        return 'bg-yellow-100 hover:bg-yellow-200 font-semibold';
      case 'no-payment-info':
        return 'relative font-semibold after:content-["*"] after:absolute after:top-0 after:right-1 after:text-orange-500 after:text-sm';
      default:
        return '';
    }
  };

  // Calcular resumo financeiro do dia
  const getDayFinancialSummary = () => {
    const planned = dayAppointments.reduce((sum, apt) => sum + (apt.procedures.price || 0), 0);
    
    const received = {
      total: 0,
      pix: 0,
      cartao: 0,
      dinheiro: 0,
    };

    dayAppointments.forEach(apt => {
      if (apt.payment_value) {
        received.total += apt.payment_value;
        
        if (apt.payment_method === 'pix') {
          received.pix += apt.payment_value;
        } else if (apt.payment_method === 'cartao') {
          received.cartao += apt.payment_value;
        } else if (apt.payment_method === 'dinheiro') {
          received.dinheiro += apt.payment_value;
        }
      }
    });

    return { planned, received };
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
      'agendado': { label: 'Agendado', className: 'bg-blue-600 text-white border-0' },
      'confirmado': { label: 'Confirmado', className: 'bg-green-600 text-white border-0' },
      'realizado': { label: 'Realizado', className: 'bg-gray-600 text-white border-0' },
      'cancelado': { label: 'Cancelado', className: 'bg-red-600 text-white border-0' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado;
    
    return (
      <Badge className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // Badge de status de pagamento
  const getPaymentStatusBadge = (appointment: Appointment) => {
    const status = appointment.payment_status || 'aguardando';
    
    const statusConfig = {
      'aguardando': { label: 'Aguardando', className: 'bg-white border-2 border-gray-300 text-gray-700' },
      'nao_pago': { label: 'Não Pago', className: 'bg-red-500 text-white border-0' },
      'pago_parcialmente': { label: 'Pago Parcialmente', className: 'bg-yellow-500 text-white border-0' },
      'pago': { label: 'Pago', className: 'bg-green-500 text-white border-0' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aguardando;
    
    return (
      <Badge className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // Verificar se agendamento já passou
  const isAppointmentPast = (appointment: Appointment) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    return appointmentDateTime < new Date();
  };

  // Abrir dialog de confirmação de cancelamento
  const handleOpenCancelDialog = () => {
    setSendCancelNotification(true);
    setCancelDialogOpen(true);
  };

  // Cancelar agendamento com opção de notificação
  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (*),
          procedures (name, price, duration),
          city_settings (city_name)
        `)
        .eq('id', selectedAppointment.id)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar status para cancelado
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      // Enviar notificação se solicitado e estava confirmado
      if (sendCancelNotification && appointmentData.status === 'confirmado') {
        try {
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

          const buildFallbackMessage = (heading: string, intro: string, outro: string, templateData?: any) => {
            const detailsLines = [
              `- Data: ${formatDateToBrazil(appointmentData.appointment_date)}`,
              `- Horário: ${appointmentData.appointment_time}`,
              `- Procedimento: ${appointmentData.procedures.name}`,
            ];

            if (appointmentData.notes) {
              detailsLines.push(`- Observações: ${appointmentData.notes}`);
            }

            return templateData?.message || [
              heading,
              '',
              `Olá ${appointmentData.clients.nome}!`,
              '',
              intro,
              detailsLines.join('\n'),
              '',
              outro,
            ].join('\n');
          };

          const message = buildFallbackMessage(
            '❌ *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '📞 Para reagendar, entre em contato conosco.',
            templateData,
          );

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: appointmentData.clients.celular,
              message,
            },
          });
        } catch (notificationError) {
          console.error('Erro ao enviar notificação:', notificationError);
        }
      }

      toast({
        title: "Agendamento cancelado",
        description: sendCancelNotification && appointmentData.status === 'confirmado'
          ? "Cliente foi notificado via WhatsApp."
          : "Agendamento foi cancelado com sucesso.",
      });

      setCancelDialogOpen(false);
      setDialogOpen(false);
      loadAppointments();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento.",
        variant: "destructive",
      });
    }
  };

  // Abrir dialog de pagamento
  const handleOpenPaymentDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPaymentStatus(appointment.payment_status || 'aguardando');
    setPaymentMethod(appointment.payment_method || '');
    setPaymentValue(appointment.payment_value?.toString() || '');
    setPaymentInstallments(appointment.payment_installments?.toString() || '1');
    setPaymentNotes(appointment.payment_notes || '');
    setPaymentDialogOpen(true);
    setDialogOpen(false);
  };

  // Salvar informações de pagamento
  const handleSavePayment = async () => {
    if (!selectedAppointment) return;

    try {
      const paymentData: Record<string, any> = {
        payment_status: paymentStatus,
      };

      if (paymentStatus !== 'aguardando') {
        paymentData.payment_method = paymentMethod || null;
        paymentData.payment_value = paymentValue ? parseFloat(paymentValue) : null;
        paymentData.payment_installments = paymentMethod === 'cartao' && paymentInstallments ? parseInt(paymentInstallments) : null;
        paymentData.payment_notes = paymentNotes || null;
      } else {
        paymentData.payment_method = null;
        paymentData.payment_value = null;
        paymentData.payment_installments = null;
        paymentData.payment_notes = null;
      }

      const { error } = await supabase
        .from('appointments')
        .update(paymentData)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Pagamento atualizado",
        description: "As informações de pagamento foram atualizadas com sucesso.",
      });

      setPaymentDialogOpen(false);
      loadAppointments();
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar informações de pagamento.",
        variant: "destructive",
      });
    }
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
                future: (date) => getDayPaymentStatus(date) === 'future',
                paid: (date) => getDayPaymentStatus(date) === 'paid',
                unpaid: (date) => getDayPaymentStatus(date) === 'unpaid',
                partial: (date) => getDayPaymentStatus(date) === 'partial',
                noPaymentInfo: (date) => getDayPaymentStatus(date) === 'no-payment-info',
              }}
              modifiersClassNames={{
                future: 'bg-blue-50 hover:bg-blue-100',
                paid: 'bg-green-100 hover:bg-green-200 font-semibold',
                unpaid: 'bg-red-100 hover:bg-red-200 font-semibold',
                partial: 'bg-yellow-100 hover:bg-yellow-200 font-semibold',
                noPaymentInfo: 'relative font-semibold after:content-["*"] after:absolute after:top-0 after:right-1 after:text-orange-500 after:text-sm',
              }}
            />
            <div className="mt-4 space-y-2 text-xs">
              <p className="font-semibold mb-2">Legenda:</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded border"></div>
                <span>Todos pagos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 rounded border"></div>
                <span>Com não-pago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 rounded border"></div>
                <span>Parcial + Pago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 rounded border"></div>
                <span>Futuros</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded border relative">
                  <span className="absolute -top-1 -right-1 text-orange-500">*</span>
                </div>
                <span>Sem info pagamento</span>
              </div>
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
                    className="p-3 border rounded-lg cursor-pointer transition-colors bg-white hover:bg-muted/50"
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {appointment.appointment_time}
                      </span>
                      <div className="flex gap-2">
                        {getStatusBadge(appointment.status)}
                        {getPaymentStatusBadge(appointment)}
                      </div>
                    </div>
                    <p className="text-sm font-medium">
                      {appointment.clients.nome} {appointment.clients.sobrenome}
                    </p>
                    <p className="text-xs">
                      {appointment.procedures.name} - R$ {appointment.procedures.price.toFixed(2)}
                    </p>
                    
                    {/* Informações de Pagamento */}
                    {appointment.payment_value && appointment.payment_value > 0 && (
                      <div className="mt-2 pt-2 border-t text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Pagamento:</span>
                          <span className="font-bold text-green-600">
                            R$ {appointment.payment_value.toFixed(2)}
                          </span>
                        </div>
                        {appointment.payment_method && (
                          <div className="flex items-center justify-between">
                            <span>Forma:</span>
                            <span className="capitalize">{appointment.payment_method}</span>
                          </div>
                        )}
                        {appointment.payment_notes && (
                          <div className="mt-1">
                            <span className="font-medium">Obs:</span>
                            <p className="text-muted-foreground">{appointment.payment_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resumo Financeiro do Dia */}
            {dayAppointments.length > 0 && (() => {
              const { planned, received } = getDayFinancialSummary();
              return (
                <div className="mt-6 pt-4 border-t space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Resumo Financeiro
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-blue-50 rounded">
                      <span className="font-medium">Valor Planejado:</span>
                      <span className="font-bold">R$ {planned.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="font-medium">Valor Recebido:</span>
                      <span className="font-bold text-green-700">R$ {received.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {received.total > 0 && (
                    <div className="space-y-1 text-xs text-muted-foreground pl-4 border-l-2 border-green-200">
                      <p className="font-medium text-foreground mb-1">Detalhamento:</p>
                      {received.pix > 0 && (
                        <div className="flex justify-between">
                          <span>• PIX:</span>
                          <span>R$ {received.pix.toFixed(2)}</span>
                        </div>
                      )}
                      {received.cartao > 0 && (
                        <div className="flex justify-between">
                          <span>• Cartão:</span>
                          <span>R$ {received.cartao.toFixed(2)}</span>
                        </div>
                      )}
                      {received.dinheiro > 0 && (
                        <div className="flex justify-between">
                          <span>• Dinheiro:</span>
                          <span>R$ {received.dinheiro.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
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

              {/* Box de Status de Pagamento - só aparece após a data/hora do agendamento */}
              {isAppointmentPast(selectedAppointment) && (
                <div className="border-t pt-4">
                  <strong>Pagamento:</strong>
                  <div className="mt-2 flex items-center justify-between">
                    {getPaymentStatusBadge(selectedAppointment)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPaymentDialog(selectedAppointment)}
                      className="flex items-center gap-1"
                      title="Gerenciar Pagamento"
                    >
                      <DollarSign className="h-3 w-3" />
                      Gerenciar
                    </Button>
                  </div>
                  {selectedAppointment.payment_status && selectedAppointment.payment_status !== 'aguardando' && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {selectedAppointment.payment_value && (
                        <p>Valor: R$ {selectedAppointment.payment_value.toFixed(2)}</p>
                      )}
                      {selectedAppointment.payment_method && (
                        <p>Forma: {
                          selectedAppointment.payment_method === 'pix' ? 'PIX' :
                          selectedAppointment.payment_method === 'cartao' ? 'Cartão' :
                          'Dinheiro'
                        }</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="space-y-3 pt-4 border-t">
                {/* Linha 1: Pagamento e WhatsApp */}
                <div className="flex flex-wrap gap-2">
                  {isAppointmentPast(selectedAppointment) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPaymentDialog(selectedAppointment)}
                      className="flex items-center gap-1 flex-1"
                      title="Gerenciar Pagamento"
                    >
                      <DollarSign className="h-3 w-3" />
                      Gerenciar
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendWhatsApp(selectedAppointment.clients.celular, selectedAppointment)}
                    className="flex items-center gap-1 flex-1 bg-green-500 hover:bg-green-600 text-white border-green-500"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Button>
                </div>

                {/* Linha 2: Editar e Confirmar/$ */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditAppointment}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>

                  {selectedAppointment.status !== 'confirmado' && (
                    <Button
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmado')}
                      className="flex items-center gap-1 flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Confirmar
                    </Button>
                  )}

                  {isAppointmentPast(selectedAppointment) && selectedAppointment.status === 'confirmado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPaymentDialog(selectedAppointment)}
                      className="flex items-center gap-1"
                      title="Gerenciar Pagamento"
                    >
                      <DollarSign className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Linha 3: Cancelar e Deletar */}
                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.status !== 'cancelado' && (
                    <Button
                      size="sm"
                      onClick={handleOpenCancelDialog}
                      className="flex items-center gap-1 flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Cancelar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteAppointment(selectedAppointment.id)}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Deletar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de cancelamento */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Cancelamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <p className="text-sm">
                Tem certeza que deseja cancelar o agendamento de <strong>{selectedAppointment.clients.nome} {selectedAppointment.clients.sobrenome}</strong>?
              </p>

              <div className="text-sm bg-muted p-3 rounded">
                <p><strong>Procedimento:</strong> {selectedAppointment.procedures.name}</p>
                <p><strong>Data:</strong> {format(parseISO(selectedAppointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {selectedAppointment.appointment_time}</p>
              </div>

              <div className="flex items-center space-x-2 border-t pt-4">
                <Checkbox
                  id="send-notification"
                  checked={sendCancelNotification}
                  onCheckedChange={(checked) => setSendCancelNotification(checked as boolean)}
                />
                <label
                  htmlFor="send-notification"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Enviar notificação via WhatsApp para o cliente
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  className="flex-1"
                >
                  Não
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelAppointment}
                  className="flex-1"
                >
                  Sim, Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Informações de Pagamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="text-sm bg-muted p-3 rounded">
                <p><strong>Cliente:</strong> {selectedAppointment.clients.nome} {selectedAppointment.clients.sobrenome}</p>
                <p><strong>Procedimento:</strong> {selectedAppointment.procedures.name}</p>
                <p><strong>Valor do Procedimento:</strong> R$ {selectedAppointment.procedures.price?.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Status do Pagamento *</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="nao_pago">Não Pago</SelectItem>
                    <SelectItem value="pago_parcialmente">Pago Parcialmente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentStatus !== 'aguardando' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Forma de Pagamento</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Valor Pago (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value)}
                      placeholder="0,00"
                      className="mt-2"
                    />
                  </div>

                  {paymentMethod === 'cartao' && (
                    <div>
                      <label className="text-sm font-medium">Número de Parcelas</label>
                      <Select value={paymentInstallments} onValueChange={setPaymentInstallments}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Observações</label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Observações sobre o pagamento..."
                      className="mt-2"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePayment}
                  className="flex-1"
                >
                  Concluir
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

