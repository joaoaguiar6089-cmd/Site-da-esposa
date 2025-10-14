import { useState } from "react";
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
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Tipos simplificados
export type SimpleFieldType = 'text' | 'number' | 'checkbox' | 'select';

export interface SimpleField {
  id: string;
  field_key: string;
  label: string;
  field_type: SimpleFieldType;
  is_required: boolean;
  order_index: number;
  options?: string[]; // Para checkbox e select
  auto_fill_mapping?: {
    source: string; // 'client.nome', 'client.cpf', etc
  };
}

interface SimpleFieldEditorProps {
  fields: SimpleField[];
  onFieldsChange: (fields: SimpleField[]) => void;
}

const AUTO_FILL_OPTIONS = [
  { value: '', label: 'Nenhum' },
  { value: 'client.nome', label: 'Nome do Cliente' },
  { value: 'client.sobrenome', label: 'Sobrenome do Cliente' },
  { value: 'client.cpf', label: 'CPF' },
  { value: 'client.celular', label: 'Celular' },
  { value: 'client.data_nascimento', label: 'Data de Nascimento' },
  { value: 'client.cidade', label: 'Cidade' },
];

export default function SimpleFieldEditor({ fields, onFieldsChange }: SimpleFieldEditorProps) {
  const [editingField, setEditingField] = useState<SimpleField | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<SimpleFieldType>('text');

  const generateFieldKey = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const addField = () => {
    if (!newFieldLabel.trim()) return;

    const newField: SimpleField = {
      id: `field_${Date.now()}`,
      field_key: generateFieldKey(newFieldLabel),
      label: newFieldLabel,
      field_type: newFieldType,
      is_required: false,
      order_index: fields.length,
      options: newFieldType === 'checkbox' || newFieldType === 'select' ? ['Opção 1'] : undefined,
    };

    onFieldsChange([...fields, newField]);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  const updateField = (fieldId: string, updates: Partial<SimpleField>) => {
    const updated = fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    );
    onFieldsChange(updated);
  };

  const deleteField = (fieldId: string) => {
    const filtered = fields.filter(f => f.id !== fieldId);
    onFieldsChange(filtered);
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOption = `Opção ${field.options.length + 1}`;
    updateField(fieldId, {
      options: [...field.options, newOption]
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, newValue: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOptions = [...field.options];
    newOptions[optionIndex] = newValue;
    updateField(fieldId, { options: newOptions });
  };

  const deleteOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
    updateField(fieldId, { options: newOptions });
  };

  return (
    <div className="space-y-6">
      {/* Adicionar Novo Campo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Novo Campo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rótulo do Campo</Label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Ex: Nome Completo"
              />
            </div>
            <div>
              <Label>Tipo de Campo</Label>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as SimpleFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="checkbox">Checkbox (Múltiplas Opções)</SelectItem>
                  <SelectItem value="select">Múltipla Escolha (Uma Opção)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addField} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Campos */}
      <div className="space-y-3">
        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum campo criado. Adicione campos usando o formulário acima.
            </CardContent>
          </Card>
        ) : (
          fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <CardTitle className="text-base">{field.label}</CardTitle>
                    <Badge variant="outline">{field.field_type}</Badge>
                    {field.is_required && (
                      <Badge variant="destructive">Obrigatório</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rótulo</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Obrigatório?</Label>
                    <Select
                      value={field.is_required ? 'yes' : 'no'}
                      onValueChange={(v) => updateField(field.id, { is_required: v === 'yes' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">Não</SelectItem>
                        <SelectItem value="yes">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Auto-fill */}
                <div>
                  <Label>Preencher Automaticamente com Dados do Cliente</Label>
                  <Select
                    value={field.auto_fill_mapping?.source || ''}
                    onValueChange={(v) => updateField(field.id, {
                      auto_fill_mapping: v ? { source: v } : undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTO_FILL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Opções para checkbox e select */}
                {(field.field_type === 'checkbox' || field.field_type === 'select') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Opções</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(field.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Opção
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {field.options?.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(field.id, idx, e.target.value)}
                            placeholder={`Opção ${idx + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOption(field.id, idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
