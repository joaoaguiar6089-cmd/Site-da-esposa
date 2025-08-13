import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleSettings {
  id: string;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  available_days: number[];
  is_active: boolean;
}

const ScheduleSettings = () => {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const dayNames = [
    "Domingo",
    "Segunda-feira", 
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Criar configuração padrão se não existir
        const defaultSettings = {
          start_time: '08:00',
          end_time: '18:00',
          interval_minutes: 60,
          available_days: [1, 2, 3, 4, 5, 6], // Segunda a sábado
          is_active: true
        };
        
        const { data: newData, error: createError } = await supabase
          .from('schedule_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar configuração padrão:', createError);
        } else {
          setSettings(newData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedule_settings')
        .update({
          start_time: settings.start_time,
          end_time: settings.end_time,
          interval_minutes: settings.interval_minutes,
          available_days: settings.available_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações de horários foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    if (!settings) return;

    const newDays = checked 
      ? [...settings.available_days, dayIndex].sort()
      : settings.available_days.filter(day => day !== dayIndex);

    setSettings({
      ...settings,
      available_days: newDays
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando configurações...</div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Erro ao carregar configurações de horários.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Horários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Horário de Início</Label>
              <Input
                id="start_time"
                type="time"
                value={settings.start_time}
                onChange={(e) => setSettings({
                  ...settings,
                  start_time: e.target.value
                })}
              />
            </div>

            <div>
              <Label htmlFor="end_time">Horário de Fim</Label>
              <Input
                id="end_time"
                type="time"
                value={settings.end_time}
                onChange={(e) => setSettings({
                  ...settings,
                  end_time: e.target.value
                })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="interval">Intervalo entre agendamentos (minutos)</Label>
            <Input
              id="interval"
              type="number"
              min="15"
              max="120"
              step="15"
              value={settings.interval_minutes}
              onChange={(e) => setSettings({
                ...settings,
                interval_minutes: parseInt(e.target.value) || 60
              })}
            />
          </div>

          <div>
            <Label>Dias da semana disponíveis</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {dayNames.map((day, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={settings.available_days.includes(index)}
                    onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                  />
                  <Label htmlFor={`day-${index}`} className="text-sm">
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleSettings;