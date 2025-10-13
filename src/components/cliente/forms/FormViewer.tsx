import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useFormResponse } from "@/hooks/forms/useFormResponses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FormField } from "@/types/forms";

export default function FormViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { response, isLoading } = useFormResponse(id);

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
          const selectedOptions = field.options?.filter(opt => value.includes(opt.value));
          return selectedOptions?.map(opt => opt.label).join(', ') || value.join(', ');
        }
        return value;

      case 'select':
      case 'radio':
        const option = field.options?.find(opt => opt.value === value);
        return option?.label || value;

      case 'textarea':
        return <pre className="whitespace-pre-wrap font-sans">{value}</pre>;

      default:
        return value.toString();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!response) {
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

  const template = (response as any).form_templates;
  const fields = template?.form_fields || [];
  const responseData = response.response_data as Record<string, any>;

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
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{template?.name || 'Ficha'}</h1>
            {template?.description && (
              <p className="text-muted-foreground">{template.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-green-100 text-green-800">
              {response.status === 'reviewed' ? 'Revisada' : 'Enviada'}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Enviada em {format(new Date(response.submitted_at || response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Respostas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum campo disponível
            </p>
          ) : (
            fields
              .sort((a: FormField, b: FormField) => a.order_index - b.order_index)
              .map((field: FormField, index: number) => (
                <div key={field.id}>
                  {index > 0 && <Separator className="mb-6" />}
                  <div>
                    <h3 className="font-medium mb-2">
                      {field.label}
                      {field.is_required && <span className="text-muted-foreground ml-1">(obrigatório)</span>}
                    </h3>
                    <div className="text-foreground">
                      {renderValue(field, responseData[field.field_key])}
                    </div>
                    {field.help_text && (
                      <p className="text-sm text-muted-foreground mt-1">{field.help_text}</p>
                    )}
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <Button variant="outline" className="flex-1" disabled>
          <Download className="mr-2 h-4 w-4" />
          Baixar PDF (em breve)
        </Button>
      </div>
    </div>
  );
}
