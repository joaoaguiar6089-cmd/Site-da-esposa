import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, User, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  nome: string;
  sobrenome: string;
  cpf: string;
  celular: string;
}

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

interface SimpleAppointmentFormProps {
  client: Client;
  onBack: () => void;
  onSuccess: () => void;
}

const SimpleAppointmentForm = ({ client, onBack, onSuccess }: SimpleAppointmentFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    procedure_id: "",
    professional_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadProcedures();
    loadProfessionals();
  }, []);

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
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de procedimentos.",
        variant: "destructive",
      });
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
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de profissionais.",
        variant: "destructive",
      });
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
      
      const { error } = await supabase
        .from("appointments")
        .insert([{
          client_id: client.id,
          procedure_id: formData.procedure_id,
          professional_id: formData.professional_id || null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          status: "agendado",
          notes: formData.notes
        }]);

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

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Button 
        onClick={onBack}
        variant="ghost"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao histórico
      </Button>

      {/* Formulário */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Novo Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações do Cliente (readonly) */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente Selecionado
              </h3>
              <p className="text-sm text-muted-foreground">
                <strong>{client.nome} {client.sobrenome}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {client.celular} • CPF: {client.cpf}
              </p>
            </div>

            {/* Procedimento */}
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedimento *</Label>
              <Select value={formData.procedure_id} onValueChange={(value) => setFormData({...formData, procedure_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um procedimento..." />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        <span>{procedure.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({procedure.duration}min - R$ {procedure.price?.toFixed(2) || '0.00'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <Label htmlFor="professional">Profissional (opcional)</Label>
              <Select value={formData.professional_id} onValueChange={(value) => setFormData({...formData, professional_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não especificar</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Adicione observações sobre o agendamento..."
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {loading ? "Salvando..." : "Agendar Procedimento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAppointmentForm;