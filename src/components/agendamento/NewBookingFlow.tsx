import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDateBrazil } from '@/utils/dateUtils';
import type { Client } from "@/types/client";
import ProcedureSpecificationSelector, { ProcedureSpecification } from "./ProcedureSpecificationSelector";
import LoginPhone from "./LoginPhone";
import CadastroCliente from "./CadastroCliente";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

type ViewMode = 'form' | 'phone' | 'cadastro' | 'confirmation';

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const NewBookingFlow = ({ onBack, onSuccess, preSelectedProcedureId }: NewBookingFlowProps) => {
  const [currentView, setCurrentView] = useState<ViewMode>('form');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [cities, setCities] = useState<{id: string, city_name: string}[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: preSelectedProcedureId || "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    city_id: "",
  });
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProcedureSpecification[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [showSpecifications, setShowSpecifications] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.appointment_date && formData.city_id) {
      loadAvailableTimes(formData.appointment_date);
    }
  }, [formData.appointment_date, formData.city_id]);

  // Mostrar especificações automaticamente quando procedimento é selecionado
  useEffect(() => {
    const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
    if (selectedProcedure?.requires_specifications) {
      setShowSpecifications(true);
    } else {
      setShowSpecifications(false);
      setSelectedSpecifications([]);
    }
  }, [formData.procedure_id, procedures]);

  const loadData = async () => {
    try {
      // Carregar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('id, name, description, duration, price, requires_specifications, body_image_url, body_image_url_male, body_selection_type')
        .order('name');

      if (proceduresError) throw proceduresError;

      // Carregar cidades
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_settings')
        .select('id, city_name')
        .eq('is_active', true)
        .order('display_order');

      if (citiesError) throw citiesError;

      setProcedures(proceduresData || []);
      setCities(citiesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive",
      });
    } finally {
      setLoadingProcedures(false);
    }
  };

  const loadAvailableTimes = async (date: string) => {
    if (!date || !formData.city_id) {
      setAvailableTimes([]);
      return;
    }
    
    setLoadingTimes(true);
    try {
      // Verificar se o dia está disponível na cidade selecionada
      const { data: cityAvailability, error: availabilityError } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', formData.city_id)
        .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`);

      if (availabilityError) {
        console.error('Erro ao verificar disponibilidade da cidade:', availabilityError);
        setAvailableTimes([]);
        return;
      }

      // Se não há disponibilidade na cidade para esta data, retorna vazio
      if (!cityAvailability || cityAvailability.length === 0) {
        setAvailableTimes([]);
        return;
      }

      // Buscar configurações de horários padrão
      const { data: settings, error } = await supabase
        .from('schedule_settings')
        .select('start_time, end_time, interval_minutes, available_days')
        .eq('is_active', true)
        .single();

      if (error || !settings) {
        console.error('Erro ao buscar configurações:', error);
        setAvailableTimes([]);
        return;
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
      
      // Verificar conflitos com agendamentos existentes
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('appointment_time, procedures(duration)')
        .eq('appointment_date', date)
        .neq('status', 'cancelado');

      if (apptError) throw apptError;

      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const selectedDuration = selectedProcedure?.duration || 60;

      const available = times.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        const timeInMinutes = hour * 60 + minute;
        
        // Não permitir horários passados no dia atual
        const today = getCurrentDateBrazil();
        if (date === today) {
          const now = new Date();
          const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
          if (timeInMinutes <= currentTimeInMinutes + 30) {
            return false;
          }
        }
        
        // Verificar conflitos
        const hasConflict = appointments?.some(apt => {
          const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
          const aptTimeInMinutes = aptHour * 60 + aptMinute;
          const aptDuration = apt.procedures?.duration || 60;
          
          return (timeInMinutes >= aptTimeInMinutes && timeInMinutes < (aptTimeInMinutes + aptDuration)) ||
                 ((timeInMinutes + selectedDuration) > aptTimeInMinutes && (timeInMinutes + selectedDuration) <= (aptTimeInMinutes + aptDuration)) ||
                 (timeInMinutes <= aptTimeInMinutes && (timeInMinutes + selectedDuration) >= (aptTimeInMinutes + aptDuration));
        });

        return !hasConflict;
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
    // Proceder diretamente para confirmação do agendamento
    createAppointment(client);
  };

  const handleClientNotFound = (phone: string) => {
    setPendingPhone(phone);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    createAppointment(client);
  };

  const createAppointment = async (client: Client) => {
    setLoading(true);
    
    try {
      let totalPrice = 0;
      
      // Calcular preço total das especificações
      if (selectedSpecifications && selectedSpecifications.length > 0) {
        totalPrice = selectedSpecifications.reduce((sum, spec) => sum + (spec.price || 0), 0);
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: client.id,
          procedure_id: formData.procedure_id,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          notes: formData.notes || null,
          city_id: formData.city_id,
          total_body_areas_price: totalPrice,
          status: 'agendado'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Salvar especificações se houver
      if (selectedSpecifications && selectedSpecifications.length > 0) {
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
      setCurrentView('confirmation');

      toast({
        title: "Sucesso!",
        description: "Agendamento criado com sucesso!",
      });

      // Enviar notificações
      await Promise.all([
        sendWhatsAppNotification(appointment, client),
        sendOwnerNotification(appointment, client),
        sendAdminNotification(appointment, client)
      ]);

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (appointment: any, client: Client) => {
    try {
      const procedure = procedures.find(p => p.id === appointment.procedure_id);
      const notes = appointment.notes ? `\n📝 Observações: ${appointment.notes}` : '';

      // 1) Buscar o template (ajuste o templateType para o que você usa no banco)
      const { data: templateData, error } = await supabase.functions.invoke('get-whatsapp-template', {
        body: {
          // use 'confirmacao_cliente' OU 'agendamento_cliente' conforme existe na tabela whatsapp_templates
          templateType: 'confirmacao_cliente',
          variables: {
            clientName: client.nome,
            appointmentDate: format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR }),
            appointmentTime: appointment.appointment_time,
            procedureName: procedure?.name || '',
            notes
          }
        }
      });

      if (error) {
        console.error('Erro ao buscar template WhatsApp:', error);
      }

      // 2) Mensagem de fallback caso o template não venha
      const fallback = `🩺 *Agendamento Confirmado*

Olá ${client.nome}!

📅 Data: ${format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
⏰ Horário: ${appointment.appointment_time}
💉 Procedimento: ${procedure?.name || ''}${notes}

📍 Clínica Dra. Karoline Ferreira
✨ Aguardamos você!`;

      const message = templateData?.message || fallback;

      // 3) Enviar de fato no WhatsApp
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: client.celular,     // pode estar com ou sem +55; o edge function normaliza
          message
        }
      });

      if (sendError) {
        console.error('Erro ao enviar WhatsApp:', sendError);
      }
    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
    }
  };

  const sendOwnerNotification = async (appointment: any, client: Client) => {
    try {
      const procedure = procedures.find(p => p.id === appointment.procedure_id);
      const specifications = selectedSpecifications.map(spec => spec.name).join(', ');
      
      await supabase.functions.invoke('notify-owner', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedure?.name || '',
          professionalName: null,
          notes: appointment.notes || '',
          specifications: specifications
        }
      });
    } catch (error) {
      console.error('Erro ao notificar proprietário:', error);
    }
  };

  const sendAdminNotification = async (appointment: any, client: Client) => {
    try {
      const procedure = procedures.find(p => p.id === appointment.procedure_id);
      const city = cities.find(c => c.id === appointment.city_id);
      
      await supabase.functions.invoke('notify-admins', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedure?.name || '',
          cityName: city?.city_name || '',
          notes: appointment.notes || ''
        }
      });
    } catch (error) {
      console.error('Erro ao notificar admins:', error);
    }
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

    setCurrentView('phone');
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
        const procedureName = procedures.find(p => p.id === formData.procedure_id)?.name || '';
        const cityName = cities.find(c => c.id === formData.city_id)?.city_name || '';
        
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">Agendamento Confirmado!</CardTitle>
              <p className="text-muted-foreground">
                Seu agendamento foi realizado com sucesso.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointmentDetails && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p><strong>Procedimento:</strong> {procedureName}</p>
                  <p><strong>Data:</strong> {format(new Date(appointmentDetails.appointment_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p><strong>Horário:</strong> {appointmentDetails.appointment_time}</p>
                  <p><strong>Cidade:</strong> {cityName}</p>
                  {appointmentDetails.total_body_areas_price > 0 && (
                    <p><strong>Valor Total:</strong> {currency(appointmentDetails.total_body_areas_price)}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/area-cliente'}
                  variant="outline"
                  className="w-full"
                >
                  Visualizar Agendamentos
                </Button>
                <Button
                  onClick={onSuccess}
                  className="w-full"
                >
                  Concluir
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        if (loadingProcedures) {
          return <div className="text-center py-8">Carregando...</div>;
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Novo Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium">Procedimento *</label>
                  <Select 
                    value={formData.procedure_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, procedure_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um procedimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {procedures.map((procedure) => (
                        <SelectItem key={procedure.id} value={procedure.id}>
                          {procedure.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Cidade *</label>
                  <Select 
                    value={formData.city_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, city_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.city_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input
                    type="date"
                    min={getCurrentDateBrazil()}
                    value={formData.appointment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Horário *</label>
                  <Select 
                    value={formData.appointment_time} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
                    disabled={!formData.appointment_date || !formData.city_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTimes ? "Carregando..." : "Selecione um horário"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de especificações se necessário */}
                {showSpecifications && formData.procedure_id && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Selecione as especificações do procedimento:</h3>
                    <ProcedureSpecificationSelector
                      procedureId={formData.procedure_id}
                      onSelectionChange={(data) => setSelectedSpecifications(data.selectedSpecifications)}
                      initialSelections={selectedSpecifications.map(spec => spec.id)}
                      bodySelectionType={procedures.find(p => p.id === formData.procedure_id)?.body_selection_type || ''}
                      bodyImageUrl={procedures.find(p => p.id === formData.procedure_id)?.body_image_url}
                      bodyImageUrlMale={procedures.find(p => p.id === formData.procedure_id)?.body_image_url_male}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações opcionais"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {showSpecifications && selectedSpecifications.length === 0 ? 'Selecione as especificações' : 'Continuar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default NewBookingFlow;