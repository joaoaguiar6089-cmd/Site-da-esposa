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
        requires_body_selection: false,
        body_selection_type: "",
        body_image_url: "",
        body_image_url_male: ""
      });
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
        subcategory_id: procedure.subcategory_id || "",
        image_url: procedure.image_url || "",
        benefits: procedure.benefits || [],
        is_featured: procedure.is_featured,
        sessions: procedure.sessions.toString(),
        indication: procedure.indication || "",
        requires_body_selection: (procedure as any).requires_body_selection || false,
        body_selection_type: (procedure as any).body_selection_type || "",
        body_image_url: (procedure as any).body_image_url || "",
        body_image_url_male: (procedure as any).body_image_url_male || ""
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
        description: "Imagem corporais enviada com sucesso!",
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
        description: "Imagem masculina enviada com sucesso!",
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

  const getDefaultBodyImage = (bodySelectionType: string): string => {
    const defaultImages = {
      'face_male': '/images/face-male-default.png',
      'face_female': '/images/face-female-default.png',
      'body_male': '/images/body-male-default.png',
      'body_female': '/images/body-female-default.png'
    };
    
    return defaultImages[bodySelectionType as keyof typeof defaultImages] || '/images/face-female-default.png';
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
              </div>

              {formData.category_id && (
                <div>
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Select value={formData.subcategory_id} onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma subcategoria (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        .filter(sub => sub.category_id === formData.category_id)
                        .map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                              Processando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload & Ajustar
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {formData.image_url && (
                    <div className="mt-2">
                      <div className="flex items-start gap-3">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditExistingImage()}
                          className="flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Ajustar Imagem
                        </Button>
                      </div>
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

              <div className="space-y-4">
                {/* Seleção de Área Corporal */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires_body_selection"
                      checked={formData.requires_body_selection || false}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, requires_body_selection: checked as boolean })
                      }
                    />
                    <Label htmlFor="requires_body_selection" className="text-sm font-medium">
                      Requer seleção de área corporal
                    </Label>
                  </div>

                  {formData.requires_body_selection && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <Label htmlFor="body_selection_type">Tipo de Seleção</Label>
                        <Select 
                          value={formData.body_selection_type || ''} 
                          onValueChange={(value) => setFormData({ ...formData, body_selection_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de área" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="face_male">Rosto Masculino</SelectItem>
                            <SelectItem value="face_female">Rosto Feminino</SelectItem>
                            <SelectItem value="body_male">Corpo Masculino</SelectItem>
                            <SelectItem value="body_female">Corpo Feminino</SelectItem>
                            <SelectItem value="custom">Imagem Customizada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.body_selection_type === 'custom' && (
                        <div className="space-y-6">
                          <h4 className="font-semibold">Imagens Personalizadas</h4>
                          
                          {/* Imagem Feminina */}
                          <div className="space-y-4 p-4 border rounded-lg">
                            <h5 className="font-medium text-sm">Imagem Feminina</h5>
                            
                            {/* Upload de arquivo feminino */}
                            <div>
                              <Label htmlFor="body-image-upload-female" className="text-sm text-muted-foreground">
                                Upload de Arquivo
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  id="body-image-upload-female"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setSelectedBodyImageFile(e.target.files?.[0] || null)}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  onClick={() => selectedBodyImageFile && uploadBodyImage(selectedBodyImageFile)}
                                  disabled={!selectedBodyImageFile || uploadingBodyImage}
                                  size="sm"
                                >
                                  {uploadingBodyImage ? 'Enviando...' : 'Upload'}
                                </Button>
                              </div>
                            </div>

                            {/* URL da imagem feminina */}
                            <div>
                              <Label htmlFor="body_image_url" className="text-sm text-muted-foreground">
                                URL da Imagem
                              </Label>
                              <Input
                                id="body_image_url"
                                value={formData.body_image_url || ''}
                                onChange={(e) => setFormData({ ...formData, body_image_url: e.target.value })}
                                placeholder="https://exemplo.com/imagem-feminina.jpg"
                                className="mt-1"
                              />
                            </div>

                            {/* Preview da imagem feminina */}
                            {formData.body_image_url && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Preview Feminino</Label>
                                <div className="border rounded p-2">
                                  <img 
                                    src={formData.body_image_url} 
                                    alt="Preview da imagem feminina"
                                    className="max-w-24 max-h-24 object-contain mx-auto"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Imagem Masculina */}
                          <div className="space-y-4 p-4 border rounded-lg">
                            <h5 className="font-medium text-sm">Imagem Masculina (Opcional)</h5>
                            
                            {/* Upload de arquivo masculino */}
                            <div>
                              <Label htmlFor="body-image-upload-male" className="text-sm text-muted-foreground">
                                Upload de Arquivo
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  id="body-image-upload-male"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setSelectedBodyImageMaleFile(e.target.files?.[0] || null)}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  onClick={() => selectedBodyImageMaleFile && uploadBodyImageMale(selectedBodyImageMaleFile)}
                                  disabled={!selectedBodyImageMaleFile || uploadingBodyImageMale}
                                  size="sm"
                                >
                                  {uploadingBodyImageMale ? 'Enviando...' : 'Upload'}
                                </Button>
                              </div>
                            </div>

                            {/* URL da imagem masculina */}
                            <div>
                              <Label htmlFor="body_image_url_male" className="text-sm text-muted-foreground">
                                URL da Imagem
                              </Label>
                              <Input
                                id="body_image_url_male"
                                value={formData.body_image_url_male || ''}
                                onChange={(e) => setFormData({ ...formData, body_image_url_male: e.target.value })}
                                placeholder="https://exemplo.com/imagem-masculina.jpg"
                                className="mt-1"
                              />
                            </div>

                            {/* Preview da imagem masculina */}
                            {formData.body_image_url_male && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Preview Masculino</Label>
                                <div className="border rounded p-2">
                                  <img 
                                    src={formData.body_image_url_male} 
                                    alt="Preview da imagem masculina"
                                    className="max-w-24 max-h-24 object-contain mx-auto"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                            💡 <strong>Dica:</strong> Se apenas uma imagem for fornecida, não haverá seleção de gênero no agendamento.
                          </div>
                        </div>
                      )}

                      {editingProcedure && formData.requires_body_selection && formData.body_selection_type && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBodyAreasManagerOpen(true)}
                          className="w-full"
                        >
                          Gerenciar Áreas Selecionáveis
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkbox destacar */}
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
              </div>

              <Button type="submit" className="w-full">
                {editingProcedure ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros e Pesquisa */}
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
          
          <div className="flex gap-2">
            <div className="min-w-[160px]">
              <Label htmlFor="filter-category" className="text-sm font-medium">
                Categoria
              </Label>
              <Select value={displaySelectedCategory} onValueChange={(value) => {
                setSelectedCategory(value === "all" ? "" : value);
                setSelectedSubcategory(""); // Reset subcategory when category changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
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
              <div className="min-w-[160px]">
                <Label htmlFor="filter-subcategory" className="text-sm font-medium">
                  Subcategoria
                </Label>
                <Select value={displaySelectedSubcategory} onValueChange={(value) => setSelectedSubcategory(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
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
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setSelectedSubcategory("");
              }}
              className="mt-6"
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredProcedures.map((procedure) => (
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
                    {procedure.subcategories && (
                      <p className="text-xs text-muted-foreground">{procedure.subcategories.name}</p>
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
                      <Edit2 className="w-4 h-4" />
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

      {filteredProcedures.length === 0 && procedures.length > 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum procedimento encontrado com os filtros aplicados.
          </p>
        </Card>
      )}

      {procedures.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum procedimento cadastrado ainda.</p>
        </Card>
      )}

      {/* Image Editor */}
      <ImageEditor
        imageFile={selectedImageFile}
        imageUrl={!selectedImageFile ? formData.image_url : undefined}
        open={imageEditorOpen}
        onSave={handleImageSave}
        onCancel={() => {
          setImageEditorOpen(false);
          setSelectedImageFile(null);
        }}
      />

      {/* Body Areas Manager */}
      {editingProcedure && (
        <BodyAreasManager
          procedureId={editingProcedure.id}
          imageUrl={formData.body_selection_type === 'custom' ? (formData.body_image_url || '') : getDefaultBodyImage(formData.body_selection_type)}
          imageUrlMale={formData.body_selection_type === 'custom' ? (formData.body_image_url_male || '') : getDefaultBodyImage(formData.body_selection_type?.includes('female') ? formData.body_selection_type.replace('female', 'male') : formData.body_selection_type)}
          bodySelectionType={formData.body_selection_type}
          open={bodyAreasManagerOpen}
          onClose={() => setBodyAreasManagerOpen(false)}
        />
      )}
    </div>
  );
};

export default ProceduresManagement;