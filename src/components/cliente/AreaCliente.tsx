import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Plus, Phone, Edit2, Download, X, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import ClientDocuments from "./ClientDocuments";
import type { Client, Appointment, ProcedureResult } from "@/types/client";

interface AreaClienteProps {
  client: Client;
  onNewAppointment: () => void;
  onBack: () => void;
  onClientUpdate?: (updatedClient: Client) => void;
}

const AreaCliente = ({ 
  client, 
  onNewAppointment, 
  onBack,
  onClientUpdate 
}: AreaClienteProps) => {
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [localClient, setLocalClient] = useState<Client>(client);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [procedureResults, setProcedureResults] = useState<{ [key: string]: ProcedureResult[] }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("agendamentos");
  const preSelectedProcedureId = searchParams.get('procedimento');
  const { toast } = useToast();

  useEffect(() => {
    setLocalClient(client);
    loadAppointments();
    
    // Se há um procedimento pré-selecionado, abrir formulário de agendamento
    if (preSelectedProcedureId) {
      setShowNewAppointment(true);
    }
  }, [client, client.id, preSelectedProcedureId]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, statusFilter]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          procedures!appointments_procedure_id_fkey(name, duration, price)
        `)
        .eq('client_id', client.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
      
      // Carregar resultados dos procedimentos para agendamentos realizados
      await loadProcedureResults(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProcedureResults = async (appointmentsList: Appointment[]) => {
    const realizedAppointments = appointmentsList.filter(apt => apt.status === 'realizado');
    
    if (realizedAppointments.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('procedure_results')
        .select('*')
        .in('appointment_id', realizedAppointments.map(apt => apt.id));

      if (error) throw error;

      const resultsMap: { [key: string]: ProcedureResult[] } = {};
      data?.forEach(result => {
        if (!resultsMap[result.appointment_id]) {
          resultsMap[result.appointment_id] = [];
        }
        resultsMap[result.appointment_id].push(result);
      });

      setProcedureResults(resultsMap);
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
    }
  };

  const filterAppointments = () => {
    if (statusFilter === "todos") {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter(apt => apt.status === statusFilter));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: "Agendado", variant: "default" as const },
      confirmado: { label: "Confirmado", variant: "secondary" as const },
      realizado: { label: "Realizado", variant: "secondary" as const },
      cancelado: { label: "Cancelado", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config?.variant || "default"}>
        {config?.label || status}
      </Badge>
    );
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      const formatted = numbers.length > 6 
        ? numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        : numbers.replace(/(\d{2})(\d{0,5})/, '($1) $2');
      setNewPhone(formatted);
    }
  };

  const handlePhoneUpdate = async () => {
    const cleanNewPhone = newPhone.replace(/\D/g, '');
    
    if (cleanNewPhone.length !== 11) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD e 9 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPhone(true);
    
    try {
      const { data, error } = await supabase.rpc('update_client_phone_simple', {
        p_client_id: localClient.id,
        p_cpf: localClient.cpf,
        p_phone: cleanNewPhone
      });

      if (error) throw error;

      const updatedClient = { ...localClient, celular: cleanNewPhone };
      setLocalClient(updatedClient);
      
      if (onClientUpdate) {
        onClientUpdate(updatedClient);
      }
      
      setEditingPhone(false);
      setNewPhone("");
      
      toast({
        title: "Sucesso",
        description: "Telefone atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar telefone:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar telefone. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPhone(false);
    }
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setNewPhone("");
  };

  const handleAppointmentCreated = () => {
    setShowNewAppointment(false);
    setEditingAppointment(null);
    loadAppointments();
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p>Carregando...</p>
      </div>
    );
  }

  if (showNewAppointment) {
    return (
      <AgendamentoForm
        client={localClient}
        onAppointmentCreated={handleAppointmentCreated}
        onBack={() => setShowNewAppointment(false)}
        preSelectedProcedureId={preSelectedProcedureId || undefined}
      />
    );
  }

  if (editingAppointment) {
    return (
      <AgendamentoForm
        client={localClient}
        onAppointmentCreated={handleAppointmentCreated}
        onBack={() => setEditingAppointment(null)}
        editingId={editingAppointment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Meus Dados
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Meus Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-lg">{localClient.nome} {localClient.sobrenome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF</p>
                  <p className="text-lg">{formatCPF(localClient.cpf)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Celular</p>
                  {editingPhone ? (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newPhone}
                        onChange={handlePhoneInputChange}
                        placeholder="(00) 00000-0000"
                        className="flex-1"
                      />
                      <Button 
                        onClick={handlePhoneUpdate} 
                        disabled={updatingPhone}
                        size="sm"
                      >
                        {updatingPhone ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button 
                        onClick={cancelPhoneEdit} 
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg">{formatPhone(localClient.celular)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPhone(true);
                          setNewPhone(formatPhone(localClient.celular));
                        }}
                        className="p-2 h-8"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendamentos" className="mt-6">
          {/* Agendamentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Meus Agendamentos
                </CardTitle>
                <Button
                  onClick={() => setShowNewAppointment(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Agendamento
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtro de Status */}
              <div>
                <label className="text-sm font-medium block mb-2">Filtrar por status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de Agendamentos */}
              {filteredAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {statusFilter === "todos" ? "Nenhum agendamento encontrado." : `Nenhum agendamento ${statusFilter} encontrado.`}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{appointment.procedures?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(appointment.appointment_date)} às {formatTime(appointment.appointment_time)}
                          </p>
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground">
                              Observações: {appointment.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          {(appointment.status === 'agendado' || appointment.status === 'confirmado') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingAppointment(appointment.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Resultados dos Procedimentos */}
                      {appointment.status === 'realizado' && procedureResults[appointment.id] && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-medium mb-2">Fotos dos Resultados</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {procedureResults[appointment.id].map((result) => (
                              <div key={result.id} className="relative group">
                                <div 
                                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => setPreviewImage(result.image_url)}
                                >
                                  <img 
                                    src={result.image_url} 
                                    alt="Resultado do procedimento"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage(result.image_url);
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadImage(result.image_url, `resultado-${appointment.id}-${result.id}.jpg`);
                                      }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <ClientDocuments clientId={localClient.id} />
        </TabsContent>
      </Tabs>

      {/* Botão Voltar */}
      <Button
        onClick={onBack}
        variant="outline"
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Sair
      </Button>

      {/* Modal de Pré-visualização de Imagem */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Foto do Resultado
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={previewImage} 
                alt="Resultado do procedimento"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AreaCliente;