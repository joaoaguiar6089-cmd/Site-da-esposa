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

const PDFEditor = ({ document, clientId, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw">("select");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(16);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(2);
  const [fileName, setFileName] = useState(document.file_name);
  const [loading, setLoading] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
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
      width: Math.min(containerWidth, isMobile ? 350 : 800),
      height: isMobile ? 500 : 600
    };
  }, []);

  // Inicializar canvas
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dimensions = getCanvasDimensions();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Configurar contexto
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setContext(ctx);
    setCanvasReady(true);

    // Carregar conteúdo inicial
    loadInitialContent();
  }, [getCanvasDimensions]);

  // Carregar conteúdo inicial
  const loadInitialContent = async () => {
    setLoading(true);
    try {
      await loadPDF();
      drawPage();
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar PDF
  const loadPDF = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());

    } catch (error) {
      console.error("Erro ao carregar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar PDF",
        variant: "destructive",
      });
    }
  };

  // Desenhar página
  const drawPage = useCallback(() => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Limpar canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar borda
    context.strokeStyle = '#e5e5e5';
    context.lineWidth = 1;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Título da página
    context.fillStyle = '#666666';
    context.font = 'bold 20px Arial';
    context.fillText(`PDF - Página ${currentPage + 1}`, 20, 40);

    // Instruções
    context.fillStyle = '#999999';
    context.font = '14px Arial';
    context.fillText('Use as ferramentas para adicionar texto ou desenhar sobre o documento', 20, 70);

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
  }, [context, currentPage, textElements, selectedElement]);

  // Efeitos
  useEffect(() => {
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

  // Handlers de mouse/touch para desenho
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = drawColor;
    context.lineWidth = drawWidth;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw" || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Handler para clique no canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "text") {
      // Adicionar novo texto
      const newElement: TextElement = {
        id: Date.now().toString(),
        text: "Novo texto",
        x,
        y,
        fontSize: textSize,
        color: textColor
      };

      setTextElements(prev => [...prev, newElement]);
      setEditingText(newElement.id);
      setTempText(newElement.text);
      
    } else if (activeTool === "select") {
      // Verificar se clicou em algum texto
      let clicked = false;
      for (const element of textElements) {
        if (context) {
          context.font = `${element.fontSize}px Arial`;
          const metrics = context.measureText(element.text);
          
          if (x >= element.x && x <= element.x + metrics.width &&
              y >= element.y - element.fontSize && y <= element.y) {
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
    setSelectedElement(null);
    drawPage();
  };

  // Carregar página
  const loadPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    setTextElements([]); // Limpar elementos da página anterior
    setSelectedElement(null);
  };

  // Salvar
  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_documents")
        .update({
          file_name: fileName,
          updated_at: new Date().toISOString()
        })
        .eq("id", document.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento salvo com sucesso",
      });

      onSave();
    } catch (error) {
      console.error("Erro ao salvar:", error);
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
  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      const link = window.document.createElement('a');
      link.download = `${fileName}_editado.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: "Download realizado com sucesso",
      });
    } catch (error) {
      console.error("Erro no download:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Modal de edição de texto */}
      {editingText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Texto</h3>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div>
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full md:w-48"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={activeTool === "select" ? "default" : "outline"}
              onClick={() => setActiveTool("select")}
              disabled={!canvasReady}
            >
              <Move className="h-4 w-4 mr-1" />
              Selecionar
            </Button>
            <Button
              size="sm"
              variant={activeTool === "text" ? "default" : "outline"}
              onClick={() => setActiveTool("text")}
              disabled={!canvasReady}
            >
              <Type className="h-4 w-4 mr-1" />
              Texto
            </Button>
            <Button
              size="sm"
              variant={activeTool === "draw" ? "default" : "outline"}
              onClick={() => setActiveTool("draw")}
              disabled={!canvasReady}
            >
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
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
            disabled={!canvasReady}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownload}
            disabled={!canvasReady}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={loading || !canvasReady}
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
        <Card className="w-full lg:w-64 order-2 lg:order-1">
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
                  disabled={!canvasReady}
                >
                  Adicionar Texto
                </Button>
                <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded">
                  <p><strong>Como usar:</strong></p>
                  <p>• Clique no canvas para adicionar texto</p>
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
                  <p>• Clique e arraste para desenhar</p>
                  <p>• Ideal para assinaturas</p>
                  <p>• Solte o mouse para parar</p>
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
        <Card className="flex-1 order-1 lg:order-2">
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

            {/* Status */}
            {!canvasReady && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Inicializando editor...</p>
                </div>
              </div>
            )}

            {/* Canvas */}
            {canvasReady && (
              <div className="border border-gray-200 rounded-lg overflow-auto bg-gray-50 p-4">
                <div className="flex justify-center">
                  <canvas 
                    ref={canvasRef}
                    className="shadow-lg bg-white border cursor-crosshair"
                    style={{ maxWidth: '100%', height: 'auto', touchAction: 'none' }}
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
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;