import { useState, useEffect, useMemo } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const requiresOptions = (type: FieldType) =>
    ["select", "radio", "checkbox"].includes(type);

  const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "Texto curto" },
    { value: "textarea", label: "Texto longo" },
    { value: "number", label: "Número" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
    { value: "cpf", label: "CPF" },
    { value: "date", label: "Data" },
    { value: "time", label: "Hora" },
    { value: "datetime", label: "Data e hora" },
    { value: "select", label: "Seleção (dropdown)" },
    { value: "radio", label: "Opção única" },
    { value: "checkbox", label: "Múltipla escolha" },
    { value: "toggle", label: "Sim/Não" },
    { value: "file", label: "Upload de arquivo" },
    { value: "signature", label: "Assinatura" },
    { value: "rating", label: "Avaliação (estrelas)" },
    { value: "slider", label: "Controle deslizante" },
    { value: "color", label: "Selecionar cor" },
  ];

  const autoFillOptions = useMemo(
    () => [
      { value: "none", label: "Nenhum" },
      { value: "client.nome", label: "Cliente - Nome" },
      { value: "client.sobrenome", label: "Cliente - Sobrenome" },
      { value: "client.cpf", label: "Cliente - CPF" },
      { value: "client.email", label: "Cliente - E-mail" },
      { value: "client.telefone", label: "Cliente - Telefone" },
      { value: "client.whatsapp", label: "Cliente - WhatsApp" },
      { value: "client.data_nascimento", label: "Cliente - Data de nascimento" },
      { value: "appointment.date", label: "Agendamento - Data" },
      { value: "appointment.time", label: "Agendamento - Hora" },
      { value: "appointment.city", label: "Agendamento - Cidade" },
      { value: "procedure.name", label: "Procedimento - Nome" },
      { value: "procedure.duration", label: "Procedimento - Duração (min)" },
      { value: "system.current_date", label: "Sistema - Data atual" },
      { value: "system.current_time", label: "Sistema - Hora atual" },
      { value: "system.current_user", label: "Sistema - Usuário atual" },
    ],
    []
  );

  const handleTypeChange = (value: FieldType) => {
    const updates: Partial<FormField> = { field_type: value };

    if (requiresOptions(value)) {
      if (!localField.options || localField.options.length === 0) {
        updates.options = [
          { label: "Opção 1", value: "opcao_1" },
          { label: "Opção 2", value: "opcao_2" },
        ];
      }
    } else if (localField.options) {
      updates.options = null;
    }

    handleUpdate(updates);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Configurações do campo</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Rótulo *</Label>
              <Input
                id="label"
                value={localField.label}
                onChange={(e) => handleUpdate({ label: e.target.value })}
                placeholder="Ex: Nome completo"
              />
            </div>

            <div>
              <Label htmlFor="field_type">Tipo de campo</Label>
              <Select value={localField.field_type} onValueChange={handleTypeChange}>
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
              <Label htmlFor="is_required">Campo obrigatório</Label>
              <Switch
                id="is_required"
                checked={localField.is_required}
                onCheckedChange={(checked) => handleUpdate({ is_required: checked })}
              />
            </div>

            <div>
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={localField.placeholder || ""}
                onChange={(e) => handleUpdate({ placeholder: e.target.value })}
                placeholder="Texto exibido quando o campo estiver vazio"
              />
            </div>
          </div>

          {requiresOptions(localField.field_type) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Opções</Label>
                <span className="text-xs text-muted-foreground">
                  Configure as opções exibidas para o usuário
                </span>
              </div>
              <OptionsEditor
                options={localField.options || []}
                onChange={(options) => handleUpdate({ options })}
              />
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="auto_fill_source">Preenchimento automático</Label>
            <Select
              value={localField.auto_fill_source || "none"}
              onValueChange={(value) =>
                handleUpdate({ auto_fill_source: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent>
                {autoFillOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localField.auto_fill_source && (
              <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>
                  O sistema tentará preencher este campo automaticamente usando os dados
                  disponíveis do cliente ou do agendamento.
                </span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface OptionsEditorProps {
  options: Array<{ label: string; value: string }>;
  onChange: (options: Array<{ label: string; value: string }>) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [localOptions, setLocalOptions] = useState(options || []);

  useEffect(() => {
    setLocalOptions(options || []);
  }, [options]);

  const update = (updated: Array<{ label: string; value: string }>) => {
    setLocalOptions(updated);
    onChange(updated);
  };

  const addOption = () => {
    const index = localOptions.length + 1;
    update([
      ...localOptions,
      {
        label: `Opção ${index}`,
        value: `opcao_${index}`,
      },
    ]);
  };

  const updateOption = (index: number, field: "label" | "value", value: string) => {
    const updated = [...localOptions];
    updated[index] = { ...updated[index], [field]: value };
    update(updated);
  };

  const removeOption = (index: number) => {
    const updated = localOptions.filter((_, i) => i !== index);
    update(updated);
  };

  return (
    <div className="space-y-2">
      {localOptions.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={option.label}
            onChange={(e) => updateOption(index, "label", e.target.value)}
            placeholder={`Rótulo ${index + 1}`}
            className="flex-1"
          />
          <Input
            value={option.value}
            onChange={(e) => updateOption(index, "value", e.target.value)}
            placeholder={`Valor ${index + 1}`}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeOption(index)}
            className="text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOption} className="w-full">
        + Adicionar opção
      </Button>
    </div>
  );
}
