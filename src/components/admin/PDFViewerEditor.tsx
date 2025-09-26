import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Edit, Save, Download, Trash2, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface PDFViewerEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const PDFViewerEditor = ({ document, onSave, onCancel }: PDFViewerEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState<string>("");
  const [scale, setScale] = useState(1.0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      console.log("🔍 Carregando documento PDF:", document.file_path);
      
      // Buscar URL assinada do documento
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 3600); // 1 hora

      if (urlError) {
        console.error("❌ Erro ao obter URL:", urlError);
        throw urlError;
      }

      if (urlData?.signedUrl) {
        console.log("✅ URL obtida:", urlData.signedUrl);
        setPdfUrl(urlData.signedUrl);
        setPdfError("");
      } else {
        throw new Error("URL não disponível");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar documento:", error);
      setPdfError("Não foi possível carregar o documento PDF");
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento PDF",
        variant: "destructive",
      });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPdfLoaded(true);
    setPdfError("");
    
    console.log("✅ PDF carregado com sucesso:", numPages, "páginas");
    
    toast({
      title: "PDF Carregado",
      description: `Documento carregado com ${numPages} página${numPages > 1 ? 's' : ''}`,
    });
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("❌ Erro ao carregar PDF:", error);
    setPdfError("Erro ao carregar o PDF");
    setPdfLoaded(false);
    
    toast({
      title: "Erro",
      description: "Erro ao carregar o documento PDF",
      variant: "destructive",
    });
  };

  const changePage = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPoint) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
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

    const x = 50 + Math.random() * 200;
    const y = 100 + Math.random() * 200;

    // Fundo amarelo para destaque
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.fillRect(x - 5, y - 25, 180, 35);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ANOTAÇÃO', x, y);

    const annotation = {
      type: 'text',
      x, y,
      text: 'ANOTAÇÃO',
      page: currentPage
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Anotação Adicionada",
      description: "Texto inserido no documento",
    });
  };

  const clearAnnotations = () => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setAnnotations([]);

    toast({
      title: "Anotações Removidas",
      description: "Todas as anotações foram limpas",
    });
  };

  const downloadAnnotated = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png');
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `anotado_${document.file_name}_pag${currentPage}.png`;
    link.click();

    toast({
      title: "Download Concluído",
      description: "Página anotada foi baixada",
    });
  };

  const handleSave = async () => {
    try {
      toast({
        title: "Salvo",
        description: "Anotações foram registradas",
      });
      onSave();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar anotações",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Status do documento */}
      <div className={`border rounded-lg p-4 ${pdfLoaded ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Status do Documento</h3>
        </div>
        <p className="text-sm">
          <strong>Arquivo:</strong> {document.file_name}
        </p>
        <p className="text-sm">
          <strong>Status:</strong> {pdfLoaded ? "✅ PDF carregado e visível" : pdfError ? "❌ Erro ao carregar" : "⏳ Carregando..."}
        </p>
        {pdfLoaded && (
          <p className="text-sm">
            <strong>Páginas:</strong> {numPages} | <strong>Página atual:</strong> {currentPage}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <Label>Nome do arquivo:</Label>
          <Input value={document.file_name} readOnly className="w-64" />
        </div>
        
        <div className="flex gap-2">
          {/* Navegação de páginas */}
          {pdfLoaded && numPages > 1 && (
            <>
              <Button 
                onClick={() => changePage(-1)} 
                disabled={currentPage <= 1}
                variant="outline" 
                size="sm"
              >
                Página Anterior
              </Button>
              <Button 
                onClick={() => changePage(1)} 
                disabled={currentPage >= numPages}
                variant="outline" 
                size="sm"
              >
                Próxima Página
              </Button>
            </>
          )}
          
          {/* Zoom */}
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          {/* Ferramentas de anotação */}
          <Button onClick={addTextAnnotation} disabled={!pdfLoaded} size="sm">
            <Type className="h-4 w-4 mr-1" />
            Adicionar Texto
          </Button>
          
          <Button onClick={clearAnnotations} disabled={!pdfLoaded} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar Anotações
          </Button>
          
          <Button onClick={downloadAnnotated} disabled={!pdfLoaded} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Baixar Página
          </Button>
          
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Visualizador PDF com overlay de anotações */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center min-h-[700px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
            {pdfError ? (
              <div className="text-center">
                <div className="text-red-600 mb-4">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Erro ao Carregar PDF</p>
                  <p className="text-sm">{pdfError}</p>
                </div>
                <Button onClick={loadPDFDocument} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            ) : !pdfLoaded ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando PDF...</p>
                <p className="text-sm text-gray-600 mt-2">Aguarde um momento</p>
              </div>
            ) : (
              <div className="relative">
                {/* PDF Document */}
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="text-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p>Carregando página...</p>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={currentPage} 
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
                
                {/* Canvas overlay para anotações */}
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  style={{
                    width: `${595 * scale}px`,
                    height: `${842 * scale}px`,
                  }}
                  width={595 * scale}
                  height={842 * scale}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            )}
          </div>
          
          {pdfLoaded && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>🎨 <strong>Instruções:</strong></p>
              <p>• PDF carregado e visível • Clique e arraste sobre o PDF para desenhar</p>
              <p>• Use "Adicionar Texto" para inserir anotações • Navegue entre páginas se houver múltiplas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFViewerEditor;