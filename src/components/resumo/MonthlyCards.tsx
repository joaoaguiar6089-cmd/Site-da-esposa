import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Activity, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthSummary {
  month: string;
  year: number;
  totalAppointments: number;
  plannedValue: number;
  receivedValue: number;
  topProcedures: { name: string; count: number }[];
}

interface MonthlyCardsProps {
  summaries: MonthSummary[];
  onCardClick: (month: string, year: number) => void;
}

const MonthlyCards = ({ summaries, onCardClick }: MonthlyCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPercentage = (received: number, planned: number) => {
    if (planned === 0) return 0;
    return Math.round((received / planned) * 100);
  };

  const getMonthLabel = (month: string, year: number) => {
    const date = new Date(year, parseInt(month) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: ptBR });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {summaries.map((summary) => {
        const percentage = getPercentage(summary.receivedValue, summary.plannedValue);
        const isPositive = percentage >= 100;
        
        return (
          <Card 
            key={`${summary.year}-${summary.month}`}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onCardClick(summary.month, summary.year)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {getMonthLabel(summary.month, summary.year)}
                </CardTitle>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Atendimentos</span>
                </div>
                <span className="text-2xl font-bold">{summary.totalAppointments}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Planejado</span>
                  <span className="font-medium">{formatCurrency(summary.plannedValue)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recebido</span>
                  <span className="font-bold text-primary">{formatCurrency(summary.receivedValue)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-orange-500'}`} />
                <Badge variant={isPositive ? "default" : "secondary"}>
                  {percentage}% do planejado
                </Badge>
              </div>

              {summary.topProcedures.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Mais realizados:</p>
                  <div className="space-y-1">
                    {summary.topProcedures.slice(0, 2).map((proc, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="truncate flex-1">{proc.name}</span>
                        <span className="font-medium ml-2">{proc.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MonthlyCards;
