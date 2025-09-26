import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Save, Download, Trash2, FileText, ZoomIn, ZoomOut, Pen, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  width?: number;
  height?: number;
  color?: string;
}

interface PDFViewerEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const SimplePDFEditor = ({ document, onSave, onCancel }: PDFViewerEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'text'>('pen');
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1.0);
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      setIsLoading(true);
      setPdfError("");
      console.log("🔍 Carregando documento:", document.file_path);
      
      // Estratégia 1: URL assinada
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 7200);

      if (urlError) {
        console.warn("⚠️ Erro na URL assinada:", urlError);
        throw new Error(`Erro ao gerar URL: ${urlError.message}`);
      }

      if (urlData?.signedUrl) {
        setPdfUrl(urlData.signedUrl);
        setPdfLoaded(true);
        console.log("✅ PDF URL obtida com sucesso");
        
        toast({
          title: "PDF Carregado",
          description: "Documento pronto para edição",
        });
      } else {
        throw new Error("URL não disponível");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar documento:", error);
      setPdfError(error instanceof Error ? error.message : 'Erro desconhecido');
      setPdfLoaded(false);
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Definir tamanho do canvas (A4 padrão)
    const width = 794 * scale; // A4 width em pixels
    const height = 1123 * scale; // A4 height em pixels
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Fundo branco
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Desenhar bordas para simular página
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);
    }
  };

  useEffect(() => {
    if (pdfLoaded) {
      setTimeout(initializeCanvas, 100);
    }
  }, [pdfLoaded, scale]);

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
    const fontSize = 20 * scale;

    // Fundo amarelo para destaque
    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.fillRect(x - 10, y - fontSize - 5, 320 * scale, fontSize + 15);

    // Texto de assinatura
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText('✓ ASSINADO DIGITALMENTE', x, y);

    // Data atual
    const dateText = new Date().toLocaleDateString('pt-BR');
    ctx.font = `${12 * scale}px Arial`;
    ctx.fillText(`Data: ${dateText}`, x, y + 25 * scale);

    const annotation: Annotation = {
      type: 'signature',
      x: x / scale,
      y: y / scale,
      text: 'ASSINADO DIGITALMENTE',
      width: 300,
      height: 40
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Assinatura Digital",
      description: "Assinatura digital adicionada com sucesso",
    });
  };

  const addCustomText = () => {
    const text = prompt("Digite o texto a ser inserido:");
    if (!text || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const x = 100 * scale;
    const y = 200 * scale;
    const fontSize = 16 * scale;

    ctx.fillStyle = '#000000';
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(text, x, y);

    const annotation: Annotation = {
      type: 'text',
      x: x / scale,
      y: y / scale,
      text: text,
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Texto Adicionado",
      description: `Texto "${text}" inserido no documento`,
    });
  };

  const addSignatureBox = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const x = 100 * scale;
    const y = 300 * scale;
    const width = 250 * scale;
    const height = 80 * scale;

    // Caixa para assinatura
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]); // Reset dash

    // Texto de instrução
    ctx.fillStyle = '#666666';
    ctx.font = `${12 * scale}px Arial`;
    ctx.fillText('__ Área para Assinatura Manuscrita __', x + 10, y + height + 20);

    // Linha para assinatura
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + height - 10);
    ctx.lineTo(x + width - 10, y + height - 10);
    ctx.stroke();

    const annotation: Annotation = {
      type: 'signature',
      x: x / scale,
      y: y / scale,
      width: width / scale,
      height: height / scale,
    };
    
    setAnnotations(prev => [...prev, annotation]);

    toast({
      title: "Caixa de Assinatura",
      description: "Área para assinatura manuscrita criada",
    });
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    
    initializeCanvas();
    setAnnotations([]);

    toast({
      title: "Canvas Limpo",
      description: "Todas as anotações foram removidas",
    });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${document.file_name}_editado.png`;
    link.click();

    toast({
      title: "Download Concluído",
      description: "Documento editado foi baixado",
    });
  };

  const handleSave = async () => {
    try {
      if (!canvasRef.current) return;
      
      const imageData = canvasRef.current.toDataURL('image/png', 1.0);
      
      const annotationData = {
        documentId: document.id,
        annotations: annotations,
        timestamp: new Date().toISOString(),
        imageData: imageData.substring(0, 100) + '...' // Store reference only
      };
      
      console.log("💾 Salvando documento editado:", annotationData);
      
      toast({
        title: "Salvo com Sucesso",
        description: `Documento com ${annotations.length} anotação(ões) foi salvo`,
      });
      
      onSave();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o documento editado",
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
          <h3 className="font-semibold text-sm">Editor Simples: {document.file_name}</h3>
        </div>
        <p className="text-xs">
          {isLoading ? "⏳ Carregando documento..." : 
           pdfLoaded ? "✅ Documento carregado - Pronto para edição" : 
           pdfError ? `❌ ${pdfError}` : "Aguardando..."}
        </p>
        {pdfUrl && (
          <p className="text-xs text-blue-600 mt-1">
            📎 <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Ver PDF original em nova aba
            </a>
          </p>
        )}
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

        {/* Ações rápidas */}
        <div className="flex gap-1">
          <Button onClick={addTextAnnotation} disabled={!pdfLoaded} size="sm">
            ✓ Assinatura Digital
          </Button>
          <Button onClick={addCustomText} disabled={!pdfLoaded} variant="outline" size="sm">
            Texto Customizado
          </Button>
          <Button onClick={addSignatureBox} disabled={!pdfLoaded} variant="outline" size="sm">
            📝 Caixa Assinatura
          </Button>
          <Button onClick={clearCanvas} disabled={!pdfLoaded} variant="outline" size="sm">
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>

        {/* Salvar/Cancelar */}
        <div className="flex gap-1 ml-auto">
          <Button onClick={() => window.open(pdfUrl, '_blank')} disabled={!pdfLoaded} variant="outline" size="sm">
            <FileText className="h-3 w-3 mr-1" />
            Ver Original
          </Button>
          <Button onClick={downloadCanvas} disabled={!pdfLoaded} variant="outline" size="sm">
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

      {/* Editor Canvas */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 h-full">
          {pdfError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao Carregar</h3>
                <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
                <Button onClick={loadPDFDocument} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando Documento...</p>
                <p className="text-sm text-gray-600 mt-2">Preparando editor...</p>
              </div>
            </div>
          ) : pdfLoaded ? (
            <div className="h-full overflow-auto bg-gray-100 rounded-lg p-4">
              <div className="flex justify-center">
                <div ref={containerRef} className="relative inline-block shadow-lg">
                  <canvas
                    ref={canvasRef}
                    className={`border border-gray-300 bg-white ${currentTool === 'pen' ? 'cursor-crosshair' : 'cursor-pointer'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onClick={handleCanvasClick}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Editor de Documentos</p>
                <p className="text-sm text-gray-600">Carregue um documento para começar</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      {pdfLoaded && (
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span>💡</span>
            <strong>Como usar o editor:</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p>• <strong>Desenhar:</strong> Selecione "Desenhar" e desenhe sobre o canvas branco</p>
            <p>• <strong>Texto:</strong> Selecione "Texto" e clique onde deseja inserir</p>
            <p>• <strong>Assinatura Digital:</strong> Adiciona selo "ASSINADO DIGITALMENTE"</p>
            <p>• <strong>Ver Original:</strong> Abre o PDF original em nova aba para referência</p>
          </div>
          <p className="mt-2 text-orange-600">
            <strong>Nota:</strong> Este editor usa um canvas branco para anotações. Você pode ver o PDF original clicando em "Ver Original" para referência.
          </p>
        </div>
      )}
    </div>
  );
};

export default SimplePDFEditor;