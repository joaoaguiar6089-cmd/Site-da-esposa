import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthSummary {
  month: string;
  year: number;
  totalAppointments: number;
  plannedValue: number;
  receivedValue: number;
  costValue: number;
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
        const profit = summary.receivedValue - summary.costValue;
        const profitLabel = profit >= 0 ? "Lucro" : "Prejuizo";
        const profitColor = profit >= 0 ? "text-blue-600" : "text-amber-600";
        const profitBg = profit >= 0 ? "bg-blue-50/70 border-blue-200" : "bg-amber-50/70 border-amber-200";
        const profitSubtext = profit >= 0 ? "text-blue-500/80" : "text-amber-600/80";
        const profitMargin = summary.receivedValue > 0
          ? Math.round((profit / summary.receivedValue) * 100)
          : 0;
        const costShare = summary.plannedValue > 0
          ? Math.round((summary.costValue / summary.plannedValue) * 100)
          : 0;
        const progressWidth = Math.min(Math.max(percentage, 0), 150);
        
        return (
          <Card 
            key={`${summary.year}-${summary.month}`}
            className="group relative cursor-pointer overflow-hidden border border-primary/15 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            onClick={() => onCardClick(summary.month, summary.year)}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-75 transition-opacity duration-300 group-hover:opacity-100" />
            <CardHeader>
              <div className="relative flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg capitalize text-foreground">
                    {getMonthLabel(summary.month, summary.year)}
                  </CardTitle>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4 text-blue-500" />
                    {summary.totalAppointments} atendimentos
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 border ${isPositive ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-blue-200 bg-blue-50 text-blue-600"}`}
                >
                  <TrendingUp className={`h-3.5 w-3.5 ${isPositive ? "text-emerald-500" : "text-blue-500"}`} />
                  {percentage}% do planejado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Receita prevista
                  </span>
                  <span className="text-foreground">{formatCurrency(summary.plannedValue)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${isPositive ? "bg-emerald-500" : "bg-blue-500"}`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Recebido</span>
                  <span className="font-medium text-foreground">{formatCurrency(summary.receivedValue)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                    Recebido
                  </div>
                  <p className="mt-2 text-lg font-semibold text-emerald-600">
                    {formatCurrency(summary.receivedValue)}
                  </p>
                  <p className="text-xs text-emerald-700/80">
                    {percentage}% do planejado
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-600">
                    <TrendingDown className="h-4 w-4" />
                    Custo
                  </div>
                  <p className="mt-2 text-lg font-semibold text-rose-600">
                    {formatCurrency(summary.costValue)}
                  </p>
                  <p className="text-xs text-rose-700/80">
                    {costShare}% do planejado
                  </p>
                </div>
                <div className={`rounded-xl border ${profitBg} p-3`}>
                  <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${profitColor}`}>
                    <TrendingUp className="h-4 w-4" />
                    {profitLabel}
                  </div>
                  <p className={`mt-2 text-lg font-semibold ${profitColor}`}>
                    {formatCurrency(profit)}
                  </p>
                  <p className={`text-xs ${profitSubtext}`}>
                    Margem {profitMargin}%
                  </p>
                </div>
              </div>

              {summary.topProcedures.length > 0 && (
                <div className="rounded-lg border border-muted/50 bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mais realizados
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {summary.topProcedures.slice(0, 3).map((proc, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="truncate text-muted-foreground">
                          {idx + 1}. {proc.name}
                        </span>
                        <span className="font-medium text-foreground">{proc.count}x</span>
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






