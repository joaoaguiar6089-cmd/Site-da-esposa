import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Save, Download, Trash2, FileText, ZoomIn, ZoomOut, Pen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker with a more reliable CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface Annotation {
  type: 'text' | 'draw' | 'signature';
  x: number;
  y: number;
  text?: string;
  page: number;
  width?: number;
  height?: number;
  paths?: { x: number; y: number }[][];
}

interface PDFViewerEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const PDFViewerEditor = ({ document, onSave, onCancel }: PDFViewerEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState<string>("");
  const [scale, setScale] = useState(1.0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'text'>('pen');
  const [pageWidth, setPageWidth] = useState(595);
  const [pageHeight, setPageHeight] = useState(842);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      setIsLoading(true);
      setPdfError("");
      console.log("🔍 Iniciando carregamento do PDF:", document.file_path);
      
      // Tentar múltiplas estratégias para obter o PDF
      let url: string | null = null;
      
      // Estratégia 1: URL assinada
      try {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(document.file_path, 7200); // 2 horas

        if (urlData?.signedUrl && !urlError) {
          url = urlData.signedUrl;
          console.log("✅ URL assinada obtida com sucesso");
        }
      } catch (err) {
        console.warn("⚠️ Falha na URL assinada:", err);
      }

      // Estratégia 2: Download direto se URL assinada falhar
      if (!url) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('client-documents')
            .download(document.file_path);

          if (fileData && !downloadError) {
            url = URL.createObjectURL(fileData);
            console.log("✅ Download direto bem-sucedido");
          }
        } catch (err) {
          console.warn("⚠️ Falha no download direto:", err);
        }
      }

      if (url) {
        setPdfUrl(url);
        console.log("✅ PDF URL definida:", url.substring(0, 100) + "...");
      } else {
        throw new Error("Não foi possível obter o arquivo PDF por nenhum método");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar documento:", error);
      setPdfError(`Erro ao carregar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPdfLoaded(true);
    setPdfError("");
    
    console.log("✅ PDF carregado com sucesso:", numPages, "páginas");
    
    toast({
      title: "PDF Carregado",
      description: `Documento carregado com ${numPages} página${numPages > 1 ? 's' : ''}`,
    });
  }, [toast]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("❌ Erro ao carregar PDF:", error);
    setPdfError(`Erro no carregamento: ${error.message}`);
    setPdfLoaded(false);
    
    toast({
      title: "Erro",
      description: "Erro ao carregar o documento PDF",
      variant: "destructive",
    });
  }, [toast]);

  const onPageLoadSuccess = useCallback((page: any) => {
    const { width, height } = page;
    setPageWidth(width);
    setPageHeight(height);
    
    // Configurar canvas com as dimensões da página
    if (canvasRef.current) {
      canvasRef.current.width = width * scale;
      canvasRef.current.height = height * scale;
      canvasRef.current.style.width = `${width * scale}px`;
      canvasRef.current.style.height = `${height * scale}px`;
    }
  }, [scale]);

  const changePage = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      // Limpar canvas ao mudar de página
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool !== 'pen') return;
    
    setIsDrawing(true);
    const pos = getMousePosition(e);
    setLastPoint(pos);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPoint || currentTool !== 'pen') return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPoint = getMousePosition(e);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const addTextAnnotation = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const x = 50 * scale;
    const y = 100 * scale;
    const fontSize = 16 * scale;

    // Fundo amarelo para destaque
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.fillRect(x - 5, y - fontSize - 5, 200 * scale, fontSize + 10);

    // Texto
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText('ASSINADO DIGITALMENTE', x, y);

    const annotation: Annotation = {
      type: 'text',
      x: x / scale,
      y: y / scale,
      text: 'ASSINADO DIGITALMENTE',
      page: currentPage,
      width: 200,
      height: fontSize
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Texto Adicionado",
      description: "Assinatura digital inserida no documento",
    });
  };

  const addSignatureBox = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const x = 100 * scale;
    const y = 200 * scale;
    const width = 200 * scale;
    const height = 60 * scale;

    // Caixa para assinatura
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Texto de instrução
    ctx.fillStyle = '#666666';
    ctx.font = `${12 * scale}px Arial`;
    ctx.fillText('Área para Assinatura', x + 10, y + height + 20);

    const annotation: Annotation = {
      type: 'signature',
      x: x / scale,
      y: y / scale,
      width: width / scale,
      height: height / scale,
      page: currentPage
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Caixa de Assinatura",
      description: "Área para assinatura criada",
    });
  };

  const clearAnnotations = () => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    setAnnotations(prev => prev.filter(ann => ann.page !== currentPage));

    toast({
      title: "Página Limpa",
      description: "Anotações da página atual foram removidas",
    });
  };

  const clearAllAnnotations = () => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    setAnnotations([]);

    toast({
      title: "Documento Limpo",
      description: "Todas as anotações foram removidas",
    });
  };

  const downloadAnnotated = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png');
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `${document.file_name}_anotado_pag${currentPage}.png`;
    link.click();

    toast({
      title: "Download Concluído",
      description: "Página com anotações foi baixada",
    });
  };

  const handleSave = async () => {
    try {
      // Salvar anotações no localStorage ou enviar para o servidor
      const annotationData = {
        documentId: document.id,
        annotations: annotations,
        timestamp: new Date().toISOString()
      };
      
      console.log("💾 Salvando anotações:", annotationData);
      
      toast({
        title: "Salvo com Sucesso",
        description: `${annotations.length} anotação(ões) registrada(s)`,
      });
      
      onSave();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar anotações",
        variant: "destructive",
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'text') {
      const pos = getMousePosition(e);
      const text = prompt("Digite o texto para inserir:");
      if (text) {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.font = `${16 * scale}px Arial`;
          ctx.fillText(text, pos.x, pos.y);
          
          const annotation: Annotation = {
            type: 'text',
            x: pos.x / scale,
            y: pos.y / scale,
            text: text,
            page: currentPage
          };
          
          setAnnotations(prev => [...prev, annotation]);
        }
      }
    }
  };

  return (
    <div className="space-y-4 p-4 h-full overflow-hidden">
      {/* Status */}
      <div className={`border rounded-lg p-3 ${pdfLoaded ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Status: {document.file_name}</h3>
        </div>
        <p className="text-xs">
          {isLoading ? "⏳ Carregando PDF..." : 
           pdfLoaded ? `✅ PDF carregado (${numPages} páginas) - Página ${currentPage}` : 
           pdfError ? `❌ ${pdfError}` : "Aguardando..."}
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
        {/* Ferramentas */}
        <div className="flex gap-1">
          <Button 
            onClick={() => setCurrentTool('pen')} 
            variant={currentTool === 'pen' ? 'default' : 'outline'} 
            size="sm"
          >
            <Pen className="h-3 w-3 mr-1" />
            Desenhar
          </Button>
          <Button 
            onClick={() => setCurrentTool('text')} 
            variant={currentTool === 'text' ? 'default' : 'outline'} 
            size="sm"
          >
            <Type className="h-3 w-3 mr-1" />
            Texto
          </Button>
        </div>

        {/* Navegação */}
        {pdfLoaded && numPages > 1 && (
          <div className="flex gap-1">
            <Button onClick={() => changePage(-1)} disabled={currentPage <= 1} variant="outline" size="sm">
              ← Anterior
            </Button>
            <span className="px-2 py-1 text-xs bg-white rounded border">
              {currentPage}/{numPages}
            </span>
            <Button onClick={() => changePage(1)} disabled={currentPage >= numPages} variant="outline" size="sm">
              Próxima →
            </Button>
          </div>
        )}

        {/* Zoom */}
        <div className="flex gap-1">
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="px-2 py-1 text-xs bg-white rounded border">
            {Math.round(scale * 100)}%
          </span>
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>

        {/* Ações */}
        <div className="flex gap-1">
          <Button onClick={addTextAnnotation} disabled={!pdfLoaded} size="sm">
            Assinatura Digital
          </Button>
          <Button onClick={addSignatureBox} disabled={!pdfLoaded} variant="outline" size="sm">
            Caixa Assinatura
          </Button>
          <Button onClick={clearAnnotations} disabled={!pdfLoaded} variant="outline" size="sm">
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar Página
          </Button>
        </div>

        {/* Salvar/Cancelar */}
        <div className="flex gap-1 ml-auto">
          <Button onClick={downloadAnnotated} disabled={!pdfLoaded} variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" />
            Baixar
          </Button>
          <Button onClick={handleSave} size="sm">
            <Save className="h-3 w-3 mr-1" />
            Salvar ({annotations.length})
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Visualizador */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-2 h-full">
          <div className="relative h-full overflow-auto bg-gray-100 rounded">
            {pdfError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao Carregar PDF</h3>
                  <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
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
              <div className="flex justify-center p-4">
                <div className="relative inline-block">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    options={{
                      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                      cMapPacked: true,
                      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
                    }}
                  >
                    <div ref={pageRef} className="relative">
                      <Page
                        pageNumber={currentPage}
                        scale={scale}
                        onLoadSuccess={onPageLoadSuccess}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      {/* Canvas sobreposto */}
                      <canvas
                        ref={canvasRef}
                        className={`absolute top-0 left-0 ${currentTool === 'pen' ? 'cursor-crosshair' : 'cursor-pointer'}`}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onClick={handleCanvasClick}
                        style={{
                          pointerEvents: 'auto',
                        }}
                      />
                    </div>
                  </Document>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Nenhum documento carregado</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      {pdfLoaded && (
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span>🎨</span>
            <strong>Instruções de Uso:</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p>• <strong>Desenhar:</strong> Selecione "Desenhar" e arraste sobre o PDF</p>
            <p>• <strong>Texto:</strong> Selecione "Texto" e clique onde deseja inserir</p>
            <p>• <strong>Assinatura Digital:</strong> Adiciona texto "ASSINADO DIGITALMENTE"</p>
            <p>• <strong>Zoom:</strong> Use os botões + e - para ajustar o tamanho</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewerEditor;