import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CheckCircle, Calendar as CalendarIcon, MessageCircle, Sparkles, Loader2, MapPin } from "lucide-react";
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
}

type ViewMode = 'form' | 'phone' | 'cadastro' | 'confirmation';

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const NewBookingFlow = ({ onBack, onSuccess, preSelectedProcedureId }: NewBookingFlowProps) => {
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadSiteSettings();
  }, []);

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
      const { data: availabilityData } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', formData.city_id);

      if (availabilityData) {
        const available = new Set<string>();
        const unavailable = new Set<string>();
        const today = new Date();
        const sixMonthsLater = addDays(today, 180);

        // Marcar todos os dias como indisponíveis por padrão
        for (let d = new Date(today); d <= sixMonthsLater; d.setDate(d.getDate() + 1)) {
          unavailable.add(format(d, 'yyyy-MM-dd'));
        }

        // Marcar períodos disponíveis
        availabilityData.forEach(period => {
          const start = new Date(period.date_start);
          const end = period.date_end ? new Date(period.date_end) : sixMonthsLater;
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            available.add(dateStr);
            unavailable.delete(dateStr);
          }
        });

        setAvailableDates(available);
        setUnavailableDates(unavailable);
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidade da cidade:', error);
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

  const sendWhatsAppNotification = async (client: Client, appointment: any, procedure: any, city: any) => {
    try {
      // Buscar template formatado
      const { data: templateData, error: templateError } = await supabase.functions.invoke('get-whatsapp-template', {
        body: {
          templateType: 'agendamento_cliente',
          variables: {
            clientName: client.nome,
            appointmentDate: format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR }),
            appointmentTime: appointment.appointment_time,
            procedureName: procedure?.name || '',
            cityName: city?.city_name || ''
          }
        }
      });

      if (templateError) throw templateError;

      // Enviar mensagem via WhatsApp
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: client.celular,
          message: templateData.message
        }
      });
    } catch (error) {
      console.error('Erro ao notificar cliente:', error);
    }
  };

  const sendOwnerNotification = async (client: Client, appointment: any, procedure: any, city: any) => {
    try {
      await supabase.functions.invoke('notify-owner', {
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
      console.error('Erro ao notificar proprietária:', error);
    }
  };

  const sendAdminNotification = async (client: Client, appointment: any, procedure: any, city: any) => {
    try {
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

  const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);

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
                          <p className="font-semibold">{clinicName ? `${clinicName} ÔÇö ${cityRec?.city_name || cityName}` : cityRec?.city_name || cityName}</p>
                          {address && (
                            <p className="text-sm text-foreground mt-1">
                              {address}
                              {mapUrl ? (
                                <>
                                  {" ÔÇó "}
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
                {/* Procedimento */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Procedimento <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.procedure_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, procedure_id: value }))}
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
                              {procedure.duration}min {procedure.price && `ÔÇó ${currency(procedure.price)}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Box de Descrição do Procedimento Selecionado */}
                {selectedProcedure && (
                  <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-md flex-shrink-0">
                          <Sparkles className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <h3 className="text-xl font-bold text-foreground">{selectedProcedure.name}</h3>
                          {selectedProcedure.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] line-clamp-4">
                              {selectedProcedure.description}
                            </p>
                          )}
                          <div className="flex items-center flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                              <span className="text-sm font-medium whitespace-nowrap">Duração:</span>
                              <span className="text-sm text-muted-foreground">{selectedProcedure.duration}min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                              <span className="text-sm font-medium whitespace-nowrap">Valor:</span>
                              <span className="text-sm text-primary font-bold">{currency(selectedProcedure.price || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Especificações */}
                {showSpecifications && (
                  <div className="space-y-3">
                    <ProcedureSpecificationSelector
                      procedureId={formData.procedure_id}
                      onSelectionChange={(data) => setSelectedSpecifications(data.selectedSpecifications)}
                      initialSelections={selectedSpecifications.map(s => s.id)}
                      bodySelectionType={selectedProcedure?.body_selection_type ?? null}
                      bodyImageUrl={selectedProcedure?.body_image_url ?? null}
                      bodyImageUrlMale={selectedProcedure?.body_image_url_male ?? null}
                    />
                  </div>
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
                            setFormData(prev => ({ ...prev, appointment_date: format(date, 'yyyy-MM-dd') }));
                            setCalendarOpen(false);
                          }
                        }}
                        disabled={(date) => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        modifiers={{
                          available: (date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return availableDates.has(dateStr);
                          },
                          unavailable: (date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return unavailableDates.has(dateStr);
                          },
                        }}
                        modifiersStyles={{
                          available: {
                            backgroundColor: 'hsl(var(--success) / 0.2)',
                            color: 'hsl(var(--success))',
                            fontWeight: 'bold',
                          },
                          unavailable: {
                            backgroundColor: 'hsl(var(--destructive) / 0.1)',
                            color: 'hsl(var(--destructive) / 0.5)',
                            textDecoration: 'line-through',
                          },
                        }}
                        locale={ptBR}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Hor├írio */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Hor├írio <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.appointment_time} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
                    disabled={!formData.appointment_date || loadingTimes}
                  >
                    <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                      <SelectValue placeholder={
                        loadingTimes ? "Carregando hor├írios..." : 
                        !formData.appointment_date ? "Selecione a data primeiro" : 
                        availableTimes.length === 0 ? "Sem hor├írios dispon├¡veis" :
                        "Selecione um hor├írio"
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

                {/* Observa├º├Áes */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Observa├º├Áes (opcional)
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione qualquer observa├º├úo relevante sobre o agendamento..."
                    className="min-h-[100px] border-2 hover:border-primary/50 transition-all duration-200"
                  />
                </div>

                {/* Bot├Áes de A├º├úo */}
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
