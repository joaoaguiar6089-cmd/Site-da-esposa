import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Plus, Edit, Trash2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

const GoalsManagement = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    procedure_id: "",
    quantity: "",
    target_month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      organizeGoalsByMonth();
    }
  }, [goals]);

  const organizeGoalsByMonth = () => {
    console.log('Organizando goals:', goals);
    
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    
    // Agrupar metas por mês
    const grouped = goals.reduce((acc, goal) => {
      const month = goal.target_month.slice(0, 7);
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(goal);
      return acc;
    }, {} as Record<string, Goal[]>);

    console.log('Grouped:', grouped);

    // Ordenar meses e criar grupos
    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    const groups: MonthGroup[] = sortedMonths.map((month, index) => {
      const date = new Date(month + '-01');
      const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const isCurrentMonth = month === currentMonth;
      
      return {
        month,
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        isOpen: isCurrentMonth, // Abrir apenas o mês atual por padrão
        goals: grouped[month],
      };
    });

    console.log('Month groups criados:', groups);
    setMonthGroups(groups);
  };

  const toggleMonth = (month: string) => {
    setMonthGroups(prev =>
      prev.map(group =>
        group.month === month ? { ...group, isOpen: !group.isOpen } : group
      )
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar procedimentos
      const { data: proceduresData, error: procError } = await supabase
        .from('procedures')
        .select('id, name, price')
        .order('name');

      if (procError) throw procError;
      setProcedures(proceduresData || []);

      // Carregar metas (apenas aquelas sem specification_id, para simplificar)
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
      
      console.log('Goals carregadas:', goalsData);
      setGoals((goalsData as any) || []);
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

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        procedure_id: goal.procedure_id,
        quantity: goal.quantity.toString(),
        target_month: goal.target_month.slice(0, 7), // YYYY-MM
      });
    } else {
      setEditingGoal(null);
      setFormData({
        procedure_id: "",
        quantity: "",
        target_month: new Date().toISOString().slice(0, 7),
      });
    }
    setDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!formData.procedure_id || !formData.quantity || !formData.target_month) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const goalData = {
        procedure_id: formData.procedure_id,
        quantity: parseInt(formData.quantity),
        target_month: formData.target_month + '-01', // Converter YYYY-MM para YYYY-MM-01
        specification_id: null, // Sempre null, ignoramos especificações
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('procedure_monthly_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;

        toast({
          title: "Meta atualizada",
          description: "A meta foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('procedure_monthly_goals')
          .insert([goalData]);

        if (error) throw error;

        toast({
          title: "Meta criada",
          description: "A meta foi criada com sucesso.",
        });
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar meta:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Erro",
          description: "Já existe uma meta para este procedimento neste mês.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível salvar a meta.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      const { error } = await supabase
        .from('procedure_monthly_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Meta excluída",
        description: "A meta foi excluída com sucesso.",
      });

      loadData();
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a meta.",
        variant: "destructive",
      });
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1];
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
            Gerenciamento de Metas
          </h2>
          <p className="text-muted-foreground">Defina metas mensais por procedimento</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {monthGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma meta cadastrada.</p>
              <p className="text-sm">Clique em "Nova Meta" para começar.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => (
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
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {group.goals.map((goal) => {
                        const displayName = goal.procedures?.name || 'Procedimento';
                        const price = goal.procedures?.price || 0;
                        
                        return (
                          <Card key={goal.id} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base">
                                  {displayName}
                                </CardTitle>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(goal)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Quantidade Alvo</p>
                                <p className="text-2xl font-bold flex items-center gap-2">
                                  <TrendingUp className="h-5 w-5 text-blue-600" />
                                  {goal.quantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Valor Estimado</p>
                                <p className="text-2xl font-bold text-green-600">
                                  R$ {(price * goal.quantity).toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  R$ {price.toFixed(2)} x {goal.quantity}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Procedimento *</Label>
              <Select
                value={formData.procedure_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, procedure_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.name} - R$ {(proc.price || 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mês/Ano da Meta *</Label>
              <Input
                type="month"
                value={formData.target_month}
                onChange={(e) =>
                  setFormData({ ...formData, target_month: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selecione o mês e ano para esta meta
              </p>
            </div>

            <div>
              <Label>Quantidade Alvo *</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Ex: 10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número de agendamentos realizados desejados neste mês
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGoal}>
                {editingGoal ? "Atualizar" : "Criar"} Meta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsManagement;
