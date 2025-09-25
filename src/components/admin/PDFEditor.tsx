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
  console.log("PDFEditor rendered with document:", document);
  
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: window.innerWidth < 768 ? Math.min(350, window.innerWidth - 40) : 800,
        height: window.innerWidth < 768 ? 500 : 600,
        backgroundColor: "#ffffff",
      });

      canvas.isDrawingMode = false;
      
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
    } catch (error) {
      console.error("Error creating canvas:", error);
      setLoading(false);
      toast({
        title: "Erro",
        description: "Erro ao inicializar editor",
        variant: "destructive",
      });
    }
  }, []);

  // Carregar PDF quando canvas estiver pronto
  useEffect(() => {
    if (fabricCanvas) {
      loadPDF();
    }
  }, [fabricCanvas]);

  // Configurar modo de desenho
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = drawColor;
      fabricCanvas.freeDrawingBrush.width = drawWidth;
    }
  }, [activeTool, drawColor, drawWidth, fabricCanvas]);

  const loadPDF = async () => {
    console.log("Starting loadPDF", { documentPath: document.file_path });
    
    try {
      setLoading(true);
      
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
      
      await loadPage(0, pdfDocument);
      
      setLoading(false);
    } catch (error) {
      console.error("Error in loadPDF:", error);
      setLoading(false);
      toast({
        title: "Erro",
        description: `Erro ao carregar PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadPage = async (pageIndex: number, doc?: PDFDocument) => {
    const pdfDocument = doc || pdfDoc;
    if (!pdfDocument || !fabricCanvas) return;

    try {
      setLoading(true);
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";

      // Adicionar texto de carregamento
      const loadingText = new FabricText("Carregando página...", {
        left: fabricCanvas.width / 2 - 100,
        top: fabricCanvas.height / 2 - 10,
        fontSize: 16,
        fill: "#666666",
        selectable: false,
      });
      
      fabricCanvas.add(loadingText);
      fabricCanvas.renderAll();

      // Extrair a página como imagem (solução simplificada)
      // Em produção, você pode usar pdf.js para renderização mais avançada
      const page = pdfDocument.getPage(pageIndex);
      const { width, height } = page.getSize();
      
      // Criar uma representação visual da página
      const pageBackground = new FabricText(`Página ${pageIndex + 1} de ${totalPages}`, {
        left: 50,
        top: 50,
        fontSize: 14,
        fill: "#333333",
        selectable: false,
      });

      const documentName = new FabricText(document.file_name, {
        left: 50,
        top: 30,
        fontSize: 12,
        fill: "#666666",
        selectable: false,
      });

      // Adicionar retângulo representando a página
      const pageRect = {
        type: 'rect',
        left: 50,
        top: 80,
        width: width / 4, // Escalar para caber no canvas
        height: height / 4,
        fill: '#f8f9fa',
        stroke: '#dee2e6',
        strokeWidth: 1,
        selectable: false
      };

      fabricCanvas.add(pageBackground);
      fabricCanvas.add(documentName);
      fabricCanvas.add(pageRect as any);
      
      // Adicionar instruções
      const instructions = new FabricText("Use as ferramentas para adicionar anotações", {
        left: 50,
        top: 80 + height / 4 + 20,
        fontSize: 12,
        fill: "#999999",
        selectable: false,
      });
      
      fabricCanvas.add(instructions);
      fabricCanvas.renderAll();
      
      setCurrentPage(pageIndex);
      setLoading(false);
      
    } catch (error) {
      console.error("Error in loadPage:", error);
      setLoading(false);
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
      top: 150,
      fontSize: textSize,
      fill: textColor,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    
    // Habilitar edição imediata
    text.enterEditing();
    fabricCanvas.renderAll();
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    
    // Manter apenas os objetos de fundo (página e instruções)
    const objectsToKeep = fabricCanvas.getObjects().filter(obj => 
      (obj as FabricText).text?.includes("Página") || 
      (obj as FabricText).text?.includes(document.file_name) ||
      (obj as FabricText).text?.includes("Use as ferramentas") ||
      obj.type === 'rect'
    );
    
    fabricCanvas.clear();
    objectsToKeep.forEach(obj => fabricCanvas.add(obj));
    fabricCanvas.renderAll();
  };

  const savePDF = async () => {
    if (!fabricCanvas || !pdfDoc) return;

    setLoading(true);
    try {
      // Para uma implementação real, você precisaria:
      // 1. Salvar as anotações como overlays no PDF
      // 2. Fazer upload do PDF modificado para o Supabase
      
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
    if (!pdfDoc) return;

    try {
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace('.pdf', '')}_editado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "PDF baixado com sucesso",
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
            {loading ? "Salvando..." : "Salvar"}
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
                  className="max-w-full touch-none select-none"
                  style={{ touchAction: 'none' }}
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