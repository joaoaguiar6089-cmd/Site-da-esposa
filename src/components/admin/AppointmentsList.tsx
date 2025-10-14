import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, Phone, Edit, Trash2, Search, MessageSquare, Filter, Plus, DollarSign, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatLocationBlock } from "@/utils/location";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateToBrazil } from '@/utils/dateUtils';
import { getPackageInfo, formatSessionProgress } from "@/utils/packageUtils";
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
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
  package_parent_id?: string | null;
  session_number?: number;
  total_sessions?: number;
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
    sessions?: number;
  };
  professionals?: {
    name: string;
  } | null;
  appointment_specifications?: {
    specification_name: string;
    specification_price: number;
  }[];
}

interface Professional {
  id: string;
  name: string;
}

interface AppointmentsListProps {
  initialPaymentFilters?: string[];
  initialSearchTerm?: string;
  initialDateFrom?: string; // YYYY-MM-DD
  initialDateTo?: string; // YYYY-MM-DD
}

const AppointmentsList = ({ 
  initialPaymentFilters, 
  initialSearchTerm,
  initialDateFrom,
  initialDateTo 
}: AppointmentsListProps = {}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentStatusFilters, setPaymentStatusFilters] = useState<string[]>(initialPaymentFilters || []);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [confirmingAppointment, setConfirmingAppointment] = useState<Appointment | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentInstallments, setPaymentInstallments] = useState("1");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [hasReturn, setHasReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (paymentDialogOpen && paymentStatus === 'nao_pago') {
      setPaymentMethod('');
      setPaymentValue('');
      setPaymentInstallments('1');
    }
  }, [paymentDialogOpen, paymentStatus]);

  // Carregar todos os agendamentos (apenas de hoje em diante)
  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Obter a data atual no formato YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
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
          package_parent_id,
          session_number,
          total_sessions,
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
            sessions
          ),
          professionals (
            name
          ),
          appointment_specifications (
            specification_name,
            specification_price
          )
        `);
      
      // Aplicar filtros de data se fornecidos, senão usar padrão
      if (initialDateFrom) {
        query = query.gte('appointment_date', initialDateFrom);
      }
      
      if (initialDateTo) {
        query = query.lte('appointment_date', initialDateTo);
      } else {
        // Histórico: mostrar apenas agendamentos até hoje
        query = query.lte('appointment_date', today);
      }
      
      query = query.order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar no lado do cliente para remover agendamentos futuros de hoje
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      
      const filteredData = (data || []).filter((apt: any) => {
        // Se for antes de hoje, incluir
        if (apt.appointment_date < today) return true;
        
        // Se for hoje, verificar se o horário já passou
        if (apt.appointment_date === today && apt.appointment_time <= currentTime) return true;
        
        // Agendamentos futuros não aparecem no histórico
        return false;
      });

      setAppointments(filteredData as any);
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

  // Carregar profissionais
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

  // Filtrar agendamentos
  useEffect(() => {
    let filtered = [...appointments];

    if (statusFilter !== "todos") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    if (paymentStatusFilters.length > 0) {
      filtered = filtered.filter(apt => {
        const status = apt.payment_status || 'aguardando';
        return paymentStatusFilters.includes(status);
      });
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
  }, [appointments, statusFilter, searchTerm, paymentStatusFilters]);

  useEffect(() => {
    loadAppointments();
    loadProfessionals();
  }, []);

  // Toggle filtro de pagamento
  const togglePaymentFilter = (status: string) => {
    setPaymentStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Abrir detalhes do agendamento
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  // Abrir formulário de edição
  const handleEditAppointment = () => {
    if (selectedAppointment) {
      setShowEditForm(true);
      setDialogOpen(false);
    }
  };

  // Fechar formulário de edição e voltar à lista
  const handleCloseEditForm = () => {
    setShowEditForm(false);
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

  // Iniciar processo de confirmação
  const startConfirmationProcess = (appointment: Appointment) => {
    if (appointment.status === 'agendado') {
      setConfirmingAppointment(appointment);
      setSelectedProfessional("");
    } else {
      updateAppointmentStatus(appointment.id, 'confirmado');
    }
  };

  // Confirmar agendamento com profissional
  const confirmAppointmentWithProfessional = async () => {
    if (!confirmingAppointment || !selectedProfessional) {
      toast({
        title: "Erro",
        description: "Selecione um profissional para confirmar o agendamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar agendamento com profissional
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmado',
          professional_id: selectedProfessional 
        })
        .eq('id', confirmingAppointment.id);

      if (error) throw error;

      // Buscar dados atualizados para notificação
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (*),
          procedures (name, price, duration),
          professionals (name)
        `)
        .eq('id', confirmingAppointment.id)
        .single();

      if (fetchError) throw fetchError;

      // Enviar notificação WhatsApp com informação do profissional
      try {
        const professionalName = appointmentData.professionals?.name || 'Profissional não informado';
        
        const message = `🩺 *Agendamento Confirmado*

Olá ${appointmentData.clients.nome}!

Seu agendamento foi confirmado:

📅 Data: ${formatDateToBrazil(appointmentData.appointment_date)}
⏰ Horário: ${appointmentData.appointment_time}
💉 Procedimento: ${appointmentData.procedures.name}
👩‍⚕️ Profissional: ${professionalName}

📍 Clínica Dra. Karoline Ferreira
Tefé-AM

✨ Aguardamos você!`;

        await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: appointmentData.clients.celular,
            message: message
          }
        });

        console.log('Notificação de confirmação enviada com informação do profissional');
      } catch (notificationError) {
        console.error('Erro ao enviar notificação de confirmação:', notificationError);
      }

      toast({
        title: "Agendamento confirmado",
        description: `Agendamento confirmado com ${professionals.find(p => p.id === selectedProfessional)?.name}`,
      });

      setConfirmingAppointment(null);
      setSelectedProfessional("");
      loadAppointments();
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar agendamento.",
        variant: "destructive",
      });
    }
  };
  
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
          console.log('=== CONFIRMAÇÃO DE STATUS ===');
          
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
              nomeCliente: appointmentData.clients.nome,
              dataAgendamento: formatDateToBrazil(appointmentData.appointment_date),
              horarioAgendamento: appointmentData.appointment_time,
              nomeProcedimento: appointmentData.procedures.name,
              observacoes: notes,
              localizacaoClinica: clinicLocation,
              nomeCidade: cityName,
              nomeClinica: 'Clínica Dra. Karoline Ferreira',
              especificacoes: '',
              // Manter compatibilidade
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
                nomeCliente: appointmentData.clients.nome,
                dataAgendamento: formatDateToBrazil(appointmentData.appointment_date),
                horarioAgendamento: appointmentData.appointment_time,
                nomeProcedimento: appointmentData.procedures.name,
                observacoes: appointmentData.notes ? `\nObservações: ${appointmentData.notes}` : '',
                // Manter compatibilidade
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
          console.log('=== ENVIANDO NOTIFICAÇÃO DE CANCELAMENTO (DELETE) ===');
          
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

  // Abrir dialog de pagamento
  const handleOpenPaymentDialog = (appointment: Appointment, statusOverride?: string) => {
    setSelectedAppointment(appointment);
    const resolvedStatus = statusOverride || appointment.payment_status || 'aguardando';
    setPaymentStatus(resolvedStatus);
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
    setHasReturn(false);
    setReturnDate('');
    setReturnTime('');
    setPaymentDialogOpen(true);
  };

  // Salvar informações de pagamento
  const handleSavePayment = async () => {
    if (!selectedAppointment) return;

    try {
      const paymentData: Record<string, any> = {
        payment_status: paymentStatus,
      };
      const trimmedNotes = paymentNotes.trim();

      if (paymentStatus === 'nao_pago') {
        if (!trimmedNotes) {
          toast({
            title: "Observações obrigatórias",
            description: "Informe o motivo do não pagamento.",
            variant: "destructive",
          });
          return;
        }
        paymentData.payment_method = null;
        paymentData.payment_value = null;
        paymentData.payment_installments = null;
        paymentData.payment_notes = trimmedNotes;
      } else if (paymentStatus !== 'aguardando') {
        paymentData.payment_method = paymentMethod || null;
        paymentData.payment_value = paymentValue ? parseFloat(paymentValue) : null;
        paymentData.payment_installments =
          paymentMethod === 'cartao' && paymentInstallments ? parseInt(paymentInstallments) : null;
        paymentData.payment_notes = trimmedNotes || null;
      } else {
        // Se voltou para aguardando, limpar todos os campos
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

      // Se tiver retorno, criar novo agendamento
      if (hasReturn && returnDate && returnTime) {
        const returnAppointment = {
          client_id: selectedAppointment.clients?.id,
          procedure_id: selectedAppointment.procedures?.id,
          appointment_date: returnDate,
          appointment_time: returnTime,
          status: 'agendado',
          notes: `Retorno - ${selectedAppointment.procedures?.name || ''}`,
        };

        const { error: insertError } = await supabase
          .from('appointments')
          .insert([returnAppointment]);

        if (insertError) throw insertError;

        toast({
          title: "Sucesso",
          description: "Pagamento atualizado e retorno agendado!",
        });
      } else {
        toast({
          title: "Pagamento atualizado",
          description: "As informações de pagamento foram atualizadas com sucesso.",
        });
      }

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
          N�o realizado
        </Badge>
      );
    }

    return (
      <Badge className="text-xs bg-gray-200 text-gray-700 border-0">
        ...
      </Badge>
    );
  };

  // Badge de status de pagamento
  const getPaymentStatusBadge = (paymentStatus?: string | null) => {
    const status = paymentStatus || 'aguardando';
    
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
        
        <div className="max-w-5xl mx-auto w-full">
          <NewBookingFlow
            onBack={handleCloseEditForm}
            onSuccess={handleAppointmentUpdated}
            adminMode={true}
            initialClient={selectedAppointment.clients}
            sendNotification={true}
            editingAppointmentId={selectedAppointment.id}
            allowPastDates={true}
            initialAppointment={{
              id: selectedAppointment.id,
              appointment_date: selectedAppointment.appointment_date,
              appointment_time: selectedAppointment.appointment_time,
              city_id: selectedAppointment.city_id,
              notes: selectedAppointment.notes ?? null,
              procedures: selectedAppointment.procedures,
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
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico de Agendamentos</h1>
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
      <div className="space-y-4">
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

        {/* Filtros de Status de Pagamento */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Filtrar por Status de Pagamento:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-aguardando"
                checked={paymentStatusFilters.includes('aguardando')}
                onCheckedChange={() => togglePaymentFilter('aguardando')}
              />
              <label htmlFor="filter-aguardando" className="text-sm cursor-pointer">
                Aguardando
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-nao-pago"
                checked={paymentStatusFilters.includes('nao_pago')}
                onCheckedChange={() => togglePaymentFilter('nao_pago')}
              />
              <label htmlFor="filter-nao-pago" className="text-sm cursor-pointer">
                Não Pago
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-pago-parcialmente"
                checked={paymentStatusFilters.includes('pago_parcialmente')}
                onCheckedChange={() => togglePaymentFilter('pago_parcialmente')}
              />
              <label htmlFor="filter-pago-parcialmente" className="text-sm cursor-pointer">
                Pago Parcialmente
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-pago"
                checked={paymentStatusFilters.includes('pago')}
                onCheckedChange={() => togglePaymentFilter('pago')}
              />
              <label htmlFor="filter-pago" className="text-sm cursor-pointer">
                Pago
              </label>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de agendamentos */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Nenhum agendamento encontrado a partir de hoje.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Coluna Esquerda - Informações do Cliente */}
                  <div className="space-y-3 cursor-pointer" onClick={() => handleAppointmentClick(appointment)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {appointment.clients.nome} {appointment.clients.sobrenome}
                      </span>
                      {renderStatusBadgeForList(appointment)}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(parseISO(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <Clock className="h-3 w-3 ml-3" />
                        <span>{appointment.appointment_time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {appointment.clients.celular}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {getPackageInfo(appointment).displayName}
                      </p>
                      {formatSessionProgress(appointment) && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          📦 {formatSessionProgress(appointment)}
                        </p>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Observações:</strong> {appointment.notes}
                      </p>
                    )}
                  </div>
                  
                  {/* Coluna Direita - Informações de Pagamento */}
                  <div className="border-l pl-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Pagamento
                      </h3>
                      {getPaymentStatusBadge(appointment.payment_status)}
                    </div>
                    
                    {appointment.payment_status && appointment.payment_status !== 'aguardando' ? (
                      <div className="space-y-2 text-sm">
                        {appointment.payment_value && (
                          <p><strong>Valor:</strong> R$ {appointment.payment_value.toFixed(2)}</p>
                        )}
                        {appointment.payment_method && (
                          <p><strong>Forma:</strong> {
                            appointment.payment_method === 'pix' ? 'PIX' :
                            appointment.payment_method === 'cartao' ? 'Cartão' :
                            'Dinheiro'
                          }</p>
                        )}
                        {appointment.payment_method === 'cartao' && appointment.payment_installments && (
                          <p><strong>Parcelas:</strong> {appointment.payment_installments}x</p>
                        )}
                        {appointment.payment_notes && (
                          <p
                            className={cn(
                              "text-muted-foreground",
                              appointment.payment_status === 'nao_pago' && "text-red-600 font-semibold"
                            )}
                          >
                            <strong>{appointment.payment_status === 'nao_pago' ? 'Motivo:' : 'Obs:'}</strong> {appointment.payment_notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem informações de pagamento</p>
                    )}
                    
                    <div className="flex gap-2 pt-2">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPaymentDialog(appointment);
                        }}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                        title="Gerenciar Pagamento"
                      >
                        <DollarSign className="h-3 w-3" />
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
                      label: 'N�o realizado',
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
              </div>

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
                        label: 'N�o pago',
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
                      <p>Valor: R$ {selectedAppointment.payment_value?.toFixed(2)}</p>
                    )}
                    {selectedAppointment.payment_method && (
                      <p>Forma: {
                        selectedAppointment.payment_method === 'pix' ? 'PIX' :
                        selectedAppointment.payment_method === 'cartao' ? 'Cart�o' :
                        'Dinheiro'
                      }</p>
                    )}
                    {selectedAppointment.payment_method === 'cartao' && selectedAppointment.payment_installments && (
                      <p>Parcelas: {selectedAppointment.payment_installments}x</p>
                    )}
                    {selectedAppointment.payment_notes && (
                      <p
                        className={cn(
                          selectedAppointment.payment_status === 'nao_pago' ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                        )}
                      >
                        {selectedAppointment.payment_status === 'nao_pago' ? 'Motivo' : 'Obs'}: {selectedAppointment.payment_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendWhatsApp(selectedAppointment.clients.celular, selectedAppointment)}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white border-green-500"
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

              {paymentStatus !== 'aguardando' && paymentStatus !== 'nao_pago' && (
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

              {paymentStatus !== 'aguardando' && (
                <div>
                  <label className="text-sm font-medium">
                    Observações {paymentStatus === 'nao_pago' ? '*' : '(opcional)'}
                  </label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder={
                      paymentStatus === 'nao_pago'
                        ? 'Descreva o motivo do não pagamento...'
                        : 'Observações sobre o pagamento...'
                    }
                    className="mt-2"
                  />
                </div>
              )}

              {/* Seção de Retorno */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="hasReturnHistory"
                    checked={hasReturn}
                    onCheckedChange={(checked) => setHasReturn(checked as boolean)}
                  />
                  <label
                    htmlFor="hasReturnHistory"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tem retorno?
                  </label>
                </div>

                {hasReturn && (
                  <div className="space-y-3 pl-6 border-l-2">
                    <div>
                      <label className="text-sm font-medium">Data do Retorno</label>
                      <Input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Horário do Retorno</label>
                      <Input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                  disabled={paymentStatus === 'nao_pago' && paymentNotes.trim().length === 0}
                >
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de seleção de profissional para confirmação */}
      <Dialog open={!!confirmingAppointment} onOpenChange={() => setConfirmingAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
          </DialogHeader>
          
          {confirmingAppointment && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Cliente:</strong> {confirmingAppointment.clients.nome} {confirmingAppointment.clients.sobrenome}</p>
                <p><strong>Procedimento:</strong> {confirmingAppointment.procedures.name}</p>
                <p><strong>Data:</strong> {format(parseISO(confirmingAppointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {confirmingAppointment.appointment_time}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Selecione o Profissional *</label>
                <Select
                  value={selectedProfessional}
                  onValueChange={setSelectedProfessional}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Escolha um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmingAppointment(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAppointmentWithProfessional}
                  disabled={!selectedProfessional}
                  className="flex-1"
                >
                  Confirmar Agendamento
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


