import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Edit, Camera, Eye, Download, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NewAppointmentForm from "./NewAppointmentForm";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  procedure: {
    name: string;
    duration: number;
    price: number;
  };
  client: {
    id: string;
    nome: string;
    sobrenome: string;
  };
}

interface ProcedureResult {
  id: string;
  appointment_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  procedure_name?: string;
}

interface ProcedureHistoryProps {
  appointments: Appointment[];
  results: ProcedureResult[];
  clientId: string;
  onAppointmentUpdated: () => void;
  onResultUploaded: () => void;
}

const ProcedureHistory = ({ 
  appointments, 
  results, 
  clientId,
  onAppointmentUpdated,
  onResultUploaded
}: ProcedureHistoryProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [appointmentFormData, setAppointmentFormData] = useState({
    appointment_date: "",
    appointment_time: "",
    notes: ""
  });

  const { toast } = useToast();

  // Ordenar appointments por data (futuros primeiro, depois passados)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    const now = new Date();
    
    // Futuros primeiro (ordenação crescente)
    if (dateA >= now && dateB >= now) {
      return dateA.getTime() - dateB.getTime();
    }
    // Passados depois (ordenação decrescente)
    if (dateA < now && dateB < now) {
      return dateB.getTime() - dateA.getTime();
    }
    // Futuros antes de passados
    if (dateA >= now && dateB < now) return -1;
    if (dateA < now && dateB >= now) return 1;
    
    return 0;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      confirmado: { label: "Confirmado", variant: "default" as const },
      realizado: { label: "Realizado", variant: "default" as const },
      cancelado: { label: "Cancelado", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: "secondary" as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAppointmentResults = (appointmentId: string) => {
    return results.filter(result => result.appointment_id === appointmentId);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentFormData({
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      notes: appointment.notes || ""
    });
    setShowEditDialog(true);
  };

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAppointment) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: appointmentFormData.appointment_date,
          appointment_time: appointmentFormData.appointment_time,
          notes: appointmentFormData.notes
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso!",
      });

      setShowEditDialog(false);
      setSelectedAppointment(null);
      setAppointmentFormData({ appointment_date: "", appointment_time: "", notes: "" });
      onAppointmentUpdated();
    } catch (error: any) {
      console.error("Erro ao atualizar agendamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status do procedimento atualizado com sucesso!",
      });

      onAppointmentUpdated();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedAppointment) return;

    try {
      setLoading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedAppointment.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('procedure-results')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('procedure-results')
        .getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase
        .from('procedure_results')
        .insert([{
          appointment_id: selectedAppointment.id,
          image_url: urlData.publicUrl,
          description: resultDescription
        }]);

      if (insertError) throw insertError;

      // Atualizar status do agendamento para "realizado" apenas se não foi um upload adicional
      if (selectedAppointment.status !== 'realizado') {
        await supabase
          .from('appointments')
          .update({ status: 'realizado' })
          .eq('id', selectedAppointment.id);
      }

      toast({
        title: "Sucesso",
        description: "Resultado do procedimento salvo com sucesso!",
      });

      setShowResultDialog(false);
      setSelectedFile(null);
      setResultDescription("");
      onResultUploaded();
      onAppointmentUpdated();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar resultado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'resultado-procedimento.jpg';
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download da imagem.",
        variant: "destructive",
      });
    }
  };

  const deleteResult = async (resultId: string) => {
    if (!confirm('Tem certeza que deseja excluir este resultado?')) return;

    try {
      const { error } = await supabase
        .from('procedure_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Resultado excluído",
        description: "O resultado do procedimento foi excluído com sucesso.",
      });

      onResultUploaded();
    } catch (error) {
      console.error('Erro ao excluir resultado:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir resultado.",
        variant: "destructive",
      });
    }
  };

  if (showNewAppointmentForm) {
    return (
      <NewAppointmentForm
        onBack={() => setShowNewAppointmentForm(false)}
        onSuccess={() => {
          setShowNewAppointmentForm(false);
          onAppointmentUpdated();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão para novo agendamento */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewAppointmentForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Lista de agendamentos */}
      {sortedAppointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhum procedimento encontrado
          </h3>
          <p className="text-muted-foreground mb-4">
            Este cliente ainda não possui procedimentos agendados.
          </p>
          <Button onClick={() => setShowNewAppointmentForm(true)}>
            Agendar Primeiro Procedimento
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAppointments.map((appointment) => {
            const appointmentResults = getAppointmentResults(appointment.id);
            const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
            const isPast = appointmentDate < new Date();
            
            return (
              <Card key={appointment.id} className={`border-l-4 ${
                isPast 
                  ? 'border-l-muted-foreground/30' 
                  : 'border-l-primary'
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{appointment.procedure.name}</h3>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(appointment.status)}
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Select
                          value={appointment.status}
                          onValueChange={(newStatus) => handleStatusChange(appointment.id, newStatus)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agendado">Agendado</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="realizado">Realizado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Botão para anexar fotos - apenas para realizados */}
                  {appointment.status === 'realizado' && (
                    <div className="mb-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowResultDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Anexar Foto
                      </Button>
                    </div>
                  )}

                  {/* Resultados do procedimento */}
                  {appointmentResults.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="text-sm font-semibold">Fotos do Procedimento:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {appointmentResults.map((result) => (
                          <div key={result.id} className="relative group">
                            <img
                              src={result.image_url}
                              alt="Resultado do procedimento"
                              className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewImage(result.image_url)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(result.image_url);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(result.image_url, `resultado-${result.id}.jpg`);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteResult(result.id);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {result.description && (
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.description}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para Editar Agendamento */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAppointment} className="space-y-4">
            <div>
              <Label htmlFor="appointment-date">Data</Label>
              <Input
                id="appointment-date"
                type="date"
                value={appointmentFormData.appointment_date}
                onChange={(e) => setAppointmentFormData({...appointmentFormData, appointment_date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="appointment-time">Horário</Label>
              <Input
                id="appointment-time"
                type="time"
                value={appointmentFormData.appointment_time}
                onChange={(e) => setAppointmentFormData({...appointmentFormData, appointment_time: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="appointment-notes">Observações</Label>
              <Textarea
                id="appointment-notes"
                value={appointmentFormData.notes}
                onChange={(e) => setAppointmentFormData({...appointmentFormData, notes: e.target.value})}
                placeholder="Observações do agendamento..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Anexar Resultado */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Resultado do Procedimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="result-file">Foto do Resultado</Label>
              <Input
                id="result-file"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={resultDescription}
                onChange={(e) => setResultDescription(e.target.value)}
                placeholder="Descreva os resultados do procedimento..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowResultDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFileUpload} disabled={loading || !selectedFile}>
                {loading ? "Salvando..." : "Salvar Resultado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de pré-visualização de imagem */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado do Procedimento</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Visualização do resultado"
                className="max-w-full max-h-96 object-contain rounded border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcedureHistory;