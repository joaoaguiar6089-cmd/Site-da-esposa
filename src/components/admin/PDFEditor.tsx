import { useState, useRef, useEffect } from "react";
import { Canvas as FabricCanvas, FabricText, FabricImage } from "fabric";
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
import * as pdfjsLib from "pdfjs-dist";

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw">("select");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(16);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(2);
  const [fileName, setFileName] = useState(document.file_name);
  const [loading, setLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPDF();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    // Configurar brush para desenho
    canvas.isDrawingMode = false;
    canvas.freeDrawingBrush.color = drawColor;
    canvas.freeDrawingBrush.width = drawWidth;
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    });

    setFabricCanvas(canvas);

    return () => {
      if (canvas && !canvas.disposed) {
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

  const loadPDF = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      
      // Carregar com pdf-lib para edição
      const pdfDocument = await PDFDocument.load(arrayBuffer);
      setPdfDoc(pdfDocument);
      
      // Carregar com PDF.js para renderização
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdfDoc2 = await loadingTask.promise;
      
      const pages = [];
      for (let i = 1; i <= pdfDoc2.numPages; i++) {
        const page = await pdfDoc2.getPage(i);
        pages.push(page);
      }
      
      setPdfPages(pages);
      setTotalPages(pdfDoc2.numPages);
      setPdfLoaded(true);
      
      // Carregar primeira página
      await loadPage(0, pages);
      
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar PDF. Verifique se o arquivo é válido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (pageIndex: number, pages?: any[]) => {
    const pdfPagesArray = pages || pdfPages;
    if (!pdfPagesArray.length || !fabricCanvas || pageIndex >= pdfPagesArray.length) return;

    try {
      const page = pdfPagesArray[pageIndex];
      
      // Configurar viewport e escala
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Criar canvas temporário para renderizar o PDF
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      
      if (!tempContext) return;
      
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      // Renderizar página do PDF
      await page.render({
        canvasContext: tempContext,
        viewport: viewport
      }).promise;

      // Redimensionar fabric canvas para coincidir
      fabricCanvas.setWidth(viewport.width);
      fabricCanvas.setHeight(viewport.height);

      // Limpar canvas atual (manter apenas objetos não-PDF)
      const objects = fabricCanvas.getObjects();
      const nonPdfObjects = objects.filter(obj => !obj.get('isPdfBackground'));
      fabricCanvas.clear();

      // Criar imagem do PDF como fundo
      const pdfImage = new FabricImage(tempCanvas, {
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        isPdfBackground: true, // marca customizada
      });

      fabricCanvas.add(pdfImage);
      
      // Re-adicionar objetos não-PDF (textos, desenhos do usuário)
      nonPdfObjects.forEach(obj => fabricCanvas.add(obj));
      
      fabricCanvas.renderAll();
      setCurrentPage(pageIndex);
      
    } catch (error) {
      console.error("Error loading page:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar página do PDF",
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
      fontFamily: 'Arial',
      editable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    
    // Entrar em modo de edição automaticamente
    text.enterEditing();
    text.selectAll();
    
    fabricCanvas.renderAll();
  };

  const clearAnnotations = () => {
    if (!fabricCanvas) return;
    
    // Remover apenas objetos que não são o fundo do PDF
    const objects = fabricCanvas.getObjects();
    const pdfBackground = objects.find(obj => obj.get('isPdfBackground'));
    
    fabricCanvas.clear();
    
    // Re-adicionar apenas o fundo do PDF
    if (pdfBackground) {
      fabricCanvas.add(pdfBackground);
    }
    
    fabricCanvas.renderAll();
  };

  const savePDF = async () => {
    if (!fabricCanvas || !pdfDoc) return;

    setLoading(true);
    try {
      // Obter dados do canvas (anotações)
      const canvasDataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // Alta resolução
        left: 0,
        top: 0,
        width: fabricCanvas.width,
        height: fabricCanvas.height,
      });

      // Em uma implementação real, você converteria as anotações para o PDF
      // Por enquanto, apenas atualizaremos o nome do arquivo
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
    if (!pdfDoc || !fabricCanvas) return;

    try {
      // Para um download simples, vamos baixar o canvas como imagem
      const link = document.createElement('a');
      link.download = `${fileName}_anotado.png`;
      link.href = fabricCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: "Download realizado com sucesso",
      });
    } catch (error) {
      console.error("Error downloading:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download",
        variant: "destructive",
      });
    }
  };

  if (loading && !pdfLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-48"
            />
          </div>
          
          <div className="flex items-center space-x-2">
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

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={clearAnnotations}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={savePDF} disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 space-x-4">
        {/* Tools Panel */}
        <Card className="w-64 h-fit">
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

            {activeTool === "select" && (
              <div className="text-sm text-gray-600">
                <p>Modo seleção ativo.</p>
                <p>Clique nos elementos para selecioná-los e editá-los.</p>
              </div>
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
            <div className="border border-gray-200 rounded-lg overflow-auto bg-gray-50 p-4">
              <div className="flex justify-center">
                <canvas 
                  ref={canvasRef} 
                  className="shadow-lg bg-white"
                  style={{ maxWidth: '100%', height: 'auto' }}
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