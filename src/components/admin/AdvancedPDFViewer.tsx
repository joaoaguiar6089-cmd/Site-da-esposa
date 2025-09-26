import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Download, 
  FileText, 
  ExternalLink, 
  Type, 
  Edit3, 
  Save, 
  Trash2, 
  Plus 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface Annotation {
  id?: string;
  content: string;
  position_x: number;
  position_y: number;
  page_number: number;
  annotation_type: string;
}

interface AdvancedPDFViewerProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const AdvancedPDFViewer = ({ document, onSave, onCancel }: AdvancedPDFViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
    loadAnnotations();
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

  const loadAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('document_annotations')
        .select('*')
        .eq('document_id', document.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setAnnotations(data || []);
    } catch (error) {
      console.error("Erro ao carregar anotações:", error);
    }
  };

  const saveAnnotation = async (annotation: Annotation) => {
    try {
      setIsSaving(true);
      
      const annotationData = {
        document_id: document.id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        annotation_type: annotation.annotation_type,
        content: annotation.content,
        position_x: annotation.position_x,
        position_y: annotation.position_y,
        page_number: annotation.page_number,
      };

      if (annotation.id) {
        // Update existing annotation
        const { error } = await supabase
          .from('document_annotations')
          .update(annotationData)
          .eq('id', annotation.id);

        if (error) throw error;
      } else {
        // Create new annotation
        const { error } = await supabase
          .from('document_annotations')
          .insert([annotationData]);

        if (error) throw error;
      }

      await loadAnnotations();
      
      toast({
        title: "Anotação Salva",
        description: "Anotação salva com sucesso no banco de dados",
      });
    } catch (error) {
      console.error("Erro ao salvar anotação:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar anotação",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('document_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;

      await loadAnnotations();
      
      toast({
        title: "Anotação Removida",
        description: "Anotação removida com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover anotação:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover anotação",
        variant: "destructive",
      });
    }
  };

  const addTextAnnotation = () => {
    setNewAnnotation({
      content: "",
      position_x: 50,
      position_y: 100,
      page_number: 1,
      annotation_type: "text"
    });
    setShowAnnotationForm(true);
  };

  const addSignatureAnnotation = () => {
    const signatureAnnotation: Annotation = {
      content: "ASSINADO DIGITALMENTE",
      position_x: 100,
      position_y: 200,
      page_number: 1,
      annotation_type: "signature"
    };
    
    saveAnnotation(signatureAnnotation);
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
    <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
      {/* Header com Status */}
      <div className="border-b p-4 bg-blue-50 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Documento: {document.file_name}</h3>
        </div>
        <p className="text-xs text-blue-700">
          {isLoading ? "⏳ Carregando PDF..." : 
           pdfUrl ? "✅ PDF carregado - Use scroll para navegação completa" : 
           error ? `❌ ${error}` : "Aguardando..."}
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b shrink-0">
        <Button onClick={openInNewTab} disabled={!pdfUrl} size="sm">
          <ExternalLink className="h-3 w-3 mr-1" />
          Nova Aba
        </Button>
        
        <Button onClick={downloadDocument} disabled={!pdfUrl} variant="outline" size="sm">
          <Download className="h-3 w-3 mr-1" />
          Baixar
        </Button>

        <Button 
          onClick={() => setIsEditing(!isEditing)} 
          disabled={!pdfUrl} 
          variant={isEditing ? "default" : "outline"}
          size="sm"
        >
          <Edit3 className="h-3 w-3 mr-1" />
          {isEditing ? "Sair da Edição" : "Editar"}
        </Button>

        {isEditing && (
          <>
            <Button onClick={addTextAnnotation} size="sm" variant="outline">
              <Type className="h-3 w-3 mr-1" />
              Texto
            </Button>
            
            <Button onClick={addSignatureAnnotation} size="sm" variant="outline">
              <Edit3 className="h-3 w-3 mr-1" />
              Assinatura
            </Button>
          </>
        )}
        
        <div className="flex gap-1 ml-auto">
          <Button onClick={onSave} size="sm">
            <Save className="h-3 w-3 mr-1" />
            Fechar ({annotations.length})
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Área principal dividida */}
      <div className="flex flex-1 overflow-hidden">
        {/* Visualizador de PDF */}
        <div className="flex-1 overflow-hidden">
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
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`PDF: ${document.file_name}`}
              style={{ 
                minHeight: '100%',
                overflow: 'auto'
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Nenhum documento carregado</p>
              </div>
            </div>
          )}
        </div>

        {/* Painel de Anotações (apenas quando editando) */}
        {isEditing && (
          <div className="w-80 border-l bg-gray-50 overflow-y-auto shrink-0">
            <div className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Anotações ({annotations.length})
              </h4>
              
              {/* Lista de anotações */}
              <div className="space-y-3">
                {annotations.map((annotation) => (
                  <Card key={annotation.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {annotation.annotation_type}
                      </span>
                      <Button
                        onClick={() => annotation.id && deleteAnnotation(annotation.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm">{annotation.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Página {annotation.page_number} - 
                      X: {Math.round(annotation.position_x)}, Y: {Math.round(annotation.position_y)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para nova anotação */}
      {showAnnotationForm && newAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-w-[90vw]">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">Nova Anotação</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Conteúdo</label>
                  <Textarea
                    value={newAnnotation.content}
                    onChange={(e) => setNewAnnotation({
                      ...newAnnotation,
                      content: e.target.value
                    })}
                    placeholder="Digite o texto da anotação..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Posição X</label>
                    <Input
                      type="number"
                      value={newAnnotation.position_x}
                      onChange={(e) => setNewAnnotation({
                        ...newAnnotation,
                        position_x: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Posição Y</label>
                    <Input
                      type="number"
                      value={newAnnotation.position_y}
                      onChange={(e) => setNewAnnotation({
                        ...newAnnotation,
                        position_y: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Página</label>
                  <Input
                    type="number"
                    min="1"
                    value={newAnnotation.page_number}
                    onChange={(e) => setNewAnnotation({
                      ...newAnnotation,
                      page_number: parseInt(e.target.value) || 1
                    })}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setShowAnnotationForm(false);
                      setNewAnnotation(null);
                    }}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      saveAnnotation(newAnnotation);
                      setShowAnnotationForm(false);
                      setNewAnnotation(null);
                    }}
                    disabled={!newAnnotation.content.trim() || isSaving}
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instruções */}
      <div className="p-3 text-xs text-gray-600 bg-green-50 border-t shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span>📄</span>
          <strong>Visualizador Avançado:</strong>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          <p>• PDF com scroll nativo e zoom do navegador</p>
          <p>• Modo de edição para adicionar anotações</p>
          <p>• Anotações salvas automaticamente no banco</p>
          <p>• Visualização responsiva para desktop e mobile</p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPDFViewer;