// @ts-nocheck
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Edit, Camera, Eye, Download, Trash2, Plus, CheckCircle, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPackageInfo, formatSessionProgress, recalculatePackageSessions } from "@/utils/packageUtils";
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
import CompletedProcedureForm from "./CompletedProcedureForm";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  city_id?: string | null;
  notes?: string;
  session_number?: number;
  total_sessions?: number;
  payment_status?: string;
  payment_method?: string;
  payment_value?: number;
  payment_installments?: number | null;
  payment_notes?: string | null;
  procedure: {
    id?: string;
    name: string;
    duration: number;
    price: number;
    sessions?: number | null;
    requires_specifications?: boolean;
    body_selection_type?: string | null;
    body_image_url?: string | null;
    body_image_url_male?: string | null;
    description?: string | null;
  };
  client: {
    id: string;
    nome: string;
    sobrenome: string;
  };
  city_settings?: {
    city_name?: string | null;
  } | null;
  appointments_procedures?: Array<{
    order_index?: number | null;
    procedure?: {
      id?: string;
      name: string;
      duration: number;
      price: number;
      requires_specifications?: boolean;
      body_selection_type?: string | null;
      body_image_url?: string | null;
      body_image_url_male?: string | null;
      description?: string | null;
    } | null;
  }>;
  appointment_specifications?: {
    specification_id: string;
    specification_name: string;
    specification_price: number;
  }[];
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
  client: {
    id: string;
    nome: string;
    sobrenome: string;
    cpf: string;
    celular: string;
  };
  onAppointmentUpdated: () => void;
  onResultUploaded: () => void;
}

const ProcedureHistory = ({ 
  appointments, 
  results, 
  clientId,
  client,
  onAppointmentUpdated,
  onResultUploaded
}: ProcedureHistoryProps) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [showCompletedProcedureForm, setShowCompletedProcedureForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentBeingEdited, setAppointmentBeingEdited] = useState<Appointment | null>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { toast } = useToast();

  // Ordenar appointments por data (futuros primeiro, depois passados)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    const now = new Date();
    
    // Futuros primeiro (ordenaÃ§Ã£o crescente)
    if (dateA >= now && dateB >= now) {
      return dateA.getTime() - dateB.getTime();
    }
    // Passados depois (ordenaÃ§Ã£o decrescente)
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
    setAppointmentBeingEdited(appointment);
    setShowEditForm(true);
  };

  const closeEditForm = () => {
    setShowEditForm(false);
    setAppointmentBeingEdited(null);
    setSelectedAppointment(null);
  };

  const handleEditSuccess = () => {
    toast({
      title: "Agendamento atualizado",
      description: "O agendamento foi atualizado com sucesso.",
    });
    closeEditForm();
    onAppointmentUpdated();
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

      // Atualizar status do agendamento para "realizado" apenas se nÃ£o foi um upload adicional
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
        title: "Resultado excluÃ­do",
        description: "O resultado do procedimento foi excluÃ­do com sucesso.",
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

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento? Esta aÃ§Ã£o nÃ£o pode ser desfeita.')) return;

    try {
      setLoading(true);

      const { data: appointmentInfo, error: fetchError } = await supabase
        .from('appointments')
        .select('id, client_id, procedure_id, total_sessions')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;
      
      // Primeiro, excluir todos os resultados relacionados ao agendamento
      const { error: resultsError } = await supabase
        .from('procedure_results')
        .delete()
        .eq('appointment_id', appointmentId);

      if (resultsError) throw resultsError;

      // Excluir especificaÃ§Ãµes do agendamento
      const { error: specsError } = await supabase
        .from('appointment_specifications')
        .delete()
        .eq('appointment_id', appointmentId);

      if (specsError) throw specsError;

      // Excluir seleÃ§Ãµes de Ã¡rea do corpo
      const { error: bodyError } = await supabase
        .from('appointment_body_selections')
        .delete()
        .eq('appointment_id', appointmentId);

      if (bodyError) throw bodyError;

      // Por Ãºltimo, excluir o agendamento
      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      let packageSessions = appointmentInfo?.total_sessions || 1;

      if (appointmentInfo?.procedure_id) {
        const { data: procedureInfo, error: procedureError } = await supabase
          .from('procedures')
          .select('sessions')
          .eq('id', appointmentInfo.procedure_id)
          .single();

        if (procedureError && procedureError.code !== 'PGRST116') throw procedureError;

        if (procedureInfo?.sessions && procedureInfo.sessions > packageSessions) {
          packageSessions = procedureInfo.sessions;
        }
      }

      if (appointmentInfo?.client_id && appointmentInfo?.procedure_id && packageSessions > 1) {
        await recalculatePackageSessions(
          supabase,
          appointmentInfo.client_id,
          appointmentInfo.procedure_id,
          packageSessions
        );
      }

      toast({
        title: "Agendamento excluÃ­do",
        description: "O agendamento foi excluÃ­do com sucesso.",
      });

      onAppointmentUpdated();
    } catch (error: any) {
      console.error('Erro ao excluir agendamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showNewAppointmentForm) {
    return (
      <NewBookingFlow
        onBack={() => setShowNewAppointmentForm(false)}
        onSuccess={() => {
          setShowNewAppointmentForm(false);
          onAppointmentUpdated();
        }}
        adminMode={true}
        initialClient={client}
        sendNotification={true}
      />
    );
  }

  if (showCompletedProcedureForm) {
    return (
      <CompletedProcedureForm
        client={client}
        onBack={() => setShowCompletedProcedureForm(false)}
        onSuccess={() => {
          setShowCompletedProcedureForm(false);
          onAppointmentUpdated();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* BotÃµes para novo agendamento e procedimento realizado */}
      <div className="flex justify-end gap-3">
        <Button 
          onClick={() => setShowCompletedProcedureForm(true)} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Inserir Procedimento Realizado
        </Button>
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
            Este cliente ainda nÃ£o possui procedimentos agendados.
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => setShowCompletedProcedureForm(true)}
              variant="outline"
            >
              Inserir Procedimento Realizado
            </Button>
            <Button onClick={() => setShowNewAppointmentForm(true)}>
              Agendar Primeiro Procedimento
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAppointments.map((appointment) => {
            const appointmentResults = getAppointmentResults(appointment.id);
            const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
            const isPast = appointmentDate < new Date();
            
            // Preparar objeto para packageUtils
            const aptWithProcedures = {
              ...appointment,
              procedures: appointment.procedure
            };
            
            return (
              <Card key={appointment.id} className={`border-l-4 ${
                isPast 
                  ? 'border-l-muted-foreground/30' 
                  : 'border-l-primary'
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {appointment.session_number && appointment.total_sessions && appointment.total_sessions > 1
                            ? getPackageInfo(aptWithProcedures).displayName
                            : appointment.procedure.name
                          }
                        </h3>
                        {appointment.session_number && appointment.total_sessions && appointment.total_sessions > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {formatSessionProgress(aptWithProcedures)}
                          </Badge>
                        )}
                      </div>
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
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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

                  {/* InformaÃ§Ãµes de Pagamento */}
                  {(appointment.payment_status || appointment.payment_method || appointment.payment_value) && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">InformaÃ§Ãµes de Pagamento</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        {appointment.payment_status && (
                          <div>
                            <span className="text-muted-foreground">Status: </span>
                            <Badge variant={appointment.payment_status === 'pago' ? 'default' : 'secondary'} className="text-xs">
                              {appointment.payment_status}
                            </Badge>
                          </div>
                        )}
                        {appointment.payment_method && (
                          <div>
                            <span className="text-muted-foreground">MÃ©todo: </span>
                            <span className="font-medium">{appointment.payment_method}</span>
                          </div>
                        )}
                        {appointment.payment_value && (
                          <div>
                            <span className="text-muted-foreground">Valor: </span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(appointment.payment_value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BotÃ£o para anexar fotos - apenas para realizados */}
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
      <Dialog
        open={showEditForm}
        onOpenChange={(open) => {
          if (!open) {
            closeEditForm();
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          {appointmentBeingEdited ? (
            <NewBookingFlow
              onBack={closeEditForm}
              onSuccess={handleEditSuccess}
              adminMode={true}
              initialClient={{
                id: client.id,
                cpf: client.cpf,
                nome: client.nome,
                sobrenome: client.sobrenome,
                celular: client.celular,
              }}
              sendNotification={true}
              editingAppointmentId={appointmentBeingEdited.id}
              allowPastDates={true}
              initialAppointment={{
                id: appointmentBeingEdited.id,
                appointment_date: appointmentBeingEdited.appointment_date,
                appointment_time: appointmentBeingEdited.appointment_time,
                city_id: appointmentBeingEdited.city_id,
                notes: appointmentBeingEdited.notes ?? null,
                procedures: appointmentBeingEdited.procedure,
                appointments_procedures: appointmentBeingEdited.appointments_procedures,
                appointment_specifications: appointmentBeingEdited.appointment_specifications || null,
                city_settings: appointmentBeingEdited.city_settings,
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um agendamento para editar.
            </p>
          )}
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
              <Label htmlFor="description">DescriÃ§Ã£o (opcional)</Label>
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

      {/* Modal de prÃ©-visualizaÃ§Ã£o de imagem */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado do Procedimento</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="VisualizaÃ§Ã£o do resultado"
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


