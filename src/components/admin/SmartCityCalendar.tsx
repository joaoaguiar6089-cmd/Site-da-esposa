import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Plus } from "lucide-react";
import { format, parseISO, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface City {
  id: string;
  city_name: string;
}

interface AvailabilityPeriod {
  id?: string;
  city_id: string;
  city_name?: string;
  date_start: string;
  date_end: string;
  start_time?: string;
  end_time?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

type SelectionMode = 'specific' | 'range';

const CITY_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500'
];

const SmartCityCalendar = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('specific');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rangeStart, setRangeStart] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState({
    city_id: '',
    start_time: '08:00',
    end_time: '18:00'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCities();
    loadAvailabilityPeriods();
  }, []);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_settings')
        .select('id, city_name')
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
    }
  };

  const loadAvailabilityPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('city_availability')
        .select(`
          *,
          city_settings!inner(city_name)
        `)
        .order('date_start');

      if (error) throw error;
      
      const periodsWithColors = (data || []).map((period, index) => ({
        ...period,
        city_name: period.city_settings?.city_name,
        color: CITY_COLORS[cities.findIndex(c => c.id === period.city_id) % CITY_COLORS.length]
      }));
      
      setAvailabilityPeriods(periodsWithColors);
    } catch (error) {
      console.error('Erro ao carregar períodos:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectionMode === 'specific') {
      setSelectedDate(date);
      setRangeStart(undefined);
      setRangeEnd(undefined);
      setShowConfigForm(true);
    } else {
      // Modo range - lógica de dois cliques
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Primeiro clique ou reiniciar seleção
        setRangeStart(date);
        setRangeEnd(undefined);
        setSelectedDate(undefined);
      } else {
        // Segundo clique - definir fim do range
        if (date < rangeStart) {
          // Se a segunda data é anterior à primeira, inverter
          setRangeEnd(rangeStart);
          setRangeStart(date);
        } else {
          setRangeEnd(date);
        }
        setShowConfigForm(true);
      }
    }
  };

  const handleSaveConfiguration = async () => {
    if (!currentConfig.city_id || !currentConfig.start_time || !currentConfig.end_time) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const dateStart = selectionMode === 'specific' ? selectedDate : rangeStart;
    const dateEnd = selectionMode === 'specific' ? selectedDate : rangeEnd;

    if (!dateStart || (selectionMode === 'range' && !dateEnd)) {
      toast({
        title: "Seleção inválida",
        description: "Selecione uma data ou intervalo válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const newPeriod = {
        city_id: currentConfig.city_id,
        date_start: format(dateStart, 'yyyy-MM-dd'),
        date_end: format(dateEnd || dateStart, 'yyyy-MM-dd'),
        start_time: currentConfig.start_time,
        end_time: currentConfig.end_time
      };

      const { error } = await supabase
        .from('city_availability')
        .insert(newPeriod);

      if (error) throw error;

      toast({
        title: "Período salvo",
        description: "Período de disponibilidade configurado com sucesso.",
      });

      // Reset form
      setSelectedDate(undefined);
      setRangeStart(undefined);
      setRangeEnd(undefined);
      setShowConfigForm(false);
      setCurrentConfig({
        city_id: '',
        start_time: '08:00',
        end_time: '18:00'
      });

      // Reload data
      loadAvailabilityPeriods();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm('Tem certeza que deseja excluir este período?')) return;

    try {
      const { error } = await supabase
        .from('city_availability')
        .delete()
        .eq('id', periodId);

      if (error) throw error;

      toast({
        title: "Período excluído",
        description: "Período removido com sucesso.",
      });

      loadAvailabilityPeriods();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelSelection = () => {
    setSelectedDate(undefined);
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setShowConfigForm(false);
    setCurrentConfig({
      city_id: '',
      start_time: '08:00',
      end_time: '18:00'
    });
  };

  const isDateInPeriod = (date: Date, period: AvailabilityPeriod) => {
    const start = parseISO(period.date_start);
    const end = parseISO(period.date_end);
    return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
  };

  const getDateColor = (date: Date) => {
    const period = availabilityPeriods.find(p => isDateInPeriod(date, p));
    return period?.color || '';
  };

  const getCityName = (cityId: string) => {
    return cities.find(c => c.id === cityId)?.city_name || 'Cidade não encontrada';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendário Inteligente de Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controles de modo de seleção */}
          <div className="space-y-2">
            <Label>Modo de Seleção</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selectionMode === "specific" ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode("specific");
                  cancelSelection();
                }}
                className="flex-1"
              >
                Dias Específicos
              </Button>
              <Button
                type="button"
                variant={selectionMode === "range" ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode("range");
                  cancelSelection();
                }}
                className="flex-1"
              >
                Intervalo de Datas
              </Button>
            </div>
          </div>

          {/* Instruções */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            {selectionMode === 'specific' ? (
              <p>🎯 <strong>Modo Dias Específicos:</strong> Clique em uma data para configurá-la.</p>
            ) : (
              <p>📅 <strong>Modo Intervalo:</strong> Clique na data de início, depois na data de fim para criar um intervalo.</p>
            )}
          </div>

          {/* Status da seleção atual */}
          {(selectedDate || rangeStart) && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="font-medium">Seleção atual:</p>
              {selectionMode === 'specific' && selectedDate && (
                <p>📅 {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              )}
              {selectionMode === 'range' && rangeStart && (
                <p>
                  📅 {format(rangeStart, "dd 'de' MMMM", { locale: ptBR })}
                  {rangeEnd ? ` até ${format(rangeEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}` : ' (selecione a data final)'}
                </p>
              )}
            </div>
          )}

          {/* Calendário */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className={cn("border rounded-md")}
              locale={ptBR}
              modifiers={{
                selected: (date) => {
                  if (selectedDate && isSameDay(date, selectedDate)) return true;
                  if (rangeStart && isSameDay(date, rangeStart)) return true;
                  if (rangeEnd && isSameDay(date, rangeEnd)) return true;
                  if (rangeStart && rangeEnd && isWithinInterval(date, { start: rangeStart, end: rangeEnd })) return true;
                  return false;
                },
                configured: (date) => availabilityPeriods.some(p => isDateInPeriod(date, p))
              }}
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground font-bold",
                configured: "font-bold text-white"
              }}
              modifiersStyles={{
                configured: {
                  fontWeight: 'bold',
                  color: 'white'
                }
              }}
            />
          </div>

          {/* Formulário de configuração */}
          {showConfigForm && (
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg">Configurar Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Select value={currentConfig.city_id} onValueChange={(value) => setCurrentConfig(prev => ({ ...prev, city_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.id}>{city.city_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start_time">
                    Horário de Início {selectionMode === 'range' && rangeStart ? `(${format(rangeStart, 'dd/MM')})` : ''}
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={currentConfig.start_time}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">
                    Horário de Término {selectionMode === 'range' && rangeEnd ? `(${format(rangeEnd, 'dd/MM')})` : ''}
                  </Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={currentConfig.end_time}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelSelection} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveConfiguration} disabled={loading} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Lista de períodos configurados */}
      <Card>
        <CardHeader>
          <CardTitle>Períodos Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availabilityPeriods.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum período configurado ainda.
              </p>
            ) : (
              availabilityPeriods.map((period) => (
                <div key={period.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded-full", period.color)} />
                    <div>
                      <p className="font-medium">
                        {period.city_name} - {format(parseISO(period.date_start), 'dd/MM/yyyy')}
                        {period.date_start !== period.date_end && ` até ${format(parseISO(period.date_end), 'dd/MM/yyyy')}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {period.start_time} às {period.end_time}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => period.id && handleDeletePeriod(period.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legenda de cores */}
      {cities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Legenda de Cores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {cities.map((city, index) => (
                <div key={city.id} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded-full", CITY_COLORS[index % CITY_COLORS.length])} />
                  <span className="text-sm font-medium">{city.city_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartCityCalendar;