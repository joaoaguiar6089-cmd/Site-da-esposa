import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Percent } from 'lucide-react';

interface DiscountConfig {
  id?: string;
  min_groups: number;
  max_groups?: number;
  discount_percentage: number;
  is_active: boolean;
}

interface DiscountConfigManagerProps {
  procedureId: string;
  open: boolean;
  onClose: () => void;
}

const DiscountConfigManager: React.FC<DiscountConfigManagerProps> = ({
  procedureId,
  open,
  onClose,
}) => {
  const [discountConfigs, setDiscountConfigs] = useState<DiscountConfig[]>([]);
  const [formData, setFormData] = useState<DiscountConfig>({
    min_groups: 2,
    max_groups: undefined,
    discount_percentage: 0,
    is_active: true,
  });
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && procedureId) {
      loadDiscountConfigs();
    }
  }, [open, procedureId]);

  const loadDiscountConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_discount_config')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('min_groups', { ascending: true });

      if (error) throw error;

      setDiscountConfigs(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações de desconto:', error);
      toast.error('Erro ao carregar configurações de desconto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.min_groups < 1) {
        toast.error('Quantidade mínima deve ser pelo menos 1');
        return;
      }

      if (formData.discount_percentage <= 0 || formData.discount_percentage > 100) {
        toast.error('Desconto deve estar entre 1% e 100%');
        return;
      }

      if (formData.max_groups && formData.max_groups < formData.min_groups) {
        toast.error('Quantidade máxima deve ser maior que a mínima');
        return;
      }

      // Verificar conflitos com configurações existentes
      const hasConflict = discountConfigs.some(config => {
        if (editingConfig && config.id === editingConfig) return false;
        
        const configMin = config.min_groups;
        const configMax = config.max_groups || Infinity;
        const newMin = formData.min_groups;
        const newMax = formData.max_groups || Infinity;

        return (
          (newMin >= configMin && newMin <= configMax) ||
          (newMax >= configMin && newMax <= configMax) ||
          (newMin <= configMin && newMax >= configMax)
        );
      });

      if (hasConflict) {
        toast.error('Esta configuração conflita com uma configuração existente');
        return;
      }

      const configData = {
        procedure_id: procedureId,
        min_groups: formData.min_groups,
        max_groups: formData.max_groups,
        discount_percentage: formData.discount_percentage,
        is_active: formData.is_active,
      };

      if (editingConfig) {
        const { error } = await supabase
          .from('procedure_discount_config')
          .update(configData)
          .eq('id', editingConfig);

        if (error) throw error;
        toast.success('Configuração atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('procedure_discount_config')
          .insert([configData]);

        if (error) throw error;
        toast.success('Configuração criada com sucesso!');
      }

      resetForm();
      loadDiscountConfigs();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração de desconto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: DiscountConfig & { id: string }) => {
    setFormData({
      min_groups: config.min_groups,
      max_groups: config.max_groups,
      discount_percentage: config.discount_percentage,
      is_active: config.is_active,
    });
    setEditingConfig(config.id);
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) return;

    try {
      const { error } = await supabase
        .from('procedure_discount_config')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      toast.success('Configuração excluída com sucesso!');
      loadDiscountConfigs();
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  const resetForm = () => {
    setFormData({
      min_groups: 2,
      max_groups: undefined,
      discount_percentage: 0,
      is_active: true,
    });
    setEditingConfig(null);
  };

  const formatRange = (config: DiscountConfig) => {
    if (config.max_groups) {
      return `${config.min_groups} - ${config.max_groups} grupos`;
    }
    return `${config.min_groups}+ grupos`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Configurar Promoções por Grupos
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
              </CardTitle>
              <CardDescription>
                Configure descontos baseados na quantidade de grupos de áreas selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_groups">Mín. Grupos</Label>
                    <Input
                      id="min_groups"
                      type="number"
                      min="1"
                      value={formData.min_groups}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        min_groups: parseInt(e.target.value) || 1
                      }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_groups">Máx. Grupos (opcional)</Label>
                    <Input
                      id="max_groups"
                      type="number"
                      min={formData.min_groups}
                      value={formData.max_groups || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        max_groups: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Sem limite"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="discount_percentage">Desconto (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discount_percentage: parseFloat(e.target.value) || 0
                    }))}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Salvando...' : editingConfig ? 'Atualizar' : 'Criar'}
                  </Button>
                  {editingConfig && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações Ativas</CardTitle>
              <CardDescription>
                Promoções configuradas para este procedimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {discountConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Percent className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma configuração de desconto criada</p>
                    <p className="text-sm">Configure promoções para incentivar múltiplas seleções</p>
                  </div>
                ) : (
                  discountConfigs.map((config) => (
                    <Card key={config.id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">
                                {formatRange(config)}
                              </Badge>
                              <Badge variant="outline" className="text-green-600">
                                -{config.discount_percentage}%
                              </Badge>
                              {!config.is_active && (
                                <Badge variant="destructive">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Desconto aplicado quando o cliente selecionar {formatRange(config).toLowerCase()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(config as DiscountConfig & { id: string })}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(config.id!)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">💡 Como funciona:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Os descontos são aplicados automaticamente no agendamento</li>
            <li>• O sistema escolhe o maior desconto aplicável</li>
            <li>• O desconto é calculado sobre o valor total dos grupos selecionados</li>
            <li>• Configurações não podem ter faixas sobrepostas</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountConfigManager;