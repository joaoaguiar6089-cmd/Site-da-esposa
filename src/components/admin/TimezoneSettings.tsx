import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, Calendar, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimezone } from "@/hooks/useTimezone";
import { BRAZILIAN_TIMEZONES, type BrazilianTimezone } from "@/utils/timezones";

const TimezoneSettings = () => {
  const { timezone, timezoneName, dateFormat, timeFormat, updateTimezone } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const selectedTz = BRAZILIAN_TIMEZONES.find(tz => tz.value === selectedTimezone);

  const handleSave = async () => {
    if (!selectedTz) return;

    try {
      setSaving(true);
      await updateTimezone(selectedTz.value, selectedTz.label);
      
      toast({
        title: "Configurações salvas!",
        description: `Fuso horário alterado para ${selectedTz.label}`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de fuso horário.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Configurações de Fuso Horário
          </CardTitle>
          <CardDescription>
            Configure o fuso horário usado em todo o sistema, incluindo agendamentos, notificações e automações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuração Atual */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fuso Horário Atual:</span>
              <Badge variant="secondary" className="text-sm">
                {timezoneName}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Formato de Data:
              </span>
              <span className="text-sm font-mono">{dateFormat}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Formato de Hora:
              </span>
              <span className="text-sm font-mono">{timeFormat}</span>
            </div>
          </div>

          {/* Seleção de Fuso */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Selecione o Fuso Horário:</label>
            <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fuso horário" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tz.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Detalhes do Fuso Selecionado */}
            {selectedTz && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-blue-900">
                  {selectedTz.label}
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Offset:</strong> {selectedTz.offset}
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Estados:</strong> {selectedTz.states.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Avisos */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Importante:</h4>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
              <li>Esta configuração afeta TODO o sistema</li>
              <li>Agendamentos serão exibidos no novo fuso horário</li>
              <li>Notificações e lembretes usarão este fuso</li>
              <li>Automações serão executadas baseadas neste horário</li>
            </ul>
          </div>

          {/* Botão Salvar */}
          <Button 
            onClick={handleSave} 
            disabled={saving || selectedTimezone === timezone}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>

      {/* Card Informativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre os Fusos Horários do Brasil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {BRAZILIAN_TIMEZONES.map((tz) => (
            <div key={tz.value} className="border-l-4 border-primary pl-4 py-2">
              <h4 className="font-medium text-sm">{tz.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {tz.states.join(', ')}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimezoneSettings;
