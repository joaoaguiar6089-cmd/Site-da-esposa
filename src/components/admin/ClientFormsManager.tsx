import { useState } from "react";
import { useFormTemplates } from "@/hooks/forms/useFormTemplates";
import { useFormResponses } from "@/hooks/forms/useFormResponses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  Plus, 
  Eye, 
  Download, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FormFillerDialog from "./forms/FormFillerDialog";
import FormViewerDialog from "./forms/FormViewerDialog";

interface ClientFormsManagerProps {
  clientId: string;
  clientName: string;
}

export default function ClientFormsManager({ clientId, clientName }: ClientFormsManagerProps) {
  const { toast } = useToast();
  const { templates, isLoading: loadingTemplates } = useFormTemplates();
  const { responses, isLoading: loadingResponses } = useFormResponses({ 
    clientId 
  });

  const [showFillDialog, setShowFillDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleFillForm = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowFillDialog(true);
  };

  const handleViewResponse = (responseId: string) => {
    setSelectedResponseId(responseId);
    setShowViewDialog(true);
  };

  const handleDownloadPDF = async (responseId: string) => {
    setIsGeneratingPDF(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-filled-pdf', {
        body: { response_id: responseId },
      });

      if (error) {
        console.error('Erro ao gerar PDF:', error);
        throw error;
      }

      if (data?.pdf_url) {
        // Abrir PDF em nova aba
        window.open(data.pdf_url, '_blank');
        
        toast({
          title: "PDF gerado com sucesso",
          description: `${data.fields_filled} campos preenchidos`,
        });
      } else {
        throw new Error('URL do PDF não retornada');
      }
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF preenchido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      rascunho: { label: "Rascunho", variant: "secondary" as const, icon: Clock },
      enviada: { label: "Enviada", variant: "default" as const, icon: CheckCircle2 },
      revisada: { label: "Revisada", variant: "outline" as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rascunho;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loadingTemplates || loadingResponses) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando fichas...</p>
        </div>
      </div>
    );
  }

  const publishedTemplates = templates.filter(t => t.is_published && t.is_active);
  const clientResponses = responses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fichas de {clientName}</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as fichas e formulários do cliente
          </p>
        </div>
      </div>

      {/* Fichas Disponíveis */}
      <div>
        <h4 className="text-md font-medium mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Fichas Disponíveis
        </h4>
        
        {publishedTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma ficha publicada disponível
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {publishedTemplates.map((template) => {
              const existingResponse = clientResponses.find(
                r => r.template_id === template.id && r.status !== 'rascunho'
              );

              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="text-sm mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      {template.category && (
                        <Badge variant="outline" className="ml-2">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {existingResponse ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewResponse(existingResponse.id)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                          {template.pdf_template_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPDF(existingResponse.id)}
                              disabled={isGeneratingPDF}
                            >
                              <Download className={`h-4 w-4 mr-2 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                              PDF
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleFillForm(template.id)}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Preencher Ficha
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fichas Preenchidas */}
      {clientResponses.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Fichas
          </h4>
          
          <div className="space-y-3">
            {clientResponses.map((response) => {
              const template = templates.find(t => t.id === response.template_id);
              
              return (
                <Card key={response.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium">
                            {template?.name || "Ficha sem nome"}
                          </h5>
                          {getStatusBadge(response.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Preenchida em {format(new Date(response.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewResponse(response.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        {template?.pdf_template_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(response.id)}
                            disabled={isGeneratingPDF}
                          >
                            <Download className={`h-4 w-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog de Preenchimento */}
      <Dialog open={showFillDialog} onOpenChange={setShowFillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preencher Ficha</DialogTitle>
            <DialogDescription>
              Preencha os campos da ficha para o cliente {clientName}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplateId && (
            <FormFillerDialog
              templateId={selectedTemplateId}
              clientId={clientId}
              onSuccess={() => {
                setShowFillDialog(false);
                setSelectedTemplateId(null);
              }}
              onCancel={() => {
                setShowFillDialog(false);
                setSelectedTemplateId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Ficha</DialogTitle>
            <DialogDescription>
              Visualize os dados preenchidos da ficha
            </DialogDescription>
          </DialogHeader>
          {selectedResponseId && (
            <FormViewerDialog
              responseId={selectedResponseId}
              onDownloadPDF={() => handleDownloadPDF(selectedResponseId)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
