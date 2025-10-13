import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Save,
  Eye,
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  Smartphone,
  Monitor,
  Loader2,
  FileText,
  Settings,
} from "lucide-react";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormFields } from "@/hooks/forms/useFormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SnippetLibrary from "./SnippetLibrary";
import FieldEditor from "./FieldEditor";
import SortableFieldItem from "./SortableFieldItem";
import PDFTemplateUploader from "./PDFTemplateUploader";
import type { FormField, FormTemplate } from "@/types/forms";

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function FormTemplateEditor() {
  const { id: urlId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pega ID da URL ou do state (quando vem do Admin)
  const state = location.state as any;
  const id = urlId || state?.editingFormId || "";

  const { template, isLoading: loadingTemplate, updateTemplate } = useFormTemplate(id);
  const { fields, isLoading: loadingFields, createField, updateField, deleteField, reorderFields } = useFormFields(id);

  // Estados locais
  const [editedTemplate, setEditedTemplate] = useState<Partial<FormTemplate>>({});
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showSnippets, setShowSnippets] = useState(true);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sincronizar template com estado local
  useEffect(() => {
    if (template) {
      setEditedTemplate({
        name: template.name,
        description: template.description,
        category: template.category,
      });
    }
  }, [template]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handler: Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handler: Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Reordenar campos
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedFields = arrayMove(fields, oldIndex, newIndex);
    const fieldIds = reorderedFields.map((f) => f.id);

    await reorderFields(fieldIds);
  };

  // Handler: Adicionar campo do snippet
  const handleAddFieldFromSnippet = async (snippetFields: any[]) => {
    if (!id) return;

    for (const field of snippetFields) {
      await createField({
        template_id: id,
        field_key: `${field.field_key}_${Date.now()}`,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required || false,
        placeholder: field.placeholder,
        help_text: field.help_text,
        default_value: field.default_value,
        validation_rules: field.validation_rules,
        conditional_logic: field.conditional_logic,
        auto_fill_source: field.auto_fill_source,
        options: field.options,
        column_span: field.column_span || 12,
        order_index: fields.length,
      });
    }
  };

  // Handler: Salvar template
  const handleSave = async () => {
    if (!id || !editedTemplate.name) return;

    await updateTemplate(id, editedTemplate);
    setIsDirty(false);
    toast({
      title: "Salvo com sucesso",
      description: "As alterações foram salvas.",
    });
  };

  // Handler: Deletar campo
  const handleDeleteField = async (fieldId: string) => {
    await deleteField(fieldId);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
      setShowFieldEditor(false);
    }
  };

  // Handler: Selecionar campo
  const handleSelectField = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    setShowFieldEditor(true);
  };

  // Handler: Atualizar campo
  const handleUpdateField = async (fieldId: string, updates: Partial<FormField>) => {
    await updateField(fieldId, updates);
  };

  // Loading state
  if (loadingTemplate || loadingFields) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Template não encontrado</p>
            <Button onClick={() => navigate("/admin/forms")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar Superior */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/forms")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-col">
              <Input
                value={editedTemplate.name || ""}
                onChange={(e) => {
                  setEditedTemplate({ ...editedTemplate, name: e.target.value });
                  setIsDirty(true);
                }}
                className="font-semibold text-lg border-0 p-0 h-auto focus-visible:ring-0"
              />
              {template.is_published && (
                <Badge className="w-fit mt-1 bg-green-100 text-green-800">Publicada</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={previewMode === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} size="sm" disabled={!isDirty}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo: Snippets + PDF Upload */}
        {showSnippets && (
          <div className="w-80 border-r bg-muted/30 overflow-y-auto flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <SnippetLibrary onAddFields={handleAddFieldFromSnippet} />
            </div>
            <div className="border-t bg-background p-4">
              <PDFTemplateUploader 
                templateId={id}
                currentPdfUrl={template.pdf_template_url}
                onUploadComplete={() => {
                  // Recarregar template
                  window.location.reload();
                }}
              />
            </div>
          </div>
        )}

        {/* Canvas Central */}
        <div className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container mx-auto py-8 px-4">
            <Card className={previewMode === "mobile" ? "max-w-md mx-auto" : "max-w-4xl mx-auto"}>
              <CardHeader>
                <CardTitle>{editedTemplate.name}</CardTitle>
                {editedTemplate.description && (
                  <p className="text-sm text-muted-foreground">{editedTemplate.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Plus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">Nenhum campo adicionado</p>
                    <p className="text-sm text-muted-foreground">
                      Arraste campos da biblioteca à esquerda
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {fields.map((field) => (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onSelect={() => handleSelectField(field.id)}
                            onDelete={() => handleDeleteField(field.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-primary">
                          {fields.find((f) => f.id === activeId)?.label}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Painel Direito: Editor de Campo */}
        {showFieldEditor && selectedField && (
          <div className="w-96 border-l bg-background overflow-y-auto">
            <FieldEditor
              field={selectedField}
              onUpdate={(updates) => handleUpdateField(selectedField.id, updates)}
              onClose={() => {
                setShowFieldEditor(false);
                setSelectedFieldId(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
