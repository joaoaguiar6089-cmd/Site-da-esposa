import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Procedure {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
}

interface Client {
  id: string;
  nome: string;
  sobrenome: string;
}

interface SimpleAppointmentFormProps {
  client: Client;
  onBack: () => void;
  onSuccess: () => void;
}

const SimpleAppointmentForm = ({ client, onBack, onSuccess }: SimpleAppointmentFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    procedure_id: "",
    appointment_date: "",
    appointment_time: "",
    professional_id: "",
    notes: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadProcedures();
    loadProfessionals();
    loadScheduleSettings();
  }, []);

  useEffect(() => {
    if (formData.appointment_date) {
      generateAvailableTimes(formData.appointment_date);
    }
  }, [formData.appointment_date, scheduleSettings]);

  const loadProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, duration, price")
        .order("name");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error("Erro ao carregar procedimentos:", error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("schedule_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setScheduleSettings(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const generateAvailableTimes = async (selectedDate: string) => {
    if (!scheduleSettings) return;

    try {
      const date = new Date(selectedDate);
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Ajustar domingo para 7

      if (!scheduleSettings.available_days.includes(dayOfWeek)) {
        setAvailableTimes([]);
        return;
      }

      // Gerar horários baseados nas configurações
      const times: string[] = [];
      const [startHour, startMinute] = scheduleSettings.start_time.split(':').map(Number);
      const [endHour, endMinute] = scheduleSettings.end_time.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += scheduleSettings.interval_minutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }

      // Verificar agendamentos existentes
      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", selectedDate)
        .neq("status", "cancelado");

      const bookedTimes = existingAppointments?.map(apt => apt.appointment_time) || [];
      const availableTimes = times.filter(time => !bookedTimes.includes(time));

      setAvailableTimes(availableTimes);
    } catch (error) {
      console.error("Erro ao gerar horários:", error);
      setAvailableTimes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.procedure_id || !formData.appointment_date || !formData.appointment_time) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const appointmentData = {
        client_id: client.id,
        procedure_id: formData.procedure_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        professional_id: formData.professional_id || null,
        notes: formData.notes || null,
        status: "agendado"
      };

      const { error } = await supabase
        .from("appointments")
        .insert([appointmentData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Definir data mínima (hoje)
  const minDate = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Button 
        onClick={onBack}
        variant="ghost"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {client.nome}
      </Button>

      {/* Formulário */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Novo Agendamento - {client.nome} {client.sobrenome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Procedimento */}
              <div>
                <Label htmlFor="procedure">Procedimento *</Label>
                <Select 
                  value={formData.procedure_id} 
                  onValueChange={(value) => setFormData({...formData, procedure_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.map((procedure) => (
                      <SelectItem key={procedure.id} value={procedure.id}>
                        {procedure.name} - R$ {procedure.price?.toFixed(2)} ({procedure.duration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div>
                <Label htmlFor="professional">Profissional (opcional)</Label>
                <Select 
                  value={formData.professional_id} 
                  onValueChange={(value) => setFormData({...formData, professional_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não especificado</SelectItem>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate}
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                  required
                />
              </div>

              {/* Horário */}
              <div>
                <Label htmlFor="time">Horário *</Label>
                <Select 
                  value={formData.appointment_time} 
                  onValueChange={(value) => setFormData({...formData, appointment_time: value})}
                  disabled={!formData.appointment_date}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.appointment_date 
                        ? "Selecione uma data primeiro" 
                        : availableTimes.length === 0 
                          ? "Nenhum horário disponível"
                          : "Selecione o horário"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.appointment_date && availableTimes.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Não há horários disponíveis para esta data.
                  </p>
                )}
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações adicionais sobre o agendamento..."
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onBack}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Agendamento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAppointmentForm;