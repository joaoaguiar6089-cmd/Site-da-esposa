import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ExternalLink, Upload, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
  notes?: string;
}

interface SimplePDFViewerProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const SimplePDFViewer = ({ document, clientId, onSave, onCancel }: SimplePDFViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  const openInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setHasNewVersion(true);
    
    toast({
      title: "Nova Versão Carregada",
      description: "Arquivo carregado. Visualize as alterações e clique em 'Salvar' para confirmar.",
    });

    // Criar URL temporário para visualização
    const tempUrl = URL.createObjectURL(file);
    setPdfUrl(tempUrl);
  };

  const saveNewVersion = async () => {
    if (!uploadedFile) return;

    try {
      setIsLoading(true);
      
      // Atualizar o arquivo existente (sobrescrever)
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .update(document.file_path, uploadedFile, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      // Atualizar registro no banco de dados
      const now = new Date();
      const editNote = `Documento editado em ${now.toLocaleString('pt-BR')}`;
      
      const { error: dbError } = await supabase
        .from('client_documents')
        .update({
          file_size: uploadedFile.size,
          notes: `${document.notes || ''} - ${editNote}`,
          updated_at: now.toISOString()
        })
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento Salvo",
        description: "PDF foi atualizado com suas edições",
      });

      setHasNewVersion(false);
      setUploadedFile(null);
      
      // Recarregar o documento
      loadPDFDocument();
      onSave();
    } catch (error) {
      console.error("Erro ao salvar PDF editado:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              <h3 className="font-semibold text-base">Editar: {document.file_name}</h3>
              <p className="text-xs text-blue-700 mt-1">
                Edite o documento PDF usando as ferramentas nativas do navegador.
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
        <div className="flex items-center gap-3 p-3 bg-gray-50 border-b shrink-0">
          <Button onClick={openInNewTab} disabled={!pdfUrl} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Nova Aba
          </Button>
          
          <div className="flex gap-2 ml-auto">
            {hasNewVersion && (
              <Button onClick={saveNewVersion} disabled={isLoading} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            )}
            <label className="cursor-pointer">
              <Button disabled={isLoading} size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Nova Versão
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <Button onClick={onCancel} variant="outline" size="sm">
              Fechar
            </Button>
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
      </div>
    </div>
  );
};

export default SimplePDFViewer;