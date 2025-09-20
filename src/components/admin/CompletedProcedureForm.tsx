import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Client {
  id: string;
  nome: string;
  sobrenome: string;
  cpf: string;
  celular: string;
}

interface CompletedProcedureFormProps {
  client: Client;
  onBack: () => void;
  onSuccess: () => void;
}

const CompletedProcedureForm = ({
  client,
  onBack,
  onSuccess,
}: CompletedProcedureFormProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: "",
    appointment_date: "",
    appointment_time: "14:00",
    notes: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [resultDescriptions, setResultDescriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, price, duration")
        .order("name");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
    }
  };

  // Set max date to today
  const today = new Date().toISOString().split('T')[0];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    setResultDescriptions(prev => [...prev, ...files.map(() => "")]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setResultDescriptions(prev => prev.filter((_, i) => i !== index));
  };

  const updateDescription = (index: number, description: string) => {
    setResultDescriptions(prev => {
      const newDescriptions = [...prev];
      newDescriptions[index] = description;
      return newDescriptions;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.procedure_id || !formData.appointment_date) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validate that date is not in the future
    const selectedDate = new Date(formData.appointment_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate > todayDate) {
      toast({
        title: "Erro",
        description: "A data do procedimento realizado não pode ser futura.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create appointment as completed
      const appointmentData = {
        client_id: client.id,
        procedure_id: formData.procedure_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        status: 'realizado',
        notes: formData.notes || 'Procedimento realizado - inserido posteriormente'
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Upload photos if any
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const description = resultDescriptions[i];

          const fileExt = file.name.split('.').pop();
          const fileName = `${appointment.id}_${Date.now()}_${i}.${fileExt}`;

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('procedure-results')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('procedure-results')
            .getPublicUrl(uploadData.path);

          // Save to procedure_results table
          const { error: insertError } = await supabase
            .from('procedure_results')
            .insert([{
              appointment_id: appointment.id,
              image_url: urlData.publicUrl,
              description: description || "Foto do procedimento realizado"
            }]);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Procedimento realizado cadastrado com sucesso!",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao cadastrar procedimento realizado:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar procedimento realizado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Cadastrar Procedimento Realizado</h2>
          <p className="text-muted-foreground">
            Cliente: {client.nome} {client.sobrenome}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Procedimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Procedure Selection */}
            <div className="grid gap-2">
              <Label htmlFor="procedure">Procedimento *</Label>
              <Select
                value={formData.procedure_id}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, procedure_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o procedimento" />
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

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Data do Procedimento *</Label>
                <Input
                  id="date"
                  type="date"
                  max={today}
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, appointment_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Horário</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, appointment_time: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre o procedimento..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <Label>Fotos do Procedimento</Label>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para selecionar fotos ou arraste aqui
                  </span>
                </label>
              </div>

              {/* Selected Photos */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Fotos Selecionadas:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <Input
                          placeholder="Descrição da foto (opcional)"
                          value={resultDescriptions[index] || ""}
                          onChange={(e) => updateDescription(index, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onBack}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar Procedimento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletedProcedureForm;