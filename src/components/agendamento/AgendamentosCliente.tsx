import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Plus, Phone, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { Client, Appointment } from "@/types/client";
import { formatDateToBrazil } from "@/utils/dateUtils";

interface AgendamentosClienteProps {
  client: Client;
  onNewAppointment: () => void;
  onBack: () => void;
  onClientUpdate?: (updatedClient: Client) => void; // Nova prop para atualizar cliente pai
}

const AgendamentosCliente = ({ 
  client, 
  onNewAppointment, 
  onBack,
  onClientUpdate 
}: AgendamentosClienteProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [localClient, setLocalClient] = useState<Client>(client); // Estado local do cliente
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalClient(client);
    loadAppointments();
  }, [client, client.id]);

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
      setAppointments((data as any) || []);
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

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'agendado': { label: 'Agendado', variant: 'default' as const },
      'confirmado': { label: 'Confirmado', variant: 'default' as const },
      'realizado': { label: 'Realizado', variant: 'secondary' as const },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus?: string | null) => {
    const status = paymentStatus || 'aguardando';
    
    const statusConfig = {
      'aguardando': { label: 'Aguardando', className: 'bg-white border-2 border-gray-300 text-gray-700' },
      'nao_pago': { label: 'Não Pago', className: 'bg-red-500 text-white border-0' },
      'pago_parcialmente': { label: 'Pago Parcialmente', className: 'bg-yellow-500 text-white border-0' },
      'pago': { label: 'Pago', className: 'bg-green-500 text-white border-0' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aguardando;
    
    return (
      <Badge className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const handleOpenPaymentDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPaymentDialogOpen(true);
  };

  const handlePhoneInputChange = (value: string) => {
    // Remove tudo que não é número e limita a 11 dígitos
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      setNewPhone(formatPhone(numbers));
    }
  };

  const handlePhoneUpdate = async () => {
    if (updatingPhone) return; // Previne múltiplas chamadas
    
    const phoneNumbers = newPhone.replace(/\D/g, '');
    
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Digite um número válido com 10 ou 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPhone(true);

    try {
      console.log('Iniciando atualização do telefone para cliente:', client.id);
      
      // Usar a função RPC simples que atualiza apenas a tabela clients
      const { data, error } = await supabase.rpc('update_client_phone_simple' as any, {
        p_client_id: client.id,
        p_cpf: client.cpf,
        p_phone: phoneNumbers
      });

      if (error) {
        console.error('Erro na função RPC update_client_phone:', error);
        throw error;
      }

      console.log('Telefone atualizado com sucesso via RPC');

      // Atualizar o objeto cliente local
      const updatedClient = {
        ...client,
        celular: phoneNumbers
      };

      // Atualizar estado local
      setLocalClient(updatedClient);

      // Chamar a função de atualização do componente pai, se existir
      if (onClientUpdate) {
        console.log('Notificando componente pai sobre atualização');
        onClientUpdate(updatedClient);
      }

      toast({
        title: "Telefone atualizado",
        description: "Seu número foi atualizado com sucesso.",
      });

      setEditingPhone(false);
      setNewPhone("");

    } catch (error: any) {
      console.error('Erro ao atualizar telefone:', error);
      
      let message = "Erro ao atualizar telefone.";
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        message = "Problema de conexão. Verifique sua internet e tente novamente.";
      } else if (error?.message?.includes('function') || error?.message?.includes('rpc')) {
        message = "Função de atualização não encontrada. Contate o suporte.";
      } else if (error?.message) {
        message = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro",
        description: message,
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

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <p>Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{localClient.nome} {localClient.sobrenome}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CPF</p>
            <p className="font-medium">{formatCPF(localClient.cpf)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Celular</p>
            {editingPhone ? (
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={newPhone}
                  onChange={(e) => handlePhoneInputChange(e.target.value)}
                  className="w-full"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  style={{ fontSize: '16px' }} // Previne zoom no iOS
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handlePhoneUpdate}
                    disabled={updatingPhone || newPhone.replace(/\D/g, '').length < 10}
                    className="flex-1"
                  >
                    {updatingPhone ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelPhoneEdit}
                    disabled={updatingPhone}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatPhone(localClient.celular)}</p>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setEditingPhone(true);
                    setNewPhone(formatPhone(localClient.celular));
                  }}
                  title="Editar telefone"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Agendamentos</CardTitle>
          <Button size="sm" onClick={onNewAppointment}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum agendamento encontrado</p>
              <p className="text-sm">Clique em "Novo" para agendar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{appointment.procedures.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateToBrazil(appointment.appointment_date)} às {formatTime(appointment.appointment_time)}
                      </p>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPaymentDialog(appointment)}
                        className="h-8 w-8 p-0"
                        title="Ver detalhes de pagamento"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes de pagamento (somente leitura) */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes de Pagamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="text-sm bg-muted p-3 rounded">
                <p><strong>Procedimento:</strong> {selectedAppointment.procedures.name}</p>
                <p><strong>Data:</strong> {formatDateToBrazil(selectedAppointment.appointment_date)} às {formatTime(selectedAppointment.appointment_time)}</p>
                <p><strong>Valor do Procedimento:</strong> R$ {selectedAppointment.procedures.price?.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Status do Pagamento</label>
                <div className="mt-2">
                  {getPaymentStatusBadge((selectedAppointment as any).payment_status)}
                </div>
              </div>

              {(selectedAppointment as any).payment_status && (selectedAppointment as any).payment_status !== 'aguardando' ? (
                <div className="space-y-3 text-sm border-t pt-3">
                  {(selectedAppointment as any).payment_value && (
                    <div>
                      <strong>Valor Pago:</strong>
                      <p className="mt-1">R$ {(selectedAppointment as any).payment_value.toFixed(2)}</p>
                    </div>
                  )}
                  {(selectedAppointment as any).payment_method && (
                    <div>
                      <strong>Forma de Pagamento:</strong>
                      <p className="mt-1">{
                        (selectedAppointment as any).payment_method === 'pix' ? 'PIX' :
                        (selectedAppointment as any).payment_method === 'cartao' ? 'Cartão' :
                        'Dinheiro'
                      }</p>
                    </div>
                  )}
                  {(selectedAppointment as any).payment_method === 'cartao' && (selectedAppointment as any).payment_installments && (
                    <div>
                      <strong>Parcelas:</strong>
                      <p className="mt-1">{(selectedAppointment as any).payment_installments}x</p>
                    </div>
                  )}
                  {(selectedAppointment as any).payment_notes && (
                    <div>
                      <strong>Observações:</strong>
                      <p className="mt-1 text-muted-foreground">{(selectedAppointment as any).payment_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground border-t pt-3">
                  Ainda não há informações de pagamento para este agendamento.
                </p>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setPaymentDialogOpen(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Botão Voltar */}
      <Button
        variant="outline"
        onClick={onBack}
        className="w-full flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>
    </div>
  );
};

export default AgendamentosCliente;