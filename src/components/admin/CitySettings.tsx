import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface City {
  id: string;
  city_name: string;
  is_active: boolean;
  display_order: number;
  clinic_name?: string | null;
  address?: string | null;
  map_url?: string | null;
}

interface CityAvailability {
  id: string;
  city_id: string;
  date_start: string;
  date_end: string | null;
  city_name?: string;
}

const CitySettings = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [availability, setAvailability] = useState<CityAvailability[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [newCityName, setNewCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"specific" | "range">("specific");
  const [rangeStart, setRangeStart] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    loadCities();
    loadAvailability();
  }, []);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCities(data || []);
      
      // Selecionar primeira cidade se não houver seleção
      if (data && data.length > 0 && !selectedCityId) {
        setSelectedCityId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cidades.",
        variant: "destructive",
      });
    }
  };

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('city_availability')
        .select(`
          *,
          city_settings!inner(city_name)
        `)
        .order('date_start');

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        ...item,
        city_name: item.city_settings?.city_name
      })) || [];
      
      setAvailability(formattedData);
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar disponibilidade das cidades.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCity = async () => {
    if (!newCityName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite o nome da cidade.",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextOrder = Math.max(...cities.map(c => c.display_order), 0) + 1;
      
      const { error } = await supabase
        .from('city_settings')
        .insert({
          city_name: newCityName.trim(),
          display_order: nextOrder
        });

      if (error) throw error;

      toast({
        title: "Cidade adicionada",
        description: `Cidade "${newCityName}" foi adicionada com sucesso.`,
      });

      setNewCityName("");
      loadCities();
    } catch (error) {
      console.error('Erro ao adicionar cidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar cidade.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCity = async (cityId: string) => {
    try {
      const { error } = await supabase
        .from('city_settings')
        .update({ is_active: false })
        .eq('id', cityId);

      if (error) throw error;

      toast({
        title: "Cidade removida",
        description: "Cidade foi desativada com sucesso.",
      });

      loadCities();
      if (selectedCityId === cityId) {
        setSelectedCityId("");
      }
    } catch (error) {
      console.error('Erro ao remover cidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover cidade.",
        variant: "destructive",
      });
    }
  };

  // Função para formatar data sem conversão de timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSaveDateRange = async () => {
    if (!selectedCityId) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione uma cidade.",
        variant: "destructive",
      });
      return;
    }

    if (selectionMode === "specific" && selectedDates.length === 0) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione pelo menos uma data.",
        variant: "destructive",
      });
      return;
    }

    if (selectionMode === "range" && (!rangeStart || !rangeEnd)) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione data inicial e final do intervalo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (selectionMode === "range" && rangeStart && rangeEnd) {
        // Modo intervalo - salvar como um único período
        await supabase
          .from('city_availability')
          .insert({
            city_id: selectedCityId,
            date_start: formatDateLocal(rangeStart),
            date_end: formatDateLocal(rangeEnd)
          });

        toast({
          title: "Disponibilidade salva",
          description: `Intervalo de ${rangeStart.toLocaleDateString('pt-BR')} a ${rangeEnd.toLocaleDateString('pt-BR')} salvo com sucesso.`,
        });

        setRangeStart(undefined);
        setRangeEnd(undefined);
      } else {
        // Modo dias específicos - agrupar datas consecutivas
        const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());
        const periods: { start: Date; end: Date | null }[] = [];
        let currentStart = sortedDates[0];
        let currentEnd = sortedDates[0];

        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = sortedDates[i];
          const daysDiff = Math.abs(currentDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 1) {
            currentEnd = currentDate;
          } else {
            periods.push({
              start: currentStart,
              end: currentStart.getTime() === currentEnd.getTime() ? null : currentEnd
            });
            currentStart = currentDate;
            currentEnd = currentDate;
          }
        }
        
        periods.push({
          start: currentStart,
          end: currentStart.getTime() === currentEnd.getTime() ? null : currentEnd
        });

        const insertsPromises = periods.map(period => 
          supabase
            .from('city_availability')
            .insert({
              city_id: selectedCityId,
              date_start: formatDateLocal(period.start),
              date_end: period.end ? formatDateLocal(period.end) : null
            })
        );

        await Promise.all(insertsPromises);

        toast({
          title: "Disponibilidade salva",
          description: `${periods.length} período(s) de disponibilidade foram salvos.`,
        });

        setSelectedDates([]);
      }

      loadAvailability();
    } catch (error) {
      console.error('Erro ao salvar disponibilidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar disponibilidade.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('city_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      toast({
        title: "Disponibilidade removida",
        description: "Período de disponibilidade foi removido.",
      });

      loadAvailability();
    } catch (error) {
      console.error('Erro ao remover disponibilidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover disponibilidade.",
        variant: "destructive",
      });
    }
  };

  // Filtrar disponibilidades da cidade selecionada
  const selectedCityAvailability = availability.filter(a => a.city_id === selectedCityId);

  // Converter disponibilidades em datas para o calendário
  const getAvailableDates = () => {
    const dates: Date[] = [];
    selectedCityAvailability.forEach(avail => {
      const startDate = new Date(avail.date_start);
      const endDate = avail.date_end ? new Date(avail.date_end) : startDate;
      
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando configurações de cidades...</div>
        {/* Endereço da Unidade (por cidade) */}
        {selectedCityId && (
          <div className="mt-6 p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Endereço da Unidade</h4>
            {(() => {
              const idx = cities.findIndex(c => c.id === selectedCityId);
              if (idx === -1) return <p className="text-sm text-muted-foreground">Selecione uma cidade.</p>;
              const city = cities[idx];
              return (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="md:col-span-1">
                    <label className="text-sm text-muted-foreground">Nome da unidade</label>
                    <Input
                      className="mt-1"
                      value={city.clinic_name || ""}
                      onChange={(e) => setCities(prev => prev.map((c,i)=> i===idx ? { ...c, clinic_name: e.target.value } : c))}
                      placeholder="Ex.: Unidade Manaus – Centro"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm text-muted-foreground">Link do mapa (opcional)</label>
                    <Input
                      className="mt-1"
                      value={city.map_url || ""}
                      onChange={(e) => setCities(prev => prev.map((c,i)=> i===idx ? { ...c, map_url: e.target.value } : c))}
                      placeholder="https://maps.google.com/…"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">Endereço completo</label>
                    <Textarea
                      className="mt-1"
                      value={city.address || ""}
                      onChange={(e) => setCities(prev => prev.map((c,i)=> i===idx ? { ...c, address: e.target.value } : c))}
                      placeholder="Rua, número, bairro, complemento"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                      <Button
                        onClick={async () => {
                          const c = cities[idx];
                          await supabase.from('city_settings').update({
                            clinic_name: c.clinic_name || null,
                            address: c.address || null,
                            map_url: c.map_url || null
                          } as any).eq('id', c.id);
                          toast({ title: 'Endereço salvo', description: `Endereço de "${c.city_name}" atualizado.` });
                          loadCities();
                        }}
                      >
                        Salvar endereço
                      </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gerenciamento de Cidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Cidades de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova cidade"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
            />
            <Button onClick={handleAddCity} disabled={!newCityName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {cities.map(city => (
              <Badge key={city.id} variant="secondary" className="flex items-center gap-2">
                {city.city_name}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveCity(city.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendário de Disponibilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Disponibilidade por Cidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="city-select">Selecionar Cidade</Label>
            <select
              id="city-select"
              className="w-full p-2 border border-input rounded-md"
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
            >
              <option value="">Selecione uma cidade</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.city_name}
                </option>
              ))}
            </select>
          </div>

          {selectedCityId && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendário para seleção */}
              <div>
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Modo de Seleção</h4>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={selectionMode === "specific" ? "default" : "outline"}
                      onClick={() => {
                        setSelectionMode("specific");
                        setRangeStart(undefined);
                        setRangeEnd(undefined);
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
                        setSelectedDates([]);
                      }}
                      className="flex-1"
                    >
                      Intervalo de Datas
                    </Button>
                  </div>
                </div>

                {selectionMode === "specific" ? (
                  <>
                    <h4 className="font-medium mb-2">Selecionar Dias Disponíveis</h4>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      className={cn("p-3 pointer-events-auto border rounded-md")}
                    />
                    
                    <Button 
                      onClick={handleSaveDateRange}
                      disabled={saving || selectedDates.length === 0}
                      className="w-full mt-3"
                    >
                      {saving ? "Salvando..." : `Salvar ${selectedDates.length} dia(s) selecionado(s)`}
                    </Button>
                  </>
                ) : (
                  <>
                    <h4 className="font-medium mb-2">Selecionar Intervalo</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Data Inicial</Label>
                        <Calendar
                          mode="single"
                          selected={rangeStart}
                          onSelect={setRangeStart}
                          className={cn("p-3 pointer-events-auto border rounded-md")}
                        />
                      </div>
                      <div>
                        <Label>Data Final</Label>
                        <Calendar
                          mode="single"
                          selected={rangeEnd}
                          onSelect={setRangeEnd}
                          className={cn("p-3 pointer-events-auto border rounded-md")}
                          disabled={(date) => rangeStart ? date < rangeStart : false}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveDateRange}
                      disabled={saving || !rangeStart || !rangeEnd}
                      className="w-full mt-3"
                    >
                      {saving ? "Salvando..." : "Salvar Intervalo"}
                    </Button>
                  </>
                )}
              </div>

              {/* Lista de disponibilidades */}
              <div>
                <h4 className="font-medium mb-2">Períodos Configurados</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedCityAvailability.map(avail => (
                    <div key={avail.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="text-sm">
                        {new Date(avail.date_start).toLocaleDateString('pt-BR')}
                        {avail.date_end && avail.date_end !== avail.date_start && 
                          ` - ${new Date(avail.date_end).toLocaleDateString('pt-BR')}`
                        }
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveAvailability(avail.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {selectedCityAvailability.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Nenhum período configurado
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CitySettings;