import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, TrendingUp, AlertCircle, X, Check, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalMes: number;
  hoje: number;
  amanha: number;
  clientes: number;
  agendado: number;
  confirmado: number;
  realizado: number;
  cancelado: number;
}

interface RecentAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_value?: number | null;
  payment_installments?: number | null;
  payment_notes?: string | null;
  clients: {
    id: string;
    nome: string;
    sobrenome: string;
    celular: string;
  };
  procedures: {
    id: string;
    name: string;
    price: number;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalMes: 0,
    hoje: 0,
    amanha: 0,
    clientes: 0,
    agendado: 0,
    confirmado: 0,
    realizado: 0,
    cancelado: 0
  });

  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<RecentAppointment | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentInstallments, setPaymentInstallments] = useState("1");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [hasReturn, setHasReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  useEffect(() => {
    loadStats();
    loadRecentAppointments();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      // Buscar agendamentos
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', firstDayOfMonth)
        .lte('appointment_date', lastDayOfMonth);

      // Buscar total de clientes
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (allAppointments) {
        const stats = {
          totalMes: allAppointments.length,
          hoje: allAppointments.filter(apt => apt.appointment_date === todayStr).length,
          amanha: allAppointments.filter(apt => apt.appointment_date === tomorrowStr).length,
          clientes: clientsCount || 0,
          agendado: allAppointments.filter(apt => apt.status === 'agendado').length,
          confirmado: allAppointments.filter(apt => apt.status === 'confirmado').length,
          realizado: allAppointments.filter(apt => apt.status === 'realizado').length,
          cancelado: allAppointments.filter(apt => apt.status === 'cancelado').length,
        };

        setStats(stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadRecentAppointments = async () => {
    try {
      const now = new Date();
      const nowStr = now.toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          payment_status,
          payment_method,
          payment_value,
          payment_installments,
          payment_notes,
          clients (
            id,
            nome,
            sobrenome,
            celular
          ),
          procedures (
            id,
            name,
            price
          )
        `)
        .lt('appointment_date', now.toISOString().split('T')[0])
        .or('payment_status.is.null,payment_status.eq.aguardando')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAppointments((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos recentes:', error);
    }
  };

  const handleOpenCancelDialog = (appointment: RecentAppointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleReagendarAppointment = () => {
    setCancelDialogOpen(false);
    // Navegar para o formulário de novo agendamento com os dados pré-preenchidos
    navigate('/admin/agendamento', { 
      state: { 
        clientId: (selectedAppointment?.clients as any)?.id 
      } 
    });
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Agendamento removido",
        description: "O agendamento foi removido com sucesso.",
      });

      setCancelDialogOpen(false);
      loadRecentAppointments();
      loadStats();
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o agendamento.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPaymentDialog = (appointment: RecentAppointment) => {
    setSelectedAppointment(appointment);
    setPaymentStatus((appointment as any).payment_status || "");
    setPaymentMethod((appointment as any).payment_method || "");
    setPaymentValue((appointment as any).payment_value?.toString() || "");
    setPaymentInstallments((appointment as any).payment_installments?.toString() || "1");
    setPaymentNotes((appointment as any).payment_notes || "");
    setHasReturn(false);
    setReturnDate("");
    setReturnTime("");
    setPaymentDialogOpen(true);
  };

  const handleSavePaymentWithReturn = async () => {
    if (!selectedAppointment) return;

    if (!paymentStatus) {
      toast({
        title: "Erro",
        description: "Por favor, selecione o status do pagamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar pagamento do agendamento atual
      const paymentData: any = {
        status: 'realizado',
        payment_status: paymentStatus,
        payment_method: paymentMethod || null,
        payment_value: paymentValue ? parseFloat(paymentValue) : null,
        payment_installments: paymentInstallments ? parseInt(paymentInstallments) : null,
        payment_notes: paymentNotes || null,
      };

      const { error: updateError } = await supabase
        .from('appointments')
        .update(paymentData)
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Se tiver retorno, criar novo agendamento
      if (hasReturn && returnDate && returnTime) {
        const returnAppointment = {
          client_id: (selectedAppointment.clients as any)?.id,
          procedure_id: (selectedAppointment.procedures as any)?.id,
          appointment_date: returnDate,
          appointment_time: returnTime,
          status: 'agendado',
          notes: `Retorno - ${(selectedAppointment.procedures as any)?.name || ''}`,
          payment_status: paymentStatus, // Espelhar o status de pagamento
          payment_method: paymentMethod || null,
          payment_value: paymentValue ? parseFloat(paymentValue) : null,
          payment_installments: paymentInstallments ? parseInt(paymentInstallments) : null,
        };

        const { error: insertError } = await supabase
          .from('appointments')
          .insert([returnAppointment]);

        if (insertError) throw insertError;

        toast({
          title: "Sucesso",
          description: "Pagamento salvo e retorno agendado!",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Pagamento salvo com sucesso!",
        });
      }

      setPaymentDialogOpen(false);
      loadRecentAppointments();
      loadStats();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as informações.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hoje}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Amanhã
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.amanha}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Número de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos Recentes sem Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Agendamentos Recentes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Agendamentos passados que precisam de informações de pagamento
          </p>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum agendamento pendente de pagamento.
            </p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.appointment_time}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(appointment.procedures as any)?.name} - {(appointment.clients as any)?.nome} {(appointment.clients as any)?.sobrenome}
                    </p>
                    <p className="text-sm font-medium text-green-600">
                      Valor: R$ {(appointment.procedures as any)?.price?.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleOpenCancelDialog(appointment)}
                      title="Não Realizado"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleOpenPaymentDialog(appointment)}
                      title="Marcar como Realizado"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status dos Agendamentos e Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hoje</span>
              <Badge className="bg-blue-500">{stats.hoje}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amanhã</span>
              <Badge className="bg-purple-500">{stats.amanha}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/calendario')}
            >
              Ver Agendamentos de Hoje
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/calendario')}
            >
              Ver Agendamentos de Amanhã
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/historico')}
            >
              Visualizar Pagamentos Pendentes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Não Realizado */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendamento Não Realizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O que você gostaria de fazer com este agendamento?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleReagendarAppointment}>
                Reagendar
              </Button>
              <Button variant="destructive" onClick={handleDeleteAppointment}>
                Excluir Definitivamente
              </Button>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pagamento com Retorno */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status do Pagamento *</label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">Aguardando Pagamento</SelectItem>
                  <SelectItem value="nao_pago">Não Pago</SelectItem>
                  <SelectItem value="pago_parcialmente">Pago Parcialmente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Método de Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Valor Pago</label>
              <Input
                type="number"
                step="0.01"
                value={paymentValue}
                onChange={(e) => setPaymentValue(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Parcelas</label>
              <Input
                type="number"
                value={paymentInstallments}
                onChange={(e) => setPaymentInstallments(e.target.value)}
                placeholder="1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Observações</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Notas sobre o pagamento..."
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="hasReturn"
                  checked={hasReturn}
                  onCheckedChange={(checked) => setHasReturn(checked as boolean)}
                />
                <label
                  htmlFor="hasReturn"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tem retorno?
                </label>
              </div>

              {hasReturn && (
                <div className="space-y-3 pl-6 border-l-2">
                  <div>
                    <label className="text-sm font-medium">Data do Retorno</label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Horário do Retorno</label>
                    <Input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePaymentWithReturn}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;