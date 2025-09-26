import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface SimplePDFViewerProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const SimplePDFViewer = ({ document, onSave, onCancel }: SimplePDFViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 7200);

      if (urlError || !urlData?.signedUrl) {
        throw new Error('Não foi possível obter o URL do documento');
      }

      setPdfUrl(urlData.signedUrl);
      
      toast({
        title: "Documento Carregado",
        description: "PDF carregado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao carregar documento:", error);
      setError(`Erro ao carregar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_file_name;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download Concluído",
        description: "Documento baixado com sucesso",
      });
    } catch (error) {
      console.error("Erro no download:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4 p-4 h-full">
      {/* Status */}
      <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Documento: {document.file_name}</h3>
        </div>
        <p className="text-xs text-blue-700">
          {isLoading ? "⏳ Carregando PDF..." : 
           pdfUrl ? "✅ PDF carregado e pronto para visualização" : 
           error ? `❌ ${error}` : "Aguardando..."}
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Button onClick={openInNewTab} disabled={!pdfUrl} size="sm">
          <ExternalLink className="h-3 w-3 mr-1" />
          Abrir em Nova Aba
        </Button>
        
        <Button onClick={downloadDocument} disabled={!pdfUrl} variant="outline" size="sm">
          <Download className="h-3 w-3 mr-1" />
          Baixar PDF
        </Button>
        
        <div className="flex gap-1 ml-auto">
          <Button onClick={onSave} size="sm">
            Fechar
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Visualizador */}
      <Card className="flex-1">
        <CardContent className="p-2 h-[600px]">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao Carregar PDF</h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <Button onClick={loadPDFDocument} variant="outline" size="sm">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando PDF...</p>
                <p className="text-sm text-gray-600 mt-2">Aguarde um momento</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="w-full h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 rounded"
                title={`PDF: ${document.file_name}`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Nenhum documento carregado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <div className="text-xs text-gray-600 bg-green-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <span>📄</span>
          <strong>Visualizador de PDF Simplificado:</strong>
        </div>
        <p>• Use "Abrir em Nova Aba" para visualizar o PDF em tela cheia</p>
        <p>• Use "Baixar PDF" para salvar o documento no seu computador</p>
        <p>• O visualizador integrado permite scroll e zoom nativos do navegador</p>
      </div>
    </div>
  );
};

export default SimplePDFViewer;