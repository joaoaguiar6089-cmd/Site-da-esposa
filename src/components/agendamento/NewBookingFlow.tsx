import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CheckCircle, Calendar as CalendarIcon, MessageCircle, Sparkles, Loader2, MapPin, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDateBrazil } from '@/utils/dateUtils';
import type { Client } from "@/types/client";
import ProcedureSpecificationSelector, { ProcedureSpecification } from "./ProcedureSpecificationSelector";
import LoginPhone from "./LoginPhone";
import CadastroCliente from "./CadastroCliente";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  requires_specifications?: boolean;
  body_image_url?: string;
  body_image_url_male?: string;
  body_selection_type?: string;
}

interface BookingData {
  procedure_id: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  city_id: string;
  specifications?: ProcedureSpecification[];
}

interface NewBookingFlowProps {
  onBack: () => void;
  onSuccess: () => void;
  preSelectedProcedureId?: string;
  adminMode?: boolean;
  initialClient?: Client | null;
  sendNotification?: boolean;
  selectedDate?: Date;
  allowPastDates?: boolean;
}

type ViewMode = 'form' | 'phone' | 'cadastro' | 'confirmation';

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const NewBookingFlow = ({ 
  onBack, 
  onSuccess, 
  preSelectedProcedureId,
  adminMode = false,
  initialClient = null,
  sendNotification = true,
  selectedDate,
  allowPastDates = false
}: NewBookingFlowProps) => {
  const [currentView, setCurrentView] = useState<ViewMode>('form');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [cities, setCities] = useState<{
    id: string,
    city_name: string,
    clinic_name?: string | null,
    address?: string | null,
    map_url?: string | null
  }[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: preSelectedProcedureId || "",
    appointment_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : "",
    appointment_time: "",
    notes: "",
    city_id: "",
  });
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProcedureSpecification[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<Array<{
    id: string;
    procedure: Procedure | null;
    specifications?: ProcedureSpecification[];
    specificationsTotal?: number; // Preço total das especificações (com desconto)
  }>>([{ id: 'proc-1', procedure: null, specifications: [], specificationsTotal: 0 }]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [showSpecifications, setShowSpecifications] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadSiteSettings();
    // Só definir cliente inicial se estiver em modo admin
    if (adminMode && initialClient) {
      setSelectedClient(initialClient);
    }
  }, [adminMode, initialClient]);

  useEffect(() => {
    if (formData.city_id) {
      loadCityAvailability();
    }
  }, [formData.city_id]);

  useEffect(() => {
    if (formData.appointment_date && formData.city_id) {
      loadAvailableTimes(formData.appointment_date);
    }
  }, [formData.appointment_date, formData.city_id]);

  // Sincronizar formData.procedure_id com o primeiro procedimento
  useEffect(() => {
    if (selectedProcedures.length > 0 && selectedProcedures[0].procedure) {
      setFormData(prev => ({ ...prev, procedure_id: selectedProcedures[0].procedure!.id }));
    }
  }, [selectedProcedures]);

  const loadSiteSettings = async () => {
    try {
      const { data: logoData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_logo_url')
        .maybeSingle();
      
      if (logoData?.setting_value) {
        setLogoUrl(logoData.setting_value);
      }

      const { data: whatsappData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'social_media_whatsapp_public')
        .maybeSingle();
      
      if (whatsappData?.setting_value) {
        setWhatsappNumber(whatsappData.setting_value);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadCityAvailability = async () => {
    if (!formData.city_id) return;

    try {
      // Novo sistema flexível: não bloqueamos mais datas
      // Apenas limpamos as restrições e permitimos todos os dias
      setAvailableDates(new Set());
      setUnavailableDates(new Set());
      
      // Nota: O sistema de avisos será implementado na função de seleção de data
      // quando o usuário selecionar uma data onde a Dra. está em outra cidade
    } catch (error) {
      console.error('Erro ao carregar disponibilidade da cidade:', error);
    }
  };

  const checkDateAvailability = async (date: string, cityId: string) => {
    try {
      // Verificar se a doutora estará disponível na cidade selecionada
      const { data: cityAvailability, error: availabilityError } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', cityId)
        .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`);

      if (availabilityError) {
        console.error('Erro ao verificar disponibilidade:', availabilityError);
        setAvailabilityWarning('');
        return;
      }

      if (!cityAvailability || cityAvailability.length === 0) {
        // Verificar se ela estará em outra cidade
        const { data: otherCityAvailability, error: otherError } = await supabase
          .from('city_availability')
          .select(`
            *,
            city_settings (
              city_name
            )
          `)
          .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`)
          .neq('city_id', cityId);

        if (otherError) {
          console.error('Erro ao verificar outras cidades:', otherError);
          setAvailabilityWarning('A Dra. Karoline não estará disponível nesta data.');
          return;
        }

        if (otherCityAvailability && otherCityAvailability.length > 0) {
          const otherCity = otherCityAvailability[0];
          const cityName = (otherCity.city_settings as any)?.city_name || 'outra cidade';
          
          // Buscar mensagem configurável
          const { data: messageSetting } = await supabase
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'availability_message')
            .single();

          const defaultMessage = 'A Dra. Karoline estará em {cidade} nesta data.';
          const messageTemplate = messageSetting?.setting_value || defaultMessage;
          const finalMessage = messageTemplate.replace('{cidade}', cityName);
          
          setAvailabilityWarning(finalMessage);
        } else {
          setAvailabilityWarning('A Dra. Karoline não estará disponível nesta data.');
        }
      } else {
        setAvailabilityWarning('');
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade da data:', error);
      setAvailabilityWarning('');
    }
  };

  const loadData = async () => {
    try {
      // Carregar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('*')
        .order('name');

      if (proceduresError) throw proceduresError;
      setProcedures(proceduresData || []);

      // Carregar cidades ativas
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (citiesError) throw citiesError;
      setCities(citiesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingProcedures(false);
    }
  };

  const loadAvailableTimes = async (selectedDate: string) => {
    if (!formData.city_id || !selectedDate) return;
    
    setLoadingTimes(true);
    
    try {
      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const procedureDuration = selectedProcedure?.duration || 60;

      const { data: cityAvailability } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', formData.city_id)
        .lte('date_start', selectedDate)
        .or(`date_end.gte.${selectedDate},date_end.is.null`);

      if (!cityAvailability || cityAvailability.length === 0) {
        setAvailableTimes([]);
        return;
      }

      const { data: scheduleSettings } = await supabase
        .from('schedule_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!scheduleSettings) {
        setAvailableTimes([]);
        return;
      }

      const { data: scheduleExceptions } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .lte('date_start', selectedDate)
        .or(`date_end.gte.${selectedDate},date_end.is.null`);

      const exception = scheduleExceptions?.find(ex => {
        const start = new Date(ex.date_start);
        const end = ex.date_end ? new Date(ex.date_end) : start;
        const current = new Date(selectedDate);
        return current >= start && current <= end;
      });

      if (exception?.is_closed) {
        setAvailableTimes([]);
        return;
      }

      const startTime = exception?.custom_start_time || scheduleSettings.start_time;
      const endTime = exception?.custom_end_time || scheduleSettings.end_time;
      const intervalMinutes = exception?.custom_interval_minutes || scheduleSettings.interval_minutes;

      const timeSlots: string[] = [];
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(timeString);
      }

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_time, procedures(duration)')
        .eq('appointment_date', selectedDate)
        .neq('status', 'cancelado');

      const occupiedSlots = new Set<string>();
      appointments?.forEach(apt => {
        const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
        const aptStartMinutes = aptHour * 60 + aptMinute;
        const aptDuration = apt.procedures?.duration || 60;
        
        for (let i = 0; i < aptDuration; i += intervalMinutes) {
          const blockedMinutes = aptStartMinutes + i;
          const blockedHour = Math.floor(blockedMinutes / 60);
          const blockedMinute = blockedMinutes % 60;
          const blockedTime = `${blockedHour.toString().padStart(2, '0')}:${blockedMinute.toString().padStart(2, '0')}`;
          occupiedSlots.add(blockedTime);
        }
      });

      const now = new Date();
      const currentDateStr = format(now, 'yyyy-MM-dd');
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      const available = timeSlots.filter(time => {
        if (occupiedSlots.has(time)) return false;
        
        const [hour, minute] = time.split(':').map(Number);
        const timeMinutes = hour * 60 + minute;
        const endTimeMinutes = timeMinutes + procedureDuration;
        
        if (endTimeMinutes > endMinutes) return false;
        
        if (selectedDate === currentDateStr && timeMinutes <= currentTimeMinutes) {
          return false;
        }

        for (let i = 0; i < procedureDuration; i += intervalMinutes) {
          const checkMinutes = timeMinutes + i;
          const checkHour = Math.floor(checkMinutes / 60);
          const checkMinute = checkMinutes % 60;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
          if (occupiedSlots.has(checkTime)) return false;
        }
        
        return true;
      });

      setAvailableTimes(available);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleClientFound = (client: Client) => {
    setSelectedClient(client);
    setLoading(true);
    createAppointment(client);
  };

  const handleClientNotFound = (phone: string) => {
    setPendingPhone(phone);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    setLoading(true);
    createAppointment(client);
  };

  const createAppointment = async (client: Client) => {
    setLoading(true);
    
    try {
      const procedure = procedures.find(p => p.id === formData.procedure_id);
      const city = cities.find(c => c.id === formData.city_id);
      
      const appointmentData = {
        client_id: client.id,
        procedure_id: formData.procedure_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes,
        status: 'agendado',
        city_id: formData.city_id,
        total_body_areas_price: selectedSpecifications.reduce((sum, spec) => sum + spec.price, 0)
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      if (selectedSpecifications.length > 0) {
        const specificationsData = selectedSpecifications.map(spec => ({
          appointment_id: appointment.id,
          specification_id: spec.id,
          specification_name: spec.name,
          specification_price: spec.price
        }));

        const { error: specsError } = await supabase
          .from('appointment_specifications')
          .insert(specificationsData);

        if (specsError) throw specsError;
      }

      setAppointmentDetails(appointment);
      
      // Enviar evento para Meta Pixel
      try {
        await supabase.functions.invoke('send-meta-event', {
          body: {
            event_name: 'Lead',
            event_data: {
              content_name: procedure?.name || 'Procedimento',
              content_category: 'Agendamento',
              value: procedure?.price || 0,
              currency: 'BRL',
              source_url: window.location.href,
            },
            user_data: {
              ph: client.celular, // phone
              fn: client.nome, // first name
              ct: city?.city_name || '', // city
            }
          }
        });
      } catch (metaError) {
        console.error('Erro ao enviar evento Meta:', metaError);
      }
      
      // Enviar notificações
      try {
        await sendWhatsAppNotification(client, appointment, procedure, city);
        await sendOwnerNotification(client, appointment, procedure, city);
        await sendAdminNotification(client, appointment, procedure, city);
      } catch (notificationError) {
        console.error('Erro ao enviar notificações:', notificationError);
      }

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso. Uma confirmação será enviada via WhatsApp.",
      });

      setCurrentView('confirmation');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any, 
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      console.log('=== INÍCIO WHATSAPP NOTIFICATION ===');
      console.log('Client:', client);
      console.log('Appointment:', appointment);
      console.log('Procedure:', procedure);
      console.log('City:', city);

      const notes = appointment.notes ? `\n📝 Observações: ${appointment.notes}` : '';
      console.log('Notes formatadas:', notes);

      // Buscar dados da cidade
      console.log('Buscando dados da cidade com ID:', appointment.city_id);
      const { data: cityData, error: cityError } = await supabase
        .from('city_settings')
        .select('city_name, map_url')
        .eq('id', appointment.city_id)
        .single();

      console.log('City data:', cityData);
      console.log('City error:', cityError);

      // Formatação simples do local da clínica usando dados disponíveis
      const cityName = cityData?.city_name || city?.city_name || '';
      const clinicLocation = `📍 Clínica Dra. Karoline Ferreira — ${cityName}`;
      
      console.log('Clinic location formatada:', clinicLocation);

      // Buscar template do banco de dados
      console.log('Buscando template do banco...');
      const { data: templateData, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('template_content')
        .eq('template_type', 'agendamento_cliente')
        .single();

      console.log('Template encontrado:', templateData);
      console.log('Template error:', templateError);

      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      // Preparar variáveis para substituição
      const variables = {
        clientName: client.nome,
        appointmentDate: format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR }),
        appointmentTime: appointment.appointment_time,
        procedureName: procedureName,
        notes: notes,
        clinicLocation: clinicLocation,
        cityName: cityName,
        clinicName: 'Clínica Dra. Karoline Ferreira',
        clinicMapUrl: cityData?.map_url || '',
        specifications: appointment.specifications || ''
      };

      console.log('Variáveis preparadas:', variables);

      // Processar template ou usar fallback
      let message = templateData?.template_content || `🩺 *Agendamento Confirmado*

Olá {clientName}!

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}{notes}

{clinicLocation}

✨ Aguardamos você!`;

      console.log('Template inicial:', message);

      // Substituir todas as variáveis
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        const oldMessage = message;
        message = message.replace(regex, value || '');
        if (oldMessage !== message) {
          console.log(`Substituiu {${key}} por:`, value);
        }
      });

      console.log('Mensagem final processada:', message);

      // Enviar WhatsApp
      console.log('Enviando WhatsApp para:', client.celular);
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: client.celular,
          message
        }
      });

      if (sendError) {
        console.error('Erro ao enviar WhatsApp:', sendError);
      } else {
        console.log('WhatsApp enviado com sucesso');
      }

      console.log('=== FIM WHATSAPP NOTIFICATION ===');

    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
    }
  };

  const sendOwnerNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any,
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      const totalDuration = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0)
        : undefined;

      await supabase.functions.invoke('notify-owner', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedureName,
          cityName: city?.city_name || '',
          notes: appointment.notes || '',
          hasMultipleProcedures: hasMultipleProcedures,
          totalDuration: totalDuration
        }
      });
    } catch (error) {
      console.error('Erro ao notificar proprietária:', error);
    }
  };

  const sendAdminNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any,
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      const totalDuration = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0)
        : undefined;

      await supabase.functions.invoke('notify-admins', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedureName,
          cityName: city?.city_name || '',
          notes: appointment.notes || '',
          hasMultipleProcedures: hasMultipleProcedures,
          totalDuration: totalDuration
        }
      });
    } catch (error) {
      console.error('Erro ao notificar admins:', error);
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedClient) return;

    try {
      setLoading(true);

      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const selectedCity = cities.find(c => c.id === formData.city_id);

      // Filtrar apenas procedimentos válidos
      const proceduresToSave = selectedProcedures.filter(sp => sp.procedure !== null);
      const hasMultipleProcedures = proceduresToSave.length > 1;

      // Calcular duração total
      const totalDuration = proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0);

      // Criar agendamento
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: selectedClient.id,
          procedure_id: formData.procedure_id,
          professional_id: null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          notes: formData.notes.trim() || null,
          status: 'agendado',
          city_id: formData.city_id || null,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Salvar procedimentos na tabela appointments_procedures
      const proceduresData = proceduresToSave.map((sp, index) => ({
        appointment_id: appointment.id,
        procedure_id: sp.procedure!.id,
        order_index: index
      }));

      const { error: proceduresError } = await (supabase as any)
        .from('appointments_procedures')
        .insert(proceduresData);

      if (proceduresError) {
        console.error('Erro ao salvar procedimentos:', proceduresError);
        throw proceduresError;
      }

      console.log(`${proceduresData.length} procedimento(s) salvo(s) para o agendamento ${appointment.id}`);

      // Salvar especificações de cada procedimento se houver
      const allSpecifications: any[] = [];
      proceduresToSave.forEach(sp => {
        if (sp.specifications && sp.specifications.length > 0) {
          sp.specifications.forEach(spec => {
            allSpecifications.push({
              appointment_id: appointment.id,
              specification_id: spec.id,
              specification_name: spec.name,
              specification_price: spec.price || 0
            });
          });
        }
      });

      if (allSpecifications.length > 0) {
        const { error: specificationsError } = await supabase
          .from('appointment_specifications')
          .insert(allSpecifications);

        if (specificationsError) throw specificationsError;
      }

      // Notificar se necessário
      if (sendNotification) {
        await sendWhatsAppNotification(selectedClient, appointment, selectedProcedure, selectedCity, hasMultipleProcedures, proceduresToSave);
        await sendOwnerNotification(selectedClient, appointment, selectedProcedure, selectedCity, hasMultipleProcedures, proceduresToSave);
        await sendAdminNotification(selectedClient, appointment, selectedProcedure, selectedCity, hasMultipleProcedures, proceduresToSave);
      }

      setAppointmentDetails(appointment);
      setCurrentView('confirmation');
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se há pelo menos um procedimento selecionado
    const validProcedures = selectedProcedures.filter(sp => sp.procedure !== null);
    if (validProcedures.length === 0) {
      toast({
        title: "Procedimento obrigatório",
        description: "Selecione pelo menos um procedimento.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.appointment_date || !formData.appointment_time || !formData.city_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios (cidade, data e horário).",
        variant: "destructive",
      });
      return;
    }

    // Validar especificações obrigatórias
    for (const sp of validProcedures) {
      if (sp.procedure?.requires_specifications && (!sp.specifications || sp.specifications.length === 0)) {
        toast({
          title: "Especificação obrigatória",
          description: `Por favor, selecione especificações para ${sp.procedure.name}.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (adminMode && selectedClient) {
      // No admin mode, bypass phone validation and go straight to booking
      handleBookingSubmit();
    } else {
      // Fluxo normal do cliente: ir para verificação de telefone
      setCurrentView('phone');
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'phone':
        return (
          <LoginPhone
            onClientFound={handleClientFound}
            onClientNotFound={handleClientNotFound}
            onBack={() => setCurrentView('form')}
          />
        );
      
      case 'cadastro':
        return (
          <CadastroCliente
            phone={pendingPhone}
            onClientRegistered={handleClientRegistered}
            onBack={() => setCurrentView('phone')}
          />
        );
      
      case 'confirmation':
        const validProceduresForDisplay = selectedProcedures.filter(sp => sp.procedure !== null);
        const procedureName = validProceduresForDisplay.length > 1
          ? validProceduresForDisplay.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join(', ')
          : validProceduresForDisplay[0]?.procedure?.name || '';
        const cityName = cities.find(c => c.id === formData.city_id)?.city_name || '';
        
        return (
          <Card className="w-full max-w-2xl mx-auto shadow-2xl border-0 bg-gradient-to-br from-card via-card to-card/80">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                Agendamento Confirmado!
              </CardTitle>
              <p className="text-muted-foreground text-lg mt-2">
                Seu agendamento foi realizado com sucesso.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg text-muted-foreground">Processando agendamento...</p>
                </div>
              )}
              {!loading && appointmentDetails && (
                <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl space-y-3 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Procedimento</p>
                      <p className="font-semibold text-lg">{procedureName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data e Horário</p>
                      <p className="font-semibold text-lg">
                        {format(parseISO(appointmentDetails.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {appointmentDetails.appointment_time}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const cityRec = cities.find(c => c.id === appointmentDetails?.city_id);
                    return (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cidade</p>
                          <p className="font-semibold text-lg">{cityRec?.city_name || cityName}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Endereço da clínica conforme cidade do agendamento */}
                  {(() => {
                    const cityRec = cities.find(c => c.id === appointmentDetails?.city_id);
                    const clinicName = cityRec?.clinic_name;
                    const address = cityRec?.address;
                    const mapUrl = cityRec?.map_url;
                    if (!address && !clinicName) return null;
                    return (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Unidade</p>
                          <p className="font-semibold">{clinicName ? `${clinicName} - ${cityRec?.city_name || cityName}` : cityRec?.city_name || cityName}</p>
                          {address && (
                            <p className="text-sm text-foreground mt-1">
                              {address}
                              {mapUrl ? (
                                <>
                                  {" • "}
                                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver no mapa</a>
                                </>
                              ) : null}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {appointmentDetails.total_body_areas_price > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-2xl text-primary">{currency(appointmentDetails.total_body_areas_price)}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {adminMode ? (
                  <Button
                    onClick={onSuccess}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Voltar para o Calendário
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => window.location.href = '/area-cliente'}
                      variant="outline"
                      className="w-full h-12 text-base font-medium"
                    >
                      Ver Meus Agendamentos
                    </Button>
                    <Button
                      onClick={onSuccess}
                      className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      Concluir
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        if (loadingProcedures) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            </div>
          );
        }

        return (
          <Card className="w-full max-w-4xl mx-auto shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm">
            <CardHeader className="text-center space-y-6 pb-8 bg-gradient-to-br from-primary/5 to-transparent">
              {logoUrl && (
                <div className="flex justify-center">
                  <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg">
                    <CalendarIcon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                    Agendar Consulta
                  </CardTitle>
                </div>
                <p className="text-muted-foreground text-lg">
                  Preencha os dados abaixo para realizar seu agendamento
                </p>
              </div>
              {true && (
                <div className="flex justify-center">
                  <a
                    href={"https://wa.me/5597984387295"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Tire suas dúvidas no WhatsApp
                  </a>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seção de Procedimentos - Formato Vertical */}
                <div className="space-y-6">
                  {selectedProcedures.map((item, index) => (
                    <div key={item.id} className="space-y-4">
                      {/* Dropdown do Procedimento */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Procedimento {selectedProcedures.length > 1 ? `${index + 1}` : ''} <span className="text-destructive">*</span>
                        </label>
                        <Select 
                          value={item.procedure?.id || ""} 
                          onValueChange={(value) => {
                            const procedure = procedures.find(p => p.id === value);
                            const newProcedures = [...selectedProcedures];
                            newProcedures[index] = { 
                              ...item, 
                              procedure: procedure || null, 
                              specifications: [],
                              specificationsTotal: 0
                            };
                            setSelectedProcedures(newProcedures);
                          }}
                        >
                          <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                            <SelectValue placeholder="Selecione um procedimento" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {procedures.map((procedure) => (
                              <SelectItem key={procedure.id} value={procedure.id} className="py-3">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{procedure.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {procedure.duration}min • {currency(procedure.price || 0)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Box de Descrição do Procedimento */}
                      {item.procedure && (
                        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-md flex-shrink-0">
                                <Sparkles className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-xl font-bold text-foreground">{item.procedure.name}</h3>
                                  {index > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newProcedures = selectedProcedures.filter((_, i) => i !== index);
                                        setSelectedProcedures(newProcedures);
                                      }}
                                      className="text-destructive hover:text-destructive flex-shrink-0"
                                      title="Remover procedimento"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                {item.procedure.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] line-clamp-4">
                                    {item.procedure.description}
                                  </p>
                                )}
                                <div className="flex items-center flex-wrap gap-4 pt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                    <span className="text-sm font-medium whitespace-nowrap">Duração:</span>
                                    <span className="text-sm text-muted-foreground">{item.procedure.duration}min</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                    <span className="text-sm font-medium whitespace-nowrap">Valor:</span>
                                    <span className="text-sm text-primary font-bold">{currency(item.procedure.price || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Especificações (se necessário) */}
                      {item.procedure?.requires_specifications && (
                        <div className="space-y-3">
                          <ProcedureSpecificationSelector
                            procedureId={item.procedure.id}
                            onSelectionChange={(data) => {
                              const newProcedures = [...selectedProcedures];
                              newProcedures[index] = { 
                                ...item, 
                                specifications: data.selectedSpecifications,
                                specificationsTotal: data.totalPrice // Salvar o preço total com desconto
                              };
                              setSelectedProcedures(newProcedures);
                            }}
                            initialSelections={item.specifications?.map(s => s.id) || []}
                            bodySelectionType={item.procedure.body_selection_type ?? null}
                            bodyImageUrl={item.procedure.body_image_url ?? null}
                            bodyImageUrlMale={item.procedure.body_image_url_male ?? null}
                          />
                        </div>
                      )}

                      {/* Link/Botão para adicionar mais procedimentos */}
                      {index === selectedProcedures.length - 1 && item.procedure && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProcedures([...selectedProcedures, { 
                              id: `proc-${Date.now()}`, 
                              procedure: null,
                              specifications: [],
                              specificationsTotal: 0
                            }]);
                          }}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar mais um procedimento
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Box de Resumo - Síntese dos Procedimentos */}
                {selectedProcedures.filter(p => p.procedure).length > 0 && (
                  <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Resumo do Agendamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {selectedProcedures.filter(p => p.procedure).map((item, index) => {
                          // Se tem especificações, usar APENAS o preço das especificações (com desconto)
                          // Se não tem, usar o preço base do procedimento
                          const hasSpecifications = item.specifications && item.specifications.length > 0;
                          const totalPrice = hasSpecifications 
                            ? (item.specificationsTotal || 0)  // Só áreas (com desconto)
                            : (item.procedure!.price || 0);    // Preço base
                          
                          return (
                            <div key={item.id} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
                              <div className="flex-1">
                                <span className="font-medium">{item.procedure!.name}</span>
                                {item.specifications && item.specifications.length > 0 && (
                                  <span className="text-muted-foreground text-sm">
                                    {' '}({item.specifications.map(s => s.name).join(', ')})
                                  </span>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.procedure!.duration}min
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-right">
                                {currency(totalPrice)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Totais */}
                      {selectedProcedures.filter(p => p.procedure).length > 1 && (
                        <div className="pt-3 border-t-2 border-primary/20 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">Duração Total:</span>
                            <span className="font-bold">
                              {selectedProcedures
                                .filter(p => p.procedure)
                                .reduce((sum, p) => sum + (p.procedure?.duration || 0), 0)} minutos
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold">Valor Total:</span>
                            <span className="text-lg font-bold text-primary">
                              {currency(
                                selectedProcedures
                                  .filter(p => p.procedure)
                                  .reduce((sum, p) => {
                                    // Se tem especificações, usar APENAS o preço das áreas
                                    // Se não tem, usar o preço base
                                    const hasSpecifications = p.specifications && p.specifications.length > 0;
                                    const price = hasSpecifications 
                                      ? (p.specificationsTotal || 0)  // Só áreas
                                      : (p.procedure?.price || 0);    // Preço base
                                    return sum + price;
                                  }, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Cidade */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Cidade <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.city_id} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, city_id: value, appointment_date: '' }));
                      setAvailableTimes([]);
                    }}
                  >
                    <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                      <SelectValue placeholder="Selecione uma cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id} className="py-3">
                          <span className="font-medium">{city.city_name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data com Calendário */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Data <span className="text-destructive">*</span>
                  </label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-14 justify-start text-left font-normal border-2 hover:border-primary/50 transition-all duration-200",
                          !formData.appointment_date && "text-muted-foreground"
                        )}
                        disabled={!formData.city_id}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {formData.appointment_date ? (
                          format(parseISO(formData.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          <span>{formData.city_id ? "Selecione uma data" : "Selecione a cidade primeiro"}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.appointment_date ? parseISO(formData.appointment_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const selectedDate = format(date, 'yyyy-MM-dd');
                            setFormData(prev => ({ ...prev, appointment_date: selectedDate }));
                            
                            // Verificar disponibilidade para mostrar aviso
                            if (formData.city_id) {
                              checkDateAvailability(selectedDate, formData.city_id);
                            }
                            
                            setCalendarOpen(false);
                          }
                        }}
                        disabled={(date) => {
                          // Se allowPastDates for true, não desabilitar nenhuma data
                          if (allowPastDates) return false;
                          
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Apenas desabilitar datas passadas
                          return date < today;
                        }}
                        locale={ptBR}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Aviso de disponibilidade */}
                  {availabilityWarning && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        ⚠️ {availabilityWarning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Horário */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Horário <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.appointment_time} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
                    disabled={!formData.appointment_date || loadingTimes}
                  >
                    <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                      <SelectValue placeholder={
                        loadingTimes ? "Carregando horários..." : 
                        !formData.appointment_date ? "Selecione a data primeiro" : 
                        availableTimes.length === 0 ? "Sem horários disponíveis" :
                        "Selecione um horário"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimes.map((time) => (
                        <SelectItem key={time} value={time} className="py-3">
                          <span className="font-medium">{time}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Observações (opcional)
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione qualquer observação relevante sobre o agendamento..."
                    className="min-h-[100px] border-2 hover:border-primary/50 transition-all duration-200"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={onBack}
                    variant="outline"
                    className="flex-1 h-12 text-base"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold"
                  >
                    {loading ? (<span className='inline-flex items-center gap-2'><Loader2 className='h-4 w-4 animate-spin' /> Processando...</span>) : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      {renderCurrentView()}
    </div>
  );
};

export default NewBookingFlow;
