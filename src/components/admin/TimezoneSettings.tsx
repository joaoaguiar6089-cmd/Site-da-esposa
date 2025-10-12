import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, Calendar, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimezone } from "@/hooks/useTimezone";
import { BRAZILIAN_TIMEZONES, type BrazilianTimezone } from "@/utils/timezones";

const TimezoneSettings = () => {
  const timezoneContext = useTimezone();
  const { timezone, timezoneName, dateFormat, timeFormat, updateTimezone, loading } = timezoneContext;
  
  console.log('🔍 TimezoneSettings renderizado:', {
    timezone,
    timezoneName,
    loading,
    contextCompleto: !!timezoneContext,
    updateTimezoneTipo: typeof updateTimezone
  });
  
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Sincronizar estado local quando o hook atualizar
  useEffect(() => {
    console.log('🔄 useEffect: timezone do hook mudou para:', timezone);
    setSelectedTimezone(timezone);
  }, [timezone]);

  const selectedTz = BRAZILIAN_TIMEZONES.find(tz => tz.value === selectedTimezone);

  const handleSave = async () => {
    console.log('🔵 handleSave chamado');
    console.log('selectedTz:', selectedTz);
    console.log('timezone do hook:', timezone);
    console.log('selectedTimezone (estado local):', selectedTimezone);
    console.log('🔍 updateTimezone na hora do save:', typeof updateTimezone);
    
    if (!selectedTz) {
      console.log('❌ selectedTz é null/undefined');
      return;
    }

    try {
      setSaving(true);
      console.log('🟡 Chamando updateTimezone...', {
        value: selectedTz.value,
        label: selectedTz.label
      });
      
      await updateTimezone(selectedTz.value, selectedTz.label);
      
      console.log('✅ updateTimezone concluído');
      console.log('✅ Badge deveria atualizar para:', selectedTz.label);
      
      toast({
        title: "Configurações salvas!",
        description: `Fuso horário alterado para ${selectedTz.label}`,
      });
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de fuso horário.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      console.log('🔵 handleSave finalizado');
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

          {/* Aviso Principal */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 mb-2">✅ Agendamentos Existentes:</h4>
            <p className="text-xs text-green-700">
              <strong>Os horários dos agendamentos já criados NÃO serão alterados.</strong> Esta configuração afeta apenas novos agendamentos, notificações futuras e a exibição de datas.
            </p>
          </div>

          {/* Avisos */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Esta configuração afeta:</h4>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
              <li><strong>Novos agendamentos</strong> criados após a mudança</li>
              <li><strong>Formato de exibição</strong> de datas (DD/MM/YYYY)</li>
              <li><strong>Notificações e lembretes</strong> futuros</li>
              <li><strong>Automações</strong> baseadas em horário</li>
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
