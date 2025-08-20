import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, X, Upload, Image } from "lucide-react";
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
  image_url: string | null;
  benefits: string[] | null;
  is_featured: boolean;
  sessions: number;
  indication: string | null;
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
    category_id: "",
    image_url: "",
    benefits: [] as string[],
    is_featured: false,
    sessions: "1",
    indication: ""
  });
  const [newBenefit, setNewBenefit] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
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
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        benefits: formData.benefits.length > 0 ? formData.benefits : null,
        is_featured: formData.is_featured,
        sessions: parseInt(formData.sessions),
        indication: formData.indication || null
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

      setFormData({ name: "", description: "", duration: "60", price: "", category_id: "", image_url: "", benefits: [], is_featured: false, sessions: "1", indication: "" });
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
      category_id: procedure.category_id || "",
      image_url: procedure.image_url || "",
      benefits: procedure.benefits || [],
      is_featured: procedure.is_featured,
      sessions: procedure.sessions.toString(),
      indication: procedure.indication || ""
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
    setFormData({ name: "", description: "", duration: "60", price: "", category_id: "", image_url: "", benefits: [], is_featured: false, sessions: "1", indication: "" });
    setEditingProcedure(null);
    setNewBenefit("");
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      setFormData({ ...formData, benefits: [...formData.benefits, newBenefit.trim()] });
      setNewBenefit("");
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData({ ...formData, benefits: formData.benefits.filter(b => b !== benefit) });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `procedures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('procedure-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleFeatured = async (procedureId: string, currentStatus: boolean) => {
    try {
      // Check if we're trying to feature and already have 4 featured procedures
      if (!currentStatus) {
        const { count } = await supabase
          .from('procedures')
          .select('*', { count: 'exact', head: true })
          .eq('is_featured', true);

        if (count && count >= 4) {
          toast({
            title: "Limite atingido",
            description: "Você pode ter no máximo 4 procedimentos em destaque.",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('procedures')
        .update({ is_featured: !currentStatus })
        .eq('id', procedureId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Removido dos destaques" : "Adicionado aos destaques",
        description: currentStatus 
          ? "O procedimento foi removido da página inicial." 
          : "O procedimento agora aparece na página inicial.",
      });

      loadProcedures();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProcedure ? "Editar Procedimento" : "Novo Procedimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do procedimento"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="indication">Indicação</Label>
                <Textarea
                  id="indication"
                  value={formData.indication}
                  onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                  placeholder="Para quem é indicado este procedimento"
                  rows={2}
                />
              </div>

              <div>
                <Label>Imagem do Procedimento</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="image_url" className="text-sm text-muted-foreground">URL da Imagem</Label>
                      <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm text-muted-foreground">ou</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
                        >
                          {uploadingImage ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="sessions">Número de Sessões</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="1"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
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
              </div>

              <div>
                <Label>Benefícios</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      placeholder="Adicionar benefício"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBenefit();
                        }
                      }}
                    />
                    <Button type="button" onClick={addBenefit} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {benefit}
                        <button
                          type="button"
                          onClick={() => removeBenefit(benefit)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_featured: checked as boolean })
                  }
                />
                <Label htmlFor="is_featured" className="text-sm font-medium">
                  Destacar na página inicial (máximo 4)
                </Label>
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
            <div className="flex gap-4">
              {procedure.image_url && (
                <div className="flex-shrink-0">
                  <img 
                    src={procedure.image_url} 
                    alt={procedure.name}
                    className="w-24 h-24 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{procedure.name}</h3>
                      {procedure.is_featured && (
                        <Badge variant="default" className="bg-amber-100 text-amber-800">
                          <Star className="w-3 h-3 mr-1" />
                          Destaque
                        </Badge>
                      )}
                    </div>
                    {procedure.categories && (
                      <p className="text-sm text-primary font-medium">{procedure.categories.name}</p>
                    )}
                    {procedure.description && (
                      <p className="text-sm text-muted-foreground mt-1">{procedure.description}</p>
                    )}
                    {procedure.indication && (
                      <p className="text-sm text-primary/80 mt-1">
                        <span className="font-medium">Indicado para:</span> {procedure.indication}
                      </p>
                    )}
                    
                    {procedure.benefits && procedure.benefits.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Benefícios:</p>
                        <div className="flex flex-wrap gap-1">
                          {procedure.benefits.slice(0, 3).map((benefit, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                          {procedure.benefits.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{procedure.benefits.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Duração: {procedure.duration} min</span>
                      <span>Sessões: {procedure.sessions}</span>
                      {procedure.price && (
                        <span>Preço: R$ {procedure.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={procedure.is_featured ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFeatured(procedure.id, procedure.is_featured)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
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