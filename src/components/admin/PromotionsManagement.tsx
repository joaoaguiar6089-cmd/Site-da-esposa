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
    return <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Carregando...</p>
      </div>
    </div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Feed</h2>
          <p className="text-muted-foreground">
            Gerencie o feed que aparece na página principal
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Post
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl">
                {editingPromotion ? "Editar Post" : "Novo Post"}
              </DialogTitle>
              <DialogDescription>
                {editingPromotion 
                  ? "Edite as informações do post" 
                  : "Crie um novo post para exibir na página principal"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto px-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Título *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Novidade na Clínica"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_order" className="text-sm font-medium">
                      Ordem de Exibição
                    </Label>
                    <Select
                      value={formData.display_order.toString()}
                      onValueChange={(value) => setFormData({ ...formData, display_order: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: promotions.length + 1 }, (_, i) => i + 1).map((position) => (
                          <SelectItem key={position} value={position.toString()}>
                            {position}º Posição
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_procedure"
                      checked={formData.is_procedure}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_procedure: !!checked })}
                    />
                    <Label htmlFor="is_procedure" className="text-sm">
                      É um procedimento/promoção
                    </Label>
                  </div>

                  {formData.is_procedure && (
                    <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                      <Label htmlFor="procedure" className="text-sm font-medium">
                        Procedimento
                      </Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Descrição *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o post..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="image" className="text-sm font-medium">
                    Imagem do Post *
                  </Label>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Enviando...
                        </div>
                      )}
                    </div>
                    {formData.image_url && (
                      <div className="flex justify-center">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="h-48 w-72 object-cover rounded-lg border shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    Ativo
                  </Label>
                </div>
              </form>
            </div>

            <DialogFooter className="border-t pt-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={!formData.title || !formData.description || !formData.image_url}
                  className="w-full sm:w-auto"
                >
                  {editingPromotion ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>
            Lista de todos os posts do feed da clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Imagem</TableHead>
                  <TableHead className="min-w-32">Título</TableHead>
                  <TableHead className="min-w-48">Descrição</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-32">Procedimento</TableHead>
                  <TableHead className="w-20">Ordem</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <img
                        src={promotion.image_url}
                        alt={promotion.title}
                        className="h-16 w-20 object-cover rounded-md"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-32 truncate" title={promotion.title}>
                        {promotion.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 text-sm text-muted-foreground" title={promotion.description}>
                        {promotion.description.length > 100 
                          ? `${promotion.description.substring(0, 100)}...` 
                          : promotion.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={promotion.is_procedure ? "default" : "secondary"} className="text-xs">
                        {promotion.is_procedure ? "Procedimento" : "Informativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {promotion.is_procedure && promotion.procedure_id ? (
                        <Badge variant="outline" className="text-xs">
                          {procedures.find(p => p.id === promotion.procedure_id)?.name || 'Procedimento'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{promotion.display_order}º</TableCell>
                    <TableCell>
                      <Badge variant={promotion.is_active ? "default" : "secondary"} className="text-xs">
                        {promotion.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(promotion)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(promotion.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {promotions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 opacity-50" />
                        <p>Nenhum post cadastrado</p>
                        <p className="text-sm">Clique em "Novo Post" para começar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}