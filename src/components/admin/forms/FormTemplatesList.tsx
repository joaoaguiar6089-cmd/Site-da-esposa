import { useState } from "react";
import { Plus, Search, FileText, Edit, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { useFormTemplates } from "@/hooks/forms/useFormTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormTemplate } from "@/types/forms";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface FormTemplatesListProps {
  onEditTemplate?: (templateId: string) => void;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function FormTemplatesList({ onEditTemplate }: FormTemplatesListProps = {}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [templateToClone, setTemplateToClone] = useState<FormTemplate | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
  });

  const {
    templates,
    isLoading,
    createTemplate,
    deleteTemplate,
    publishTemplate,
    unpublishTemplate,
    cloneTemplate,
    isCreating,
    isDeleting,
    isCloning,
  } = useFormTemplates();

  // Filtrar templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      categoryFilter === "all" || template.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Handler: Criar template
  const openTemplateEditor = (templateId: string) => {
    if (onEditTemplate) {
      onEditTemplate(templateId);
    } else {
      navigate(`/admin/forms/edit/${templateId}`);
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) return;

    const created = await createTemplate({
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category || null,
      is_published: false,
    }) as FormTemplate;

    setShowCreateDialog(false);
    setNewTemplate({ name: "", description: "", category: "" });

    if (created?.id) {
      openTemplateEditor(created.id);
    }
  };

  // Handler: Deletar template
  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate(templateToDelete.id);
    setTemplateToDelete(null);
  };

  // Handler: Clonar template
  const handleClone = async () => {
    if (!templateToClone || !cloneName.trim()) return;
    const cloned = await cloneTemplate(templateToClone.id, cloneName) as FormTemplate;
    setTemplateToClone(null);
    setCloneName("");

    if (cloned?.id) {
      openTemplateEditor(cloned.id);
    }
  };

  // Handler: Toggle publish
  const handleTogglePublish = async (template: FormTemplate) => {
    if (template.is_published) {
      await unpublishTemplate(template.id);
    } else {
      await publishTemplate(template.id);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documentos</h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie documentos personalizados para seus clientes
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="lg">
            Nova Ficha
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fichas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="anamnese">Anamnese</SelectItem>
              <SelectItem value="consentimento">Consentimento</SelectItem>
              <SelectItem value="avaliacao">Avaliação</SelectItem>
              <SelectItem value="cadastro">Cadastro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando fichas...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma ficha encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Comece criando sua primeira ficha personalizada"}
            </p>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Ficha
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid de Templates */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => openTemplateEditor(template.id)}
              onClone={() => {
                setTemplateToClone(template);
                setCloneName(`${template.name} (cÃ³pia)`);
              }}
              onDelete={() => setTemplateToDelete(template)}
              onTogglePublish={() => handleTogglePublish(template)}
            />
          ))}
        </div>
      )}

      {/* Dialog: Criar Template */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ficha</DialogTitle>
            <DialogDescription>
              Crie uma nova ficha personalizada para seus clientes preencherem
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Ficha *</Label>
              <Input
                id="name"
                placeholder="Ex: Ficha de Anamnese"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">DescriÃ§Ã£o</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propÃ³sito desta ficha..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anamnese">Anamnese</SelectItem>
                  <SelectItem value="consentimento">Consentimento</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                  <SelectItem value="cadastro">Cadastro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newTemplate.name.trim() || isCreating}>
              {isCreating ? "Criando..." : "Criar Ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Clonar Template */}
      <Dialog open={!!templateToClone} onOpenChange={() => setTemplateToClone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar Ficha</DialogTitle>
            <DialogDescription>
              SerÃ¡ criada uma cÃ³pia da ficha "{templateToClone?.name}" com todos os campos
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="clone-name">Nome da CÃ³pia *</Label>
            <Input
              id="clone-name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="Digite o nome da cÃ³pia"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateToClone(null)}>
              Cancelar
            </Button>
            <Button onClick={handleClone} disabled={!cloneName.trim() || isCloning}>
              {isCloning ? "Clonando..." : "Clonar Ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Deletar Template */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Ficha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{templateToDelete?.name}"? 
              Esta ação não pode ser desfeita e todos os campos serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =====================================================
// SUB-COMPONENTE: Card de Template
// =====================================================

interface TemplateCardProps {
  template: FormTemplate;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}

function TemplateCard({ template, onEdit, onClone, onDelete, onTogglePublish }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            {template.category && (
              <Badge variant="secondary" className="mt-2">
                {template.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {template.is_published ? (
              <Badge className="bg-green-100 text-green-800">Publicada</Badge>
            ) : (
              <Badge variant="outline">Rascunho</Badge>
            )}
          </div>
        </div>
        {template.description && (
          <CardDescription className="mt-2 line-clamp-2">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Versão: {template.version}</p>
          <p>Editado: {template.edit_count} {template.edit_count === 1 ? 'vez' : 'vezes'}</p>
          <p>
            Criado em: {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={onEdit} size="sm" className="flex-1">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button onClick={onTogglePublish} size="sm" variant="outline">
          {template.is_published ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        <Button onClick={onClone} size="sm" variant="outline">
          <Copy className="h-4 w-4" />
        </Button>
        <Button onClick={onDelete} size="sm" variant="outline">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
