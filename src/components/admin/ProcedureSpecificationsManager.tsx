import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProcedureSpecificationsManagerProps {
  procedureId: string;
  procedureName: string;
  onClose: () => void;
}

const ProcedureSpecificationsManager = ({ procedureId, procedureName, onClose }: ProcedureSpecificationsManagerProps) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<ProcedureSpecification | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    display_order: "1"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSpecifications();
  }, [procedureId]);

  const loadSpecifications = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_specifications')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('display_order');

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar especificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da especificação é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const specData = {
        procedure_id: procedureId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price) || 0,
        display_order: parseInt(formData.display_order) || 1,
        is_active: true
      };

      if (editingSpec) {
        const { error } = await supabase
          .from('procedure_specifications')
          .update({
            name: specData.name,
            description: specData.description,
            price: specData.price,
            display_order: specData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSpec.id);

        if (error) throw error;
        
        toast({
          title: "Especificação atualizada",
          description: "A especificação foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('procedure_specifications')
          .insert([specData]);

        if (error) throw error;
        
        toast({
          title: "Especificação criada",
          description: "A especificação foi criada com sucesso.",
        });
      }

      resetForm();
      setDialogOpen(false);
      loadSpecifications();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (spec: ProcedureSpecification) => {
    setEditingSpec(spec);
    setFormData({
      name: spec.name,
      description: spec.description || "",
      price: spec.price.toString(),
      display_order: spec.display_order.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a especificação "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('procedure_specifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Especificação removida",
        description: "A especificação foi excluída com sucesso.",
      });
      
      loadSpecifications();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      display_order: "1"
    });
    setEditingSpec(null);
  };

  const handleNewSpec = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando especificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Especificações do Procedimento</h2>
          <p className="text-muted-foreground">{procedureName}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewSpec}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Especificação  
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>

      {specifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma especificação cadastrada para este procedimento.
            </p>
            <Button onClick={handleNewSpec}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Especificação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Especificações Cadastradas ({specifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specifications.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell className="font-medium">{spec.name}</TableCell>
                    <TableCell>
                      {spec.description ? (
                        <span className="text-sm text-muted-foreground">
                          {spec.description.length > 50 
                            ? `${spec.description.substring(0, 50)}...` 
                            : spec.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem descrição</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {spec.price > 0 ? (
                        <span className="font-medium">
                          R$ {spec.price.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Gratuito</span>
                      )}
                    </TableCell>
                    <TableCell>{spec.display_order}</TableCell>
                    <TableCell>
                      <Badge variant={spec.is_active ? "default" : "secondary"}>
                        {spec.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(spec)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(spec.id, spec.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog para criar/editar especificação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSpec ? "Editar Especificação" : "Nova Especificação"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Especificação *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vitamina C, Ácido Hialurônico..."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os benefícios e características desta especificação..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSpec ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcedureSpecificationsManager;