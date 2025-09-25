import { useRef, useEffect, useState } from "react";
import { Canvas as FabricCanvas, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Type, Edit, Save, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface PDFEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const PDFEditor = ({ document, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const { toast } = useToast();

  // Inicialização do canvas - executada apenas uma vez
  useEffect(() => {
    console.log("🔧 Iniciando inicialização do canvas...");
    
    if (!canvasRef.current) {
      console.error("❌ canvasRef.current não está disponível");
      setIsLoading(false);
      return;
    }

    if (fabricCanvasRef.current) {
      console.log("ℹ️ Canvas já inicializado, pulando...");
      setIsLoading(false);
      setCanvasInitialized(true);
      return;
    }

    const initializeCanvas = () => {
      try {
        console.log("🖌️ Criando novo canvas Fabric...");
        
        // Dispose do canvas anterior se existir
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }

        const canvas = new FabricCanvas(canvasRef.current, {
          width: Math.min(800, window.innerWidth - 40),
          height: Math.min(600, window.innerHeight - 200),
          backgroundColor: "#ffffff",
        });

        canvas.isDrawingMode = false;
        
        // Configurar brush de desenho de forma segura
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = "#000000";
          canvas.freeDrawingBrush.width = 2;
        }

        fabricCanvasRef.current = canvas;
        setCanvasInitialized(true);
        
        console.log("✅ Canvas criado com sucesso");

        // Adicionar conteúdo inicial após um pequeno delay
        setTimeout(() => {
          if (fabricCanvasRef.current) {
            addInitialContent(fabricCanvasRef.current);
          }
        }, 100);

      } catch (error) {
        console.error("❌ Erro ao criar canvas:", error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar editor",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeCanvas();

    // Cleanup
    return () => {
      console.log("🧹 Executando cleanup do canvas...");
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
          setCanvasInitialized(false);
        } catch (error) {
          console.error("Erro no cleanup:", error);
        }
      }
    };
  }, [toast]);

  const addInitialContent = (canvas: FabricCanvas) => {
    try {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";

      const pageText = new FabricText(`Documento: ${document.file_name}`, {
        left: 50,
        top: 50,
        fontSize: 18,
        fill: "#333333",
        selectable: false,
      });

      const instructions = new FabricText("Use as ferramentas para adicionar texto ou desenhar", {
        left: 50,
        top: 80,
        fontSize: 14,
        fill: "#666666",
        selectable: false,
      });

      const pdfPreview = new FabricText("📄 Visualização do PDF", {
        left: 50,
        top: 120,
        fontSize: 16,
        fill: "#0066cc",
        selectable: false,
      });

      const fileInfo = new FabricText(`Arquivo: ${document.original_file_name}`, {
        left: 50,
        top: 150,
        fontSize: 12,
        fill: "#666666",
        selectable: false,
      });

      canvas.add(pageText);
      canvas.add(instructions);
      canvas.add(pdfPreview);
      canvas.add(fileInfo);
      canvas.renderAll();
      
      console.log("📝 Conteúdo inicial adicionado ao canvas");
    } catch (error) {
      console.error("❌ Erro ao adicionar conteúdo inicial:", error);
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) {
      console.error("❌ Canvas não disponível para adicionar texto");
      toast({
        title: "Aviso",
        description: "Aguarde o carregamento do editor",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = new FabricText("Clique para editar", {
        left: 100,
        top: 200,
        fontSize: 16,
        fill: "#000000",
        backgroundColor: 'rgba(255, 255, 0, 0.2)',
        padding: 5,
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      fabricCanvasRef.current.renderAll();
      console.log("📝 Texto adicionado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao adicionar texto:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar texto",
        variant: "destructive",
      });
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
    
    // Configurar brush de forma segura
    if (isDrawingMode && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = "#000000";
      fabricCanvasRef.current.freeDrawingBrush.width = 2;
    }
    
    console.log(`🎨 Modo desenho: ${isDrawingMode ? 'ativado' : 'desativado'}`);
    
    toast({
      title: isDrawingMode ? "Modo Desenho Ativado" : "Modo Desenho Desativado",
      description: isDrawingMode ? 
        "Agora você pode desenhar no documento" : 
        "Modo seleção ativado",
    });
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    
    try {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      addInitialContent(fabricCanvasRef.current);
      console.log("🧹 Canvas limpo e conteúdo recriado");
    } catch (error) {
      console.error("❌ Erro ao limpar canvas:", error);
      toast({
        title: "Erro",
        description: "Erro ao limpar o canvas",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsLoading(true);
      console.log("💾 Iniciando salvamento...");

      // Atualizar nome do documento no Supabase
      const { error } = await supabase
        .from("client_documents")
        .update({ 
          file_name: document.file_name,
          updated_at: new Date().toISOString()
        })
        .eq("id", document.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento salvo com sucesso",
      });

      console.log("✅ Documento salvo com sucesso");
      onSave();
    } catch (error) {
      console.error("❌ Erro ao salvar documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;

    try {
      console.log("📥 Iniciando download...");
      
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      // Usar window.document para evitar conflitos com a interface Document
      const link = window.document.createElement('a');
      link.href = dataURL;
      link.download = `${document.file_name.replace('.pdf', '')}_anotado.png`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast({
        title: "Sucesso",
        description: "Imagem baixada com sucesso",
      });
      
      console.log("✅ Download concluído");
    } catch (error) {
      console.error("❌ Erro ao baixar imagem:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar imagem",
        variant: "destructive",
      });
    }
  };

  // Redimensionar canvas quando a janela mudar de tamanho
  useEffect(() => {
    const handleResize = () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.setDimensions({
          width: Math.min(800, window.innerWidth - 40),
          height: Math.min(600, window.innerHeight - 200)
        });
        fabricCanvasRef.current.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              defaultValue={document.file_name}
              className="w-full"
              readOnly
            />
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={addText}
              disabled={isLoading || !canvasInitialized}
            >
              <Type className="h-4 w-4 mr-1" />
              Adicionar Texto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleDrawing}
              disabled={isLoading || !canvasInitialized}
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
            onClick={clearCanvas}
            disabled={isLoading || !canvasInitialized}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownload}
            disabled={isLoading || !canvasInitialized}
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

      <div className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Canvas Area */}
        <Card className="flex-1">
          <CardContent className="p-4">
            <Separator className="mb-4" />

            {/* Canvas */}
            <div className="border border-gray-200 rounded-lg overflow-hidden touch-manipulation bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Inicializando editor...</p>
                    {!canvasInitialized && (
                      <p className="text-xs text-gray-500 mt-1">Preparando ambiente de edição</p>
                    )}
                  </div>
                </div>
              ) : (
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full touch-none select-none"
                  style={{ 
                    touchAction: 'none',
                    width: '100%',
                    height: 'auto'
                  }}
                />
              )}
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>• Clique em "Adicionar Texto" para inserir caixas de texto editáveis</p>
              <p>• Use "Desenhar" para fazer anotações livres</p>
              <p>• Arraste para mover elementos</p>
              <p>• Toque duas vezes para editar texto (mobile)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;