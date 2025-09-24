import { useState, useRef, useEffect, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw">("select");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(16);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(2);
  const [fileName, setFileName] = useState(document.file_name);
  const [loading, setLoading] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const { toast } = useToast();

  // Função para calcular dimensões responsivas do canvas
  const getCanvasDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // padding
    const isMobile = window.innerWidth < 768;
    
    return {
      width: Math.min(containerWidth, isMobile ? 350 : 800),
      height: isMobile ? 500 : 600
    };
  }, []);

  // Inicialização do canvas com cleanup adequado
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current || canvasInitialized) return;

    try {
      // Garantir que qualquer canvas anterior seja limpo
      if (fabricCanvas) {
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }

      const dimensions = getCanvasDimensions();
      const canvas = new FabricCanvas(canvasRef.current, {
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: "#ffffff",
        selection: true,
        preserveObjectStacking: true
      });

      // Configurar brush para desenho
      canvas.isDrawingMode = false;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = drawColor;
        canvas.freeDrawingBrush.width = drawWidth;
      }

      setFabricCanvas(canvas);
      setCanvasInitialized(true);
    } catch (error) {
      console.error("Erro ao inicializar canvas:", error);
      toast({
        title: "Erro",
        description: "Erro ao inicializar editor. Tente recarregar a página.",
        variant: "destructive",
      });
    }
  }, [canvasInitialized, fabricCanvas, drawColor, drawWidth, getCanvasDimensions, toast]);

  // Cleanup do canvas
  const cleanupCanvas = useCallback(() => {
    if (fabricCanvas && !fabricCanvas.disposed) {
      try {
        fabricCanvas.dispose();
      } catch (error) {
        console.error("Erro ao fazer cleanup do canvas:", error);
      }
    }
    setFabricCanvas(null);
    setCanvasInitialized(false);
  }, [fabricCanvas]);

  // Efeito para carregar PDF
  useEffect(() => {
    loadPDF();
  }, []);

  // Efeito para inicializar canvas após o DOM estar pronto
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeCanvas();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupCanvas();
    };
  }, []);

  // Efeito para atualizar configurações do canvas
  useEffect(() => {
    if (!fabricCanvas || fabricCanvas.disposed) return;

    try {
      fabricCanvas.isDrawingMode = activeTool === "draw";
      
      if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = drawColor;
        fabricCanvas.freeDrawingBrush.width = drawWidth;
      }
    } catch (error) {
      console.error("Erro ao atualizar configurações do canvas:", error);
    }
  }, [activeTool, drawColor, drawWidth, fabricCanvas]);

  // Efeito para redimensionar canvas em dispositivos móveis
  useEffect(() => {
    const handleResize = () => {
      if (!fabricCanvas || fabricCanvas.disposed) return;
      
      try {
        const dimensions = getCanvasDimensions();
        fabricCanvas.setWidth(dimensions.width);
        fabricCanvas.setHeight(dimensions.height);
        fabricCanvas.renderAll();
      } catch (error) {
        console.error("Erro ao redimensionar canvas:", error);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fabricCanvas, getCanvasDimensions]);

  const loadPDF = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const pdfDocument = await PDFDocument.load(arrayBuffer);
      
      setPdfDoc(pdfDocument);
      setTotalPages(pdfDocument.getPageCount());
      
      // Aguardar canvas estar pronto antes de carregar página
      setTimeout(() => {
        loadPage(0, pdfDocument);
      }, 200);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar PDF",
        variant: "destructive",
      });
    }
  };

  const loadPage = async (pageIndex: number, doc?: PDFDocument) => {
    const pdfDocument = doc || pdfDoc;
    if (!pdfDocument || !fabricCanvas || fabricCanvas.disposed) return;

    try {
      // Limpar canvas de forma segura
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";

      // Placeholder para a página do PDF
      const pageText = new FabricText(`PDF Página ${pageIndex + 1}`, {
        left: 50,
        top: 50,
        fontSize: Math.min(20, textSize),
        fill: "#666666",
        selectable: false,
      });
      
      fabricCanvas.add(pageText);
      fabricCanvas.renderAll();
      setCurrentPage(pageIndex);
    } catch (error) {
      console.error("Error loading page:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar página",
        variant: "destructive",
      });
    }
  };

  const addText = () => {
    if (!fabricCanvas || fabricCanvas.disposed) return;

    try {
      const text = new FabricText("Clique para editar", {
        left: 100,
        top: 100,
        fontSize: textSize,
        fill: textColor,
        editable: true
      });

      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
    } catch (error) {
      console.error("Erro ao adicionar texto:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar texto",
        variant: "destructive",
      });
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvas || fabricCanvas.disposed) return;
    
    try {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";
      fabricCanvas.renderAll();
    } catch (error) {
      console.error("Erro ao limpar canvas:", error);
    }
  };

  const savePDF = async () => {
    if (!fabricCanvas || !pdfDoc || fabricCanvas.disposed) return;

    setLoading(true);
    try {
      // Convert canvas to image data
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // Atualizar nome do documento
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
      {/* Toolbar - Responsivo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 md:flex-none">
            <Label htmlFor="fileName" className="text-sm">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={activeTool === "select" ? "default" : "outline"}
              onClick={() => setActiveTool("select")}
            >
              Selecionar
            </Button>
            <Button
              size="sm"
              variant={activeTool === "text" ? "default" : "outline"}
              onClick={() => setActiveTool("text")}
            >
              <Type className="h-4 w-4 mr-1" />
              Texto
            </Button>
            <Button
              size="sm"
              variant={activeTool === "draw" ? "default" : "outline"}
              onClick={() => setActiveTool("draw")}
            >
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={savePDF} disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Tools Panel - Responsivo */}
        <Card className="w-full lg:w-64 order-2 lg:order-1">
          <CardContent className="p-4 space-y-4">
            {activeTool === "text" && (
              <>
                <div>
                  <Label>Tamanho da Fonte</Label>
                  <Select value={textSize.toString()} onValueChange={(value) => setTextSize(parseInt(value))}>
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
                <Button onClick={addText} className="w-full">
                  Adicionar Texto
                </Button>
              </>
            )}

            {activeTool === "draw" && (
              <>
                <div>
                  <Label>Largura do Traço</Label>
                  <Select value={drawWidth.toString()} onValueChange={(value) => setDrawWidth(parseInt(value))}>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Canvas Area - Responsivo */}
        <Card className="flex-1 order-1 lg:order-2">
          <CardContent className="p-4" ref={containerRef}>
            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
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
                disabled={currentPage === totalPages - 1}
                onClick={() => loadPage(currentPage + 1)}
              >
                Próxima
              </Button>
            </div>

            <Separator className="mb-4" />

            {/* Canvas Container */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex justify-center">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full touch-none"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;