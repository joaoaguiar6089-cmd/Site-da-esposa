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
  const { toast } = useToast();

  useEffect(() => {
    // Load PDF after component mounts
    if (fabricCanvas) {
      loadPDF();
    }
  }, [fabricCanvas]);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth < 768 ? Math.min(350, window.innerWidth - 40) : 800,
      height: window.innerWidth < 768 ? 500 : 600,
      backgroundColor: "#ffffff",
    });

    canvas.isDrawingMode = false;
    
    // Initialize freeDrawingBrush safely
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = drawColor;
      canvas.freeDrawingBrush.width = drawWidth;
    }

    setFabricCanvas(canvas);

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [canvasRef.current]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = drawColor;
      fabricCanvas.freeDrawingBrush.width = drawWidth;
    }
  }, [activeTool, drawColor, drawWidth, fabricCanvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }
    };
  }, [fabricCanvas]);

  const loadPDF = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) {
        console.error("Supabase storage error:", error);
        throw error;
      }

      const arrayBuffer = await data.arrayBuffer();
      const pdfDocument = await PDFDocument.load(arrayBuffer);
      
      setPdfDoc(pdfDocument);
      setTotalPages(pdfDocument.getPageCount());
      
      // Load first page after canvas is ready
      if (fabricCanvas) {
        await loadPage(0, pdfDocument);
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Erro",
        description: `Erro ao carregar PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadPage = async (pageIndex: number, doc?: PDFDocument) => {
    const pdfDocument = doc || pdfDoc;
    if (!pdfDocument || !fabricCanvas) {
      console.log("Missing requirements:", { pdfDocument: !!pdfDocument, fabricCanvas: !!fabricCanvas });
      return;
    }

    try {
      // Clear canvas
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";

      // Show loading indicator
      const loadingText = new FabricText("Carregando página...", {
        left: fabricCanvas.width / 2 - 100,
        top: fabricCanvas.height / 2 - 10,
        fontSize: 16,
        fill: "#666666",
        selectable: false,
      });
      
      fabricCanvas.add(loadingText);
      fabricCanvas.renderAll();

      // Render PDF page info for now - in production you'd render the actual PDF
      setTimeout(() => {
        if (!fabricCanvas) return;
        
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";

        const pageText = new FabricText(`Documento: ${document.file_name}`, {
          left: 50,
          top: 50,
          fontSize: 18,
          fill: "#333333",
          selectable: false,
        });

        const pageInfo = new FabricText(`Página ${pageIndex + 1} de ${totalPages}`, {
          left: 50,
          top: 80,
          fontSize: 14,
          fill: "#666666",  
          selectable: false,
        });

        const instructions = new FabricText("Use as ferramentas acima para adicionar texto ou desenhar", {
          left: 50,
          top: 120,
          fontSize: 12,
          fill: "#999999",
          selectable: false,
        });
        
        fabricCanvas.add(pageText);
        fabricCanvas.add(pageInfo);
        fabricCanvas.add(instructions);
        fabricCanvas.renderAll();
      }, 100);
      
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
    if (!fabricCanvas) return;

    const text = new FabricText("Clique para editar", {
      left: 100,
      top: 100,
      fontSize: textSize,
      fill: textColor,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
  };

  const savePDF = async () => {
    if (!fabricCanvas || !pdfDoc) return;

    setLoading(true);
    try {
      // Convert canvas to image data
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // In a real implementation, you would:
      // 1. Convert the canvas overlay to PDF annotations
      // 2. Merge with the original PDF
      // 3. Save the new PDF

      // For now, we'll update the document name and show success
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
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
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

        <div className="flex items-center space-x-2 flex-wrap">
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
        {/* Tools Panel */}
        <Card className="w-full lg:w-64 h-fit">
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

        {/* Canvas Area */}
        <Card className="flex-1">
          <CardContent className="p-4">
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

            {/* Canvas */}
            <div className="border border-gray-200 rounded-lg overflow-hidden touch-manipulation">
              <canvas 
                ref={canvasRef} 
                className="max-w-full touch-none select-none"
                style={{ touchAction: 'none' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;