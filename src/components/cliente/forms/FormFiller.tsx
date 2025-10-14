// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormResponse, useFormResponses } from "@/hooks/forms/useFormResponses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { FormField } from "@/types/forms";

export default function FormFiller() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estado: se id é um template ou um response existente
  const [isExistingResponse, setIsExistingResponse] = useState(false);
  const [responseId, setResponseId] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState<string | undefined>();

  // Dados do formulário
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { template, isLoading: loadingTemplate } = useFormTemplate(templateId);
  const { response, isLoading: loadingResponse } = useFormResponse(responseId);
  const { createResponse, updateResponse, submitResponse } = useFormResponses();

  // Buscar campos do template
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (!templateId) return;

    const fetchFields = async () => {
      const { data } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (data) {
        setFields(data as any);
      }
    };

    fetchFields();
  }, [templateId]);

  // Determinar se é template novo ou response existente
  useEffect(() => {
    if (!id) return;

    // Tentar carregar como response primeiro
    const checkIfResponse = async () => {
      const { data } = await supabase
        .from('form_responses')
        .select('id, template_id')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        setIsExistingResponse(true);
        setResponseId(id);
        setTemplateId(data.template_id);
      } else {
        setIsExistingResponse(false);
        setTemplateId(id);
      }
    };

    checkIfResponse();
  }, [id]);

  // Carregar dados existentes do response
  useEffect(() => {
    if (response?.response_data) {
      setFormData(response.response_data as Record<string, any>);
    }
  }, [response]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (!responseId || Object.keys(formData).length === 0) return;

    const interval = setInterval(async () => {
      await handleSave(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, responseId]);

  // Calcular progresso
  const calculateProgress = useCallback(() => {
    if (fields.length === 0) return 0;
    
    const requiredFields = fields.filter((f: FormField) => f.is_required);
    if (requiredFields.length === 0) return 100;

    const filledRequired = requiredFields.filter(
      (f: FormField) => formData[f.field_key] !== undefined && formData[f.field_key] !== ''
    );

    return Math.round((filledRequired.length / requiredFields.length) * 100);
  }, [fields, formData]);

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    
    // Limpar erro do campo
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (fields.length === 0) return false;

    const newErrors: Record<string, string> = {};

    fields.forEach((field: FormField) => {
      const value = formData[field.field_key];

      // Validar campo obrigatório
      if (field.is_required && (value === undefined || value === '' || value === null)) {
        newErrors[field.field_key] = `${field.label} é obrigatório`;
      }

      // Validar tipo email
      if (field.field_type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.field_key] = 'E-mail inválido';
        }
      }

      // Validar tipo CPF
      if (field.field_type === 'cpf' && value) {
        const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
        if (!cpfRegex.test(value)) {
          newErrors[field.field_key] = 'CPF inválido (formato: 000.000.000-00)';
        }
      }

      // Validar regras personalizadas
      if (field.validation_rules) {
        const rules = field.validation_rules as any;
        
        if (rules.minLength && value && value.length < rules.minLength) {
          newErrors[field.field_key] = `Mínimo ${rules.minLength} caracteres`;
        }

        if (rules.maxLength && value && value.length > rules.maxLength) {
          newErrors[field.field_key] = `Máximo ${rules.maxLength} caracteres`;
        }

        if (rules.min && value < rules.min) {
          newErrors[field.field_key] = `Valor mínimo: ${rules.min}`;
        }

        if (rules.max && value > rules.max) {
          newErrors[field.field_key] = `Valor máximo: ${rules.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (silent = false) => {
    if (!templateId) return;

    setIsSaving(true);

    try {
      if (responseId) {
        // Atualizar response existente
        await updateResponse({
          id: responseId,
          updates: {
            response_data: formData,
          },
        });
      } else {
        // Criar novo response
        const newResponse = await createResponse({
          template_id: templateId,
          response_data: formData,
          status: 'draft',
        });
        setResponseId(newResponse.id);
      }

      if (!silent) {
        toast({
          title: "Salvo!",
          description: "Suas respostas foram salvas.",
        });
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar suas respostas.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Campos inválidos",
        description: "Por favor, corrija os erros antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    // Salvar antes de submeter
    await handleSave(true);

    if (responseId) {
      await submitResponse(responseId);
      navigate('/area-cliente/forms');
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_key];
    const error = errors[field.field_key];

    const commonProps = {
      id: field.field_key,
      disabled: isSaving,
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'cpf':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type={field.field_type === 'email' ? 'email' : 'text'}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || ''}
              className={error ? 'border-destructive' : ''}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              {...commonProps}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={4}
              className={error ? 'border-destructive' : ''}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.field_key, parseFloat(e.target.value))}
              placeholder={field.placeholder || ''}
              className={error ? 'border-destructive' : ''}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="date"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(v) => handleFieldChange(field.field_key, v)}
              disabled={isSaving}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || 'Selecione...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id}>
            <Label>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={value || ''}
              onValueChange={(v) => handleFieldChange(field.field_key, v)}
              disabled={isSaving}
              className="mt-2"
            >
              {field.options?.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${field.field_key}-${opt.value}`} />
                  <Label htmlFor={`${field.field_key}-${opt.value}`} className="font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id}>
            <Label>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2 mt-2">
              {field.options?.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_key}-${opt.value}`}
                    checked={Array.isArray(value) && value.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = checked
                        ? [...currentValues, opt.value]
                        : currentValues.filter((v) => v !== opt.value);
                      handleFieldChange(field.field_key, newValues);
                    }}
                    disabled={isSaving}
                  />
                  <Label htmlFor={`${field.field_key}-${opt.value}`} className="font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      case 'toggle':
        return (
          <div key={field.id} className="flex items-center justify-between">
            <Label htmlFor={field.field_key}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Switch
              {...commonProps}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.field_key, checked)}
            />
            {field.help_text && (
              <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (loadingTemplate || loadingResponse) {
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
            <p className="text-muted-foreground">Ficha não encontrada</p>
            <Button onClick={() => navigate('/area-cliente/forms')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/area-cliente/forms')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Progresso</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6">
            {fields.map((field: FormField) => renderField(field))}
          </form>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={() => handleSave()}
          variant="outline"
          disabled={isSaving}
          className="flex-1"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving || progress < 100}
          className="flex-1"
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar Ficha
        </Button>
      </div>

      {progress < 100 && (
        <p className="text-sm text-center text-muted-foreground mt-4">
          Preencha todos os campos obrigatórios (*) para enviar a ficha
        </p>
      )}
    </div>
  );
}

// Importar supabase
import { supabase } from "@/integrations/supabase/client";
