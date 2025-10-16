// @ts-nocheck
import { useState, useEffect } from "react";
import { Save, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormFields } from "@/hooks/forms/useFormFields";
import { useFormResponses, useFormResponse } from "@/hooks/forms/useFormResponses";
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
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { FormField } from "@/types/forms";
import { FormSubmittedPreview } from "./FormSubmittedPreviewV2";

interface FormFillerDialogProps {
  templateId?: string;
  clientId: string;
  existingResponseId?: string; // Para edição de ficha existente
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FormFillerDialog({ 
  templateId, 
  clientId,
  existingResponseId,
  onSuccess,
  onCancel 
}: FormFillerDialogProps) {
  const { toast } = useToast();
  
  // Se está editando, buscar dados da response existente
  const { response: existingResponse, isLoading: loadingExisting } = useFormResponse(
    existingResponseId || ''
  );
  
  // Template ID pode vir das props ou da response existente
  const effectiveTemplateId = templateId || existingResponse?.template_id || '';
  
  const { template, isLoading: loadingTemplate } = useFormTemplate(effectiveTemplateId);
  const { fields } = useFormFields(effectiveTemplateId);
  const { createResponse, updateResponse } = useFormResponses();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(existingResponseId || null);
  const [showPreview, setShowPreview] = useState(false);
  const [autoFillContext, setAutoFillContext] = useState<{
    client: any;
    appointment: any;
    procedure: any;
  }>({ client: null, appointment: null, procedure: null });

  useEffect(() => {
    const loadAutoFillData = async () => {
      try {
        if (!clientId) return;

        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        const { data: appointmentRows } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            city_settings:city_settings ( city_name ),
            procedures (
              id,
              name,
              duration
            ),
            appointments_procedures (
              id,
              order_index,
              procedure:procedures (
                id,
                name,
                duration
              )
            )
          `)
          .eq('client_id', clientId)
          .order('appointment_date', { ascending: false })
          .order('appointment_time', { ascending: false })
          .limit(1);

        const latestAppointment = appointmentRows?.[0] || null;

        let primaryProcedure = null;
        if (latestAppointment?.procedures) {
          primaryProcedure = latestAppointment.procedures;
        } else if (
          latestAppointment?.appointments_procedures &&
          latestAppointment.appointments_procedures.length > 0
        ) {
          const sorted = [...latestAppointment.appointments_procedures].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
          );
          primaryProcedure = sorted[0]?.procedure ?? null;
        }

        setAutoFillContext({
          client: clientData ?? null,
          appointment: latestAppointment,
          procedure: primaryProcedure,
        });
      } catch (error) {
        console.error("Erro ao carregar dados para auto preenchimento:", error);
      }
    };

    loadAutoFillData();
  }, [clientId]);

  // Carregar dados existentes se estiver editando
  useEffect(() => {
    if (existingResponse && fields.length > 0) {
      // Carregar dados da response existente
      const data = existingResponse.response_data as Record<string, any> || {};
      setFormData(data);
      setResponseId(existingResponse.id);
    } else if (fields.length > 0 && !existingResponse) {
      // Inicializar com valores vazios para nova ficha
      const defaultValues: Record<string, any> = {};
      fields.forEach((field) => {
        // Usar auto_fill_mapping.defaultValue se disponível
        if (field.auto_fill_mapping?.defaultValue !== undefined && field.auto_fill_mapping?.defaultValue !== null) {
          defaultValues[field.field_key] = field.auto_fill_mapping.defaultValue;
        } else if (field.field_type === 'checkbox') {
          defaultValues[field.field_key] = [];
        } else if (field.field_type === 'toggle') {
          defaultValues[field.field_key] = false;
        }
      });
      setFormData(defaultValues);
    }
  }, [existingResponse, fields]);

  const formatDateValue = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return format(parsed, "dd/MM/yyyy");
  };

  const formatTimeValue = (value?: string | null) => {
    if (!value) return "";
    if (typeof value === "string" && value.length >= 5) {
      return value.slice(0, 5);
    }
    return value;
  };

  const isEmptyValue = (value: any) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    return false;
  };

  const resolveAutoFillValue = (source: string) => {
    const { client, appointment, procedure } = autoFillContext;

    switch (source) {
      case "client.nome":
        return client?.nome || "";
      case "client.sobrenome":
        return client?.sobrenome || "";
      case "client.cpf":
        return client?.cpf || "";
      case "client.email":
        return client?.email || "";
      case "client.telefone":
        return client?.telefone || client?.celular || client?.whatsapp || "";
      case "client.whatsapp":
        return client?.whatsapp || client?.celular || "";
      case "client.data_nascimento":
        return formatDateValue(client?.data_nascimento);
      case "appointment.date":
        return formatDateValue(appointment?.appointment_date);
      case "appointment.time":
        return formatTimeValue(appointment?.appointment_time);
      case "appointment.city":
        return appointment?.city_settings?.city_name || "";
      case "procedure.name":
        return procedure?.name || appointment?.procedures?.name || "";
      case "procedure.duration":
        return procedure?.duration != null
          ? String(procedure.duration)
          : appointment?.procedures?.duration != null
          ? String(appointment.procedures.duration)
          : "";
      case "system.current_date":
        return format(new Date(), "dd/MM/yyyy");
      case "system.current_time":
        return format(new Date(), "HH:mm");
      case "system.current_user":
        return "";
      default:
        return null;
    }
  };

  useEffect(() => {
    if (existingResponse) return;
    if (fields.length === 0) return;

    setFormData((prev) => {
      const updated = { ...prev };
      let changed = false;

      fields.forEach((field) => {
        if (!field.auto_fill_source) return;
        const currentValue = updated[field.field_key];
        if (!isEmptyValue(currentValue)) {
          return;
        }

        const resolved = resolveAutoFillValue(field.auto_fill_source);
        if (!isEmptyValue(resolved)) {
          updated[field.field_key] = resolved;
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, [fields, autoFillContext, existingResponse]);

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    // Limpar erro ao editar
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.is_required) {
        const value = formData[field.field_key];
        if (value === undefined || value === null || value === '') {
          newErrors[field.field_key] = 'Este campo é obrigatório';
        }
      }

      // Validações específicas por tipo
      if (formData[field.field_key]) {
        const value = formData[field.field_key];

        if (field.field_type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.field_key] = 'Email inválido';
          }
        }

        if (field.field_type === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            newErrors[field.field_key] = 'Número inválido';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (submit: boolean = false) => {
    if (!validateForm() && submit) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros antes de enviar",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let savedResponseId = responseId;

      console.log('=== DEBUG SAVE ===');
      console.log('Form Data:', formData);
      console.log('Template Version:', template?.version);
      console.log('Client ID:', clientId);
      console.log('Submit:', submit);

      if (!responseId) {
        // Criar nova response
        const newResponse = await createResponse({
          template_id: templateId,
          template_version: template?.version || 1,
          client_id: clientId,
          response_data: formData,
          status: submit ? 'submitted' : 'draft',
        });

        console.log('Response criada:', newResponse);

        savedResponseId = newResponse.id;
        setResponseId(newResponse.id);

        toast({
          title: submit ? "Ficha salva" : "Rascunho salvo",
          description: submit 
            ? "Abrindo visualização..." 
            : "Suas alterações foram salvas como rascunho",
        });
      } else {
        // Atualizar response existente
        // Sempre atualizar os dados primeiro
        await updateResponse({
          id: responseId,
          updates: {
            response_data: formData,
            status: submit ? 'submitted' : 'draft',
            ...(submit && { submitted_at: new Date().toISOString() })
          }
        });

        console.log('Response atualizada');

        toast({
          title: submit ? "Ficha salva" : "Alterações salvas",
          description: submit 
            ? "Abrindo visualização..." 
            : "Suas alterações foram salvas",
        });
      }

      // Mostrar preview após salvar com sucesso
      if (submit && savedResponseId) {
        setShowPreview(true);
      } else if (!submit && onSuccess) {
        // Se for rascunho, apenas chama onSuccess
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a ficha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_key];
    const error = errors[field.field_key];
    const commonProps = {
      id: field.field_key,
      disabled: isSaving,
    };

    let input: React.ReactNode;

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
      case 'time':
        input = (
          <Input
            {...commonProps}
            type={field.field_type}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
        break;

      case 'textarea':
        input = (
          <Textarea
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
          />
        );
        break;

      case 'select':
        input = (
          <Select
            value={value || ''}
            onValueChange={(val) => handleFieldChange(field.field_key, val)}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        break;

      case 'radio':
        input = (
          <RadioGroup
            value={value || ''}
            onValueChange={(val) => handleFieldChange(field.field_key, val)}
            disabled={isSaving}
          >
            {field.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.field_key}-${option.value}`} />
                <Label htmlFor={`${field.field_key}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
        break;

      case 'checkbox':
        input = (
          <div className="flex items-center space-x-2">
            <Checkbox
              {...commonProps}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.field_key, checked)}
            />
            <Label htmlFor={field.field_key} className="text-sm font-normal">
              {field.help_text}
            </Label>
          </div>
        );
        break;

      default:
        input = <p className="text-sm text-muted-foreground">Tipo de campo não suportado</p>;
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.field_key} className="flex items-center gap-1">
          {field.label}
          {field.is_required && <span className="text-destructive">*</span>}
        </Label>
        {field.help_text && field.field_type !== 'checkbox' && (
          <p className="text-xs text-muted-foreground">{field.help_text}</p>
        )}
        {input}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Ficha não encontrada</p>
      </div>
    );
  }

  // Se está mostrando preview, renderizar componente de preview
  if (showPreview && responseId) {
    return (
      <FormSubmittedPreview 
        responseId={responseId}
        onEdit={() => setShowPreview(false)}
        onDuplicate={(duplicatedResponseId) => {
          // Ao duplicar, carregar a nova ficha em modo de edição
          setResponseId(duplicatedResponseId);
          setShowPreview(false);
          // Recarregar dados será feito automaticamente pelo useEffect
        }}
        onClose={() => {
          if (onSuccess) {
            onSuccess();
          }
        }}
      />
    );
  }

  const progress = fields.length > 0 
    ? (Object.keys(formData).length / fields.filter(f => f.is_required).length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{template.name}</h3>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% completo
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}
      </div>

      {/* Campos do formulário */}
      <div className="space-y-6">
        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum campo configurado para esta ficha
            </CardContent>
          </Card>
        ) : (
          fields.map(renderField)
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </>
          )}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Ficha
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
