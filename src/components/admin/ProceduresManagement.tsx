import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, Edit2, Trash2, X, Star, StarOff, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageEditor } from "./ImageEditor";
import { Checkbox } from "@/components/ui/checkbox";
import BodyAreasManager from "./BodyAreasManager";
import ProcedureDiscountManager from "./ProcedureDiscountManager";
import ProcedureSpecificationsManager from "./ProcedureSpecificationsManager";

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  benefits: string[] | null;
  is_featured: boolean;
  sessions: number;
  indication: string | null;
  requires_specifications?: boolean;
  requires_body_selection?: boolean;
  body_selection_type?: string;
  body_image_url?: string;
  body_image_url_male?: string;
  categories?: Category;
  subcategories?: {
    name: string;
  };
}

const ProceduresManagement = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  
  // Filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "60",
    price: "",
    category_id: "",
    subcategory_id: "",
    image_url: "",
    benefits: [] as string[],
    is_featured: false,
    sessions: "1",
    indication: "",
    requires_specifications: false,
    requires_body_selection: false,
    body_selection_type: "",
    body_image_url: "",
    body_image_url_male: ""
  });
  const [newBenefit, setNewBenefit] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [uploadingBodyImageMale, setUploadingBodyImageMale] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedBodyImageFile, setSelectedBodyImageFile] = useState<File | null>(null);
  const [selectedBodyImageMaleFile, setSelectedBodyImageMaleFile] = useState<File | null>(null);
  const [bodyAreasManagerOpen, setBodyAreasManagerOpen] = useState(false);
  const [specificationsManagerOpen, setSpecificationsManagerOpen] = useState(false);
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
          ),
          subcategories (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      setProcedures(data || []);
      setFilteredProcedures(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar procedimentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar subcategorias",
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
    }
  };

  useEffect(() => {
    loadCategories();
    loadSubcategories();
    loadProcedures();
  }, []);

  // Filtrar procedimentos
  useEffect(() => {
    let filtered = procedures;

    if (searchTerm) {
      filtered = filtered.filter(procedure =>
        procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(procedure => procedure.category_id === selectedCategory);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(procedure => procedure.subcategory_id === selectedSubcategory);
    }

    setFilteredProcedures(filtered);
  }, [procedures, searchTerm, selectedCategory, selectedSubcategory]);

  // Mapear valores "all" para estado vazio
  const displaySelectedCategory = selectedCategory || "all";
  const displaySelectedSubcategory = selectedSubcategory || "all";
  const availableSubcategories = selectedCategory 
    ? subcategories.filter(sub => sub.category_id === selectedCategory)
    : subcategories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const procedureData = {
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        image_url: formData.image_url || null,
        benefits: formData.benefits.length > 0 ? formData.benefits : null,
        is_featured: formData.is_featured,
        sessions: parseInt(formData.sessions),
        indication: formData.indication || null,
        requires_specifications: formData.requires_specifications,
        requires_body_selection: formData.requires_body_selection,
        body_selection_type: formData.body_selection_type || null,
        body_image_url: formData.body_image_url || null,
        body_image_url_male: formData.body_image_url_male || null
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

      resetForm();
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
      subcategory_id: procedure.subcategory_id || "",
      image_url: procedure.image_url || "",
      benefits: procedure.benefits || [],
      is_featured: procedure.is_featured,
      sessions: procedure.sessions.toString(),
      indication: procedure.indication || "",
      requires_specifications: procedure.requires_specifications || false,
      requires_body_selection: procedure.requires_body_selection || false,
      body_selection_type: procedure.body_selection_type || "",
      body_image_url: procedure.body_image_url || "",
      body_image_url_male: procedure.body_image_url_male || ""
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
    setFormData({ 
      name: "", 
      description: "", 
      duration: "60", 
      price: "", 
      category_id: "", 
      subcategory_id: "",
      image_url: "", 
      benefits: [], 
      is_featured: false, 
      sessions: "1", 
      indication: "",
      requires_specifications: false,
      requires_body_selection: false,
      body_selection_type: "",
      body_image_url: "",
      body_image_url_male: ""
    });
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

    // Open image editor instead of uploading directly
    setSelectedImageFile(file);
    setImageEditorOpen(true);
  };

  const handleEditExistingImage = () => {
    if (formData.image_url) {
      setSelectedImageFile(null);
      setImageEditorOpen(true);
    }
  };

  const handleImageSave = async (canvas: HTMLCanvasElement) => {
    setUploadingImage(true);
    
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const file = new File([blob], `procedure-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('procedure-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: data.publicUrl });
      setImageEditorOpen(false);
      setSelectedImageFile(null);
      
      toast({
        title: "Sucesso",
        description: "Imagem ajustada e enviada com sucesso!",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleFeatured = async (procedureId: string, currentStatus: boolean) => {
    try {
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

  const uploadBodyImage = async (file: File) => {
    if (!file) return;

    setUploadingBodyImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `body-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('procedure-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        body_image_url: publicUrl
      }));

      toast({
        title: "Upload realizado",
        description: "Imagem corporal enviada com sucesso!",
      });

      setSelectedBodyImageFile(null);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBodyImage(false);
    }
  };

  const uploadBodyImageMale = async (file: File) => {
    if (!file) return;

    setUploadingBodyImageMale(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `body-male-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('procedure-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        body_image_url_male: publicUrl
      }));

      toast({
        title: "Upload realizado",
        description: "Imagem corporal masculina enviada com sucesso!",
      });

      setSelectedBodyImageMaleFile(null);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBodyImageMale(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando procedimentos...</p>
        </div>
      </div>
    );
  }

  // If body areas manager is open
  if (bodyAreasManagerOpen && editingProcedure) {
    return (
      <BodyAreasManager
        procedureId={editingProcedure.id}
        imageUrl={formData.body_image_url || '/images/body-female-default.png'}
        imageUrlMale={formData.body_image_url_male}
        bodySelectionType={formData.body_selection_type}
        open={bodyAreasManagerOpen}
        onClose={() => setBodyAreasManagerOpen(false)}
      />
    );
  }

  // If specifications manager is open
  if (specificationsManagerOpen && editingProcedure) {
    return (
      <ProcedureSpecificationsManager
        procedureId={editingProcedure.id}
        procedureName={editingProcedure.name}
        onClose={() => setSpecificationsManagerOpen(false)}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Procedimentos</h1>
          <p className="text-muted-foreground">
            Gerencie os procedimentos disponíveis na clínica
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Procedimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProcedure ? "Editar Procedimento" : "Novo Procedimento"}
              </DialogTitle>
              <DialogDescription>
                {editingProcedure 
                  ? "Atualize as informações do procedimento" 
                  : "Adicione um novo procedimento à clínica"
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Procedimento</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Limpeza de Pele"
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
                    placeholder="Ex: 150.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o procedimento..."
                  rows={3}
                />
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value, subcategory_id: "" })}>
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

                {formData.category_id && (
                  <div>
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select value={formData.subcategory_id} onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Duration and Sessions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="sessions">Número de Sessões</Label>
                  <Input
                    id="sessions"
                    type="number"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <Label>Imagem do Procedimento</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                  />
                  {formData.image_url && (
                    <div className="flex items-center gap-2">
                      <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      <Button type="button" variant="outline" size="sm" onClick={handleEditExistingImage}>
                        Editar Imagem
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_specifications"
                    checked={formData.requires_specifications}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requires_specifications: checked as boolean })
                    }
                  />
                  <Label htmlFor="requires_specifications" className="text-sm font-medium">
                    Requer especificação
                  </Label>
                </div>

                {formData.requires_specifications && editingProcedure && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSpecificationsManagerOpen(true)}
                      className="w-full"
                    >
                      Gerenciar Especificações
                    </Button>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div>
                <Label>Benefícios</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      placeholder="Adicionar benefício..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    />
                    <Button type="button" onClick={addBenefit} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {benefit}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => removeBenefit(benefit)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indication */}
              <div>
                <Label htmlFor="indication">Indicação</Label>
                <Textarea
                  id="indication"
                  value={formData.indication}
                  onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                  placeholder="Para que é indicado este procedimento..."
                  rows={2}
                />
              </div>

              {/* Featured */}
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProcedure ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="search" className="text-sm font-medium">
              Pesquisar Procedimentos
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="min-w-[200px]">
            <Label htmlFor="category-filter" className="text-sm font-medium">
              Filtrar por Categoria
            </Label>
            <Select value={displaySelectedCategory} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="min-w-[200px]">
              <Label htmlFor="subcategory-filter" className="text-sm font-medium">
                Filtrar por Subcategoria
              </Label>
              <Select value={displaySelectedSubcategory} onValueChange={(value) => setSelectedSubcategory(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as subcategorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as subcategorias</SelectItem>
                  {availableSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Procedures List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Procedimentos ({filteredProcedures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProcedures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum procedimento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure) => (
                  <TableRow key={procedure.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {procedure.image_url && (
                          <img 
                            src={procedure.image_url} 
                            alt={procedure.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">{procedure.name}</div>
                          {procedure.description && (
                            <div className="text-sm text-muted-foreground">
                              {procedure.description.length > 50 
                                ? `${procedure.description.substring(0, 50)}...` 
                                : procedure.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {procedure.categories?.name && (
                          <div className="text-sm font-medium">{procedure.categories.name}</div>
                        )}
                        {procedure.subcategories?.name && (
                          <div className="text-xs text-muted-foreground">{procedure.subcategories.name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {procedure.price ? (
                        <span className="font-medium">
                          R$ {procedure.price.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Não informado</span>
                      )}
                    </TableCell>
                    <TableCell>{procedure.duration} min</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {procedure.requires_specifications && (
                          <Badge variant="outline" className="text-xs">
                            Especificações
                          </Badge>
                        )}
                        {procedure.requires_body_selection && (
                          <Badge variant="outline" className="text-xs">
                            Áreas Corporais
                          </Badge>
                        )}
                        {procedure.is_featured && (
                          <Badge className="text-xs">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFeatured(procedure.id, procedure.is_featured)}
                        >
                          {procedure.is_featured ? (
                            <StarOff className="h-4 w-4" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(procedure)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(procedure.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Image Editor */}
      <ImageEditor
        open={imageEditorOpen}
        onCancel={() => setImageEditorOpen(false)}
        onSave={handleImageSave}
        imageFile={selectedImageFile}
        imageUrl={selectedImageFile ? undefined : formData.image_url}
      />

      {/* Discount Manager */}
      {editingProcedure && (
        <ProcedureDiscountManager
          procedureId={editingProcedure.id}
        requiresBodySelection={formData.requires_body_selection || false}
        />
      )}
    </div>
  );
};

export default ProceduresManagement;