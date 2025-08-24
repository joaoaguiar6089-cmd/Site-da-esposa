import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
}

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: "",
    description: "",
    category_id: ""
  });
  const { toast } = useToast();

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*, categories(name)')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar subcategorias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        
        toast({
          title: "Categoria atualizada",
          description: "A categoria foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Categoria criada",
          description: "A categoria foi adicionada com sucesso.",
        });
      }

      setFormData({ name: "", description: "" });
      setEditingCategory(null);
      setDialogOpen(false);
      loadCategories();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Categoria removida",
        description: "A categoria foi excluída com sucesso.",
      });
      
      loadCategories();
      loadSubcategories();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSubcategory) {
        const { error } = await supabase
          .from('subcategories')
          .update({
            name: subcategoryFormData.name,
            description: subcategoryFormData.description
          })
          .eq('id', editingSubcategory.id);

        if (error) throw error;
        
        toast({
          title: "Subcategoria atualizada",
          description: "A subcategoria foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('subcategories')
          .insert([subcategoryFormData]);

        if (error) throw error;
        
        toast({
          title: "Subcategoria criada",
          description: "A subcategoria foi adicionada com sucesso.",
        });
      }

      setSubcategoryFormData({ name: "", description: "", category_id: "" });
      setEditingSubcategory(null);
      setSubcategoryDialogOpen(false);
      loadSubcategories();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryFormData({
      name: subcategory.name,
      description: subcategory.description || "",
      category_id: subcategory.category_id
    });
    setSubcategoryDialogOpen(true);
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta subcategoria?")) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Subcategoria removida",
        description: "A subcategoria foi excluída com sucesso.",
      });
      
      loadSubcategories();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddSubcategory = (categoryId: string) => {
    setSelectedCategoryForSub(categoryId);
    setSubcategoryFormData({
      name: "",
      description: "",
      category_id: categoryId
    });
    setSubcategoryDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingCategory(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryFormData({ name: "", description: "", category_id: "" });
    setEditingSubcategory(null);
  };

  if (loading) return <div>Carregando categorias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Gerenciar Categorias e Subcategorias</h2>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="subcategories">Subcategorias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Categorias</h3>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Editar Categoria" : "Nova Categoria"}
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
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição opcional da categoria"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCategory ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    )}
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSubcategory(category.id)}
                        className="text-primary hover:text-primary-foreground"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Subcategoria
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {categories.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subcategories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Subcategorias</h3>
            <Dialog open={subcategoryDialogOpen} onOpenChange={(open) => {
              setSubcategoryDialogOpen(open);
              if (!open) resetSubcategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Subcategoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSubcategory ? "Editar Subcategoria" : "Nova Subcategoria"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={subcategoryFormData.category_id} 
                      onValueChange={(value) => setSubcategoryFormData({ ...subcategoryFormData, category_id: value })}
                      required
                    >
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
                    <Label htmlFor="subcategory-name">Nome</Label>
                    <Input
                      id="subcategory-name"
                      value={subcategoryFormData.name}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subcategory-description">Descrição</Label>
                    <Textarea
                      id="subcategory-description"
                      value={subcategoryFormData.description}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, description: e.target.value })}
                      placeholder="Descrição opcional da subcategoria"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingSubcategory ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {subcategories.map((subcategory: any) => (
              <Card key={subcategory.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {subcategory.categories?.name}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">{subcategory.name}</h3>
                    {subcategory.description && (
                      <p className="text-sm text-muted-foreground mt-1">{subcategory.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSubcategory(subcategory)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSubcategory(subcategory.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {subcategories.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma subcategoria cadastrada ainda.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoriesList;