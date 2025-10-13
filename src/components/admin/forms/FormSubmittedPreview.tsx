import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  Edit, 
  Save, 
  FileCheck,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormResponse } from "@/hooks/forms/useFormResponses";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormFields } from "@/hooks/forms/useFormFields";

interface FormSubmittedPreviewProps {
  responseId: string;
  onEdit?: () => void;
  onSave?: () => void;
  onClose?: () => void;
}

export function FormSubmittedPreview({ 
  responseId, 
  onEdit,
  onSave,
  onClose 
}: FormSubmittedPreviewProps) {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { response, isLoading: loadingResponse } = useFormResponse(responseId);
  const { template, isLoading: loadingTemplate } = useFormTemplate(
    response?.template_id || ""
  );
  const { fields = [], isLoading: loadingFields } = useFormFields(
    response?.template_id || ""
  );

  const isLoading = loadingResponse || loadingTemplate || loadingFields;

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-filled-pdf', {
        body: { response_id: responseId }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast({
          title: "PDF gerado com sucesso",
          description: `${data.fields_filled} campos preenchidos`,
        });
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      // Aqui você pode adicionar lógica adicional antes de salvar
      // Por exemplo, marcar como revisada
      
      toast({
        title: "Ficha salva",
        description: "A ficha está disponível na aba de fichas do cliente",
      });

      if (onSave) {
        onSave();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          label: 'Rascunho', 
          icon: Clock, 
          variant: 'secondary' as const,
          color: 'text-yellow-600'
        };
      case 'submitted':
        return { 
          label: 'Enviada', 
          icon: CheckCircle2, 
          variant: 'default' as const,
          color: 'text-green-600'
        };
      case 'reviewed':
        return { 
          label: 'Revisada', 
          icon: FileCheck, 
          variant: 'default' as const,
          color: 'text-blue-600'
        };
      case 'archived':
        return { 
          label: 'Arquivada', 
          icon: AlertCircle, 
          variant: 'outline' as const,
          color: 'text-gray-600'
        };
      default:
        return { 
          label: status, 
          icon: AlertCircle, 
          variant: 'outline' as const,
          color: 'text-gray-600'
        };
    }
  };

  const formatValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Não preenchido</span>;
    }

    switch (fieldType) {
      case 'date':
        try {
          return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch {
          return value;
        }
      case 'datetime-local':
        try {
          return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
          return value;
        }
      case 'toggle':
        return value ? 'Sim' : 'Não';
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!response || !template) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Ficha não encontrada
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(response.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Cabeçalho com status */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
            <Badge variant={statusInfo.variant} className="ml-4">
              <StatusIcon className={`h-4 w-4 mr-1 ${statusInfo.color}`} />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>
              <strong>Criada em:</strong>{' '}
              {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { 
                locale: ptBR 
              })}
            </div>
            {response.updated_at && response.updated_at !== response.created_at && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div>
                  <strong>Atualizada em:</strong>{' '}
                  {format(new Date(response.updated_at), "dd/MM/yyyy 'às' HH:mm", { 
                    locale: ptBR 
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados preenchidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Preenchidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum campo configurado
              </p>
            ) : (
              fields.map((field, index) => (
                <div key={field.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium">
                        {field.label}
                        {field.is_required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </label>
                      {field.description && (
                        <span className="text-xs text-muted-foreground italic max-w-xs text-right">
                          {field.description}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {formatValue(
                        response.response_data?.[field.field_key],
                        field.field_type
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isGeneratingPDF || isSaving}
        >
          <Edit className="h-4 w-4 mr-2" />
          Voltar ao Formulário
        </Button>

        <div className="flex items-center gap-3">
          {/* Botão Assinar - placeholder para implementação futura */}
          <Button
            variant="outline"
            disabled
            title="Em breve: funcionalidade de assinatura digital"
          >
            <FileSignature className="h-4 w-4 mr-2" />
            Assinar
            <Badge variant="secondary" className="ml-2 text-xs">
              Em breve
            </Badge>
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || isSaving || !template.pdf_template_url}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className={`h-4 w-4 mr-2 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                Baixar Documento
              </>
            )}
          </Button>

          <Button
            onClick={handleSaveAndClose}
            disabled={isGeneratingPDF || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar e Concluir
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
