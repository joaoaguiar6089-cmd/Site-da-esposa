import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDateBrazil } from '@/utils/dateUtils';
import { formatCPF, isValidCPF } from "@/utils/cpfValidator";
import type { Client } from "@/types/client";
import ProcedureSpecificationSelector, { ProcedureSpecification } from "./ProcedureSpecificationSelector";

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

type FlowStep = 'booking-form' | 'cpf-verification' | 'client-registration';

const NewBookingFlow = ({ onBack, onSuccess, preSelectedProcedureId }: NewBookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('booking-form');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [cpfInput, setCpfInput] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [registrationData, setRegistrationData] = useState({
    nome: '',
    sobrenome: '',
    celular: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBookingFormComplete = (data: BookingData) => {
    setBookingData(data);
    setCurrentStep('cpf-verification');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfInput(formatted);
  };

  const handleCPFSubmit = async () => {
    if (!isValidCPF(cpfInput)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('cpf', cpfInput.replace(/[^\d]/g, ''))
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Cliente encontrado
        setFoundClient(data);
        await createAppointment(data);
      } else {
        // Cliente não encontrado, vai para cadastro
        setCurrentStep('client-registration');
      }
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar CPF.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientRegistration = async () => {
    if (!registrationData.nome || !registrationData.sobrenome || !registrationData.celular) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          cpf: cpfInput.replace(/[^\d]/g, ''),
          nome: registrationData.nome,
          sobrenome: registrationData.sobrenome,
          celular: registrationData.celular
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "CPF já cadastrado",
            description: "Este CPF já possui cadastro no sistema.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setFoundClient(data);
      await createAppointment(data);
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (client: Client) => {
    if (!bookingData) return;

    try {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: client.id,
          procedure_id: bookingData.procedure_id,
          appointment_date: bookingData.appointment_date,
          appointment_time: bookingData.appointment_time,
          notes: bookingData.notes || null,
          city_id: bookingData.city_id,
          status: 'agendado'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Salvar especificações se houver
      if (bookingData.specifications && bookingData.specifications.length > 0) {
        const specificationsData = bookingData.specifications.map(spec => ({
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

      toast({
        title: "Sucesso!",
        description: "Agendamento criado com sucesso!",
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento.",
        variant: "destructive",
      });
    }
  };

  const renderBookingForm = () => {
    return (
      <BookingFormStep 
        onComplete={handleBookingFormComplete}
        onBack={onBack}
        preSelectedProcedureId={preSelectedProcedureId}
      />
    );
  };

  const renderCPFVerification = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentStep('booking-form')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Confirmar Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para finalizar seu agendamento, informe seu CPF:
          </p>
          
          <div>
            <label className="text-sm font-medium">CPF *</label>
            <Input
              value={cpfInput}
              onChange={handleCPFChange}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <Button 
            onClick={handleCPFSubmit}
            disabled={loading || !isValidCPF(cpfInput)}
            className="w-full"
          >
            {loading ? 'Verificando...' : 'Confirmar Agendamento'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderClientRegistration = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentStep('cpf-verification')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Cadastro de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            CPF não encontrado. Vamos fazer seu cadastro:
          </p>

          <div>
            <label className="text-sm font-medium">CPF</label>
            <Input
              value={cpfInput}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input
              value={registrationData.nome}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Sobrenome *</label>
            <Input
              value={registrationData.sobrenome}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, sobrenome: e.target.value }))}
              placeholder="Seu sobrenome"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Celular *</label>
            <Input
              value={registrationData.celular}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, celular: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <Button 
            onClick={handleClientRegistration}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar e Agendar'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  switch (currentStep) {
    case 'booking-form':
      return renderBookingForm();
    case 'cpf-verification':
      return renderCPFVerification();
    case 'client-registration':
      return renderClientRegistration();
    default:
      return renderBookingForm();
  }
};

// Componente separado para o formulário de agendamento
interface BookingFormStepProps {
  onComplete: (data: BookingData) => void;
  onBack: () => void;
  preSelectedProcedureId?: string;
}

const BookingFormStep = ({ onComplete, onBack, preSelectedProcedureId }: BookingFormStepProps) => {
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

    const bookingData: BookingData = {
      ...formData,
      specifications: selectedSpecifications
    };

    onComplete(bookingData);
  };

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
};

export default NewBookingFlow;