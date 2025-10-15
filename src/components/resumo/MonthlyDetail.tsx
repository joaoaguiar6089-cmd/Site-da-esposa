import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, DollarSign, Activity, TrendingUp, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateToBrazil } from '@/utils/dateUtils';
import { cn } from "@/lib/utils";

interface MonthlyDetailProps {
  month: string;
  year: number;
  onBack: () => void;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_value?: number | null;
  payment_installments?: number | null;
  clients: {
    nome: string;
    sobrenome: string;
    celular: string;
  };
  procedures: {
    name: string;
    price: number;
  };
}

const MonthlyDetail = ({ month, year, onBack }: MonthlyDetailProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentStatusFilters, setPaymentStatusFilters] = useState<string[]>([]);
  const { toast } = useToast();

  // Estatísticas do mês
  const [stats, setStats] = useState({
    totalAppointments: 0,
    plannedValue: 0,
    receivedValue: 0,
    topProcedures: [] as { name: string; count: number }[]
  });

  useEffect(() => {
    loadMonthData();
  }, [month, year]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter, paymentStatusFilters]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      
      // Calcular primeiro e último dia do mês
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

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
          clients (
            nome,
            sobrenome,
            celular
          ),
          procedures (
            name,
            price
          )
        `)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;

      setAppointments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados do mês:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do mês.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appts: Appointment[]) => {
    const total = appts.length;
    const planned = appts.reduce((sum, apt) => sum + (apt.procedures?.price || 0), 0);
    const received = appts.reduce((sum, apt) => {
      if (apt.payment_status === 'pago' || apt.payment_status === 'pago_parcialmente') {
        return sum + (apt.payment_value || 0);
      }
      return sum;
    }, 0);

    // Contar procedimentos mais realizados
    const procedureCounts = appts.reduce((acc, apt) => {
      const procName = apt.procedures?.name || 'Sem procedimento';
      acc[procName] = (acc[procName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topProcs = Object.entries(procedureCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalAppointments: total,
      plannedValue: planned,
      receivedValue: received,
      topProcedures: topProcs
    });
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clients?.sobrenome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clients?.celular?.includes(searchTerm) ||
        apt.procedures?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== "todos") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filtro de status de pagamento
    if (paymentStatusFilters.length > 0) {
      filtered = filtered.filter(apt => {
        const status = apt.payment_status || 'aguardando';
        return paymentStatusFilters.includes(status);
      });
    }

    setFilteredAppointments(filtered);
  };

  const togglePaymentFilter = (status: string) => {
    setPaymentStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentStatusBadge = (appointment: Appointment) => {
    const status = appointment.payment_status || 'aguardando';
    const variants: Record<string, any> = {
      pago: { label: 'Pago', variant: 'default' },
      pago_parcialmente: { label: 'Parcial', variant: 'secondary' },
      nao_pago: { label: 'Não Pago', variant: 'destructive' },
      aguardando: { label: 'Aguardando', variant: 'outline' },
    };
    
    const config = variants[status] || variants.aguardando;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      agendado: { label: 'Agendado', variant: 'default' },
      concluido: { label: 'Concluído', variant: 'secondary' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
      ausente: { label: 'Ausente', variant: 'outline' },
    };
    
    const config = variants[status] || variants.agendado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const percentage = stats.plannedValue > 0 
    ? Math.round((stats.receivedValue / stats.plannedValue) * 100)
    : 0;

  const monthLabel = format(new Date(year, parseInt(month) - 1, 1), 'MMMM yyyy', { locale: ptBR });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold capitalize">{monthLabel}</h1>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor Planejado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.plannedValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.receivedValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">do planejado</p>
          </CardContent>
        </Card>
      </div>

      {/* Procedimentos mais realizados */}
      {stats.topProcedures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Procedimentos Mais Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topProcedures.map((proc, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{proc.name}</span>
                  <Badge variant="secondary">{proc.count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por cliente, telefone ou procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro de status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status do Agendamento</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de status de pagamento */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Pagamento</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'pago', label: 'Pago' },
                  { value: 'pago_parcialmente', label: 'Parcial' },
                  { value: 'nao_pago', label: 'Não Pago' },
                  { value: 'aguardando', label: 'Aguardando' },
                ].map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payment-${status.value}`}
                      checked={paymentStatusFilters.includes(status.value)}
                      onCheckedChange={() => togglePaymentFilter(status.value)}
                    />
                    <label
                      htmlFor={`payment-${status.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {status.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Histórico de Agendamentos ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum agendamento encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {appointment.clients?.nome} {appointment.clients?.sobrenome}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {appointment.clients?.celular}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(appointment.status)}
                      {getPaymentStatusBadge(appointment)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDateToBrazil(appointment.appointment_date)}</span>
                      <span className="text-muted-foreground">às {appointment.appointment_time}</span>
                    </div>

                    <div>
                      <span className="font-medium">Procedimento:</span>{' '}
                      {appointment.procedures?.name}
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {appointment.payment_value ? (
                        <>
                          <span className="font-medium">{formatCurrency(appointment.payment_value)}</span>
                          {appointment.payment_method && (
                            <span className="text-muted-foreground text-xs">
                              ({appointment.payment_method}
                              {appointment.payment_installments && appointment.payment_installments > 1
                                ? ` ${appointment.payment_installments}x`
                                : ''})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Previsto: {formatCurrency(appointment.procedures?.price || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyDetail;
