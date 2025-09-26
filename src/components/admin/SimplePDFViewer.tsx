import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Upload, Save, Pen, Square, Circle, Minus, RotateCcw, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';

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

interface Annotation {
  type: 'pen' | 'highlight' | 'text';
  path: string;
  color: string;
  width: number;
  x?: number;
  y?: number;
}

const SimplePDFViewer = ({ document, clientId, onSave, onCancel }: SimplePDFViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlight'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(2);
  const canvasRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();

  // Detectar dispositivo móvel/tablet
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?=.*Tablet)|(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileDevice || isTablet || isTouchDevice);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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

    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo Inválido",
        description: "Por favor, selecione apenas arquivos PDF",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setHasNewVersion(true);
    
    toast({
      title: "Nova Versão Carregada",
      description: "Arquivo carregado. Visualize as alterações e clique em 'Salvar' para confirmar.",
    });

    const tempUrl = URL.createObjectURL(file);
    setPdfUrl(tempUrl);
  };

  const saveNewVersion = async () => {
    if (!uploadedFile) return;

    try {
      setIsLoading(true);
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .update(document.file_path, uploadedFile, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

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

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  const saveAnnotations = async () => {
    if (!canvasRef.current || !pdfUrl) return;

    try {
      setIsLoading(true);
      
      // Obter dados do canvas
      const canvasData = canvasRef.current.toDataURL();
      
      // Baixar PDF original
      const pdfResponse = await fetch(pdfUrl);
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      
      // Carregar PDF com pdf-lib
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      // Converter canvas para imagem
      const canvasImage = await pdfDoc.embedPng(canvasData);
      const { width, height } = firstPage.getSize();
      
      // Desenhar anotações sobre o PDF
      firstPage.drawImage(canvasImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
        opacity: 0.8,
      });
      
      // Salvar PDF modificado
      const pdfBytes = await pdfDoc.save();
      const modifiedFile = new File([pdfBytes], document.file_name, { type: 'application/pdf' });
      
      // Upload do arquivo modificado
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .update(document.file_path, modifiedFile, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      toast({
        title: "Anotações Salvas",
        description: "PDF atualizado com suas anotações",
      });

      setShowMobileEditor(false);
      loadPDFDocument();
      
    } catch (error) {
      console.error("Erro ao salvar anotações:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar anotações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startMobileEditing = () => {
    setShowMobileEditor(true);
  };

  const colors = [
    { name: 'Preto', value: '#000000' },
    { name: 'Azul', value: '#0066CC' },
    { name: 'Vermelho', value: '#CC0000' },
    { name: 'Verde', value: '#00AA00' },
    { name: 'Amarelo', value: '#FFAA00' },
    { name: 'Roxo', value: '#6600CC' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-3 bg-blue-50 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-base">
                Editar: {document.file_name}
                <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                  {isMobile ? '📱 Modo Mobile' : '🖥️ Modo Desktop'}
                </span>
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                {isMobile 
                  ? 'Use as ferramentas de anotação otimizadas para touch e Apple Pencil'
                  : 'Edite o documento PDF usando as ferramentas nativas do navegador'
                }
              </p>
            </div>
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              {isLoading ? "⏳ Carregando..." : 
               pdfUrl ? "✅ Pronto" : 
               error ? "❌ Erro" : "Aguardando..."}
            </span>
          </div>
        </div>

        {/* Controles - Desktop */}
        {!isMobile && (
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
        )}

        {/* Controles - Mobile */}
        {isMobile && !showMobileEditor && (
          <div className="flex flex-col gap-2 p-3 bg-gray-50 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Button onClick={startMobileEditing} disabled={!pdfUrl} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Pen className="h-4 w-4 mr-2" />
                Iniciar Edição
              </Button>
              <Button onClick={openInNewTab} disabled={!pdfUrl} size="sm" variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Nova Aba
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm" className="ml-auto">
                Fechar
              </Button>
            </div>
            <div className="text-sm bg-blue-100 p-2 rounded">
              💡 <strong>Dica:</strong> Para editar no iPad, toque em "Iniciar Edição" para usar ferramentas otimizadas para Apple Pencil
            </div>
          </div>
        )}

        {/* Ferramentas Mobile - Modo Edição */}
        {isMobile && showMobileEditor && (
          <div className="flex flex-col gap-2 p-3 bg-gray-50 border-b shrink-0">
            {/* Linha 1: Ferramentas */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setCurrentTool('pen')}
                size="sm"
                variant={currentTool === 'pen' ? 'default' : 'outline'}
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentTool('highlight')}
                size="sm"
                variant={currentTool === 'highlight' ? 'default' : 'outline'}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button onClick={clearCanvas} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              {/* Espessura */}
              <select
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={1}>Fino</option>
                <option value={2}>Médio</option>
                <option value={4}>Grosso</option>
                <option value={6}>Extra</option>
              </select>
            </div>
            
            {/* Linha 2: Cores */}
            <div className="flex items-center gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setCurrentColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    currentColor === color.value ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            
            {/* Linha 3: Ações */}
            <div className="flex items-center gap-2">
              <Button onClick={saveAnnotations} disabled={isLoading} size="sm" className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Salvando..." : "Salvar Anotações"}
              </Button>
              <Button onClick={() => setShowMobileEditor(false)} variant="outline" size="sm">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Área do PDF */}
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
                <p className="text-xl font-medium mb-2">
                  {isLoading && showMobileEditor ? 'Salvando Anotações...' : 'Carregando PDF...'}
                </p>
                <p className="text-sm text-gray-600">Aguarde um momento</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="relative w-full h-full">
              {/* PDF Viewer */}
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 bg-white"
                title={`PDF: ${document.file_name}`}
                allowFullScreen
              />
              
              {/* Canvas de Anotação (Mobile) */}
              {isMobile && showMobileEditor && (
                <div className="absolute inset-0 pointer-events-none">
                  <SignatureCanvas
                    ref={canvasRef}
                    canvasProps={{
                      className: 'w-full h-full pointer-events-auto',
                      style: { 
                        background: 'transparent',
                        touchAction: 'none'
                      }
                    }}
                    backgroundColor="transparent"
                    penColor={currentColor}
                    minWidth={penWidth}
                    maxWidth={penWidth}
                  />
                </div>
              )}
            </div>
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

        {/* Footer com instruções específicas por plataforma */}
        <div className="text-sm text-gray-700 bg-green-50 p-3 border-t shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">{isMobile ? '📱' : '🖥️'}</span>
            <div className="flex-1">
              {isMobile ? (
                <>
                  <strong className="text-green-800">iPad/Mobile:</strong>
                  <span className="ml-2">
                    Toque em "Iniciar Edição" para usar ferramentas touch otimizadas • 
                    Suporte completo ao Apple Pencil • 
                    Anotações são salvas automaticamente no PDF
                  </span>
                </>
              ) : (
                <>
                  <strong className="text-green-800">Desktop:</strong>
                  <span className="ml-2">
                    1) Edite o PDF acima • 2) Use Ctrl+S para baixar • 3) Upload da nova versão • 
                    Ou abra em "Nova Aba" para ferramentas completas
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePDFViewer;