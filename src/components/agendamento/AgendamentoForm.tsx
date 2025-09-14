import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, Check, ChevronsUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDateToBrazil, getCurrentDateBrazil, getCurrentDateTimeBrazil } from '@/utils/dateUtils';
import type { Client } from "@/types/client";
import BodyAreaSelector from "./BodyAreaSelector";
import ProcedureSpecificationSelector from "./ProcedureSpecificationSelector";
import { useSpecificationCalculation, ProcedureSpecification } from "@/hooks/useSpecificationCalculation";

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

const AgendamentoForm = ({ client, onAppointmentCreated, onBack, editingId, preSelectedProcedureId, selectedDate, adminMode = false, sendNotification = true }: AgendamentoFormProps) => {
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
  });
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<AreaGroup[]>([]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [totalBodyAreasPrice, setTotalBodyAreasPrice] = useState(0);
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProcedureSpecification[]>([]);
  const [totalSpecificationsPrice, setTotalSpecificationsPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<any>(null);
  const { toast } = useToast();

  const loadProcedures = async () => {
    try {
      // Carregar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('id, name, description, duration, price, requires_body_selection, requires_specifications, body_selection_type, body_image_url, body_image_url_male, category_id, subcategory_id')
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

      setProcedures(proceduresData || []);
      setCategories(categoriesData || []);
      setSubcategories(subcategoriesData || []);
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
          appointment_selected_areas(
            area_group_id,
            body_area_groups(id, name, price, shapes, gender)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      setCurrentAppointment(data);
      setFormData({
        procedure_id: data.procedure_id || "",
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        notes: data.notes || "",
      });

      // Carregar seleções de áreas corporais se existirem
      if (data.appointment_selected_areas && data.appointment_selected_areas.length > 0) {
        const bodyAreas: AreaGroup[] = data.appointment_selected_areas.map((selection: any) => ({
          id: selection.body_area_groups.id,
          name: selection.body_area_groups.name,
          price: selection.body_area_groups.price,
          shapes: selection.body_area_groups.shapes
        }));
        setSelectedBodyAreas(bodyAreas);
        setTotalBodyAreasPrice(data.total_body_areas_price || 0);
        
        // Definir o gênero selecionado baseado na primeira seleção
        const gender = data.appointment_selected_areas[0]?.body_area_groups?.gender;
        if (gender === 'male' || gender === 'female') {
          setSelectedGender(gender as "male" | "female");
        }
      }

      if (data.selected_gender) {
        setSelectedGender(data.selected_gender as 'male' | 'female');
      }

      // Carregar horários disponíveis para a data
      loadAvailableTimes(data.appointment_date);
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
  const [procedureSearchOpen, setProcedureSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const generateTimeOptions = async () => {
    try {
      // Verificar se a data tem exceções configuradas
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
          const exception = exceptions[0]; // Pega a primeira exceção válida
          
          // Se a clínica está fechada nesta data
          if (exception.is_closed) {
            return [];
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

      // Verificar se o dia selecionado está disponível (considerando fuso brasileiro)
      if (formData.appointment_date) {
        // Criar data no fuso brasileiro para evitar problemas de timezone
        const [year, month, day] = formData.appointment_date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        const dayOfWeek = selectedDate.getDay();
        
        if (!settings.available_days.includes(dayOfWeek)) {
          return [];
        }
      }

      // Gerar horários baseados nas configurações padrão
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
      console.error('Erro ao gerar horários:', error);
      // Fallback para horários padrão
      const times = [];
      for (let hour = 8; hour <= 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          times.push(timeString);
        }
      }
      return times;
    }
  };

  const loadAvailableTimes = async (date: string) => {
    if (!date) {
      setAvailableTimes([]);
      return;
    }

    try {
      const allTimes = await generateTimeOptions();
      
      if (allTimes.length === 0) {
        setAvailableTimes([]);
        return;
      }

      // Buscar agendamentos existentes com detalhes do procedimento
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          appointment_time,
          procedures (
            duration
          )
        `)
        .eq('appointment_date', date)
        .neq('status', 'cancelado');

      if (error) throw error;

      // Obter duração do procedimento selecionado
      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const selectedDuration = selectedProcedure?.duration || 60;

      // Filtrar horários considerando conflitos de duração e horário atual se for hoje
      let available = allTimes.filter(time => {
        // Converter horário para minutos para facilitar cálculos
        const [hour, minute] = time.split(':').map(Number);
        const timeInMinutes = hour * 60 + minute;
        
        // Se for hoje, verificar se o horário é futuro (considerando fuso brasileiro)
        const today = getCurrentDateBrazil();
        if (date === today) {
          const nowBrazil = getCurrentDateTimeBrazil();
          const currentTimeInMinutes = nowBrazil.getHours() * 60 + nowBrazil.getMinutes();
          
          // Adicionar uma margem de pelo menos 30 minutos a partir do horário atual
          if (timeInMinutes <= currentTimeInMinutes + 30) {
            return false;
          }
        }
        
        // Verificar se este horário conflita com agendamentos existentes
        const hasConflict = appointments?.some(apt => {
          const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
          const aptTimeInMinutes = aptHour * 60 + aptMinute;
          const aptDuration = apt.procedures?.duration || 60;
          
          // Verificar sobreposição:
          // 1. Novo agendamento começa durante um existente
          const startsInExisting = timeInMinutes >= aptTimeInMinutes && 
                                   timeInMinutes < (aptTimeInMinutes + aptDuration);
          
          // 2. Novo agendamento termina durante um existente  
          const endsInExisting = (timeInMinutes + selectedDuration) > aptTimeInMinutes && 
                                 (timeInMinutes + selectedDuration) <= (aptTimeInMinutes + aptDuration);
          
          // 3. Novo agendamento engloba um existente
          const engulfsExisting = timeInMinutes <= aptTimeInMinutes && 
                                  (timeInMinutes + selectedDuration) >= (aptTimeInMinutes + aptDuration);
          
          return startsInExisting || endsInExisting || engulfsExisting;
        });

        return !hasConflict;
      });
      
      setAvailableTimes(available);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      // Fallback mais conservador em caso de erro
      const fallbackTimes = [];
      for (let hour = 8; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 60) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          fallbackTimes.push(timeString);
        }
      }
      setAvailableTimes(fallbackTimes);
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

  const getMinDate = () => {
    return getCurrentDateBrazil();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.procedure_id || !formData.appointment_date || !formData.appointment_time) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o procedimento requer seleção de áreas corporais ou especificações
    const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
    if (selectedProcedure?.requires_body_selection && selectedBodyAreas.length === 0) {
      toast({
        title: "Seleção de áreas obrigatória",
        description: "Por favor, selecione pelo menos uma área corporal para este procedimento.",
        variant: "destructive",
      });
      return;
    }

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
          })
          .eq('id', editingId)
          .select()
          .single();
      } else {
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
          })
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

      // Salvar seleções de áreas corporais se houver
      if (selectedBodyAreas.length > 0) {
        // Deletar seleções anteriores se estiver editando
        if (editingId) {
          await supabase
            .from('appointment_selected_areas')
            .delete()
            .eq('appointment_id', appointmentId);
        }

        // Inserir novas seleções usando a tabela correta
        const bodySelections = selectedBodyAreas.map(area => ({
          appointment_id: appointmentId,
          area_group_id: area.id
        }));

        const { error: selectionsError } = await supabase
          .from('appointment_selected_areas')
          .insert(bodySelections);

        if (selectionsError) throw selectionsError;
      }

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
        if (!editingId && (!adminMode || sendNotification)) { // Cliente sempre recebe, admin só se marcar opção
          try {
            // Buscar template de confirmação
            const { data: template } = await supabase
              .from('whatsapp_templates')
              .select('template_content')
              .eq('template_type', 'appointment_confirmation')
              .single();

            if (template) {
              const formattedDate = formatDateToBrazil(formData.appointment_date);
              const message = template.template_content
                .replace('{cliente_nome}', `${client.nome} ${client.sobrenome}`)
                .replace('{data}', formattedDate)
                .replace('{horario}', formData.appointment_time)
                .replace('{procedimento}', selectedProc?.name || '')
                .replace('{profissional}', 'Dra. Karoline');

              await supabase.functions.invoke('send-whatsapp', {
                body: {
                  to: client.celular,
                  message: message
                }
              });
              
              console.log('Notificação de confirmação enviada para cliente');
            }
          } catch (notificationError) {
            console.error('Erro ao enviar notificação para cliente:', notificationError);
          }
        }


        // Notificar proprietária da clínica via WhatsApp
        try {
          const ownerNotifyData = {
            type: editingId ? 'alteracao' : 'agendamento',
            clientName: `${client.nome} ${client.sobrenome}`,
            clientPhone: client.celular,
            appointmentDate: formData.appointment_date,
            appointmentTime: formData.appointment_time,
            procedureName: selectedProc?.name || '',
            professionalName: null,
            notes: formData.notes
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

  const handleSpecificationChange = (specs: ProcedureSpecification[], totalPrice: number) => {
    setSelectedSpecifications(specs);
    setTotalSpecificationsPrice(totalPrice);
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
            notes: currentAppointment.notes || ''
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
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl">Novo Agendamento</CardTitle>
        </div>
        <p className="text-muted-foreground">
          {client.nome} {client.sobrenome}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="procedure" className="text-sm font-medium">
              Procedimento *
            </label>
            <Popover open={procedureSearchOpen} onOpenChange={setProcedureSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={procedureSearchOpen}
                  className="w-full justify-between mt-1"
                >
                  {formData.procedure_id ? (
                    <div className="text-left">
                      <div className="font-medium">
                        {procedures.find(p => p.id === formData.procedure_id)?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {procedures.find(p => p.id === formData.procedure_id)?.duration}min - R$ {procedures.find(p => p.id === formData.procedure_id)?.price?.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    "Selecione um procedimento..."
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


          <div>
            <label htmlFor="date" className="text-sm font-medium">
              Data *
            </label>
            <Input
              id="date"
              type="date"
              min={getMinDate()}
              value={formData.appointment_date}
              onChange={async (e) => {
                const newDate = e.target.value;
                
                // Verificar se a data está bloqueada
                const isDisabled = await isDateDisabled(newDate);
                if (isDisabled) {
                  toast({
                    title: "Data indisponível",
                    description: "A clínica estará fechada nesta data. Escolha outra data.",
                    variant: "destructive",
                  });
                  return;
                }
                
                setFormData(prev => ({ ...prev, appointment_date: newDate, appointment_time: "" }));
                loadAvailableTimes(newDate);
              }}
              className="mt-1"
              required
            />
          </div>

          {/* Especificações do procedimento - só mostra se requer especificações */}
          {selectedProcedure && selectedProcedure.requires_specifications && (
            <div className="space-y-4">
              <ProcedureSpecificationSelector
                procedureId={selectedProcedure.id}
                onSelectionChange={handleSpecificationChange}
              />
            </div>
          )}

          {/* Seleção de Áreas Corporais - se o procedimento requer */}
          {selectedProcedure?.requires_body_selection && (
            <div className="space-y-4">
              <BodyAreaSelector
                procedureId={selectedProcedure.id}
                bodySelectionType={selectedProcedure.body_selection_type || ''}
                bodyImageUrl={selectedProcedure.body_image_url}
                bodyImageUrlMale={selectedProcedure.body_image_url_male}
                onSelectionChange={(areas, totalPrice, gender) => {
                  setSelectedBodyAreas(areas);
                  setTotalBodyAreasPrice(totalPrice);
                  setSelectedGender(gender);
                }}
              />
            </div>
          )}

          <div>
            <label htmlFor="time" className="text-sm font-medium">
              Horário *
            </label>
            <Select
              value={formData.appointment_time}
              onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um horário" />
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

          <div>
            <label htmlFor="notes" className="text-sm font-medium">
              Observações
            </label>
            <Textarea
              id="notes"
              placeholder="Alguma observação especial..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
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
                    className="flex items-center gap-2"
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
              className="flex-1"
            >
              {loading ? (editingId ? "Salvando..." : "Agendando...") : (editingId ? "Salvar Alterações" : "Confirmar Agendamento")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgendamentoForm;