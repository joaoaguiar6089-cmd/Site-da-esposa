// @ts-nocheck
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
  Trash2,
  Plus,
  Smartphone,
  Monitor,
  Loader2,
} from "lucide-react";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormFields } from "@/hooks/forms/useFormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SnippetLibrary from "./SnippetLibrary";
import FieldEditor from "./FieldEditor";
import SortableFieldItem from "./SortableFieldItem";
import PDFTemplateUploader from "./PDFTemplateUploader";
import type { FormField, FormTemplate, FieldType } from "@/types/forms";
import { useFormSnippets } from "@/hooks/forms/useFormSnippets";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FormTemplateEditorProps {
  templateId?: string | null;
  onExit?: () => void;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function FormTemplateEditor({ templateId: externalTemplateId = null, onExit }: FormTemplateEditorProps = {}) {
  const { id: urlId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pega ID da URL ou do state (quando vem do Admin)
  const state = location.state as any;
  const id = (externalTemplateId && externalTemplateId.length > 0)
    ? externalTemplateId
    : urlId || state?.editingFormId || "";

  const handleBack = () => {
    if (onExit) {
      onExit();
    } else {
      navigate("/admin/forms");
    }
  };

  const { template, isLoading: loadingTemplate, refetch: refetchTemplate } = useFormTemplate(id);
  const { fields, isLoading: loadingFields, createField, updateField, deleteField, reorderFields } = useFormFields(id);
  const { snippets, updateSnippet } = useFormSnippets();

  // Estados locais
  const [editedTemplate, setEditedTemplate] = useState<Partial<FormTemplate>>({});
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showSnippets, setShowSnippets] = useState(true);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);
  const [fieldToSaveToSnippet, setFieldToSaveToSnippet] = useState<FormField | null>(null);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>("");
  const [isSavingSnippetField, setIsSavingSnippetField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [isAddingField, setIsAddingField] = useState(false);

  const quickAddFieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "Texto curto" },
    { value: "textarea", label: "Texto longo" },
    { value: "number", label: "Número" },
    { value: "date", label: "Data" },
    { value: "time", label: "Hora" },
    { value: "select", label: "Seleção (Dropdown)" },
    { value: "checkbox", label: "Múltipla escolha" },
    { value: "radio", label: "Opção única" },
    { value: "signature", label: "Assinatura" },
  ];

  const needsOptionsForType = (type: FieldType) =>
    ["select", "checkbox", "radio"].includes(type);

  const generateFieldKey = (label: string) => {
    const base = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return base || `campo_${Date.now()}`;
  };

  // Sincronizar template com estado local
  useEffect(() => {
    if (template) {
      setEditedTemplate({
        name: template.name,
        description: template.description,
        category: template.category,
      });
      setIsDirty(false);
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

  const updateTemplateDetails = async (updates: Partial<FormTemplate>) => {
    if (!id) return;

    const payload: Partial<FormTemplate> = {};
    if (typeof updates.name === "string" && updates.name !== template?.name) {
      payload.name = updates.name;
    }
    if (updates.description !== undefined && updates.description !== template?.description) {
      payload.description = updates.description;
    }
    if (updates.category !== undefined && updates.category !== template?.category) {
      payload.category = updates.category as any;
    }

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase
      .from('form_templates')
      .update({
        ...payload,
        edit_count: supabase.sql`edit_count + 1`,
      })
      .eq('id', id);

    if (error) throw error;
  };

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
    if (!id || !Array.isArray(snippetFields)) return;

    const startingIndex = fields.length;

    for (const [index, field] of snippetFields.entries()) {
      const keyBase = field?.field_key ? field.field_key : generateFieldKey(field?.label || "campo");
      const uniqueKey = `${keyBase}_${Date.now()}_${index}`;

      await createField({
        template_id: id,
        field_key: uniqueKey,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required || false,
        placeholder: field.placeholder,
        help_text: field.help_text,
        default_value: field.default_value,
        validation_rules: field.validation_rules,
        conditional_logic: field.conditional_logic,
        auto_fill_source: field.auto_fill_source,
        auto_fill_mapping: field.auto_fill_mapping,
        options: field.options,
        column_span: field.column_span || 12,
        order_index: startingIndex + index,
      });
    }
  };

  const handleAddManualField = async () => {
    if (!id || !newFieldLabel.trim()) return;

    setIsAddingField(true);
    try {
      const label = newFieldLabel.trim();
      const keyBase = generateFieldKey(label);
      const uniqueKey = `${keyBase}_${Date.now()}`;
      const options = needsOptionsForType(newFieldType)
        ? [
            { label: "Opção 1", value: "opcao_1" },
            { label: "Opção 2", value: "opcao_2" },
          ]
        : null;

      const newField = await createField({
        template_id: id,
        field_key: uniqueKey,
        label,
        field_type: newFieldType,
        is_required: false,
        placeholder: "",
        help_text: null,
        validation_rules: null,
        options,
        auto_fill_source: null,
        auto_fill_mapping: null,
        conditional_logic: null,
        column_span: 12,
        order_index: fields.length,
      });

      if (newField?.id) {
        setSelectedFieldId(newField.id);
        setShowFieldEditor(true);
      }

      setNewFieldLabel("");
      setNewFieldType("text");
    } catch (error: any) {
      console.error("Erro ao adicionar campo:", error);
      toast({
        title: "Erro ao adicionar campo",
        description: error?.message || "Não foi possível adicionar o campo.",
        variant: "destructive",
      });
    } finally {
      setIsAddingField(false);
    }
  };

  // Handler: Salvar template
  const handleSave = async () => {
    if (!id || !editedTemplate.name) return;

    try {
      await updateTemplateDetails(editedTemplate);
      await refetchTemplate();
      setIsDirty(false);
      toast({
        title: "Salvo com sucesso",
        description: "As alteraÃ§Ãµes foram salvas.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
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

  const openSaveToSnippetDialog = (field: FormField) => {
    setFieldToSaveToSnippet(field);
    setSelectedSnippetId("");
    setSnippetDialogOpen(true);
  };

  const mapFieldToSnippetDefinition = (field: FormField, orderIndex: number) => ({
    field_key: field.field_key,
    label: field.label,
    description: field.description,
    placeholder: field.placeholder,
    help_text: field.help_text,
    field_type: field.field_type,
    is_required: field.is_required,
    validation_rules: field.validation_rules,
    options: field.options,
    auto_fill_source: field.auto_fill_source,
    auto_fill_mapping: field.auto_fill_mapping,
    conditional_logic: field.conditional_logic,
    column_span: field.column_span ?? 12,
    order_index,
  });

  const handleConfirmSaveToSnippet = async () => {
    if (!fieldToSaveToSnippet || !selectedSnippetId) return;

    const targetSnippet = snippets.find((snippet) => snippet.id === selectedSnippetId);
    if (!targetSnippet) {
      toast({
        title: "Snippet não encontrado",
        description: "Selecione um snippet válido para salvar o campo.",
        variant: "destructive",
      });
      return;
    }

    const existingFields = Array.isArray(targetSnippet.fields) ? targetSnippet.fields : [];
    const mappedField = mapFieldToSnippetDefinition(fieldToSaveToSnippet, existingFields.length);

    try {
      setIsSavingSnippetField(true);
      await updateSnippet(selectedSnippetId, {
        fields: [...existingFields, mappedField],
      });
      setSnippetDialogOpen(false);
      setFieldToSaveToSnippet(null);
      setSelectedSnippetId("");
    } catch (error: any) {
      console.error("Erro ao salvar campo no snippet:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível adicionar o campo ao snippet.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSnippetField(false);
    }
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
            <p className="text-muted-foreground">Template nao encontrado</p>
            <Button onClick={handleBack} className="mt-4">
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
            {onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
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
            <div className="border-t bg-background p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Adicionar campo manual</p>
                <p className="text-xs text-muted-foreground">
                  Crie um campo rápido sem depender de snippets.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide">Rótulo</Label>
                <Input
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Ex: Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide">Tipo</Label>
                <Select value={newFieldType} onValueChange={(value: FieldType) => setNewFieldType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quickAddFieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddManualField}
                disabled={isAddingField || !newFieldLabel.trim() || !id}
                className="w-full"
              >
                {isAddingField ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar campo
                  </>
                )}
              </Button>
            </div>
            <div className="border-t bg-background p-4">
              <PDFTemplateUploader 
                templateId={id}
                currentPdfUrl={template.pdf_template_url}
                onUploadComplete={() => {
                  refetchTemplate();
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
                      Arraste campos da biblioteca Ã  esquerda
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
                            onSaveToSnippet={() => openSaveToSnippetDialog(field)}
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

      <Dialog open={snippetDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSnippetDialogOpen(false);
          setFieldToSaveToSnippet(null);
          setSelectedSnippetId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar campo no snippet</DialogTitle>
            <DialogDescription>
              Escolha um snippet para reutilizar o campo "{fieldToSaveToSnippet?.label}" em outras fichas.
            </DialogDescription>
          </DialogHeader>
          {snippets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum snippet disponÃ­vel. Crie um snippet na biblioteca ao lado para comeÃ§ar.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Snippet de destino</Label>
                <Select value={selectedSnippetId} onValueChange={setSelectedSnippetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um snippet" />
                  </SelectTrigger>
                  <SelectContent>
                    {snippets.map((snippet) => (
                      <SelectItem key={snippet.id} value={snippet.id}>
                        {snippet.name} ({snippet.fields?.length || 0} campos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{fieldToSaveToSnippet?.label}</p>
                <p className="text-muted-foreground">{fieldToSaveToSnippet?.field_type}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSnippetDialogOpen(false);
                setFieldToSaveToSnippet(null);
                setSelectedSnippetId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSaveToSnippet}
              disabled={!selectedSnippetId || snippets.length === 0 || isSavingSnippetField}
            >
              {isSavingSnippetField ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar no snippet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


