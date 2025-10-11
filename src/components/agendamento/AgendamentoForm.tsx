import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, Check, ChevronsUpDown, X } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDateToBrazil, getCurrentDateBrazil, getCurrentDateTimeBrazil } from '@/utils/dateUtils';
import { sanitizeSupabaseData } from "@/utils/textEncoding";
import type { Client } from "@/types/client";
import ProcedureSpecificationSelector, { ProcedureSpecification } from "./ProcedureSpecificationSelector";
import { useDiscountCalculation } from "@/hooks/useDiscountCalculation";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  category_id: string;
}

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  requires_body_selection: boolean;
  requires_specifications: boolean;
  body_selection_type: string;
  body_image_url: string;
  body_image_url_male: string;
  category_id?: string;
  subcategory_id?: string;
  sessions?: number;
}

interface AreaGroup {
  id: string;
  name: string;
  price: number;
  shapes: AreaShape[];
}

interface AreaShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AgendamentoFormProps {
  client: Client;
  onAppointmentCreated: () => void;
  onBack: () => void;
  editingId?: string;
  preSelectedProcedureId?: string;
  selectedDate?: Date;
  adminMode?: boolean;
  sendNotification?: boolean;
}

const AgendamentoForm = ({ client: rawClient, onAppointmentCreated, onBack, editingId, preSelectedProcedureId, selectedDate, adminMode = false, sendNotification = true }: AgendamentoFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [formData, setFormData] = useState({
    procedure_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    city_id: "",
  });
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<AreaGroup[]>([]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [totalBodyAreasPrice, setTotalBodyAreasPrice] = useState(0);
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProcedureSpecification[]>([]);
  const [totalSpecificationsPrice, setTotalSpecificationsPrice] = useState(0);
  const [discountInfo, setDiscountInfo] = useState({
    originalTotal: 0,
    discountAmount: 0,
    finalTotal: 0,
    discountPercentage: 0,
  });
  const [cities, setCities] = useState<{id: string, city_name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<any>(null);
  const { toast } = useToast();
  const client = useMemo(() => sanitizeSupabaseData(rawClient), [rawClient]);

  const loadProcedures = async () => {
    try {
      // Carregar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('id, name, description, duration, price, requires_body_selection, requires_specifications, body_selection_type, body_image_url, body_image_url_male, category_id, subcategory_id, sessions')
        .order('name');

      if (proceduresError) throw proceduresError;

      // Carregar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Carregar subcategorias
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) throw subcategoriesError;

      // Carregar cidades
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_settings')
        .select('id, city_name')
        .eq('is_active', true)
        .order('display_order');

      if (citiesError) throw citiesError;

      setProcedures(sanitizeSupabaseData(proceduresData || []));
      setCategories(sanitizeSupabaseData(categoriesData || []));
      setSubcategories(sanitizeSupabaseData(subcategoriesData || []));
      setCities(sanitizeSupabaseData(citiesData || []));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar procedimentos.",
        variant: "destructive",
      });
    } finally {
      setLoadingProcedures(false);
    }
  };

  useEffect(() => {
    loadProcedures();
    
    // Carregar dados se estiver editando
    if (editingId) {
      loadAppointmentData(editingId);
    } else {
      // Pré-preencher data se fornecida (do calendário administrativo)
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, appointment_date: dateString }));
      }
      
      // Pré-selecionar procedimento se fornecido
      if (preSelectedProcedureId) {
        setFormData(prev => ({ ...prev, procedure_id: preSelectedProcedureId }));
      }
    }
  }, [editingId, preSelectedProcedureId, selectedDate]);

  const loadAppointmentData = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          procedures!appointments_procedure_id_fkey(name, duration, price, requires_body_selection, body_selection_type),
          appointment_specifications(specification_id, specification_name, specification_price),
          city_settings(city_name, clinic_name, address, map_url)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      const sanitizedData = sanitizeSupabaseData(data);

      setCurrentAppointment(sanitizedData);
      setFormData({
        procedure_id: sanitizedData.procedure_id || "",
        appointment_date: sanitizedData.appointment_date,
        appointment_time: sanitizedData.appointment_time,
        notes: sanitizedData.notes || "",
        city_id: sanitizedData.city_id || "",
      });

      // Carregar especificações selecionadas se existirem
      if (sanitizedData.appointment_specifications && sanitizedData.appointment_specifications.length > 0) {
        const specs: ProcedureSpecification[] = sanitizedData.appointment_specifications.map((spec: any) => ({
          id: spec.specification_id,
          name: spec.specification_name,
          price: spec.specification_price,
          description: null,
          display_order: 0,
          is_active: true,
          has_area_selection: false,
          area_shapes: null,
          gender: 'female'
        }));
        setSelectedSpecifications(specs);
      }

      if (sanitizedData.selected_gender) {
        setSelectedGender(sanitizedData.selected_gender as 'male' | 'female');
      }

      // Carregar horários disponíveis para a data
      loadAvailableTimes(sanitizedData.appointment_date);
    } catch (error) {
      console.error('Erro ao carregar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do agendamento.",
        variant: "destructive",
      });
    }
  };

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [procedureSearchOpen, setProcedureSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');

  const generateTimeOptions = async () => {
    try {
      // Verificar se a data tem exceções configuradas (horários especiais)
      if (formData.appointment_date) {
        const { data: exceptions, error: exceptionsError } = await supabase
          .from('schedule_exceptions')
          .select('*')
          .or(`and(date_start.lte.${formData.appointment_date},date_end.gte.${formData.appointment_date}),and(date_start.eq.${formData.appointment_date},date_end.is.null)`)
          .order('date_start', { ascending: true });

        if (exceptionsError) {
          console.error('Erro ao buscar exceções:', exceptionsError);
        }

        // Se há exceção para essa data
        if (exceptions && exceptions.length > 0) {
          const exception = exceptions[0];
          
          // Se está fechado, ainda retorna horários básicos (permitindo agendamento)
          if (exception.is_closed) {
            const basicTimes: string[] = [];
            for (let hour = 8; hour <= 17; hour++) {
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              basicTimes.push(timeString);
            }
            return basicTimes;
          }
          
          // Se há horários customizados, usar eles
          if (exception.custom_start_time && exception.custom_end_time && exception.custom_interval_minutes) {
            const times = [];
            const [startHour, startMinute] = exception.custom_start_time.split(':').map(Number);
            const [endHour, endMinute] = exception.custom_end_time.split(':').map(Number);
            
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;
            
            for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += exception.custom_interval_minutes) {
              const hour = Math.floor(minutes / 60);
              const minute = minutes % 60;
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              times.push(timeString);
            }
            
            return times;
          }
        }
      }

      // Buscar configurações de horários padrão
      const { data: settings, error } = await supabase
        .from('schedule_settings')
        .select('start_time, end_time, interval_minutes, available_days')
        .eq('is_active', true)
        .single();

      if (error || !settings) {
        console.error('Erro ao buscar configurações de horários:', error);
        // Usar valores padrão se não conseguir buscar
        const times = [];
        for (let hour = 8; hour <= 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            times.push(timeString);
          }
        }
        return times;
      }

      // Verificar se hoje é um dia disponível
      const today = new Date(formData.appointment_date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today];
      
      if (!settings.available_days || !settings.available_days[todayName]) {
        // Dia não está disponível, mas retornamos horários básicos (permitindo agendamento)
        const basicTimes: string[] = [];
        for (let hour = 8; hour <= 17; hour++) {
          const timeString = `${hour.toString().padStart(2, '0')}:00`;
          basicTimes.push(timeString);
        }
        return basicTimes;
      }

      // Gerar horários baseados nas configurações
      const times = [];
      const [startHour, startMinute] = settings.start_time.split(':').map(Number);
      const [endHour, endMinute] = settings.end_time.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += settings.interval_minutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
      
      return times;
    } catch (error) {
      console.error('Erro ao gerar opções de horário:', error);
      // Fallback para horários básicos
      const fallbackTimes: string[] = [];
      for (let hour = 8; hour <= 17; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        fallbackTimes.push(timeString);
      }
      return fallbackTimes;
    }
  };

  const loadAvailableTimes = async (date: string) => {
    if (!date) {
      setAvailableTimes([]);
      return;
    }
    setLoadingTimes(true);
    try {
      const allTimes = await generateTimeOptions();
      
      if (allTimes.length === 0) {
        setAvailableTimes([]);
        return;
      }

      // Buscar agendamentos do dia, excluindo o agendamento atual se estiver editando
      let query = supabase
        .from('appointments')
        .select(`
          appointment_time,
          procedures (
            duration
          )
        `)
        .eq('appointment_date', date)
        .neq('status', 'cancelado');

      // Se estiver editando, excluir o agendamento atual da verificação de conflitos
      if (editingId) {
        query = query.neq('id', editingId);
      }

      const { data: appointments, error } = await query;

      if (error) throw error;

      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const selectedDuration = selectedProcedure?.duration || 60;

      let available = allTimes.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        const timeInMinutes = hour * 60 + minute;
        
        const today = getCurrentDateBrazil();
        if (date === today) {
          const nowBrazil = getCurrentDateTimeBrazil();
          const currentTimeInMinutes = nowBrazil.getHours() * 60 + nowBrazil.getMinutes();
          if (timeInMinutes <= currentTimeInMinutes + 30) {
            return false;
          }
        }
        
        const hasConflict = appointments?.some(apt => {
          const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
          const aptTimeInMinutes = aptHour * 60 + aptMinute;
          const aptDuration = apt.procedures?.duration || 60;
          
          const startsInExisting = timeInMinutes >= aptTimeInMinutes && 
                                   timeInMinutes < (aptTimeInMinutes + aptDuration);
          const endsInExisting = (timeInMinutes + selectedDuration) > aptTimeInMinutes && 
                                 (timeInMinutes + selectedDuration) <= (aptTimeInMinutes + aptDuration);
          const engulfsExisting = timeInMinutes <= aptTimeInMinutes && 
                                  (timeInMinutes + selectedDuration) >= (aptTimeInMinutes + aptDuration);
          return startsInExisting || endsInExisting || engulfsExisting;
        });

        return !hasConflict;
      });

      // Se estiver editando, garantir que o horário atual esteja sempre disponível
      if (editingId && formData.appointment_time && !available.includes(formData.appointment_time)) {
        available.push(formData.appointment_time);
        available.sort();
      }
      
      setAvailableTimes(available);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      const fallbackTimes: string[] = [];
      for (let hour = 8; hour <= 17; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        fallbackTimes.push(timeString);
      }
      setAvailableTimes(fallbackTimes);
    } finally {
      setLoadingTimes(false);
    }
  };

  const isDateDisabled = async (date: string) => {
    try {
      const { data: exceptions, error } = await supabase
        .from('schedule_exceptions')
        .select('is_closed')
        .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`)
        .eq('is_closed', true);

      if (error) {
        console.error('Erro ao verificar data:', error);
        return false;
      }

      return exceptions && exceptions.length > 0;
    } catch (error) {
      console.error('Erro ao verificar data:', error);
      return false;
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
      console.error('Erro ao verificar disponibilidade:', error);
      setAvailabilityWarning('');
    }
  };

  const getMinDate = () => {
    return getCurrentDateBrazil();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.procedure_id || !formData.appointment_date || !formData.appointment_time || !formData.city_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios (procedimento, cidade, data e horário).",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o procedimento requer especificações
    const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
    if (selectedProcedure?.requires_specifications && selectedSpecifications.length === 0) {
      toast({
        title: "Especificação obrigatória",
        description: "Por favor, selecione pelo menos uma especificação para este procedimento.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Verificar conflitos de agendamento primeiro
      const { data: conflictData, error: conflictError } = await supabase
        .rpc('check_appointment_conflict', {
          p_appointment_date: formData.appointment_date,
          p_appointment_time: formData.appointment_time,
          p_professional_id: null,
          p_procedure_id: formData.procedure_id,
          p_appointment_id: editingId || null
        });

      if (conflictError) {
        console.error('Erro ao verificar conflitos:', conflictError);
      } else if (conflictData) {
        toast({
          title: "Conflito de horário",
          description: "Já existe um agendamento neste horário. Escolha outro horário.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let appointmentResult;
      if (editingId) {
        appointmentResult = await supabase
          .from('appointments')
          .update({
            procedure_id: formData.procedure_id,
            professional_id: null,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            notes: formData.notes.trim() || null,
            selected_gender: selectedProcedure?.requires_body_selection ? selectedGender : null,
            total_body_areas_price: totalBodyAreasPrice,
            city_id: formData.city_id || null,
          })
          .eq('id', editingId)
          .select()
          .single();
      } else {
        // Calcular o número da sessão ANTES de criar o agendamento
        let sessionNumber = 1;
        let totalSessions = 1;

        if (selectedProcedure?.sessions && selectedProcedure.sessions > 1) {
          // Buscar agendamentos anteriores deste cliente para este procedimento
          const { data: previousAppointments, error: historyError } = await supabase
            .from('appointments')
            .select('id, session_number, appointment_date')
            .eq('client_id', client.id)
            .eq('procedure_id', formData.procedure_id)
            .neq('status', 'cancelado')
            .order('appointment_date', { ascending: true });

          if (historyError) {
            console.error('Erro ao buscar histórico:', historyError);
          }

          // Calcular qual é a sessão atual (sessões anteriores + 1)
          const previousCount = (previousAppointments || []).length;
          sessionNumber = previousCount + 1;
          totalSessions = selectedProcedure.sessions;
          
          console.log(`Cliente tem ${previousCount} sessões anteriores. Esta será a sessão ${sessionNumber} de ${totalSessions}`);
        }

        // Criar agendamento JÁ com os dados corretos de sessão
        appointmentResult = await supabase
          .from('appointments')
          .insert({
            client_id: client.id,
            procedure_id: formData.procedure_id,
            professional_id: null,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            notes: formData.notes.trim() || null,
            status: 'agendado',
            selected_gender: selectedProcedure?.requires_body_selection ? selectedGender : null,
            total_body_areas_price: totalBodyAreasPrice,
            city_id: formData.city_id || null,
            session_number: sessionNumber,
            total_sessions: totalSessions,
          } as any)
          .select()
          .single();
      }

      if (appointmentResult.error) throw appointmentResult.error;

      const appointmentId = appointmentResult.data.id;

      // Salvar especificações se houver
      if (selectedSpecifications.length > 0) {
        // Deletar especificações anteriores se estiver editando
        if (editingId) {
          await supabase
            .from('appointment_specifications')
            .delete()
            .eq('appointment_id', appointmentId);
        }

        // Inserir novas especificações
        const specificationsData = selectedSpecifications.map(spec => ({
          appointment_id: appointmentId,
          specification_id: spec.id,
          specification_name: spec.name,
          specification_price: spec.price
        }));

        const { error: specsError } = await supabase
          .from('appointment_specifications')
          .insert(specificationsData);

        if (specsError) {
          console.error('Erro ao salvar especificações:', specsError);
          throw specsError;
        }
      }

      // Since we removed body area selections, no need for additional processing
      // Only specifications are now stored in appointment_specifications

      // Enviar notificações e dados para webhook
      try {
        const selectedProc = procedures.find(p => p.id === formData.procedure_id);
        
        // Enviar dados para webhook n8n
        const webhookData = {
          client: {
            id: client.id,
            nome: client.nome,
            sobrenome: client.sobrenome,
            cpf: client.cpf,
            celular: client.celular
          },
          appointment: {
            id: editingId || appointmentId,
            procedure_id: formData.procedure_id,
            procedure_name: selectedProc?.name,
            procedure_price: selectedProc?.price,
            procedure_duration: selectedProc?.duration,
            professional_id: null,
            professional_name: null,
            professional_email: null,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            notes: formData.notes.trim() || null,
            status: 'agendado',
            action: editingId ? 'updated' : 'created',
            created_at: new Date().toISOString(),
            selected_gender: selectedGender,
            selected_body_areas: selectedBodyAreas,
            total_body_areas_price: totalBodyAreasPrice
          }
        };

        // Enviar para webhook n8n
        try {
          await fetch('https://jk2025.app.n8n.cloud/webhook-test/WebhookN8N', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });
        } catch (webhookError) {
          console.error('Erro ao enviar para webhook n8n:', webhookError);
        }
        
        // Enviar notificação WhatsApp para cliente
        if (!adminMode || sendNotification) { // Cliente sempre recebe, admin só se marcar opção
          try {
            console.log(`=== ENVIO WHATSAPP - AgendamentoForm ${editingId ? '(EDIÇÃO)' : '(NOVO)'} ===`);
            
            // Escolher template baseado na ação
            const templateType = editingId ? 'agendamento_atualizado_cliente' : 'agendamento_cliente';
            
            // Buscar template
            const { data: template } = await supabase
              .from('whatsapp_templates')
              .select('template_content')
              .eq('template_type', templateType)
              .single();

            console.log('Template encontrado:', template);

            if (template) {
              // Buscar dados da cidade
              const { data: cityData } = await supabase
                .from('city_settings')
                .select('city_name')
                .eq('id', formData.city_id)
                .single();

              const notes = formData.notes ? `\n📝 Observações: ${formData.notes}` : '';
              const cityName = cityData?.city_name || '';
              const clinicLocation = `📍 Clínica Dra. Karoline Ferreira — ${cityName}`;

              // Preparar variáveis para substituição
              const variables = {
                clientName: client.nome,
                appointmentDate: formatDateToBrazil(formData.appointment_date),
                appointmentTime: formData.appointment_time,
                procedureName: selectedProc?.name || '',
                notes: notes,
                clinicLocation: clinicLocation,
                cityName: cityName,
                clinicName: 'Clínica Dra. Karoline Ferreira',
                specifications: selectedSpecifications.map(spec => spec.name).join(', ') || ''
              };

              console.log('Variáveis preparadas:', variables);

              // Substituir todas as variáveis no template
              let message = template.template_content;
              Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                message = message.replace(regex, value || '');
              });

              console.log('Mensagem final:', message);

              await supabase.functions.invoke('send-whatsapp', {
                body: {
                  to: client.celular,
                  message: message
                }
              });
              
              console.log(`Notificação de ${editingId ? 'alteração' : 'confirmação'} enviada para cliente`);
            } else if (editingId) {
              // Fallback para alteração se não houver template específico
              const { data: fallbackTemplate } = await supabase
                .from('whatsapp_templates')
                .select('template_content')
                .eq('template_type', 'agendamento_cliente')
                .single();

              if (fallbackTemplate) {
                // Buscar dados da cidade
                const { data: cityData } = await supabase
                  .from('city_settings')
                  .select('city_name')
                  .eq('id', formData.city_id)
                  .single();

                const notes = formData.notes ? `\n📝 Observações: ${formData.notes}` : '';
                const cityName = cityData?.city_name || '';
                const clinicLocation = `📍 Clínica Dra. Karoline Ferreira — ${cityName}`;

                // Adicionar cabeçalho de alteração ao template padrão
                let message = `🔄 *Agendamento Alterado*\n\n` + fallbackTemplate.template_content;

                // Preparar variáveis para substituição
                const variables = {
                  clientName: client.nome,
                  appointmentDate: formatDateToBrazil(formData.appointment_date),
                  appointmentTime: formData.appointment_time,
                  procedureName: selectedProc?.name || '',
                  notes: notes,
                  clinicLocation: clinicLocation,
                  cityName: cityName,
                  clinicName: 'Clínica Dra. Karoline Ferreira',
                  specifications: selectedSpecifications.map(spec => spec.name).join(', ') || ''
                };

                // Substituir todas as variáveis no template
                Object.entries(variables).forEach(([key, value]) => {
                  const regex = new RegExp(`\\{${key}\\}`, 'g');
                  message = message.replace(regex, value || '');
                });

                await supabase.functions.invoke('send-whatsapp', {
                  body: {
                    to: client.celular,
                    message: message
                  }
                });
                
                console.log('Notificação de alteração enviada para cliente (usando template padrão)');
              }
            }
          } catch (notificationError) {
            console.error('Erro ao enviar notificação para cliente:', notificationError);
          }
        }


        // Notificar proprietária da clínica via WhatsApp
        try {
          const specificationsText = selectedSpecifications.length > 0 
            ? selectedSpecifications.map(spec => spec.name).join('; ')
            : '';

          const ownerNotifyData = {
            type: editingId ? 'alteracao' : 'agendamento',
            clientName: `${client.nome} ${client.sobrenome}`,
            clientPhone: client.celular,
            appointmentDate: formData.appointment_date,
            appointmentTime: formData.appointment_time,
            procedureName: selectedProc?.name || '',
            professionalName: null,
            notes: formData.notes,
            specifications: specificationsText,
            cityId: formData.city_id || null,
            cityName: cities.find(city => city.id === formData.city_id)?.city_name || ''
          };
          
          console.log('Dados completos sendo enviados para notify-owner:', ownerNotifyData);
          
          const ownerNotifyResult = await supabase.functions.invoke('notify-owner', {
            body: ownerNotifyData
          });

          console.log('Resultado da notificação para proprietária:', ownerNotifyResult);

          console.log('Dados sendo enviados para notify-admins:', {
            appointmentDate: formData.appointment_date,
            appointmentTime: formData.appointment_time,
            clientName: `${client.nome} ${client.sobrenome}`
          });

          const emailNotifyResult = await supabase.functions.invoke('notify-admins', {
            body: {
              type: editingId ? 'alteracao' : 'agendamento',
              clientName: `${client.nome} ${client.sobrenome}`,
              clientPhone: client.celular,
              appointmentDate: formData.appointment_date,
              appointmentTime: formData.appointment_time,
              procedureName: selectedProc?.name || '',
              professionalName: null
            }
          });

          console.log('Resultado da notificação para admins:', emailNotifyResult);
        } catch (ownerNotificationError) {
          console.error('Erro ao notificar proprietária:', ownerNotificationError);
        }
      } catch (notificationError) {
        console.error('Erro ao enviar notificações:', notificationError);
        // Não falha o agendamento se as notificações não funcionarem
      }

      toast({
        title: editingId ? "Agendamento atualizado!" : "Agendamento realizado!",
        description: editingId ? "Seu agendamento foi atualizado com sucesso." : "Seu agendamento foi criado com sucesso. Uma confirmação será enviada via WhatsApp.",
      });

      console.log('Agendamento criado com sucesso, chamando onAppointmentCreated...');
      
      // Garantir que o callback seja executado após um pequeno delay para permitir que o toast apareça
      setTimeout(() => {
        console.log('Executando onAppointmentCreated...');
        onAppointmentCreated();
      }, 100);
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

  const handleCancelAppointment = async () => {
    if (!editingId || !currentAppointment) return;
    
    setCancelling(true);
    
    try {
      // Cancelar o agendamento
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', editingId);

      if (error) throw error;

      // Se o status anterior era "confirmado", notificar a proprietária e o cliente
      if (currentAppointment.status === 'confirmado') {
        try {
          const cancelNotifyData = {
            type: 'cancelamento',
            clientName: `${client.nome} ${client.sobrenome}`,
            clientPhone: client.celular,
            appointmentDate: currentAppointment.appointment_date,
            appointmentTime: currentAppointment.appointment_time,
            procedureName: currentAppointment.procedures?.name || '',
            professionalName: null,
            notes: currentAppointment.notes || '',
            specifications: currentAppointment.appointment_specifications
              ? currentAppointment.appointment_specifications
                  .map(spec => spec.specification_name)
                  .join(', ')
              : '',
            cityId: currentAppointment.city_id || null,
            cityName: cities.find(city => city.id === currentAppointment.city_id)?.city_name || ''
          };

          await supabase.functions.invoke('notify-owner', {
            body: cancelNotifyData
          });
        } catch (notificationError) {
          console.error('Erro ao notificar proprietária sobre cancelamento:', notificationError);
        }

        // Notificar o cliente via WhatsApp
        try {
          const clientMessage = `❌ *Agendamento Cancelado*

Olá ${client.nome}!

Seu agendamento foi cancelado:

📅 Data: ${formatDateToBrazil(currentAppointment.appointment_date)}
⏰ Horário: ${currentAppointment.appointment_time}
💉 Procedimento: ${currentAppointment.procedures?.name || ''}

📍 Clínica Dra. Karoline Ferreira
Tefé-AM

Para reagendar, entre em contato conosco.`;

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: client.celular,
              message: clientMessage
            }
          });
        } catch (clientNotificationError) {
          console.error('Erro ao notificar cliente sobre cancelamento:', clientNotificationError);
        }
      }

      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso.",
      });

      onAppointmentCreated();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);

  if (loadingProcedures) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">Carregando procedimentos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-full">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {editingId ? "Editar Agendamento" : "Novo Agendamento"}
              </CardTitle>
            </div>
            {/* Botão de dúvidas no WhatsApp */}
            {!adminMode && (
              <>
                <div className="absolute right-6 top-6 hidden sm:block">
                  <a
                    href="https://wa.me/5597984387295"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Tirar dúvida no WhatsApp
                  </a>
                </div>
                <a
                  href="https://wa.me/5597984387295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:hidden fixed right-4 bottom-4 inline-flex items-center gap-2 rounded-full shadow-lg border bg-white px-4 py-3 text-sm z-40"
                >
                  <MessageCircle className="h-4 w-4" />
                  Dúvidas
                </a>
              </>
            )}
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {client.nome} {client.sobrenome}
              </p>
              <p className="text-sm text-muted-foreground">
                {client.celular}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">{/* rest of form content */}
              <div className="space-y-2">
                <label htmlFor="procedure" className="text-sm font-semibold text-foreground">
                  Procedimento <span className="text-destructive">*</span>
                </label>
                <Popover open={procedureSearchOpen} onOpenChange={setProcedureSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={procedureSearchOpen}
                      className="w-full justify-between h-auto min-h-[3rem] border-2 hover:border-primary/50 transition-all duration-200"
                    >
                      {formData.procedure_id ? (
                        <div className="text-left space-y-1">
                          <div className="font-semibold text-foreground">
                            {procedures.find(p => p.id === formData.procedure_id)?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {procedures.find(p => p.id === formData.procedure_id)?.duration}min - R$ {procedures.find(p => p.id === formData.procedure_id)?.price?.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Selecione um procedimento...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
              <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput 
                    placeholder="Buscar procedimento..." 
                    className="h-9"
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum procedimento encontrado.</CommandEmpty>
                    
                    {/* Se há texto de busca, mostrar todos os procedimentos filtrados */}
                    {searchQuery.trim() ? (
                      <CommandGroup heading="Procedimentos">
                        {procedures
                          .filter(procedure => 
                            procedure.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (procedure.description && procedure.description.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map((procedure) => (
                            <CommandItem
                              key={procedure.id}
                              value={procedure.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, procedure_id: procedure.id, appointment_time: "" }));
                                setProcedureSearchOpen(false);
                                setSelectedCategoryId('');
                                setSelectedSubcategoryId('');
                                setSearchQuery('');
                                
                                // Resetar seleções de áreas corporais se mudar o procedimento
                                setSelectedBodyAreas([]);
                                setTotalBodyAreasPrice(0);
                                
                                // Recarregar horários se uma data já estiver selecionada
                                if (formData.appointment_date) {
                                  loadAvailableTimes(formData.appointment_date);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                  <span className="font-medium">{procedure.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {procedure.duration}min - R$ {procedure.price?.toFixed(2)}
                                  </span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-2 h-4 w-4",
                                    formData.procedure_id === procedure.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    ) : (
                      <>
                        {/* Se nenhuma categoria selecionada, mostrar categorias */}
                        {!selectedCategoryId && categories.map((category) => (
                          <CommandGroup key={category.id} heading={`📁 ${category.name}`}>
                            <CommandItem
                              value={category.name}
                              onSelect={() => {
                                setSelectedCategoryId(category.id);
                                setSelectedSubcategoryId('');
                              }}
                            >
                              <div className="flex flex-col w-full">
                                <span className="font-medium">{category.name}</span>
                                {category.description && (
                                  <span className="text-xs text-muted-foreground">{category.description}</span>
                                )}
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        ))}
                        
                        {/* Se categoria selecionada mas não subcategoria, mostrar subcategorias */}
                        {selectedCategoryId && !selectedSubcategoryId && (
                          <>
                            <CommandGroup heading="← Voltar">
                              <CommandItem
                                value="voltar-categoria"
                                onSelect={() => {
                                  setSelectedCategoryId('');
                                  setSelectedSubcategoryId('');
                                }}
                              >
                                <span>← Voltar às categorias</span>
                              </CommandItem>
                            </CommandGroup>
                            
                            {subcategories
                              .filter(sub => sub.category_id === selectedCategoryId)
                              .map((subcategory) => (
                                <CommandGroup key={subcategory.id} heading={`📂 ${subcategory.name}`}>
                                  <CommandItem
                                    value={subcategory.name}
                                    onSelect={() => {
                                      setSelectedSubcategoryId(subcategory.id);
                                    }}
                                  >
                                    <div className="flex flex-col w-full">
                                      <span className="font-medium">{subcategory.name}</span>
                                      {subcategory.description && (
                                        <span className="text-xs text-muted-foreground">{subcategory.description}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                </CommandGroup>
                              ))}
                          </>
                        )}
                        
                        {/* Se subcategoria selecionada, mostrar procedimentos */}
                        {selectedSubcategoryId && (
                          <>
                            <CommandGroup heading="← Voltar">
                              <CommandItem
                                value="voltar-subcategoria"
                                onSelect={() => {
                                  setSelectedSubcategoryId('');
                                }}
                              >
                                <span>← Voltar às subcategorias</span>
                              </CommandItem>
                            </CommandGroup>
                            
                            <CommandGroup heading="Procedimentos">
                              {procedures
                                .filter(proc => proc.subcategory_id === selectedSubcategoryId)
                                .map((procedure) => (
                                  <CommandItem
                                    key={procedure.id}
                                    value={procedure.name}
                                    onSelect={() => {
                                      setFormData(prev => ({ ...prev, procedure_id: procedure.id, appointment_time: "" }));
                                      setProcedureSearchOpen(false);
                                      setSelectedCategoryId('');
                                      setSelectedSubcategoryId('');
                                      setSearchQuery('');
                                      
                                      // Resetar seleções de áreas corporais se mudar o procedimento
                                      setSelectedBodyAreas([]);
                                      setTotalBodyAreasPrice(0);
                                      
                                      // Recarregar horários se uma data já estiver selecionada
                                      if (formData.appointment_date) {
                                        loadAvailableTimes(formData.appointment_date);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{procedure.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {procedure.duration}min - R$ {procedure.price?.toFixed(2)}
                                        </span>
                                      </div>
                                      <Check
                                        className={cn(
                                          "ml-2 h-4 w-4",
                                          formData.procedure_id === procedure.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {/* Removida a descrição que aparecia abaixo do dropdown */}
          </div>

          {/* Seleção de Cidade */}
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-semibold text-foreground">
              Cidade de Atendimento <span className="text-destructive">*</span>
            </label>
            <Select
              value={formData.city_id}
              onValueChange={async (value) => {
                const currentDate = formData.appointment_date;
                setFormData({...formData, city_id: value, appointment_date: "", appointment_time: ""});
                setAvailableTimes([]);
                setAvailabilityWarning('');
                
                // Se havia uma data selecionada, verificar disponibilidade na nova cidade
                if (currentDate) {
                  setFormData({...formData, city_id: value, appointment_date: currentDate, appointment_time: ""});
                  await checkDateAvailability(currentDate, value);
                  loadAvailableTimes(currentDate);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a cidade" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.city_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-semibold text-foreground">
              Data <span className="text-destructive">*</span>
            </label>
            <Input
              id="date"
              type="date"
              min={getMinDate()}
              value={formData.appointment_date}
              disabled={!formData.city_id}
              onChange={async (e) => {
                const newDate = e.target.value;
                
                // Atualizar data sempre (não bloqueamos mais)
                setFormData({...formData, appointment_date: newDate, appointment_time: ""});
                
                // Verificar disponibilidade para mostrar aviso
                if (formData.city_id) {
                  await checkDateAvailability(newDate, formData.city_id);
                }
                
                // Carregar horários disponíveis
                loadAvailableTimes(newDate);
              }}
              className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-200"
              required
            />
            {!formData.city_id && (
              <p className="text-sm text-muted-foreground">
                Primeiro selecione uma cidade para habilitar a seleção de data
              </p>
            )}
            
            {/* Aviso de disponibilidade */}
            {availabilityWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-amber-600 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-amber-800">
                  {availabilityWarning}
                </div>
              </div>
            )}
          </div>

              <div className="space-y-2">
                <label htmlFor="time" className="text-sm font-semibold text-foreground">
                  Horário <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.appointment_time}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
                >
                  <SelectTrigger className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-200" disabled={loadingTimes || availableTimes.length === 0}>
                    <SelectValue placeholder={
                      loadingTimes 
                        ? "Carregando horários..." 
                        : (formData.appointment_date ? "Selecione um horário" : "Selecione uma data primeiro")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.length > 0 ? (
                      availableTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-times" disabled>
                        {formData.appointment_date ? "Nenhum horário disponível" : "Selecione uma data primeiro"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Box com informações do procedimento selecionado */}
              {selectedProcedure && (
                <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-background rounded-2xl border-2 border-primary/20 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
                      <div>
                        <h3 className="font-bold text-lg text-primary">Procedimento Selecionado</h3>
                        <p className="text-sm text-muted-foreground">Confirme os detalhes do seu agendamento</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pl-6">
                      <div>
                        <h4 className="font-semibold text-foreground text-base">{selectedProcedure.name}</h4>
                        {selectedProcedure.description && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{selectedProcedure.description}</p>
                        )}
                      </div>
                      
                      {/* Só mostra preço base se NÃO houver especificações */}
                      {selectedProcedure.price > 0 && !selectedProcedure.requires_specifications && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                          <span className="text-xs font-medium text-primary">Valor:</span>
                          <span className="font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(selectedProcedure.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Especificações do procedimento */}
              {selectedProcedure && selectedProcedure.requires_specifications && (
                <ProcedureSpecificationSelector
                  procedureId={selectedProcedure.id}
                  onSelectionChange={(data) => {
                    console.log('Seleção de especificações mudou:', data);
                    setSelectedSpecifications(data.selectedSpecifications);
                    setTotalSpecificationsPrice(data.totalPrice);
                    setDiscountInfo(data.discountInfo);
                    if (data.selectedGender) {
                      setSelectedGender(data.selectedGender as 'male' | 'female');
                    }
                  }}
                  bodySelectionType={selectedProcedure.body_selection_type || ''}
                  bodyImageUrl={selectedProcedure.body_image_url}
                  bodyImageUrlMale={selectedProcedure.body_image_url_male}
                />
              )}

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-semibold text-foreground">
                  Observações
                </label>
                <Textarea
                  id="notes"
                  placeholder="Alguma observação especial sobre o procedimento..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-200 resize-none"
                  rows={3}
                />
              </div>
          
          
          {/* Resumo e promoções (mobile-friendly) */}
          {selectedProcedure && (
            <div className="lg:hidden">
              <div className="sticky bottom-4 z-10">
                <div className="bg-gradient-to-r from-background to-muted/50 backdrop-blur-sm border-2 border-primary/20 rounded-2xl p-4 shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(
                          selectedProcedure?.requires_specifications ? discountInfo.originalTotal : (selectedProcedure?.price || 0)
                        )}
                      </span>
                    </div>
                    
                    {discountInfo.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span>Desconto ({discountInfo.discountPercentage}%):</span>
                        <span className="font-medium">
                          -{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(discountInfo.discountAmount)}
                        </span>
                      </div>
                    )}
                    
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
                    
                    <div className="flex items-center justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">
                        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(
                          selectedProcedure?.requires_specifications ? discountInfo.finalTotal : (selectedProcedure?.price || 0)
                        )}
                      </span>
                    </div>
                    
                    {discountInfo.discountAmount > 0 && (
                      <div className="text-center text-xs text-green-600 font-medium">
                        🎉 Você economizou {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(discountInfo.discountAmount)}!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center justify-center gap-2 border-2 hover:border-primary/50 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                
                {/* Botão de cancelar - para agendamentos confirmados e agendados */}
                {editingId && (currentAppointment?.status === 'confirmado' || currentAppointment?.status === 'agendado') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={cancelling}
                        className="flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        Cancelar Agendamento
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita e a proprietária será notificada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Agendamento</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelAppointment}
                          disabled={cancelling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {loading ? (editingId ? "Salvando..." : "Agendando...") : (editingId ? "Salvar Alterações" : "Confirmar Agendamento")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendamentoForm;

