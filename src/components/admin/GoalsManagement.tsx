import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Goal {
  id: string;
  procedure_id: string;
  specification_id?: string | null;
  quantity: number;
  target_month: string;
  procedures: {
    name: string;
    price: number | null;
  };
  procedure_specifications?: {
    specification_name: string;
    specification_price: number;
  } | null;
}

interface Procedure {
  id: string;
  name: string;
  price: number;
}

interface MonthGroup {
  month: string;
  monthName: string;
  isOpen: boolean;
  goals: Goal[];
}

interface GoalProgress {
  id: string;
  procedure_id: string;
  procedure_name: string;
  target_quantity: number;
  target_value: number;
  current_quantity: number;
  current_value: number;
  pending_payments_count: number;
}

interface OtherProcedures {
  current_quantity: number;
  current_value: number;
}

const GoalsManagement = () => {
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthProgress, setMonthProgress] = useState<Record<string, { progress: GoalProgress[], others: OtherProcedures }>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadMonthProgress = async (month: string) => {
    try {
      setLoadingProgress(prev => ({ ...prev, [month]: true }));

      // Get the first and last day of the month
      const [year, monthNum] = month.split('-');
      const firstDay = `${year}-${monthNum}-01`;
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

      // Buscar metas do mês (ignorar specification_id)
      const { data: goalsData, error: goalsError } = await supabase
        .from('procedure_monthly_goals')
        .select(`
          id,
          procedure_id,
          quantity,
          procedures (
            name,
            price
          )
        `)
        .is('specification_id', null)
        .gte('target_month', firstDay)
        .lte('target_month', lastDayStr);

      if (goalsError) throw goalsError;

      // Buscar appointments do mês (excluir cancelados)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('procedure_id, payment_value, payment_status, procedures(price)')
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDayStr)
        .neq('status', 'cancelado');

      if (appointmentsError) throw appointmentsError;

      // Calcular progresso para cada meta
      const progress: GoalProgress[] = (goalsData || []).map((goal: any) => {
        const procedureAppointments = (appointmentsData || []).filter(
          (apt: any) => apt.procedure_id === goal.procedure_id
        );

        let currentValue = 0;
        let pendingPaymentsCount = 0;

        procedureAppointments.forEach((apt: any) => {
          // Contar apenas appointments COM payment_value preenchido
          if (apt.payment_value && apt.payment_value > 0) {
            currentValue += apt.payment_value;
          }
          
          // Contar pagamentos pendentes
          if (!apt.payment_status || apt.payment_status === 'aguardando' || apt.payment_status === 'nao_pago' || apt.payment_status === 'pago_parcialmente') {
            pendingPaymentsCount++;
          }
        });

        const targetValue = (goal.procedures?.price || 0) * goal.quantity;

        return {
          id: goal.id,
          procedure_id: goal.procedure_id,
          procedure_name: goal.procedures?.name || 'Procedimento',
          target_quantity: goal.quantity,
          target_value: targetValue,
          current_quantity: procedureAppointments.length,
          current_value: currentValue,
          pending_payments_count: pendingPaymentsCount,
        };
      });

      // Calcular "Outros Procedimentos" - apenas valores COM payment_value preenchido
      const goalProcedureIds = (goalsData || []).map((g: any) => g.procedure_id);
      const othersValue = (appointmentsData || []).reduce((sum: number, apt: any) => {
        if (!goalProcedureIds.includes(apt.procedure_id)) {
          if (apt.payment_value && apt.payment_value > 0) {
            return sum + apt.payment_value;
          }
        }
        return sum; // Não adiciona se não tem payment_value
      }, 0);

      const othersQuantity = (appointmentsData || []).filter(
        (apt: any) => !goalProcedureIds.includes(apt.procedure_id)
      ).length;

      const others: OtherProcedures = {
        current_quantity: othersQuantity,
        current_value: othersValue,
      };

      setMonthProgress(prev => ({
        ...prev,
        [month]: { progress, others },
      }));
    } catch (error) {
      console.error('Erro ao carregar progresso do mês:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o progresso do mês.",
        variant: "destructive",
      });
    } finally {
      setLoadingProgress(prev => ({ ...prev, [month]: false }));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar metas (apenas aquelas sem specification_id)
      const { data: goalsData, error: goalsError } = await supabase
        .from('procedure_monthly_goals')
        .select(`
          id,
          procedure_id,
          specification_id,
          quantity,
          target_month,
          procedures (
            name,
            price
          )
        `)
        .is('specification_id', null)
        .order('target_month', { ascending: false });

      if (goalsError) throw goalsError;

      // Organizar metas por mês
      const grouped = (goalsData || []).reduce((acc: any, goal: any) => {
        const month = goal.target_month.slice(0, 7);
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(goal);
        return acc;
      }, {});

      // Criar grupos de mês
      const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
      const currentMonth = new Date().toISOString().slice(0, 7);

      const groups: MonthGroup[] = sortedMonths.map((month) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const isCurrentMonth = month === currentMonth;

        return {
          month,
          monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          isOpen: isCurrentMonth, // Abrir apenas o mês atual por padrão
          goals: grouped[month],
        };
      });

      setMonthGroups(groups);

      // Carregar progresso do mês atual automaticamente
      if (groups.length > 0 && groups[0].isOpen) {
        await loadMonthProgress(groups[0].month);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = async (month: string) => {
    const group = monthGroups.find(g => g.month === month);
    if (!group) return;

    const newIsOpen = !group.isOpen;

    // Atualizar estado de abertura
    setMonthGroups(prev =>
      prev.map(g =>
        g.month === month ? { ...g, isOpen: newIsOpen } : g
      )
    );

    // Se está abrindo e não tem dados carregados, carregar
    if (newIsOpen && !monthProgress[month]) {
      await loadMonthProgress(month);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Metas por Mês
          </h2>
          <p className="text-muted-foreground">Visualize o progresso das metas mensais</p>
        </div>
      </div>

      {monthGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma meta cadastrada.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const progressData = monthProgress[group.month];
            const goalsProgress = progressData?.progress || [];
            const otherProcedures = progressData?.others || { current_quantity: 0, current_value: 0 };

            // Calcular totais - QUANTIDADE: apenas metas, VALOR: todos
            const totalQuantity = goalsProgress.reduce((sum, g) => sum + g.current_quantity, 0);
            const totalTargetQuantity = goalsProgress.reduce((sum, g) => sum + g.target_quantity, 0);
            const totalValue = goalsProgress.reduce((sum, g) => sum + g.current_value, 0) + otherProcedures.current_value;
            const totalTargetValue = goalsProgress.reduce((sum, g) => sum + g.target_value, 0);

            return (
              <Card key={group.month}>
                <Collapsible open={group.isOpen} onOpenChange={() => toggleMonth(group.month)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{group.monthName}</CardTitle>
                          <Badge variant="secondary">{group.goals.length} meta{group.goals.length !== 1 ? 's' : ''}</Badge>
                        </div>
                        {group.isOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-6">
                      {/* Mostrar loading ou conteúdo */}
                      {loadingProgress[group.month] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : progressData ? (
                        <>
                          {/* Cards de Metas - Estilo Dashboard */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                          const [year, monthNum] = group.month.split('-');
                                          const firstDay = `${year}-${monthNum}-01`;
                                          const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
                                          const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

                                          navigate('/admin', {
                                            state: {
                                              tab: 'appointments',
                                              initialPaymentFilters: ['aguardando', 'nao_pago', 'pago_parcialmente'],
                                              searchTerm: goal.procedure_name,
                                              dateFrom: firstDay,
                                              dateTo: lastDayStr
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
                          {totalTargetQuantity > 0 && (
                            <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                              <h4 className="font-semibold mb-3">Resumo Geral</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total de Procedimentos</p>
                                  <p className="text-xl font-bold">
                                    {totalQuantity} / {totalTargetQuantity}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {((totalQuantity / totalTargetQuantity) * 100).toFixed(0)}% das metas
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Valor Total</p>
                                  <p className="text-xl font-bold text-green-600">
                                    R$ {totalValue.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {totalTargetValue > 0 ? ((totalValue / totalTargetValue) * 100).toFixed(0) : 0}% de R$ {totalTargetValue.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsManagement;
