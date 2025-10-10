import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, TrendingUp, AlertCircle, X, Check, DollarSign, Users, Target } from "lucide-react";
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
  status: string;
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

interface GoalProgress {
  id: string;
  procedure_id: string;
  procedure_name: string;
  target_quantity: number;
  target_value: number;
  current_quantity: number;
  current_value: number;
  pending_payments_count: number; // Quantidade de appointments sem payment_value
}

interface OtherProceduresStats {
  current_quantity: number;
  current_value: number;
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
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);
  const [otherProcedures, setOtherProcedures] = useState<OtherProceduresStats>({ current_quantity: 0, current_value: 0 });
  const [totalGoalsStats, setTotalGoalsStats] = useState({ totalQuantity: 0, totalValue: 0, targetQuantity: 0, targetValue: 0 });
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
    loadGoalsProgress();
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
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS (com segundos)

      console.log('🔍 CARREGANDO AGENDAMENTOS RECENTES');
      console.log('Data atual:', todayStr, 'Hora atual:', currentTime);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
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
        .lte('appointment_date', todayStr) // Incluir até hoje
        .limit(100); // Buscar mais para garantir que após filtro temos suficientes

      if (error) throw error;

      console.log('Total de appointments do DB:', data?.length);
      const day09 = (data || []).filter((apt: any) => apt.appointment_date === '2025-10-09');
      console.log('Appointments do dia 09 (TODOS):', day09.length);
      if (day09.length > 0) {
        console.log('Detalhes dia 09:', day09.map((apt: any) => ({
          hora: apt.appointment_time,
          status: apt.status,
          cliente: apt.clients?.nome
        })));
      }
      
      // Filtrar cancelados no lado do cliente
      const notCanceled = (data || []).filter((apt: any) => {
        return apt.status?.toLowerCase() !== 'cancelado';
      });

      console.log('Após remover cancelados:', notCanceled.length);
      const day09NotCanceled = notCanceled.filter((apt: any) => apt.appointment_date === '2025-10-09');
      console.log('Dia 09 não cancelados:', day09NotCanceled.length);

      // Filtrar pelo lado do cliente para incluir apenas os que já passaram (data + hora)
      const filtered = notCanceled.filter((apt: any) => {
        const aptDate = apt.appointment_date;
        const aptTime = apt.appointment_time;
        
        // Se for antes de hoje, incluir
        if (aptDate < todayStr) return true;
        
        // Se for hoje, verificar se o horário já passou
        if (aptDate === todayStr && aptTime <= currentTime) return true;
        
        return false;
      });

      console.log('Após filtro de data/hora:', filtered.length);
      const day09Filtered = filtered.filter((apt: any) => apt.appointment_date === '2025-10-09');
      console.log('Dia 09 após filtro:', day09Filtered.length);
      if (day09Filtered.length > 0) {
        console.log('Dia 09 que passaram no filtro:', day09Filtered.map((apt: any) => ({
          hora: apt.appointment_time,
          passou: apt.appointment_time <= currentTime
        })));
      }

      // Ordenar do mais recente para o mais antigo (data DESC, hora DESC)
      filtered.sort((a: any, b: any) => {
        // Primeiro comparar datas
        if (a.appointment_date !== b.appointment_date) {
          return b.appointment_date.localeCompare(a.appointment_date);
        }
        // Se datas iguais, comparar horários
        return b.appointment_time.localeCompare(a.appointment_time);
      });

      console.log('Top 10 após ordenação:');
      filtered.slice(0, 10).forEach((apt: any, idx: number) => {
        console.log(`${idx + 1}. ${apt.appointment_date} ${apt.appointment_time} - ${apt.clients?.nome} - ${apt.procedures?.name}`);
      });

      // Limitar a 10 após ordenação
      setRecentAppointments(filtered.slice(0, 10) as any);
    } catch (error) {
      console.error('Erro ao carregar agendamentos recentes:', error);
    }
  };

  const loadGoalsProgress = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      // Buscar metas do mês atual (ignorar specification_id)
      const { data: goals, error: goalsError } = await supabase
        .from('procedure_monthly_goals')
        .select(`
          id,
          procedure_id,
          quantity,
          target_month,
          procedures (
            name,
            price
          )
        `)
        .gte('target_month', firstDay)
        .lte('target_month', lastDay)
        .is('specification_id', null); // Apenas metas sem especificação

      if (goalsError) throw goalsError;

      // Buscar TODOS os agendamentos do mês (exceto cancelados)
      const { data: allAppointments, error: aptError } = await supabase
        .from('appointments')
        .select('procedure_id, payment_value, payment_status, procedures(price)')
        .neq('status', 'cancelado') // Ignorar cancelados
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay);

      if (aptError) throw aptError;

      const appointmentsData = (allAppointments as any) || [];

      // Criar set de procedure_ids que têm metas
      const procedureIdsWithGoals = new Set((goals || []).map((g: any) => g.procedure_id));

      // Separar agendamentos com meta e sem meta
      const appointmentsWithGoals = appointmentsData.filter((apt: any) =>
        procedureIdsWithGoals.has(apt.procedure_id)
      );
      const appointmentsWithoutGoals = appointmentsData.filter((apt: any) =>
        !procedureIdsWithGoals.has(apt.procedure_id)
      );

      // Calcular progresso de cada meta
      const progress: GoalProgress[] = (goals || []).map((goal: any) => {
        const goalAppointments = appointmentsWithGoals.filter(
          (apt: any) => apt.procedure_id === goal.procedure_id
        );

        const currentQuantity = goalAppointments.length;
        
        // Contar apenas appointments COM payment_value preenchido
        let currentValue = 0;
        let pendingPaymentsCount = 0;
        
        goalAppointments.forEach((apt: any) => {
          if (apt.payment_value && apt.payment_value > 0) {
            // Soma apenas se tem valor de pagamento preenchido
            currentValue += apt.payment_value;
          } else {
            // Conta como pagamento pendente
            pendingPaymentsCount++;
          }
        });

        const price = goal.procedures?.price || 0;

        return {
          id: goal.id,
          procedure_id: goal.procedure_id,
          procedure_name: goal.procedures?.name || 'Procedimento',
          target_quantity: goal.quantity,
          target_value: price * goal.quantity,
          current_quantity: currentQuantity,
          current_value: currentValue,
          pending_payments_count: pendingPaymentsCount,
        };
      });

      // Calcular "Outros Procedimentos" - apenas valores COM payment_value preenchido
      const othersQuantity = appointmentsWithoutGoals.length;
      const othersValue = appointmentsWithoutGoals.reduce((sum: number, apt: any) => {
        if (apt.payment_value && apt.payment_value > 0) {
          return sum + apt.payment_value;
        }
        return sum; // Não adiciona se não tem payment_value
      }, 0);

      setOtherProcedures({
        current_quantity: othersQuantity,
        current_value: othersValue,
      });

      // Calcular totais
      // Quantidade: APENAS procedimentos com meta (NÃO incluir "Outros")
      const totalQuantity = progress.reduce((sum, g) => sum + g.current_quantity, 0);
      // Valor: TODOS os procedimentos do mês (incluir "Outros")
      const totalValue = progress.reduce((sum, g) => sum + g.current_value, 0) + othersValue;
      const targetQuantity = progress.reduce((sum, g) => sum + g.target_quantity, 0);
      const targetValue = progress.reduce((sum, g) => sum + g.target_value, 0);

      setTotalGoalsStats({
        totalQuantity,
        totalValue,
        targetQuantity,
        targetValue,
      });

      setGoalsProgress(progress);
    } catch (error) {
      console.error('Erro ao carregar progresso das metas:', error);
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

    // Validar campos quando status é pago ou pago parcialmente
    if (paymentStatus === 'pago' || paymentStatus === 'pago_parcialmente') {
      if (!paymentMethod) {
        toast({
          title: "Erro",
          description: "Por favor, selecione o método de pagamento.",
          variant: "destructive",
        });
        return;
      }

      if (!paymentValue || parseFloat(paymentValue) <= 0) {
        toast({
          title: "Erro",
          description: "Por favor, informe o valor pago.",
          variant: "destructive",
        });
        return;
      }

      if (paymentMethod === 'cartao' && (!paymentInstallments || parseInt(paymentInstallments) < 1)) {
        toast({
          title: "Erro",
          description: "Por favor, informe o número de parcelas.",
          variant: "destructive",
        });
        return;
      }
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
              onClick={() => {
                const today = new Date();
                navigate('/admin', { 
                  state: { 
                    tab: 'calendar',
                    initialDate: today
                  } 
                });
              }}
            >
              Ver Agendamentos de Hoje
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                navigate('/admin', { 
                  state: { 
                    tab: 'calendar',
                    initialDate: tomorrow
                  } 
                });
              }}
            >
              Ver Agendamentos de Amanhã
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                navigate('/admin', { 
                  state: { 
                    tab: 'appointments',
                    initialPaymentFilters: ['aguardando', 'nao_pago', 'pago_parcialmente']
                  } 
                });
              }}
            >
              Visualizar Pagamentos Pendentes
            </Button>
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
          {(() => {
            console.log('🎨 RENDERIZANDO LISTA:', recentAppointments.length, 'appointments');
            console.log('🎨 Appointments para renderizar:', recentAppointments.map((apt: any) => ({
              data: apt.appointment_date,
              hora: apt.appointment_time,
              cliente: apt.clients?.nome,
              procedimento: apt.procedures?.name
            })));
            return null;
          })()}
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

      {/* Painel de Metas do Mês */}
      {(goalsProgress.length > 0 || otherProcedures.current_quantity > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Metas do Mês
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                Total: {totalGoalsStats.totalQuantity} procedimentos | R$ {totalGoalsStats.totalValue.toFixed(2)}
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Progresso dos procedimentos realizados no mês atual
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cards de Metas */}
              {goalsProgress.map((goal) => {
                const quantityProgress = goal.target_quantity > 0 ? (goal.current_quantity / goal.target_quantity) * 100 : 0;
                const valueProgress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
                
                return (
                  <Card key={goal.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{goal.procedure_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Progresso de Quantidade */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Quantidade</span>
                          <span className="text-sm font-bold">
                            {goal.current_quantity}/{goal.target_quantity}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              quantityProgress >= 100
                                ? 'bg-green-500'
                                : quantityProgress >= 75
                                ? 'bg-blue-500'
                                : quantityProgress >= 50
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(quantityProgress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {quantityProgress.toFixed(0)}% da meta
                        </p>
                      </div>

                      {/* Progresso de Valor */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Valor</span>
                          <span className="text-sm font-bold text-green-600">
                            R$ {goal.current_value.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              valueProgress >= 100
                                ? 'bg-green-500'
                                : valueProgress >= 75
                                ? 'bg-blue-500'
                                : valueProgress >= 50
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(valueProgress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {valueProgress.toFixed(0)}% de R$ {goal.target_value.toFixed(2)}
                        </p>
                      </div>

                      {/* Link para pagamentos pendentes */}
                      {goal.pending_payments_count > 0 && (
                        <button
                          onClick={() => {
                            // Calcular primeiro e último dia do mês atual
                            const now = new Date();
                            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                            
                            navigate('/admin', {
                              state: {
                                tab: 'appointments',
                                initialPaymentFilters: ['aguardando', 'nao_pago', 'pago_parcialmente'],
                                searchTerm: goal.procedure_name,
                                dateFrom: firstDay,
                                dateTo: lastDay
                              }
                            });
                          }}
                          className="text-xs text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 mt-2"
                        >
                          * Ver {goal.pending_payments_count} pagamento{goal.pending_payments_count > 1 ? 's' : ''} pendente{goal.pending_payments_count > 1 ? 's' : ''}
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Card Outros Procedimentos */}
              {otherProcedures.current_quantity > 0 && (
                <Card className="border-2 border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-muted-foreground">Outros Procedimentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Quantidade Realizada</span>
                        <span className="text-2xl font-bold">
                          {otherProcedures.current_quantity}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Valor Recebido</span>
                        <span className="text-2xl font-bold text-green-600">
                          R$ {otherProcedures.current_value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Procedimentos sem meta definida
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Resumo Total */}
            {totalGoalsStats.targetQuantity > 0 && (
              <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                <h4 className="font-semibold mb-3">Resumo Geral</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Procedimentos</p>
                    <p className="text-xl font-bold">
                      {totalGoalsStats.totalQuantity} / {totalGoalsStats.targetQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((totalGoalsStats.totalQuantity / totalGoalsStats.targetQuantity) * 100).toFixed(0)}% das metas
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {totalGoalsStats.totalValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((totalGoalsStats.totalValue / totalGoalsStats.targetValue) * 100).toFixed(0)}% de R$ {totalGoalsStats.targetValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  <SelectItem value="nao_pago">Não Pago</SelectItem>
                  <SelectItem value="pago_parcialmente">Pago Parcialmente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(paymentStatus === 'pago' || paymentStatus === 'pago_parcialmente') && (
              <>
                <div>
                  <label className="text-sm font-medium">Método de Pagamento *</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'cartao' && (
                  <div>
                    <label className="text-sm font-medium">Número de Parcelas *</label>
                    <Input
                      type="number"
                      min="1"
                      value={paymentInstallments}
                      onChange={(e) => setPaymentInstallments(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Valor Pago *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentValue}
                    onChange={(e) => setPaymentValue(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

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