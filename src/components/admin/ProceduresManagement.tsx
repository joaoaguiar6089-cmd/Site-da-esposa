import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
}

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  category_id: string | null;
  categories?: Category;
}

const ProceduresManagement = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "60",
    price: "",
    category_id: ""
  });
  const { toast } = useToast();

  const loadProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;
      setProcedures(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar procedimentos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadProcedures();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const procedureData = {
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : null,
        category_id: formData.category_id || null
      };

      if (editingProcedure) {
        const { error } = await supabase
          .from('procedures')
          .update(procedureData)
          .eq('id', editingProcedure.id);

        if (error) throw error;
        
        toast({
          title: "Procedimento atualizado",
          description: "O procedimento foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('procedures')
          .insert([procedureData]);

        if (error) throw error;
        
        toast({
          title: "Procedimento criado",
          description: "O procedimento foi adicionado com sucesso.",
        });
      }

      setFormData({ name: "", description: "", duration: "60", price: "", category_id: "" });
      setEditingProcedure(null);
      setDialogOpen(false);
      loadProcedures();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    setFormData({
      name: procedure.name,
      description: procedure.description || "",
      duration: procedure.duration.toString(),
      price: procedure.price?.toString() || "",
      category_id: procedure.category_id || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este procedimento?")) return;

    try {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Procedimento removido",
        description: "O procedimento foi excluído com sucesso.",
      });
      
      loadProcedures();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", duration: "60", price: "", category_id: "" });
    setEditingProcedure(null);
  };

  if (loading) return <div>Carregando procedimentos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Procedimentos</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Procedimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProcedure ? "Editar Procedimento" : "Novo Procedimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do procedimento"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingProcedure ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {procedures.map((procedure) => (
          <Card key={procedure.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-foreground">{procedure.name}</h3>
                {procedure.categories && (
                  <p className="text-sm text-primary font-medium">{procedure.categories.name}</p>
                )}
                {procedure.description && (
                  <p className="text-sm text-muted-foreground mt-1">{procedure.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Duração: {procedure.duration} min</span>
                  {procedure.price && (
                    <span>Preço: R$ {procedure.price.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(procedure)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(procedure.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {procedures.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum procedimento cadastrado ainda.</p>
        </Card>
      )}
    </div>
  );
};

export default ProceduresManagement;