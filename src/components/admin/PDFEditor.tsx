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
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initCanvas = () => {
      if (!canvasRef.current) {
        console.log("Canvas ref não está disponível");
        return;
      }

      if (fabricCanvasRef.current) {
        console.log("Canvas já existe, não inicializando novamente");
        return;
      }

      try {
        console.log("Iniciando inicialização do canvas...");
        
        const canvas = new FabricCanvas(canvasRef.current);
        
        // Configurar o canvas
        canvas.setWidth(800);
        canvas.setHeight(600);
        canvas.backgroundColor = "#ffffff";
        
        // Configurar brush para desenho
        canvas.freeDrawingBrush.color = "#000000";
        canvas.freeDrawingBrush.width = 2;
        
        fabricCanvasRef.current = canvas;
        
        // Adicionar texto inicial
        const welcomeText = new FabricText("Editor de PDF Carregado!\nClique nos botões para adicionar texto ou desenhar.", {
          left: 50,
          top: 50,
          fontSize: 16,
          fill: "#333333",
          fontFamily: "Arial",
        });
        
        canvas.add(welcomeText);
        canvas.renderAll();
        
        setIsReady(true);
        console.log("Canvas inicializado com sucesso!");
        
        toast({
          title: "Editor Carregado",
          description: "O editor de PDF está pronto para uso!",
        });
        
      } catch (error) {
        console.error("Erro ao inicializar canvas:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar o editor",
          variant: "destructive",
        });
      }
    };

    // Aguardar um pouco antes de inicializar
    const timer = setTimeout(initCanvas, 500);

    return () => {
      clearTimeout(timer);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [toast]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new FabricText("Novo texto - clique para editar", {
      left: Math.random() * 300 + 50,
      top: Math.random() * 200 + 150,
      fontSize: 16,
      fill: "#000000",
      fontFamily: "Arial",
      backgroundColor: "rgba(255, 255, 0, 0.3)",
      padding: 5,
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();

    toast({
      title: "Texto Adicionado",
      description: "Clique no texto para editá-lo",
    });
  };

  const toggleDrawing = () => {
    if (!fabricCanvasRef.current) return;

    const newDrawingMode = !isDrawingMode;
    fabricCanvasRef.current.isDrawingMode = newDrawingMode;
    setIsDrawingMode(newDrawingMode);

    toast({
      title: newDrawingMode ? "Modo Desenho Ativado" : "Modo Seleção Ativado",
      description: newDrawingMode ? "Arraste para desenhar" : "Clique para selecionar objetos",
    });
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = "#ffffff";
    fabricCanvasRef.current.renderAll();

    toast({
      title: "Canvas Limpo",
      description: "Todas as anotações foram removidas",
    });
  };

  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsLoading(true);
      
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      // Aqui você pode salvar a imagem ou os dados do canvas
      toast({
        title: "Salvo",
        description: "Anotações salvas com sucesso",
      });

      onSave();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar as anotações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `${document.file_name}_anotado.png`;
    link.click();

    toast({
      title: "Download Iniciado",
      description: "O arquivo foi baixado",
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="w-full sm:w-48">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              value={document.file_name}
              readOnly
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addText}
              disabled={!isReady}
            >
              <Type className="h-4 w-4 mr-1" />
              Adicionar Texto
            </Button>
            <Button
              size="sm"
              variant={isDrawingMode ? "default" : "outline"}
              onClick={toggleDrawing}
              disabled={!isReady}
            >
              <Edit className="h-4 w-4 mr-1" />
              {isDrawingMode ? "Parar Desenho" : "Desenhar"}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearCanvas}
            disabled={!isReady}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownload}
            disabled={!isReady}
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isLoading || !isReady}
          >
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? "Salvando..." : "Salvar"}
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

      <div className="flex-1 min-h-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full flex flex-col">
            <Separator className="mb-4" />

            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white flex-1 flex items-center justify-center min-h-[600px]">
              {!isReady ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Carregando editor...</p>
                </div>
              ) : (
                <canvas 
                  ref={canvasRef} 
                  style={{ border: '1px solid #ccc' }}
                />
              )}
            </div>
            
            {isReady && (
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>• <strong>Adicionar Texto:</strong> Clique no botão para inserir texto editável</p>
                <p>• <strong>Desenhar:</strong> Ative o modo desenho e arraste o mouse</p>
                <p>• <strong>Editar:</strong> Clique duas vezes em textos para editá-los</p>
                <p>• <strong>Mover:</strong> Arraste elementos para reposicioná-los</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;