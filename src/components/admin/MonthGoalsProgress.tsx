import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface OtherProceduresStats {
  current_quantity: number;
  current_value: number;
}

const MonthGoalsProgress = () => {
  const navigate = useNavigate();
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);
  const [otherProcedures, setOtherProcedures] = useState<OtherProceduresStats>({
    current_quantity: 0,
    current_value: 0,
  });
  const [totalGoalsStats, setTotalGoalsStats] = useState({
    totalQuantity: 0,
    totalValue: 0,
    targetQuantity: 0,
    targetValue: 0,
  });

  useEffect(() => {
    loadGoalsProgress();
  }, []);

  const loadGoalsProgress = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      // Buscar metas do mês atual
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
        .is('specification_id', null);

      if (goalsError) throw goalsError;

      // Buscar TODOS os agendamentos realizados do mês
      const { data: allAppointments, error: aptError } = await supabase
        .from('appointments')
        .select('procedure_id, payment_value, payment_status, procedures(price)')
        .eq('status', 'realizado')
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
            currentValue += apt.payment_value;
          } else {
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

      // Calcular "Outros Procedimentos"
      const othersQuantity = appointmentsWithoutGoals.length;
      const othersValue = appointmentsWithoutGoals.reduce((sum: number, apt: any) => {
        if (apt.payment_value && apt.payment_value > 0) {
          return sum + apt.payment_value;
        }
        return sum;
      }, 0);

      setOtherProcedures({
        current_quantity: othersQuantity,
        current_value: othersValue,
      });

      // Calcular totais
      const totalQuantity = progress.reduce((sum, g) => sum + g.current_quantity, 0) + othersQuantity;
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

  const getCurrentMonthName = () => {
    const now = new Date();
    return format(now, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleCreateGoal = () => {
    // Navegar para a aba de Metas
    navigate('/admin', {
      state: {
        tab: 'pricing-table',
        activeGoalsTab: 'goals',
        openCreateGoal: true
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas do Mês
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              Acompanhe as metas de vendas para {getCurrentMonthName()}
            </p>
          </div>
          <Button onClick={handleCreateGoal} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Criar Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goalsProgress.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma meta cadastrada para este mês</p>
            <Button onClick={handleCreateGoal} variant="outline" className="mt-4">
              Criar Primeira Meta
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header com totais */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total de Procedimentos</p>
                <p className="text-2xl font-bold">{totalGoalsStats.totalQuantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalGoalsStats.totalValue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Grid de metas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goalsProgress.map((goal) => {
                const quantityProgress = (goal.current_quantity / goal.target_quantity) * 100;
                const valueProgress = (goal.current_value / goal.target_value) * 100;

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
                            navigate('/admin', {
                              state: {
                                tab: 'appointments',
                                initialPaymentFilters: ['aguardando', 'nao_pago', 'pago_parcialmente'],
                                searchTerm: goal.procedure_name
                              }
                            });
                          }}
                          className="text-xs text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
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
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Quantidade</span>
                      <span className="text-sm font-bold">{otherProcedures.current_quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className="text-sm font-bold text-green-600">
                        R$ {otherProcedures.current_value.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Resumo Geral */}
            {totalGoalsStats.targetQuantity > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumo Geral das Metas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Progresso de Quantidade</p>
                    <p className="text-2xl font-bold">
                      {totalGoalsStats.totalQuantity} / {totalGoalsStats.targetQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((totalGoalsStats.totalQuantity / totalGoalsStats.targetQuantity) * 100).toFixed(0)}% da meta total
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Progresso de Valor</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {totalGoalsStats.totalValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((totalGoalsStats.totalValue / totalGoalsStats.targetValue) * 100).toFixed(0)}% de R$ {totalGoalsStats.targetValue.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthGoalsProgress;
