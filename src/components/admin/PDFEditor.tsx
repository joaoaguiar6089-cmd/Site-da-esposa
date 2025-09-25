import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Type, Edit, Save, Download, Trash2, Move } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument } from "pdf-lib";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface PDFEditorProps {
  document: Document;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

const PDFEditor = ({ document, clientId, onSave, onCancel }: PDFEditorProps) => {
  console.log("PDFEditor rendered with document:", document);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw">("select");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(16);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(2);
  const [fileName, setFileName] = useState(document.file_name);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [tempText, setTempText] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const { toast } = useToast();

  // Função para obter dimensões responsivas
  const getCanvasDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32;
    const isMobile = window.innerWidth < 768;
    
    return {
      width: Math.min(containerWidth, isMobile ? Math.min(350, window.innerWidth - 40) : 800),
      height: isMobile ? 500 : 600
    };
  }, []);

  // Inicializar canvas
  const initializeCanvas = useCallback(() => {
    console.log("Initializing canvas...");
    
    if (!canvasRef.current) {
      console.log("No canvas ref available");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log("Could not get canvas context");
      return;
    }

    const dimensions = getCanvasDimensions();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Configurar contexto
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setContext(ctx);
    console.log("Canvas initialized successfully");
    
    // Carregar PDF após inicializar canvas
    loadPDF();
  }, [getCanvasDimensions]);

  // Carregar PDF
  const loadPDF = async () => {
    console.log("Starting loadPDF", { documentPath: document.file_path });
    
    try {
      console.log("Downloading PDF from storage...");
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) {
        console.error("Supabase storage error:", error);
        throw error;
      }

      console.log("PDF downloaded successfully, size:", data.size, "bytes");
      
      const arrayBuffer = await data.arrayBuffer();
      console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);
      
      console.log("Loading PDF with pdf-lib...");
      const pdfDocument = await PDFDocument.load(arrayBuffer);
      console.log("PDF loaded successfully, pages:", pdfDocument.getPageCount());
      
      setPdfDoc(pdfDocument);
      setTotalPages(pdfDocument.getPageCount());
      
      // Desenhar primeira página
      drawPage();
      
      console.log("PDF setup complete");
      setLoading(false);
    } catch (error) {
      console.error("Error in loadPDF:", error);
      setLoading(false);
      toast({
        title: "Erro",
        description: `Erro ao carregar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  // Desenhar página
  const drawPage = useCallback(() => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    console.log("Drawing page...", { currentPage, totalPages });
    
    // Limpar canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar borda
    context.strokeStyle = '#e5e5e5';
    context.lineWidth = 1;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Informações do documento
    context.fillStyle = '#333333';
    context.font = 'bold 18px Arial';
    context.fillText(`Documento: ${document.file_name}`, 20, 40);

    // Informações da página
    context.fillStyle = '#666666';
    context.font = '14px Arial';
    context.fillText(`Página ${currentPage + 1} de ${totalPages}`, 20, 65);

    // Instruções
    context.fillStyle = '#999999';
    context.font = '12px Arial';
    context.fillText('Use as ferramentas para adicionar texto ou desenhar sobre o documento', 20, 90);

    // Desenhar caminhos de desenho
    drawPaths.forEach(path => {
      if (path.points.length > 1) {
        context.strokeStyle = path.color;
        context.lineWidth = path.width;
        context.beginPath();
        context.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
          context.lineTo(path.points[i].x, path.points[i].y);
        }
        
        context.stroke();
      }
    });

    // Desenhar caminho atual (durante o desenho)
    if (currentPath.length > 1) {
      context.strokeStyle = drawColor;
      context.lineWidth = drawWidth;
      context.beginPath();
      context.moveTo(currentPath[0].x, currentPath[0].y);
      
      for (let i = 1; i < currentPath.length; i++) {
        context.lineTo(currentPath[i].x, currentPath[i].y);
      }
      
      context.stroke();
    }

    // Desenhar elementos de texto
    textElements.forEach(element => {
      context.fillStyle = element.color;
      context.font = `${element.fontSize}px Arial`;
      context.fillText(element.text, element.x, element.y);

      // Destacar elemento selecionado
      if (selectedElement === element.id) {
        const metrics = context.measureText(element.text);
        context.strokeStyle = '#007bff';
        context.lineWidth = 2;
        context.strokeRect(
          element.x - 2, 
          element.y - element.fontSize - 2, 
          metrics.width + 4, 
          element.fontSize + 4
        );
      }
    });
  }, [context, currentPage, totalPages, document.file_name, drawPaths, currentPath, drawColor, drawWidth, textElements, selectedElement]);

  // Efeitos
  useEffect(() => {
    console.log("Canvas useEffect triggered");
    const timer = setTimeout(initializeCanvas, 100);
    return () => clearTimeout(timer);
  }, [initializeCanvas]);

  useEffect(() => {
    drawPage();
  }, [drawPage]);

  // Redimensionar canvas
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !context) return;
      
      const dimensions = getCanvasDimensions();
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
      drawPage();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getCanvasDimensions, drawPage]);

  // Obter coordenadas do mouse/touch
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Handlers de desenho
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw") return;

    e.preventDefault();
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setCurrentPath([coords]);
  };

  const continueDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw") return;

    e.preventDefault();
    const coords = getCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
    drawPage(); // Redesenhar para mostrar o caminho atual
  };

  const stopDrawing = () => {
    if (!isDrawing || activeTool !== "draw") return;

    if (currentPath.length > 1) {
      // Salvar o caminho desenhado
      const newPath: DrawPath = {
        id: Date.now().toString(),
        points: [...currentPath],
        color: drawColor,
        width: drawWidth
      };
      
      setDrawPaths(prev => [...prev, newPath]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  // Handler para clique no canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "text" && activeTool !== "select") return;

    const coords = getCoordinates(e);

    if (activeTool === "text") {
      // Adicionar novo texto
      const newElement: TextElement = {
        id: Date.now().toString(),
        text: "Novo texto",
        x: coords.x,
        y: coords.y,
        fontSize: textSize,
        color: textColor
      };

      setTextElements(prev => [...prev, newElement]);
      setEditingText(newElement.id);
      setTempText(newElement.text);
      
    } else if (activeTool === "select") {
      // Verificar se clicou em algum texto
      let clicked = false;
      
      if (context) {
        for (const element of textElements) {
          context.font = `${element.fontSize}px Arial`;
          const metrics = context.measureText(element.text);
          
          if (coords.x >= element.x && coords.x <= element.x + metrics.width &&
              coords.y >= element.y - element.fontSize && coords.y <= element.y) {
            setSelectedElement(element.id);
            clicked = true;
            break;
          }
        }
      }
      
      if (!clicked) {
        setSelectedElement(null);
      }
    }
  };

  // Adicionar texto via botão
  const addText = () => {
    const newElement: TextElement = {
      id: Date.now().toString(),
      text: "Clique para editar",
      x: 100,
      y: 150,
      fontSize: textSize,
      color: textColor
    };

    setTextElements(prev => [...prev, newElement]);
    setEditingText(newElement.id);
    setTempText(newElement.text);
  };

  // Salvar texto editado
  const saveText = () => {
    if (!editingText) return;

    setTextElements(prev => prev.map(element => 
      element.id === editingText 
        ? { ...element, text: tempText }
        : element
    ));

    setEditingText(null);
    setTempText("");
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingText(null);
    setTempText("");
  };

  // Deletar elemento selecionado
  const deleteSelected = () => {
    if (selectedElement) {
      setTextElements(prev => prev.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // Limpar canvas
  const clearCanvas = () => {
    setTextElements([]);
    setDrawPaths([]);
    setSelectedElement(null);
    drawPage();
  };

  // Carregar página
  const loadPage = (pageIndex: number) => {
    console.log("Loading page:", pageIndex);
    setCurrentPage(pageIndex);
    // Manter elementos da página atual (em uma implementação real, você salvaria/carregaria por página)
  };

  // Salvar
  const savePDF = async () => {
    if (!pdfDoc) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_documents")
        .update({ file_name: fileName })
        .eq("id", document.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento salvo com sucesso",
      });

      onSave();
    } catch (error) {
      console.error("Error saving PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Download
  const downloadPDF = async () => {
    if (!pdfDoc) return;

    try {
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${fileName}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Download realizado com sucesso",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Modal de edição de texto */}
      {editingText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-describedby="edit-text-description">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Texto</h3>
            <p id="edit-text-description" className="text-sm text-gray-600 mb-4">
              Digite o texto que deseja adicionar ao documento
            </p>
            <Input
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder="Digite o texto"
              className="mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelEdit}>
                Cancelar
              </Button>
              <Button onClick={saveText}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            <Button
              size="sm"
              variant={activeTool === "select" ? "default" : "outline"}
              onClick={() => setActiveTool("select")}
              disabled={loading}
            >
              <Move className="h-4 w-4 mr-1" />
              Selecionar
            </Button>
            <Button
              size="sm"
              variant={activeTool === "text" ? "default" : "outline"}
              onClick={() => setActiveTool("text")}
              disabled={loading}
            >
              <Type className="h-4 w-4 mr-1" />
              Texto
            </Button>
            <Button
              size="sm"
              variant={activeTool === "draw" ? "default" : "outline"}
              onClick={() => setActiveTool("draw")}
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {selectedElement && (
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={deleteSelected}
            >
              Deletar
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearCanvas}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={downloadPDF}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={savePDF} 
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-1" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Tools Panel */}
        <Card className="w-full lg:w-64 h-fit">
          <CardContent className="p-4 space-y-4">
            {activeTool === "text" && (
              <>
                <div>
                  <Label>Tamanho da Fonte</Label>
                  <Select 
                    value={textSize.toString()} 
                    onValueChange={(value) => setTextSize(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12px</SelectItem>
                      <SelectItem value="14">14px</SelectItem>
                      <SelectItem value="16">16px</SelectItem>
                      <SelectItem value="18">18px</SelectItem>
                      <SelectItem value="20">20px</SelectItem>
                      <SelectItem value="24">24px</SelectItem>
                      <SelectItem value="32">32px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cor do Texto</Label>
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={addText} 
                  className="w-full"
                  disabled={loading}
                >
                  Adicionar Texto
                </Button>
                <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded">
                  <p><strong>Como usar:</strong></p>
                  <p>• Clique no documento para adicionar texto</p>
                  <p>• Ou use o botão "Adicionar Texto"</p>
                </div>
              </>
            )}

            {activeTool === "draw" && (
              <>
                <div>
                  <Label>Largura do Traço</Label>
                  <Select 
                    value={drawWidth.toString()} 
                    onValueChange={(value) => setDrawWidth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1px</SelectItem>
                      <SelectItem value="2">2px</SelectItem>
                      <SelectItem value="3">3px</SelectItem>
                      <SelectItem value="5">5px</SelectItem>
                      <SelectItem value="8">8px</SelectItem>
                      <SelectItem value="12">12px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cor do Traço</Label>
                  <Input
                    type="color"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-600 p-2 bg-green-50 rounded">
                  <p><strong>Instruções:</strong></p>
                  <p>• Arraste para desenhar</p>
                  <p>• Ideal para assinaturas</p>
                  <p>• Funciona no mobile</p>
                </div>
              </>
            )}

            {activeTool === "select" && (
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                <p><strong>Modo Seleção:</strong></p>
                <p>• Clique em textos para selecioná-los</p>
                <p>• Textos selecionados ficam destacados</p>
                <p>• Use "Deletar" para remover</p>
                <p>• Duplo-clique para editar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Canvas Area */}
        <Card className="flex-1">
          <CardContent className="p-4" ref={containerRef}>
            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0 || loading}
                onClick={() => loadPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages - 1 || loading}
                onClick={() => loadPage(currentPage + 1)}
              >
                Próxima
              </Button>
            </div>

            <Separator className="mb-4" />

            {/* Canvas */}
            <div className="border border-gray-200 rounded-lg overflow-hidden touch-manipulation">
              {loading ? (
                <div className="flex items-center justify-center h-96 bg-gray-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Carregando documento...</p>
                  </div>
                </div>
              ) : (
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full touch-none select-none cursor-crosshair bg-white"
                  style={{ touchAction: 'none' }}
                  onClick={handleCanvasClick}
                  onDoubleClick={(e) => {
                    // Duplo-clique para editar texto
                    if (selectedElement) {
                      const element = textElements.find(el => el.id === selectedElement);
                      if (element) {
                        setEditingText(element.id);
                        setTempText(element.text);
                      }
                    }
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={continueDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={continueDrawing}
                  onTouchEnd={stopDrawing}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;