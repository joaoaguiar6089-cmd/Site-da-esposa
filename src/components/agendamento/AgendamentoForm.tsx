import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Calendar, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDateToBrazil, getCurrentDateBrazil } from '@/utils/dateUtils';
import type { Client } from "@/types/client";

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}


interface AgendamentoFormProps {
  client: Client;
  onAppointmentCreated: () => void;
  onBack: () => void;
  editingId?: string;
  preSelectedProcedureId?: string;
}

const AgendamentoForm = ({ client, onAppointmentCreated, onBack, editingId, preSelectedProcedureId }: AgendamentoFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const { toast } = useToast();

  const loadProcedures = async () => {
    try {
      const { data, error } = await supabase.from('procedures').select('*').order('name');

      if (error) throw error;

      setProcedures(data || []);
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
    }
    
    // Pré-selecionar procedimento se fornecido
    if (preSelectedProcedureId && !editingId) {
      setFormData(prev => ({ ...prev, procedure_id: preSelectedProcedureId }));
    }
  }, [editingId, preSelectedProcedureId]);

  const loadAppointmentData = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      setFormData({
        procedure_id: data.procedure_id || "",
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        notes: data.notes || "",
      });

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

      // Verificar se o dia selecionado está disponível
      if (formData.appointment_date) {
        const selectedDate = new Date(formData.appointment_date + 'T00:00:00');
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
        
        // Se for hoje, verificar se o horário é futuro
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          const now = new Date();
          const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
          
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
    const today = new Date();
    return today.toISOString().split('T')[0];
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

      let result;
      if (editingId) {
        result = await supabase
          .from('appointments')
          .update({
            procedure_id: formData.procedure_id,
            professional_id: null,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            notes: formData.notes.trim() || null,
          })
          .eq('id', editingId);
      } else {
        result = await supabase
          .from('appointments')
          .insert({
            client_id: client.id,
            procedure_id: formData.procedure_id,
            professional_id: null,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            notes: formData.notes.trim() || null,
            status: 'agendado',
          });
      }

      if (result.error) throw result.error;

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
            id: editingId || null,
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
            created_at: new Date().toISOString()
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
        
        // WhatsApp para cliente usando template
        const templateType = editingId ? 'agendamento_atualizado_cliente' : 'agendamento_cliente';
        const notesText = formData.notes ? `\n📝 Observações: ${formData.notes}` : '';
        
        const { data: templateData } = await supabase.functions.invoke('get-whatsapp-template', {
          body: {
            templateType,
            variables: {
              clientName: client.nome,
              appointmentDate: formatDateToBrazil(formData.appointment_date),
              appointmentTime: formData.appointment_time,
              procedureName: selectedProc?.name || '',
              notes: notesText
            }
          }
        });
        
        // Use consistent Brazil date formatting
        const formattedDate = formatDateToBrazil(formData.appointment_date);
        
        const clientMessage = templateData?.message || `🩺 *Agendamento ${editingId ? 'Atualizado' : 'Confirmado'}*\n\nOlá ${client.nome}!\n\nSeu agendamento foi ${editingId ? 'atualizado' : 'confirmado'}:\n\n📅 Data: ${formattedDate}\n⏰ Horário: ${formData.appointment_time}\n💉 Procedimento: ${selectedProc?.name}${notesText}\n📍 Local: Av. Brasil, 63b, São Francisco - Tefé-AM\n🗺️ Ver localização: https://share.google/GBkRNRdCejpJYVANt\n\nObrigado pela confiança! 🙏`;
        
        console.log('Enviando WhatsApp para:', client.celular, 'Mensagem:', clientMessage.substring(0, 100) + '...');
        
        try {
          const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: client.celular,
              message: clientMessage
            }
          });
          
          if (whatsappError) {
            console.error('Erro específico WhatsApp:', whatsappError);
          } else {
            console.log('WhatsApp enviado com sucesso:', whatsappData);
          }
        } catch (whatsappException) {
          console.error('Exceção ao enviar WhatsApp:', whatsappException);
        }


        // Notificar proprietária da clínica via WhatsApp e Email
        try {
          console.log('Dados sendo enviados para notify-owner:', {
            appointmentDate: formData.appointment_date,
            appointmentTime: formData.appointment_time,
            clientName: `${client.nome} ${client.sobrenome}`
          });
          
          const ownerNotifyPromise = supabase.functions.invoke('notify-owner', {
            body: {
              type: editingId ? 'alteracao' : 'agendamento',
              clientName: `${client.nome} ${client.sobrenome}`,
              clientPhone: client.celular,
              appointmentDate: formData.appointment_date,
              appointmentTime: formData.appointment_time,
              procedureName: selectedProc?.name || '',
              professionalName: null,
              notes: formData.notes
            }
          });

          console.log('Dados sendo enviados para notify-admins:', {
            appointmentDate: formData.appointment_date,
            appointmentTime: formData.appointment_time,
            clientName: `${client.nome} ${client.sobrenome}`
          });

          const emailNotifyPromise = supabase.functions.invoke('notify-admins', {
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

          await Promise.allSettled([ownerNotifyPromise, emailNotifyPromise]);
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

      onAppointmentCreated();
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
                  <CommandInput placeholder="Buscar procedimento..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum procedimento encontrado.</CommandEmpty>
                    <CommandGroup>
                      {procedures.map((procedure) => (
                        <CommandItem
                          key={procedure.id}
                          value={`${procedure.name} ${procedure.description || ''}`}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, procedure_id: procedure.id, appointment_time: "" }));
                            setProcedureSearchOpen(false);
                            
                            // Recarregar horários se uma data já estiver selecionada
                            if (formData.appointment_date) {
                              loadAvailableTimes(formData.appointment_date);
                            }
                          }}
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{procedure.name}</span>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  formData.procedure_id === procedure.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {procedure.duration}min - R$ {procedure.price?.toFixed(2)}
                            </div>
                            {procedure.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {procedure.description}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedProcedure && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProcedure.description}
              </p>
            )}
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