import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { FormField, FieldType } from "@/types/forms";

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export default function FieldEditor({ field, onUpdate, onClose }: FieldEditorProps) {
  const [localField, setLocalField] = useState<FormField>(field);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const handleUpdate = (updates: Partial<FormField>) => {
    const newField = { ...localField, ...updates };
    setLocalField(newField);
    onUpdate(updates);
  };

  // Tipos de campo disponíveis
  const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "Texto Curto" },
    { value: "textarea", label: "Texto Longo" },
    { value: "number", label: "Número" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
    { value: "cpf", label: "CPF" },
    { value: "date", label: "Data" },
    { value: "time", label: "Hora" },
    { value: "datetime", label: "Data e Hora" },
    { value: "select", label: "Seleção (Dropdown)" },
    { value: "radio", label: "Opção Única (Radio)" },
    { value: "checkbox", label: "Múltipla Escolha" },
    { value: "toggle", label: "Sim/Não (Toggle)" },
    { value: "file", label: "Upload de Arquivo" },
    { value: "signature", label: "Assinatura" },
    { value: "rating", label: "Avaliação (Estrelas)" },
    { value: "slider", label: "Controle Deslizante" },
    { value: "color", label: "Cor" },
  ];

  // Verifica se o campo precisa de opções
  const needsOptions = ["select", "radio", "checkbox"].includes(localField.field_type);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Propriedades do Campo</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Básico */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Rótulo do Campo *</Label>
              <Input
                id="label"
                value={localField.label}
                onChange={(e) => handleUpdate({ label: e.target.value })}
                placeholder="Ex: Nome Completo"
              />
            </div>

            <div>
              <Label htmlFor="field_key">Chave Única *</Label>
              <Input
                id="field_key"
                value={localField.field_key}
                onChange={(e) => handleUpdate({ field_key: e.target.value })}
                placeholder="Ex: nome_completo"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identificador único usado no banco de dados
              </p>
            </div>

            <div>
              <Label htmlFor="field_type">Tipo de Campo</Label>
              <Select
                value={localField.field_type}
                onValueChange={(value: FieldType) => handleUpdate({ field_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">Campo Obrigatório</Label>
              <Switch
                id="is_required"
                checked={localField.is_required}
                onCheckedChange={(checked) => handleUpdate({ is_required: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Accordion com configurações avançadas */}
          <Accordion type="multiple" className="w-full">
            {/* Texto de Ajuda */}
            <AccordionItem value="help">
              <AccordionTrigger>Texto de Ajuda</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="placeholder">Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={localField.placeholder || ""}
                    onChange={(e) => handleUpdate({ placeholder: e.target.value })}
                    placeholder="Digite aqui..."
                  />
                </div>
                <div>
                  <Label htmlFor="help_text">Texto de Ajuda</Label>
                  <Textarea
                    id="help_text"
                    value={localField.help_text || ""}
                    onChange={(e) => handleUpdate({ help_text: e.target.value })}
                    placeholder="Informações adicionais para o usuário"
                    rows={2}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layout */}
            <AccordionItem value="layout">
              <AccordionTrigger>Layout</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label>Largura do Campo (colunas)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[localField.column_span || 12]}
                      onValueChange={([value]) => handleUpdate({ column_span: value })}
                      min={1}
                      max={12}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">
                      {localField.column_span || 12}/12
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    12 colunas = largura total
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Opções (para select, radio, checkbox) */}
            {needsOptions && (
              <AccordionItem value="options">
                <AccordionTrigger>Opções</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <OptionsEditor
                    options={localField.options || []}
                    onChange={(options) => handleUpdate({ options })}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Auto-fill */}
            <AccordionItem value="autofill">
              <AccordionTrigger>Preenchimento Automático</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="auto_fill_source">Fonte de Dados</Label>
                  <Select
                    value={localField.auto_fill_source || "none"}
                    onValueChange={(value) =>
                      handleUpdate({ auto_fill_source: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="client.nome">Cliente - Nome</SelectItem>
                      <SelectItem value="client.sobrenome">Cliente - Sobrenome</SelectItem>
                      <SelectItem value="client.cpf">Cliente - CPF</SelectItem>
                      <SelectItem value="client.celular">Cliente - Celular</SelectItem>
                      <SelectItem value="client.email">Cliente - E-mail</SelectItem>
                      <SelectItem value="client.data_nascimento">Cliente - Data Nascimento</SelectItem>
                      <SelectItem value="system.current_date">Sistema - Data Atual</SelectItem>
                      <SelectItem value="system.current_time">Sistema - Hora Atual</SelectItem>
                    </SelectContent>
                  </Select>
                  {localField.auto_fill_source && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded-md">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Este campo será preenchido automaticamente quando disponível
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Validações */}
            <AccordionItem value="validation">
              <AccordionTrigger>Validações</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configurações avançadas de validação serão implementadas em breve
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Lógica Condicional */}
            <AccordionItem value="conditional">
              <AccordionTrigger>Lógica Condicional</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configurar quando este campo deve aparecer/ser obrigatório será implementado em breve
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

// =====================================================
// SUB-COMPONENTE: Editor de Opções
// =====================================================

interface OptionsEditorProps {
  options: Array<{ label: string; value: string }>;
  onChange: (options: Array<{ label: string; value: string }>) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [localOptions, setLocalOptions] = useState(options || []);

  useEffect(() => {
    setLocalOptions(options || []);
  }, [options]);

  const addOption = () => {
    const newOptions = [...localOptions, { label: "", value: "" }];
    setLocalOptions(newOptions);
    onChange(newOptions);
  };

  const updateOption = (index: number, field: "label" | "value", value: string) => {
    const newOptions = [...localOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setLocalOptions(newOptions);
    onChange(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = localOptions.filter((_, i) => i !== index);
    setLocalOptions(newOptions);
    onChange(newOptions);
  };

  return (
    <div className="space-y-2">
      {localOptions.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Rótulo"
            value={option.label}
            onChange={(e) => updateOption(index, "label", e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Valor"
            value={option.value}
            onChange={(e) => updateOption(index, "value", e.target.value)}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeOption(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOption} className="w-full">
        + Adicionar Opção
      </Button>
    </div>
  );
}
