import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  Edit, 
  Copy,
  FileCheck,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
  FileText,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFormResponse } from "@/hooks/forms/useFormResponses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFormTemplate } from "@/hooks/forms/useFormTemplates";
import { useFormFields } from "@/hooks/forms/useFormFields";
import { FormSignatureDialog } from "./FormSignatureDialog";
import AdvancedPDFEditor from "@/components/admin/AdvancedPDFEditor";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurar worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FormSubmittedPreviewProps {
  responseId: string;
  onEdit?: () => void;
  onDuplicate?: (responseId: string) => void;
  onClose?: () => void;
}

export function FormSubmittedPreview({ 
  responseId, 
  onEdit,
  onDuplicate,
  onClose 
}: FormSubmittedPreviewProps) {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

  const { response, isLoading: loadingResponse } = useFormResponse(responseId);
  const { template, isLoading: loadingTemplate } = useFormTemplate(
    response?.template_id || ""
  );
  const { fields = [], isLoading: loadingFields } = useFormFields(
    response?.template_id || ""
  );

  const isLoading = loadingResponse || loadingTemplate || loadingFields;

  // Gerar PDF automaticamente ao abrir preview
  useEffect(() => {
    if (response && template?.pdf_template_url && !pdfUrl && !isGeneratingPDF) {
      // Primeiro, verificar se já existe um PDF assinado/preenchido
      const filledPdfPath = (response as any).filled_pdf_path as string | null | undefined;
      
      if (filledPdfPath) {
        console.log('PDF já existe, carregando:', filledPdfPath);
        loadExistingPDF(filledPdfPath);
      } else {
        console.log('PDF não existe, gerando novo');
        generatePDFPreview();
      }
    }
  }, [response, template]);
  
  const loadExistingPDF = async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("form-pdfs")
        .createSignedUrl(pdfPath, 3600);
        
      if (error) {
        console.error('Erro ao carregar PDF existente:', error);
        // Se falhar, gerar novo
        generatePDFPreview();
        return;
      }
      
      if (data?.signedUrl) {
        console.log('PDF carregado com sucesso:', data.signedUrl);
        setPdfUrl(data.signedUrl);
        setPdfPath(pdfPath);
      }
    } catch (error) {
      console.error('Erro ao carregar PDF:', error);
      generatePDFPreview();
    }
  };

  const generatePDFPreview = async () => {
    setIsGeneratingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-filled-pdf', {
        body: { response_id: responseId }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      }
      // optional returned storage path
      if (data?.pdf_path || data?.file_path) {
        setPdfPath(data?.pdf_path || data?.file_path);
      }
    } catch (error) {
      console.error("Erro ao gerar preview do PDF:", error);
      toast({
        title: "Erro ao gerar preview",
        description: "Não foi possível gerar a visualização do PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      toast({
        title: "PDF aberto",
        description: "O PDF foi aberto em uma nova aba",
      });
    } else {
      generatePDFPreview();
    }
  };

  const handleDuplicate = async () => {
    if (!response || !template) return;

    setIsDuplicating(true);
    try {
      // Criar nova response com os mesmos dados
      const { data: newResponse, error } = await supabase
        .from('form_responses')
        .insert({
          template_id: response.template_id,
          template_version: response.template_version,
          client_id: response.client_id,
          response_data: response.response_data,
          status: 'draft', // Nova ficha começa como rascunho
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Ficha duplicada",
        description: "Uma cópia da ficha foi criada. Você pode editá-la agora.",
      });

      // Chamar callback para abrir a nova ficha em modo de edição
      if (onDuplicate && newResponse) {
        onDuplicate(newResponse.id);
      }
    } catch (error) {
      console.error("Erro ao duplicar ficha:", error);
      toast({
        title: "Erro ao duplicar",
        description: "Não foi possível duplicar a ficha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
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

  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
  }), []);

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
  const hasPdfTemplate = !!template.pdf_template_url;

  return (
    <div className="space-y-6">
      {/* Cabeçalho com status e ações rápidas */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{template.name}</CardTitle>
                <Badge variant={statusInfo.variant}>
                  <StatusIcon className={`h-4 w-4 mr-1 ${statusInfo.color}`} />
                  {statusInfo.label}
                </Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
            
            {/* Botões de ação rápida */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={isDuplicating}
              >
                {isDuplicating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicar
              </Button>
            </div>
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

      {/* Tabs: Dados vs PDF Preview */}
      <Tabs defaultValue={hasPdfTemplate ? "pdf" : "dados"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {hasPdfTemplate && (
            <TabsTrigger value="pdf">
              <Eye className="h-4 w-4 mr-2" />
              Visualizar PDF
            </TabsTrigger>
          )}
          <TabsTrigger value="dados">
            <FileText className="h-4 w-4 mr-2" />
            Dados Preenchidos
          </TabsTrigger>
        </TabsList>

        {/* Tab: PDF Preview */}
        {hasPdfTemplate && (
          <TabsContent value="pdf" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Preview do Documento</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.1))}
                      disabled={pdfScale <= 0.5}
                    >
                      -
                    </Button>
                    <span className="text-sm font-medium w-16 text-center">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPdfScale(Math.min(2.0, pdfScale + 0.1))}
                      disabled={pdfScale >= 2.0}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isGeneratingPDF ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Gerando preview do PDF...
                    </p>
                  </div>
                ) : pdfUrl ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-auto max-h-[600px] bg-gray-100">
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        options={pdfOptions}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                        error={
                          <div className="p-8 text-center text-destructive">
                            Erro ao carregar PDF
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={pdfScale}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                        />
                      </Document>
                    </div>
                    
                    {/* Navegação de páginas */}
                    {numPages > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                          disabled={pageNumber <= 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm">
                          Página {pageNumber} de {numPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                          disabled={pageNumber >= numPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <FileCheck className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique em "Baixar Documento" para gerar o PDF
                    </p>
                    <Button onClick={generatePDFPreview}>
                      Gerar Preview
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Dados Preenchidos */}
        <TabsContent value="dados" className="mt-4">
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
        </TabsContent>
      </Tabs>

      {/* Ações inferiores */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Fechar
        </Button>

          <div className="flex items-center gap-2">
            {/* Botão Assinar - abre diálogo de assinatura */}
            <Button
              variant="outline"
              onClick={() => setShowSignatureDialog(true)}
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Assinar
            </Button>

          {hasPdfTemplate && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              {pdfPath && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedEditor(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Documento
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Signature Dialog */}
      {showSignatureDialog && (
        <Dialog open={showSignatureDialog} onOpenChange={(open) => setShowSignatureDialog(open)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assinar ficha</DialogTitle>
            </DialogHeader>
            <FormSignatureDialog responseId={responseId} onClose={() => setShowSignatureDialog(false)} onSigned={() => setShowSignatureDialog(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Advanced PDF Editor placeholder (opens when requested) */}
      {showAdvancedEditor && pdfPath && (
        <AdvancedPDFEditor
          document={{ id: responseId, file_name: template?.name || 'document.pdf', file_path: pdfPath, original_file_name: template?.name || 'document.pdf' }}
          clientId={response.client_id}
          onSave={() => setShowAdvancedEditor(false)}
          onCancel={() => setShowAdvancedEditor(false)}
        />
      )}
    </div>
  );
}
