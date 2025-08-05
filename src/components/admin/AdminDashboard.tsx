import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  total: number;
  hoje: number;
  agendado: number;
  confirmado: number;
  realizado: number;
  cancelado: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    hoje: 0,
    agendado: 0,
    confirmado: 0,
    realizado: 0,
    cancelado: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Buscar todos os agendamentos
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*');

      if (allAppointments) {
        const today = new Date().toISOString().split('T')[0];
        
        const stats = {
          total: allAppointments.length,
          hoje: allAppointments.filter(apt => apt.appointment_date === today).length,
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

  const dashboardCards = [
    {
      title: "Total de Agendamentos",
      value: stats.total,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Agendamentos Hoje",
      value: stats.hoje,
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Confirmados",
      value: stats.confirmado,
      icon: User,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Realizados",
      value: stats.realizado,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral dos agendamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-full ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Status dos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Agendado</span>
              <Badge variant="default">{stats.agendado}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Confirmado</span>
              <Badge variant="secondary">{stats.confirmado}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Realizado</span>
              <Badge variant="outline">{stats.realizado}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cancelado</span>
              <Badge variant="destructive">{stats.cancelado}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Ver agendamentos de hoje
            </p>
            <p className="text-sm text-muted-foreground">
              • Confirmar agendamentos pendentes
            </p>
            <p className="text-sm text-muted-foreground">
              • Enviar lembretes por WhatsApp
            </p>
            <p className="text-sm text-muted-foreground">
              • Relatório do mês
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;