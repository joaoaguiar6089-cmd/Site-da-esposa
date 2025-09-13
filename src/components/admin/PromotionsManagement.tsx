import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
  procedure_id?: string;
  is_procedure?: boolean;
  created_at: string;
}

interface Procedure {
  id: string;
  name: string;
}

export default function PromotionsManagement() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    is_active: true,
    display_order: 1,
    procedure_id: "none",
    is_procedure: false,
  });

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchProcedures();
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotion-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('promotion-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
      
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.image_url) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      procedure_id: (formData.is_procedure && formData.procedure_id !== "none") ? formData.procedure_id : null
    };

    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(submitData)
          .eq("id", editingPromotion.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Post atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert([submitData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Post criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (error) {
      console.error("Erro ao salvar post:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar post",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      image_url: promotion.image_url,
      is_active: promotion.is_active,
      display_order: promotion.display_order,
      procedure_id: promotion.procedure_id || "none",
      is_procedure: promotion.is_procedure || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Post excluído com sucesso!",
      });
      
      fetchPromotions();
    } catch (error) {
      console.error("Erro ao excluir post:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir post",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      is_active: true,
      display_order: 1,
      procedure_id: "none",
      is_procedure: false,
    });
    setEditingPromotion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Feed</h2>
          <p className="text-muted-foreground">
            Gerencie o feed que aparece na página principal
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? "Editar Post" : "Novo Post"}
              </DialogTitle>
              <DialogDescription>
                {editingPromotion 
                  ? "Edite as informações do post" 
                  : "Crie um novo post para exibir na página principal"
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Novidade na Clínica"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Select
                    value={formData.display_order.toString()}
                    onValueChange={(value) => setFormData({ ...formData, display_order: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º Posição</SelectItem>
                      <SelectItem value="2">2º Posição</SelectItem>
                      <SelectItem value="3">3º Posição</SelectItem>
                      <SelectItem value="4">4º Posição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_procedure"
                  checked={formData.is_procedure}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_procedure: !!checked })}
                />
                <Label htmlFor="is_procedure">É um procedimento/promoção</Label>
              </div>

              {formData.is_procedure && (
                <div className="space-y-2">
                  <Label htmlFor="procedure">Procedimento</Label>
                  <Select
                    value={formData.procedure_id}
                    onValueChange={(value) => setFormData({ ...formData, procedure_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um procedimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum procedimento</SelectItem>
                      {procedures.map((procedure) => (
                        <SelectItem key={procedure.id} value={procedure.id}>
                          {procedure.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se selecionado, ao clicar em "Agendar Agora" o procedimento será pré-selecionado
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o post..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagem do Post *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                </div>
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-32 w-48 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPromotion ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>
            Lista de todos os posts. Máximo de 4 posts ativos por vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <img
                      src={promotion.image_url}
                      alt={promotion.title}
                      className="h-16 w-24 object-cover rounded-md"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{promotion.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{promotion.description}</TableCell>
                  <TableCell>
                    <Badge variant={promotion.is_procedure ? "default" : "secondary"}>
                      {promotion.is_procedure ? "Procedimento" : "Post Informativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {promotion.is_procedure && promotion.procedure_id ? (
                      <Badge variant="outline">
                        {procedures.find(p => p.id === promotion.procedure_id)?.name || 'Procedimento'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{promotion.display_order}º</TableCell>
                  <TableCell>
                    <Badge variant={promotion.is_active ? "default" : "secondary"}>
                      {promotion.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {promotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum post cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}