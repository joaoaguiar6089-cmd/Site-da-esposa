import { useRef, useEffect, useState } from "react";
import { Canvas as FabricCanvas, FabricText, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Type, Edit, Save, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentType {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface PDFEditorProps {
  document: DocumentType;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const PDFEditor = ({ document, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Baixar o PDF e criar URL
  useEffect(() => {
    const downloadPDF = async () => {
      try {
        setIsLoading(true);
        console.log("📥 Baixando PDF...", document.file_path);

        const { data, error } = await supabase.storage
          .from("client-documents")
          .download(document.file_path);

        if (error) {
          throw error;
        }

        // Criar URL para o PDF
        const url = URL.createObjectURL(data);
        setPdfUrl(url);
        console.log("✅ PDF baixado com sucesso");

      } catch (error) {
        console.error("❌ Erro ao baixar PDF:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o documento",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    downloadPDF();

    // Cleanup da URL
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [document.file_path, toast]);

  // Inicializar canvas quando o PDF estiver pronto
  useEffect(() => {
    if (!pdfUrl || !canvasRef.current) return;

    const initializeCanvas = async () => {
      try {
        console.log("🖌️ Inicializando canvas com PDF...");

        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
        }

        const canvas = new FabricCanvas(canvasRef.current, {
          width: Math.min(800, window.innerWidth - 40),
          height: Math.min(1000, window.innerHeight - 200),
          backgroundColor: "#ffffff",
        });

        canvas.isDrawingMode = false;
        
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = "#000000";
          canvas.freeDrawingBrush.width = 2;
        }

        fabricCanvasRef.current = canvas;

        // Adicionar representação visual do PDF
        await renderPDFPreview(canvas);

        console.log("✅ Canvas inicializado com PDF");

      } catch (error) {
        console.error("❌ Erro ao inicializar canvas:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar visualização do documento",
          variant: "destructive",
        });
      }
    };

    initializeCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [pdfUrl, toast]);

  const renderPDFPreview = async (canvas: FabricCanvas) => {
    try {
      // Limpar canvas
      canvas.clear();
      canvas.backgroundColor = "#ffffff";

      // Adicionar cabeçalho com informações do documento
      const headerText = new FabricText(document.file_name, {
        left: 50,
        top: 30,
        fontSize: 16,
        fill: "#333333",
        selectable: false,
        fontFamily: 'Arial, sans-serif',
      });

      const pageInfo = new FabricText("Visualização do Documento PDF", {
        left: 50,
        top: 60,
        fontSize: 14,
        fill: "#666666",
        selectable: false,
        fontFamily: 'Arial, sans-serif',
      });

      // Criar retângulo representando a página do PDF
      const pageRect = new FabricText("📄", {
        left: 50,
        top: 100,
        fontSize: 48,
        fill: "#999999",
        selectable: false,
      });

      const documentType = new FabricText("DOCUMENTO PDF", {
        left: 110,
        top: 120,
        fontSize: 18,
        fill: "#333333",
        selectable: false,
        fontFamily: 'Arial, sans-serif',
      });

      const fileInfo = new FabricText(`Arquivo: ${document.original_file_name}`, {
        left: 110,
        top: 150,
        fontSize: 12,
        fill: "#666666",
        selectable: false,
        fontFamily: 'Arial, sans-serif',
      });

      // Adicionar área de trabalho interativa
      const workspace = new FabricText("Área de Edição - Adicione textos e anotações acima", {
        left: 50,
        top: 200,
        fontSize: 12,
        fill: "#999999",
        selectable: false,
        fontFamily: 'Arial, sans-serif',
      });

      canvas.add(headerText);
      canvas.add(pageInfo);
      canvas.add(pageRect);
      canvas.add(documentType);
      canvas.add(fileInfo);
      canvas.add(workspace);

      // Adicionar instruções de uso
      const instructions = [
        "• Clique em 'Adicionar Texto' para inserir campos editáveis",
        "• Use 'Desenhar' para fazer anotações livres", 
        "• Arraste os elementos para movê-los",
        "• Clique em um texto para editá-lo",
        "• Use 'Limpar' para remover anotações"
      ];

      instructions.forEach((instruction, index) => {
        const text = new FabricText(instruction, {
          left: 50,
          top: 250 + (index * 25),
          fontSize: 11,
          fill: "#666666",
          selectable: false,
          fontFamily: 'Arial, sans-serif',
        });
        canvas.add(text);
      });

      canvas.renderAll();

    } catch (error) {
      console.error("❌ Erro ao renderizar preview:", error);
      throw error;
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) {
      toast({
        title: "Aviso",
        description: "Aguarde o carregamento do editor",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = new FabricText("Clique para editar o texto", {
        left: 100,
        top: 400,
        fontSize: 16,
        fill: "#000000",
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'rgba(255, 255, 0, 0.3)',
        padding: 5,
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      fabricCanvasRef.current.renderAll();
      
      toast({
        title: "Texto adicionado",
        description: "Clique no texto para editar o conteúdo",
      });
    } catch (error) {
      console.error("❌ Erro ao adicionar texto:", error);
    }
  };

  const toggleDrawing = () => {
    if (!fabricCanvasRef.current) {
      toast({
        title: "Aviso",
        description: "Editor não está pronto",
        variant: "destructive",
      });
      return;
    }

    const isDrawingMode = !fabricCanvasRef.current.isDrawingMode;
    fabricCanvasRef.current.isDrawingMode = isDrawingMode;
    
    if (isDrawingMode && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = "#000000";
      fabricCanvasRef.current.freeDrawingBrush.width = 2;
    }
    
    toast({
      title: isDrawingMode ? "Modo Desenho Ativado" : "Modo Desenho Desativado",
      description: isDrawingMode ? 
        "Agora você pode desenhar no documento" : 
        "Modo seleção ativado",
    });
  };

  const clearAnnotations = () => {
    if (!fabricCanvasRef.current) return;
    
    try {
      // Manter apenas os elementos de fundo (preview do PDF)
      const backgroundObjects = fabricCanvasRef.current.getObjects().filter(obj => {
        const text = obj as FabricText;
        return text.selectable === false;
      });
      
      fabricCanvasRef.current.clear();
      backgroundObjects.forEach(obj => fabricCanvasRef.current!.add(obj));
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      fabricCanvasRef.current.renderAll();
      
      toast({
        title: "Anotações removidas",
        description: "Todas as anotações foram limpas",
      });
    } catch (error) {
      console.error("❌ Erro ao limpar anotações:", error);
    }
  };

  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsLoading(true);

      // Salvar as anotações como imagem
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // Converter dataURL para Blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Fazer upload da imagem anotada
      const fileName = `annotated_${document.id}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Atualizar registro do documento
      const { error: updateError } = await supabase
        .from("client_documents")
        .update({ 
          updated_at: new Date().toISOString(),
          annotations_url: fileName
        })
        .eq("id", document.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Documento salvo com anotações",
      });

      onSave();
    } catch (error) {
      console.error("❌ Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `${document.file_name.replace('.pdf', '')}_anotado.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download realizado",
        description: "Documento anotado baixado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao baixar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o documento",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Label htmlFor="fileName">Documento</Label>
            <Input
              id="fileName"
              value={document.file_name}
              className="w-full font-medium"
              readOnly
            />
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={addText}
              disabled={isLoading}
            >
              <Type className="h-4 w-4 mr-1" />
              Adicionar Texto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleDrawing}
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearAnnotations}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar Anotações
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <Separator className="mb-4" />

            <div className="border border-gray-200 rounded-lg overflow-hidden touch-manipulation bg-white h-full flex items-center justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Carregando documento...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full overflow-auto">
                  <canvas 
                    ref={canvasRef} 
                    className="max-w-full touch-none select-none"
                    style={{ 
                      touchAction: 'none',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;