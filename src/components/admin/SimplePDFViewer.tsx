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
  const [dragActive, setDragActive] = useState(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo Inválido",
        description: "Por favor, selecione apenas arquivos PDF",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Atualizar o arquivo existente (sobrescrever)
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .update(document.file_path, file, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      toast({
        title: "✅ Documento Atualizado!",
        description: `PDF "${document.file_name}" foi substituído com suas edições`,
      });

      // Recarregar o documento
      setTimeout(() => {
        loadPDFDocument();
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao salvar PDF editado:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        // Simular o evento de input
        const fakeEvent = {
          target: { files: [file] }
        } as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(fakeEvent);
      } else {
        toast({
          title: "Arquivo Inválido",
          description: "Por favor, arraste apenas arquivos PDF",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header compacto */}
        <div className="border-b p-3 bg-blue-50 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-base">Visualizar: {document.file_name}</h3>
              <p className="text-xs text-blue-700 mt-1">
                Visualize o documento PDF com scroll completo e zoom nativo.
              </p>
            </div>
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              {isLoading ? "⏳ Carregando..." : 
               pdfUrl ? "✅ Pronto" : 
               error ? "❌ Erro" : "Aguardando..."}
            </span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-2 p-3 bg-gray-50 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Button onClick={openInNewTab} disabled={!pdfUrl} size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Nova Aba
            </Button>
            
            <Button onClick={downloadDocument} disabled={!pdfUrl} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar Original
            </Button>
            
            <div className="flex gap-2 ml-auto">
              <Button onClick={onSave} size="sm" className="bg-green-600 hover:bg-green-700">
                Fechar
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm">
                Cancelar
              </Button>
            </div>
          </div>
          
          {/* Instruções de edição em destaque */}
          <div className="bg-blue-100 border border-blue-300 rounded p-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">✏️</span>
              <strong className="text-blue-800">Como editar:</strong>
              <span className="text-blue-700">
                1) Edite o PDF acima • 2) Pressione <kbd className="bg-blue-200 px-1 rounded">Ctrl+S</kbd> para baixar • 3) Use o botão abaixo para fazer upload
              </span>
            </div>
          </div>
          
          {/* Upload Zone para arquivo editado */}
          <div 
            className={`border-2 border-dashed rounded p-3 transition-colors ${
              dragActive 
                ? 'border-green-500 bg-green-100' 
                : 'border-green-300 bg-green-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-lg">
                {dragActive ? '📥' : '📤'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {dragActive 
                    ? 'Solte o arquivo PDF aqui!' 
                    : 'Arquivo editado? Arraste aqui ou clique para selecionar:'
                  }
                </p>
                <label className="cursor-pointer">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-1 border-green-400 text-green-700 hover:bg-green-100" 
                    disabled={isLoading}
                    asChild
                  >
                    <span>
                      {isLoading ? '⏳ Salvando...' : '📁 Selecionar PDF Editado'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Área principal do PDF - ocupa todo espaço disponível */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                <FileText className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl font-medium text-red-600 mb-3">Erro ao Carregar PDF</h3>
                <p className="text-sm text-gray-600 mb-6">{error}</p>
                <Button onClick={loadPDFDocument} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-xl font-medium mb-2">Carregando PDF...</p>
                <p className="text-sm text-gray-600">Aguarde um momento</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 bg-white"
              title={`PDF: ${document.file_name}`}
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-medium mb-2">Nenhum documento carregado</p>
                <p className="text-sm text-gray-600">Selecione um documento para visualizar</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer com dicas */}
        <div className="text-sm text-gray-700 bg-yellow-50 p-3 border-t shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <strong className="text-yellow-800">Importante:</strong>
              <span className="ml-2">
                Por limitações de segurança do navegador, não é possível salvar automaticamente as edições do PDF. 
                Você deve baixar o arquivo editado e fazer upload da nova versão.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePDFViewer;