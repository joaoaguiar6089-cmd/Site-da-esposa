import { useState, useRef, useEffect } from "react";
import { Canvas as FabricCanvas, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Type, Edit, Save, Download, Trash2 } from "lucide-react";
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

const PDFEditor = ({ document, clientId, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
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
  const { toast } = useToast();

  // Cleanup function
  const cleanupCanvas = () => {
    if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
      try {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      } catch (e) {
        console.warn("Erro ao limpar canvas:", e);
      }
    }
  };

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
      });

      // Configurações básicas
      canvas.isDrawingMode = false;
      
      // Configurar brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = drawColor;
        canvas.freeDrawingBrush.width = drawWidth;
      }

      fabricCanvasRef.current = canvas;
      setCanvasReady(true);

      // Carregar conteúdo inicial
      loadInitialContent();

    } catch (error) {
      console.error("Erro ao inicializar canvas:", error);
      toast({
        title: "Erro",
        description: "Erro ao inicializar editor",
        variant: "destructive",
      });
    }

    return cleanupCanvas;
  }, []);

  // Load initial content
  const loadInitialContent = async () => {
    setLoading(true);
    try {
      await loadPDF();
      await loadPage(0);
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load PDF metadata
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

  // Load page (simplified - just show page indicator)
  const loadPage = async (pageIndex: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = "#ffffff";

      // Add page indicator
      const pageText = new FabricText(`PDF - Página ${pageIndex + 1}`, {
        left: 50,
        top: 50,
        fontSize: 20,
        fill: "#666666",
        selectable: false,
        evented: false,
      });

      // Add instructions
      const instructionsText = new FabricText(
        "Use as ferramentas abaixo para adicionar texto ou desenhar sobre o PDF",
        {
          left: 50,
          top: 100,
          fontSize: 14,
          fill: "#999999",
          selectable: false,
          evented: false,
        }
      );

      canvas.add(pageText);
      canvas.add(instructionsText);
      canvas.renderAll();

      setCurrentPage(pageIndex);
    } catch (error) {
      console.error("Erro ao carregar página:", error);
    }
  };

  // Update drawing mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      canvas.isDrawingMode = activeTool === "draw";
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = drawColor;
        canvas.freeDrawingBrush.width = drawWidth;
      }
    } catch (error) {
      console.warn("Erro ao atualizar modo de desenho:", error);
    }
  }, [activeTool, drawColor, drawWidth]);

  // Add text
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const text = new FabricText("Digite aqui", {
        left: 150,
        top: 200,
        fontSize: textSize,
        fill: textColor,
        fontFamily: 'Arial',
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();

      // Attempt to enter editing mode
      setTimeout(() => {
        try {
          const activeObj = canvas.getActiveObject() as any;
          if (activeObj && typeof activeObj.enterEditing === 'function') {
            activeObj.enterEditing();
          }
        } catch (e) {
          // Editing mode not available
        }
      }, 100);

    } catch (error) {
      console.error("Erro ao adicionar texto:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar texto",
        variant: "destructive",
      });
    }
  };

  // Clear annotations
  const clearAnnotations = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      canvas.clear();
      loadPage(currentPage);
    } catch (error) {
      console.error("Erro ao limpar:", error);
    }
  };

  // Save
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
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
      });

      const link = window.document.createElement('a');
      link.download = `${fileName}_editado.png`;
      link.href = dataURL;
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearAnnotations}
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
                <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded">
                  <p><strong>Instruções:</strong></p>
                  <p>• Clique e arraste para desenhar</p>
                  <p>• Ideal para assinaturas</p>
                </div>
              </>
            )}

            {activeTool === "select" && (
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                <p><strong>Modo Seleção:</strong></p>
                <p>• Clique para selecionar elementos</p>
                <p>• Arraste para mover</p>
                <p>• Duplo-clique para editar texto</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Canvas Area */}
        <Card className="flex-1 order-1 lg:order-2">
          <CardContent className="p-4">
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
                    className="shadow-lg bg-white border"
                    style={{ maxWidth: '100%', height: 'auto' }}
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