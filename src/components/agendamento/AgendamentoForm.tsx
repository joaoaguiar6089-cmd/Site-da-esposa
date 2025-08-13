import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/pages/Agendamento";

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
  email?: string;
}

interface AgendamentoFormProps {
  client: Client;
  onAppointmentCreated: () => void;
  onBack: () => void;
  editingId?: string;
}

const AgendamentoForm = ({ client, onAppointmentCreated, onBack, editingId }: AgendamentoFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: "",
    professional_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const { toast } = useToast();

  const loadProcedures = async () => {
    try {
      const [proceduresResponse, professionalsResponse] = await Promise.all([
        supabase.from('procedures').select('*').order('name'),
        supabase.from('professionals').select('id, name').order('name')
      ]);

      if (proceduresResponse.error) throw proceduresResponse.error;
      if (professionalsResponse.error) throw professionalsResponse.error;

      setProcedures(proceduresResponse.data || []);
      setProfessionals(professionalsResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar procedimentos e profissionais.",
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
  }, [editingId]);

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
        professional_id: data.professional_id || "none",
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

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const loadAvailableTimes = async (date: string) => {
    if (!date) {
      setAvailableTimes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .eq('status', 'agendado');

      if (error) throw error;

      const bookedTimes = data?.map(apt => apt.appointment_time) || [];
      const allTimes = generateTimeOptions();
      const available = allTimes.filter(time => !bookedTimes.includes(time));
      
      setAvailableTimes(available);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setAvailableTimes(generateTimeOptions());
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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
      let result;
      if (editingId) {
        result = await supabase
          .from('appointments')
          .update({
            procedure_id: formData.procedure_id,
            professional_id: formData.professional_id === "none" ? null : formData.professional_id,
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
            professional_id: formData.professional_id === "none" ? null : formData.professional_id,
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
        const selectedProfessional = professionals.find(p => p.id === formData.professional_id && formData.professional_id !== "none");
        
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
            professional_id: formData.professional_id === "none" ? null : formData.professional_id,
            professional_name: selectedProfessional?.name || null,
            professional_email: selectedProfessional?.email || null,
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
        
        // WhatsApp para cliente
        const clientMessage = `🩺 *Agendamento ${editingId ? 'Atualizado' : 'Confirmado'}*\n\nOlá ${client.nome}!\n\nSeu agendamento foi ${editingId ? 'atualizado' : 'confirmado'}:\n\n📅 Data: ${new Date(formData.appointment_date).toLocaleDateString('pt-BR')}\n⏰ Horário: ${formData.appointment_time}\n💉 Procedimento: ${selectedProc?.name}\n💰 Valor: R$ ${selectedProc?.price?.toFixed(2)}\n${selectedProfessional ? `👩‍⚕️ Profissional: ${selectedProfessional.name}\n` : ''}\n📍 Local: Tefé-AM - Av. Brasil, 63b\n\nPara reagendamentos em Manaus, entre em contato via WhatsApp.\n\nObrigado pela confiança! 🙏`;
        
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

        // Email para profissional
        if (selectedProfessional && selectedProfessional.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: selectedProfessional.email,
              professionalName: selectedProfessional.name,
              clientName: `${client.nome} ${client.sobrenome}`,
              procedureName: selectedProc?.name || '',
              appointmentDate: new Date(formData.appointment_date).toLocaleDateString('pt-BR'),
              appointmentTime: formData.appointment_time,
            }
          });
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
            <Select
              value={formData.procedure_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, procedure_id: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um procedimento" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((procedure) => (
                  <SelectItem key={procedure.id} value={procedure.id}>
                    <div>
                      <div className="font-medium">{procedure.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {procedure.duration}min - R$ {procedure.price?.toFixed(2)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProcedure && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProcedure.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="professional" className="text-sm font-medium">
              Profissional (Opcional)
            </label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, professional_id: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum profissional específico</SelectItem>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onChange={(e) => {
                const newDate = e.target.value;
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