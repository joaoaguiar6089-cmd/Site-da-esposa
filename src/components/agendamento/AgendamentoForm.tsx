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

interface AgendamentoFormProps {
  client: Client;
  onAppointmentCreated: () => void;
  onBack: () => void;
}

const AgendamentoForm = ({ client, onAppointmentCreated, onBack }: AgendamentoFormProps) => {
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
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .order('name');

      if (error) throw error;

      setProcedures(data || []);
    } catch (error) {
      console.error('Erro ao carregar procedimentos:', error);
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
  }, []);

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
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: client.id,
          procedure_id: formData.procedure_id,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          notes: formData.notes.trim() || null,
          status: 'agendado',
        });

      if (error) throw error;

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso.",
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
            <label htmlFor="date" className="text-sm font-medium">
              Data *
            </label>
            <Input
              id="date"
              type="date"
              min={getMinDate()}
              value={formData.appointment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
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
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
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
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgendamentoForm;