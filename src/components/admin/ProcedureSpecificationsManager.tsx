import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  display_order: number;
}

interface ProcedureSpecificationsManagerProps {
  procedureId: string;
  open: boolean;
  onClose: () => void;
}

const ProcedureSpecificationsManager: React.FC<ProcedureSpecificationsManagerProps> = ({
  procedureId,
  open,
  onClose,
}) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSpec, setEditingSpec] = useState<ProcedureSpecification | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    display_order: '1'
  });
  const { toast } = useToast();

  const loadSpecifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('procedure_specifications')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar especificações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar especificações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && procedureId) {
      loadSpecifications();
    }
  }, [open, procedureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast({
        title: "Erro",
        description: "Nome e preço são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const specData = {
        procedure_id: procedureId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        display_order: parseInt(formData.display_order),
        is_active: true,
      };

      if (editingSpec) {
        const { error } = await supabase
          .from('procedure_specifications')
          .update(specData)
          .eq('id', editingSpec.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Especificação atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('procedure_specifications')
          .insert([specData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Especificação criada com sucesso",
        });
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        display_order: '1'
      });
      setEditingSpec(null);
      
      // Reload specifications
      await loadSpecifications();
    } catch (error) {
      console.error('Erro ao salvar especificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar especificação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (spec: ProcedureSpecification) => {
    setEditingSpec(spec);
    setFormData({
      name: spec.name,
      description: spec.description || '',
      price: spec.price.toString(),
      display_order: spec.display_order.toString()
    });
  };

  const handleDelete = async (specId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta especificação?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('procedure_specifications')
        .delete()
        .eq('id', specId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Especificação excluída com sucesso",
      });
      
      await loadSpecifications();
    } catch (error) {
      console.error('Erro ao excluir especificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir especificação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (spec: ProcedureSpecification) => {
    try {
      const { error } = await supabase
        .from('procedure_specifications')
        .update({ is_active: !spec.is_active })
        .eq('id', spec.id);

      if (error) throw error;
      
      await loadSpecifications();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status da especificação",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingSpec(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      display_order: '1'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gerenciar Especificações do Procedimento
          </DialogTitle>
          <DialogDescription>
            Configure as diferentes especificações/aplicações que os clientes podem escolher para este procedimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingSpec ? 'Editar Especificação' : 'Nova Especificação'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Especificação *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Vitamina C, Hidratação Profunda..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva os benefícios e características desta especificação..."
                    rows={3}
                  />
                </div>

                <div className="w-32">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingSpec ? 'Atualizar' : 'Criar'} Especificação
                  </Button>
                  {editingSpec && (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Especificações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Especificações Configuradas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && specifications.length === 0 ? (
                <div className="text-center py-4">Carregando...</div>
              ) : specifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma especificação configurada ainda.</p>
                  <p className="text-sm">Adicione especificações para permitir que os clientes escolham diferentes opções.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specifications.map((spec) => (
                        <TableRow key={spec.id}>
                          <TableCell className="font-medium">{spec.name}</TableCell>
                          <TableCell className="max-w-xs truncate" title={spec.description || ''}>
                            {spec.description || '-'}
                          </TableCell>
                          <TableCell>R$ {spec.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={spec.is_active ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => toggleActive(spec)}
                            >
                              {spec.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>{spec.display_order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(spec)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(spec.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcedureSpecificationsManager;