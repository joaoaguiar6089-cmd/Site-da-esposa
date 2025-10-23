import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, User, Phone, Edit, Trash2, MessageSquare, Plus, CheckCircle, DollarSign, RotateCcw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatLocationBlock } from "@/utils/location";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";
import { getPackageInfo, formatSessionProgress, getPackageValue } from "@/utils/packageUtils";

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
  session_number?: number | null;
  total_sessions?: number | null;
  return_of_appointment_id?: string | null;
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
    id?: string;
    name: string;
    duration: number;
    price: number;
    sessions?: number | null;
    requires_specifications?: boolean;
    body_selection_type?: string | null;
    body_image_url?: string | null;
    body_image_url_male?: string | null;
    description?: string | null;
  };
  professionals?: {
    id?: string;
    name: string;
  } | null;
  professional_id?: string | null;
  appointments_procedures?: Array<{
    order_index?: number | null;
    custom_price?: number | null;
    procedure?: {
      id?: string;
      name: string;
      duration: number;
      price: number;
      requires_specifications?: boolean;
      body_selection_type?: string | null;
      body_image_url?: string | null;
      body_image_url_male?: string | null;
      description?: string | null;
    } | null;
  }>;
  appointment_specifications?: {
    specification_id: string;
    specification_name: string;
    specification_price: number;
  }[];
  all_procedures?: Array<{
    id?: string;
    name: string;
    duration: number;
    price: number;
    requires_specifications?: boolean;
    body_selection_type?: string | null;
    body_image_url?: string | null;
    body_image_url_male?: string | null;
    description?: string | null;
  }>;
  total_duration?: number;
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
  const [appointmentBeingEdited, setAppointmentBeingEdited] = useState<Appointment | null>(null);
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
  const [markAsRealizado, setMarkAsRealizado] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [appointmentToReturn, setAppointmentToReturn] = useState<Appointment | null>(null);
  const { toast } = useToast();

  // Carregar todos os agendamentos
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error} = await supabase
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
          session_number,
          total_sessions,
          return_of_appointment_id,
          professional_id,
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
            id,
            name,
            duration,
            price,
            sessions,
            requires_specifications,
            body_selection_type,
            body_image_url,
            body_image_url_male,
            description
          ),
          professionals (
            id,
            name
          ),
          appointments_procedures (
            order_index,
            custom_price,
            procedure:procedures (
              id,
              name,
              duration,
              price,
              requires_specifications,
              body_selection_type,
              body_image_url,
              body_image_url_male,
              description
            )
          ),
          appointment_specifications (
            specification_id,
            specification_name,
            specification_price
          )
        `)
        .order('appointment_date')
        .order('appointment_time');

      if (error) throw error;

      console.log('=== DEBUG ADMIN CALENDAR ===');
      console.log('Total appointments loaded:', data?.length);
      console.log('First appointment:', data?.[0]);

      // Processar appointments para incluir múltiplos procedimentos
      const processedAppointments = (data as any[])?.map(apt => {
        // Se tem appointments_procedures, usar eles; senão, usar procedure principal
        const allProcedures = apt.appointments_procedures && apt.appointments_procedures.length > 0
          ? apt.appointments_procedures
              .sort((a: any, b: any) => (a?.order_index ?? 0) - (b?.order_index ?? 0))
              .map((ap: any) => {
                // Usar custom_price se disponível, senão usar price padrão
                const proc = ap?.procedure;
                if (!proc) return null;
                return {
                  ...proc,
                  price: ap.custom_price !== null && ap.custom_price !== undefined ? ap.custom_price : proc.price
                };
              })
              .filter((p: any) => p !== null)
          : apt.procedures ? [apt.procedures] : [];

        // Filtrar procedimentos válidos
        const validProcedures = allProcedures.filter((p: any) => p && p.name);

        // Calcular duração total
        const totalDuration = validProcedures.reduce((sum: number, proc: any) => 
          sum + (proc?.duration || 0), 0
        );

        const result = {
          ...apt,
          all_procedures: validProcedures,
          total_duration: totalDuration
        };

        console.log('Processed appointment:', {
          id: apt.id,
          date: apt.appointment_date,
          has_procedures: validProcedures.length > 0,
          procedures: validProcedures.map((p: any) => p.name)
        });

        return result;
      }) || [];

      console.log('Total processed appointments:', processedAppointments.length);
      setAppointments(processedAppointments);
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

    // Verificar se tem pagamentos passados (data/hora já passou) apenas para agendamentos realizados
    const pastAppts = dayAppts.filter(apt => isAppointmentPast(apt) && apt.status === 'realizado');
    
    if (pastAppts.length === 0) {
      return 'future'; // Se não passou ainda ou não foi realizado, considerar futuro
    }

    // Verificar status de pagamento dos agendamentos passados realizados
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
    const planned = dayAppointments
      .filter(apt => apt.status !== 'cancelado' && !apt.return_of_appointment_id)
      .reduce((sum, apt) => sum + getPackageValue(apt), 0);
    
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
      setAppointmentBeingEdited(selectedAppointment);
      setShowEditForm(true);
      setDialogOpen(false);
    }
  };

  // Fechar formulário de edição e voltar ao calendário
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setAppointmentBeingEdited(null);
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

  // Marcar agendamento como retorno
  const handleMarkAsReturn = async () => {
    if (!appointmentToReturn) return;

    try {
      // Atualizar o agendamento para marcar como retorno
      const { error } = await supabase
        .from('appointments')
        .update({
          return_of_appointment_id: appointmentToReturn.id, // Marca como retorno
          payment_value: 0, // Zera o valor
        })
        .eq('id', appointmentToReturn.id);

      if (error) throw error;

      toast({
        title: "Procedimento marcado como retorno",
        description: "O valor foi zerado e não será contabilizado no planejado.",
      });

      setReturnDialogOpen(false);
      setAppointmentToReturn(null);
      loadAppointments();
    } catch (error) {
      console.error('Erro ao marcar como retorno:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar procedimento como retorno.",
        variant: "destructive",
      });
    }
  };

  // Abrir dialog de confirmação para marcar como retorno
  const handleOpenReturnDialog = (appointment: Appointment, event: React.MouseEvent) => {
    event.stopPropagation(); // Impedir que abra o dialog de detalhes
    setAppointmentToReturn(appointment);
    setReturnDialogOpen(true);
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
            const notes = appointmentData.notes ? `\n?? Observações: ${appointmentData.notes}` : '';
            const cityName = appointmentData.city_settings?.city_name || '';
            const clinicLocation = `?? Clínica Dra. Karoline Ferreira — ${cityName}`;

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
            const notes = appointmentData.notes ? `\n?? Observações: ${appointmentData.notes}` : '';
            const cityName = appointmentData.city_settings?.city_name || '';
            const clinicLocation = `?? Clínica Dra. Karoline Ferreira — ${cityName}`;
            
            message = `?? *Agendamento Confirmado*

Olá ${appointmentData.clients.nome}!

?? Data: ${formatDateToBrazil(appointmentData.appointment_date)}
? Horário: ${appointmentData.appointment_time}
?? Procedimento: ${appointmentData.procedures.name}${notes}

${clinicLocation}

? Aguardamos você!`;
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
            '? *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '?? Para reagendar, entre em contato conosco.',
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
            '? *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '?? Para reagendar, entre em contato conosco.',
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
    
?? Data: ${format(parseISO(appointmentData.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
? Horário: ${appointmentData.appointment_time}
?? Procedimento: ${appointmentData.procedures.name}
?? Local: Dra. Karoline Ferreira - Estética e Saúde

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

  const renderStatusBadgeForList = (appointment: Appointment) => {
    if (isAppointmentPast(appointment)) {
      if (appointment.status === 'realizado') {
        return (
          <Badge className="text-xs bg-green-600 text-white border-0 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Realizado
          </Badge>
        );
      }

      if (appointment.status === 'cancelado') {
        return (
          <Badge className="text-xs bg-red-600 text-white border-0 flex items-center gap-1">
            <X className="h-3 w-3" />
            Não realizado
          </Badge>
        );
      }

      return (
        <Badge className="text-xs bg-gray-200 text-gray-700 border-0">
          ...
        </Badge>
      );
    }

    return getStatusBadge(appointment.status);
  };

  // Badge de status de pagamento
  const getPaymentStatusBadge = (appointment: Appointment) => {
    // Só mostrar status de pagamento para agendamentos realizados
    if (appointment.status !== 'realizado') {
      return null;
    }
    
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
  const handleOpenCancelDialog = (appointment?: Appointment) => {
    if (appointment) {
      setSelectedAppointment(appointment);
    }
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
            '? *Agendamento Cancelado*',
            'Informamos que seu agendamento foi cancelado:',
            '?? Para reagendar, entre em contato conosco.',
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
  const handleOpenPaymentDialog = (appointment: Appointment, statusOverride?: string, markAsRealizado: boolean = false) => {
    setSelectedAppointment(appointment);
    const resolvedStatus = statusOverride || appointment.payment_status || 'aguardando';
    setPaymentStatus(resolvedStatus);
    setMarkAsRealizado(markAsRealizado);
    if (statusOverride === 'nao_pago') {
      setPaymentMethod('');
      setPaymentValue('');
      setPaymentInstallments('1');
    } else {
      setPaymentMethod(appointment.payment_method || '');
      setPaymentValue(appointment.payment_value?.toString() || '');
      setPaymentInstallments(appointment.payment_installments?.toString() || '1');
    }
    setPaymentNotes(appointment.payment_notes || '');
    setPaymentDialogOpen(true);
    setDialogOpen(false);
  };

  // Salvar informações de pagamento
  const handleSavePayment = async () => {
    if (!selectedAppointment) return;

    try {
      const paymentData: Record<string, any> = {
        payment_status: paymentStatus === 'retorno' ? 'pago' : paymentStatus,
      };

      // Se deve marcar como realizado, incluir o status
      if (markAsRealizado) {
        paymentData.status = 'realizado';
      }

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
  if (showEditForm && appointmentBeingEdited) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Editar Agendamento</h1>
        </div>
        
        <div className="max-w-5xl mx-auto w-full">
          <NewBookingFlow
            onBack={handleCloseEditForm}
            onSuccess={handleAppointmentUpdated}
            adminMode={true}
            initialClient={appointmentBeingEdited.clients}
            sendNotification={true}
            editingAppointmentId={appointmentBeingEdited.id}
            allowPastDates={true}
            initialAppointment={{
              id: appointmentBeingEdited.id,
              appointment_date: appointmentBeingEdited.appointment_date,
              appointment_time: appointmentBeingEdited.appointment_time,
              city_id: appointmentBeingEdited.city_id,
              notes: appointmentBeingEdited.notes ?? null,
              procedures: appointmentBeingEdited.procedures,
              appointments_procedures: appointmentBeingEdited.appointments_procedures as any,
              appointment_specifications: appointmentBeingEdited.appointment_specifications || null,
              city_settings: appointmentBeingEdited.city_settings,
              professional_id: appointmentBeingEdited.professional_id ?? null,
              professional: appointmentBeingEdited.professionals,
            }}
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
              classNames={{
                day_selected: "",
              }}
              modifiers={{
                future: (date) => getDayPaymentStatus(date) === 'future',
                paid: (date) => getDayPaymentStatus(date) === 'paid',
                unpaid: (date) => getDayPaymentStatus(date) === 'unpaid',
                partial: (date) => getDayPaymentStatus(date) === 'partial',
                noPaymentInfo: (date) => getDayPaymentStatus(date) === 'no-payment-info',
                selected: (date) => selectedDate && isSameDay(date, selectedDate),
              }}
              modifiersClassNames={{
                future: 'bg-blue-50 hover:bg-blue-100',
                paid: 'bg-green-100 hover:bg-green-200 font-semibold',
                unpaid: 'bg-red-100 hover:bg-red-200 font-semibold',
                partial: 'bg-yellow-100 hover:bg-yellow-200 font-semibold',
                noPaymentInfo: 'relative font-semibold after:content-["*"] after:absolute after:top-0 after:right-1 after:text-orange-500 after:text-sm',
                selected: 'border-2 border-black',
              }}
            />
            <div className="mt-4 space-y-2 text-xs">
              <p className="font-semibold mb-2">Legenda:</p>
              <p className="text-muted-foreground mb-3 italic">
                * Cores baseadas apenas em agendamentos realizados
              </p>
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
                {dayAppointments.map((appointment) => {
                  // Verificar se é um agendamento passado que precisa de ação (não realizado nem cancelado)
                  const needsAction = isAppointmentPast(appointment) && 
                                    appointment.status !== 'realizado' && 
                                    appointment.status !== 'cancelado';
                  
                  return (
                    <div
                      key={appointment.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors bg-white hover:bg-muted/50",
                        needsAction && "border-orange-200 bg-orange-50/50"
                      )}
                      onClick={() => !needsAction && handleAppointmentClick(appointment)}
                    >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {appointment.appointment_time}
                      </span>
                      <div className="flex gap-2">
                        {renderStatusBadgeForList(appointment)}
                        {getPaymentStatusBadge(appointment)}
                        {/* Botões de ação para agendamentos que passaram e precisam de ação */}
                        {needsAction && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCancelDialog(appointment);
                              }}
                              title="Não Realizado"
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentDialog(appointment, undefined, true);
                              }}
                              title="Marcar como Realizado"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium">
                      {appointment.clients.nome} {appointment.clients.sobrenome}
                    </p>
                    
                    {/* Mostrar múltiplos procedimentos */}
                    {appointment.all_procedures && appointment.all_procedures.length > 1 ? (
                      <div className="text-xs space-y-1 mt-1">
                        {appointment.all_procedures.map((proc, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-muted-foreground">•</span>
                            <span>
                              {proc.name}
                              {appointment.return_of_appointment_id && ' - Retorno'}
                            </span>
                            <span className="text-muted-foreground">({proc.duration}min)</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 mt-1 pt-1 border-t flex-wrap">
                          <span className="font-medium">Total:</span>
                          <span>{appointment.total_duration}min</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-medium">
                            R$ {appointment.return_of_appointment_id ? '0,00' : appointment.all_procedures.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs flex-1">
                          {getPackageInfo(appointment).displayName}
                          {appointment.return_of_appointment_id && ' - Retorno'}
                          {' - R$ '}
                          {appointment.return_of_appointment_id ? '0,00' : getPackageValue(appointment).toFixed(2)}
                        </p>
                        {getPackageInfo(appointment).isPackage && (
                          <Badge variant="outline" className="text-xs">
                            {formatSessionProgress(appointment)}
                          </Badge>
                        )}
                        {/* Botão para marcar como retorno */}
                        {!appointment.return_of_appointment_id && 
                         !getPackageInfo(appointment).displayName.toLowerCase().includes('retorno') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleOpenReturnDialog(appointment, e)}
                            title="Marcar como retorno"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Informações de Pagamento */}
                    {appointment.payment_value > 0 && (
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
                );
                })}
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
        <DialogContent className="max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-lg sm:text-xl">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                <strong>{selectedAppointment.all_procedures && selectedAppointment.all_procedures.length > 1 ? 'Procedimentos:' : 'Procedimento:'}</strong>
                
                {/* Múltiplos Procedimentos */}
                {selectedAppointment.all_procedures && selectedAppointment.all_procedures.length > 1 ? (
                  <div className="space-y-2 mt-2">
                    {selectedAppointment.all_procedures.map((proc, idx) => (
                      <div key={idx} className="p-2 bg-muted/30 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {idx + 1}. {proc.name}
                            {selectedAppointment.return_of_appointment_id && ' - Retorno'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {proc.duration}min • R$ {selectedAppointment.return_of_appointment_id ? '0,00' : proc.price.toFixed(2)}
                        </p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-2 bg-primary/10 rounded font-medium">
                      <span>Total:</span>
                      <span>
                        {selectedAppointment.total_duration}min • R$ {selectedAppointment.return_of_appointment_id ? '0,00' : selectedAppointment.all_procedures.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p>
                        {getPackageInfo(selectedAppointment).displayName}
                        {selectedAppointment.return_of_appointment_id && ' - Retorno'}
                      </p>
                      {getPackageInfo(selectedAppointment).isPackage && (
                        <Badge variant="outline">
                          {formatSessionProgress(selectedAppointment)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedAppointment.procedures.duration}min - R$ {selectedAppointment.return_of_appointment_id ? '0,00' : getPackageValue(selectedAppointment).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Removido badge de retorno - agora aparece no nome do procedimento */}

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
                {isAppointmentPast(selectedAppointment) ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      {
                        value: 'realizado',
                        label: 'Realizado',
                        icon: Check,
                        activeClasses: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
                        inactiveClasses: 'text-green-700 border-green-500 hover:bg-green-50'
                      },
                      {
                        value: 'cancelado',
                        label: 'Não realizado',
                        icon: X,
                        activeClasses: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
                        inactiveClasses: 'text-red-600 border-red-500 hover:bg-red-50'
                      }
                    ].map((option) => {
                      const isActive = selectedAppointment.status === option.value;
                      return (
                        <Button
                          key={option.value}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!isActive) {
                              updateAppointmentStatus(selectedAppointment.id, option.value);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1",
                            isActive ? option.activeClasses : option.inactiveClasses
                          )}
                        >
                          <option.icon className="h-3 w-3" />
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-1">
                    {getStatusBadge(selectedAppointment.status)}
                  </div>
                )}
              </div>

              {/* Box de Status de Pagamento - só aparece após a data/hora do agendamento */}
              {isAppointmentPast(selectedAppointment) && (
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <strong>Status do Pagamento:</strong>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        {
                          value: 'pago',
                          label: 'Pago',
                          activeClasses: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
                          inactiveClasses: 'text-green-700 border-green-500 hover:bg-green-50'
                        },
                        {
                          value: 'pago_parcialmente',
                          label: 'Pago parcialmente',
                          activeClasses: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-500',
                          inactiveClasses: 'text-amber-600 border-amber-500 hover:bg-amber-50'
                        },
                        {
                          value: 'nao_pago',
                          label: 'Não pago',
                          activeClasses: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
                          inactiveClasses: 'text-red-600 border-red-500 hover:bg-red-50'
                        }
                      ].map((option) => {
                        const isActive = (selectedAppointment.payment_status || 'aguardando') === option.value;
                        return (
                          <Button
                            key={option.value}
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPaymentDialog(selectedAppointment, option.value)}
                            className={cn(
                              "flex items-center gap-1",
                              isActive ? option.activeClasses : option.inactiveClasses
                            )}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedAppointment.payment_status && selectedAppointment.payment_status !== 'aguardando' && (
                    <div className="text-sm text-muted-foreground space-y-1">
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendWhatsApp(selectedAppointment.clients.celular, selectedAppointment)}
                    className="flex items-center gap-1 flex-1 bg-green-500 hover:bg-green-600 text-white border-green-500"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditAppointment}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                </div>

                {!isAppointmentPast(selectedAppointment) && selectedAppointment.status !== 'confirmado' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmado')}
                      className="flex items-center gap-1 flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Confirmar
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!isAppointmentPast(selectedAppointment) && selectedAppointment.status !== 'cancelado' && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenCancelDialog(selectedAppointment)}
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
                <div className="flex items-center gap-2 mb-1">
                  <p><strong>Procedimento:</strong> {getPackageInfo(selectedAppointment).displayName}</p>
                  {getPackageInfo(selectedAppointment).isPackage && (
                    <Badge variant="outline" className="text-xs">
                      {formatSessionProgress(selectedAppointment)}
                    </Badge>
                  )}
                </div>
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
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) {
          setMarkAsRealizado(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {markAsRealizado ? 'Marcar como Realizado - Informações de Pagamento' : 'Informações de Pagamento'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="text-sm bg-muted p-3 rounded">
                <p><strong>Cliente:</strong> {selectedAppointment.clients.nome} {selectedAppointment.clients.sobrenome}</p>
                <div className="flex items-center gap-2">
                  <p><strong>Procedimento:</strong> {getPackageInfo(selectedAppointment).displayName}</p>
                  {getPackageInfo(selectedAppointment).isPackage && (
                    <Badge variant="outline" className="text-xs">
                      {formatSessionProgress(selectedAppointment)}
                    </Badge>
                  )}
                </div>
                <p><strong>Valor do Procedimento:</strong> R$ {getPackageValue(selectedAppointment).toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Status do Pagamento *</label>
                <Select value={paymentStatus} onValueChange={(value) => {
                  setPaymentStatus(value);
                  if (value === 'retorno') {
                    setPaymentMethod('pix');
                    setPaymentValue('0');
                    setPaymentInstallments('1');
                    setPaymentNotes('Retorno - valor zerado');
                  }
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="nao_pago">Não Pago</SelectItem>
                    <SelectItem value="pago_parcialmente">Pago Parcialmente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
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

      {/* Dialog de confirmação para marcar como retorno */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como retorno?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar o procedimento como um retorno? O valor será zerado (R$ 0,00) e não será contabilizado no planejado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsReturn}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCalendar;




