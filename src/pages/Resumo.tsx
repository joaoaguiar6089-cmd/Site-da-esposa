import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home } from "lucide-react";
import ResumoAuth from "@/components/resumo/ResumoAuth";
import MonthlyCards from "@/components/resumo/MonthlyCards";
import MonthlyDetail from "@/components/resumo/MonthlyDetail";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";

interface MonthSummary {
  month: string;
  year: number;
  totalAppointments: number;
  plannedValue: number;
  receivedValue: number;
  costValue: number;
  topProcedures: { name: string; count: number }[];
}

const Resumo = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; year: number } | null>(null);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadMonthlySummaries();
    }
  }, [authenticated]);

  const checkAuth = () => {
    // Verificar sessão local (não usa Supabase Auth)
    const isAuth = sessionStorage.getItem('resumo_authenticated') === 'true';
    setAuthenticated(isAuth);
    setLoading(false);
  };

  const loadMonthlySummaries = async () => {
    try {
      setLoading(true);

      // Carregar todos os agendamentos
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          payment_status,
          payment_value,
          procedures (
            name,
            price,
            material_cost
          )
        `)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Agrupar por mês
      const monthlyData: Record<string, MonthSummary> = {};

      appointments?.forEach((apt) => {
        const date = new Date(apt.appointment_date);
        const month = (date.getMonth() + 1).toString();
        const year = date.getFullYear();
        const key = `${year}-${month}`;

        if (!monthlyData[key]) {
          monthlyData[key] = {
            month,
            year,
            totalAppointments: 0,
            plannedValue: 0,
            receivedValue: 0,
            costValue: 0,
            topProcedures: []
          };
        }

        monthlyData[key].totalAppointments++;
        monthlyData[key].plannedValue += apt.procedures?.price || 0;
        monthlyData[key].costValue += apt.procedures?.material_cost || 0;

        if (apt.payment_status === 'pago' || apt.payment_status === 'pago_parcialmente') {
          monthlyData[key].receivedValue += apt.payment_value || 0;
        }
      });

      // Calcular procedimentos mais realizados por mês
      for (const key in monthlyData) {
        const monthAppts = appointments?.filter((apt) => {
          const date = new Date(apt.appointment_date);
          const month = (date.getMonth() + 1).toString();
          const year = date.getFullYear();
          return `${year}-${month}` === key;
        });

        const procedureCounts = monthAppts?.reduce((acc, apt) => {
          const procName = apt.procedures?.name || 'Sem procedimento';
          acc[procName] = (acc[procName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        monthlyData[key].topProcedures = Object.entries(procedureCounts || {})
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
      }

      // Converter para array e ordenar
      const summaries = Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return parseInt(b.month) - parseInt(a.month);
      });

      setMonthlySummaries(summaries);
    } catch (error) {
      console.error('Erro ao carregar resumos mensais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar resumos mensais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const username = sessionStorage.getItem('resumo_username');
      
      // Log de segurança
      await supabase.rpc('log_security_event', {
        event_type: 'resumo_logout',
        event_details: { username }
      });
      
      // Limpar sessão local
      sessionStorage.removeItem('resumo_authenticated');
      sessionStorage.removeItem('resumo_username');
      setAuthenticated(false);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da área de resumos.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Limpar sessão mesmo se houver erro no log
      sessionStorage.removeItem('resumo_authenticated');
      sessionStorage.removeItem('resumo_username');
      setAuthenticated(false);
    }
  };

  const goToHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <ResumoAuth onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-card p-4 lg:p-6">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Resumos Financeiros
              </h1>
              <p className="text-muted-foreground text-sm lg:text-base">
                Dra. Karoline Ferreira - Visão Geral
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToHome} className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Ir para o Site</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-4 lg:p-6">
        {selectedMonth ? (
          <MonthlyDetail
            month={selectedMonth.month}
            year={selectedMonth.year}
            onBack={() => setSelectedMonth(null)}
          />
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6">Resumo por Mês</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando resumos...</p>
              </div>
            ) : monthlySummaries.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Nenhum dado disponível ainda
              </p>
            ) : (
              <MonthlyCards
                summaries={monthlySummaries}
                onCardClick={(month, year) => setSelectedMonth({ month, year })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Resumo;
