import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ScheduleException {
  id: string;
  date_start: string;
  date_end: string | null;
  is_closed: boolean;
  custom_start_time: string | null;
  custom_end_time: string | null;
  custom_interval_minutes: number | null;
  reason: string | null;
}

interface NewException {
  date_start: string;
  date_end: string;
  is_closed: boolean;
  custom_start_time: string;
  custom_end_time: string;
  custom_interval_minutes: number;
  reason: string;
}

const ScheduleExceptions = () => {
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const [newException, setNewException] = useState<NewException>({
    date_start: "",
    date_end: "",
    is_closed: false,
    custom_start_time: "08:00",
    custom_end_time: "18:00",
    custom_interval_minutes: 60,
    reason: ""
  });

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .order('date_start', { ascending: true });

      if (error) {
        console.error('Erro ao carregar exceções:', error);
        return;
      }

      setExceptions(data || []);
    } catch (error) {
      console.error('Erro ao carregar exceções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddException = async () => {
    if (!newException.date_start) {
      toast({
        title: "Erro",
        description: "Data de início é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const exceptionData = {
        date_start: newException.date_start,
        date_end: newException.date_end || null,
        is_closed: newException.is_closed,
        custom_start_time: newException.is_closed ? null : newException.custom_start_time,
        custom_end_time: newException.is_closed ? null : newException.custom_end_time,
        custom_interval_minutes: newException.is_closed ? null : newException.custom_interval_minutes,
        reason: newException.reason || null
      };

      const { error } = await supabase
        .from('schedule_exceptions')
        .insert(exceptionData);

      if (error) {
        throw error;
      }

      toast({
        title: "Exceção adicionada",
        description: "A exceção de horário foi criada com sucesso.",
      });

      setShowAddDialog(false);
      setNewException({
        date_start: "",
        date_end: "",
        is_closed: false,
        custom_start_time: "08:00",
        custom_end_time: "18:00",
        custom_interval_minutes: 60,
        reason: ""
      });
      loadExceptions();
    } catch (error) {
      console.error('Erro ao salvar exceção:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a exceção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta exceção?")) return;

    try {
      const { error } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Exceção removida",
        description: "A exceção de horário foi removida com sucesso.",
      });

      loadExceptions();
    } catch (error) {
      console.error('Erro ao remover exceção:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover a exceção. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando exceções...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exceções de Horários</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exceção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Exceção de Horário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_start">Data Início *</Label>
                    <Input
                      id="date_start"
                      type="date"
                      value={newException.date_start}
                      onChange={(e) => setNewException({
                        ...newException,
                        date_start: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_end">Data Fim</Label>
                    <Input
                      id="date_end"
                      type="date"
                      value={newException.date_end}
                      onChange={(e) => setNewException({
                        ...newException,
                        date_end: e.target.value
                      })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_closed"
                    checked={newException.is_closed}
                    onCheckedChange={(checked) => setNewException({
                      ...newException,
                      is_closed: checked as boolean
                    })}
                  />
                  <Label htmlFor="is_closed">Clínica fechada (sem agendamentos)</Label>
                </div>

                {!newException.is_closed && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="custom_start_time">Horário Início</Label>
                        <Input
                          id="custom_start_time"
                          type="time"
                          value={newException.custom_start_time}
                          onChange={(e) => setNewException({
                            ...newException,
                            custom_start_time: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom_end_time">Horário Fim</Label>
                        <Input
                          id="custom_end_time"
                          type="time"
                          value={newException.custom_end_time}
                          onChange={(e) => setNewException({
                            ...newException,
                            custom_end_time: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="custom_interval">Intervalo (minutos)</Label>
                      <Input
                        id="custom_interval"
                        type="number"
                        min="15"
                        max="120"
                        step="15"
                        value={newException.custom_interval_minutes}
                        onChange={(e) => setNewException({
                          ...newException,
                          custom_interval_minutes: parseInt(e.target.value) || 60
                        })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Textarea
                    id="reason"
                    value={newException.reason}
                    onChange={(e) => setNewException({
                      ...newException,
                      reason: e.target.value
                    })}
                    placeholder="Ex: Feriado, Férias, Evento especial..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddException} 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddDialog(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma exceção de horário configurada.</p>
              <p className="text-sm">Adicione exceções para dias especiais, feriados ou fechamentos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception) => (
                <div 
                  key={exception.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      <strong>
                        {formatDate(exception.date_start)}
                        {exception.date_end && ` até ${formatDate(exception.date_end)}`}
                      </strong>
                      {exception.is_closed && (
                        <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded">
                          FECHADO
                        </span>
                      )}
                    </div>
                    
                    {!exception.is_closed && exception.custom_start_time && (
                      <div className="text-sm text-muted-foreground">
                        Horário: {exception.custom_start_time} às {exception.custom_end_time}
                        {exception.custom_interval_minutes && ` (${exception.custom_interval_minutes}min)`}
                      </div>
                    )}
                    
                    {exception.reason && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {exception.reason}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteException(exception.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleExceptions;