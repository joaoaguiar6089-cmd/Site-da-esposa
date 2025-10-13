import { Download, Loader2 } from "lucide-react";
import { useFormResponse } from "@/hooks/forms/useFormResponses";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FormField } from "@/types/forms";

interface FormViewerDialogProps {
  responseId: string;
  onDownloadPDF?: () => void;
}

export default function FormViewerDialog({ responseId, onDownloadPDF }: FormViewerDialogProps) {
  const { response, isLoading } = useFormResponse(responseId);

  const renderValue = (field: FormField, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Não informado</span>;
    }

    switch (field.field_type) {
      case 'date':
        try {
          return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
        } catch {
          return value;
        }

      case 'datetime':
        try {
          return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
          return value;
        }

      case 'toggle':
        return value ? 'Sim' : 'Não';

      case 'checkbox':
        if (Array.isArray(value)) {
          const selectedOptions = field.options?.filter((opt: any) => value.includes(opt.value));
          return selectedOptions?.map((opt: any) => opt.label).join(', ') || value.join(', ');
        }
        return value;

      case 'select':
      case 'radio':
        const option = field.options?.find((opt: any) => opt.value === value);
        return option?.label || value;

      case 'textarea':
        return <pre className="whitespace-pre-wrap font-sans text-sm">{value}</pre>;

      default:
        return value.toString();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      rascunho: { label: "Rascunho", variant: "secondary" },
      enviada: { label: "Enviada", variant: "default" },
      revisada: { label: "Revisada", variant: "outline" },
    };

    const config = statusConfig[status] || statusConfig.rascunho;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!response) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Ficha não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const template = (response as any).form_templates;
  const fields = template?.form_fields || [];
  const responseData = response.response_data as Record<string, any>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">{template?.name || "Ficha"}</h3>
          <p className="text-sm text-muted-foreground">
            Preenchida em {format(new Date(response.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(response.status)}
          {template?.pdf_template_url && onDownloadPDF && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Dados da Ficha */}
      <div className="space-y-6">
        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum campo disponível
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {fields.map((field: FormField) => {
              const value = responseData?.[field.field_key];
              
              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{field.label}</h4>
                    {field.is_required && (
                      <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>
                  {field.help_text && (
                    <p className="text-xs text-muted-foreground">{field.help_text}</p>
                  )}
                  <div className="text-sm bg-muted/30 rounded-lg p-3">
                    {renderValue(field, value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata */}
      <Separator />
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Criado em</p>
          <p className="font-medium">
            {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Última atualização</p>
          <p className="font-medium">
            {format(new Date(response.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    </div>
  );
}
