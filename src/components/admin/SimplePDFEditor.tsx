import { useRef, useEffect, useState } from "react";
import { Canvas as FabricCanvas, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Edit, Save, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface SimplePDFEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const SimplePDFEditor = ({ document, onSave, onCancel }: SimplePDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initializeCanvas = () => {
      console.log("Tentando inicializar canvas...");
      
      if (!canvasRef.current) {
        console.log("Canvas element não encontrado, tentando novamente...");
        timeoutId = setTimeout(initializeCanvas, 100);
        return;
      }

      if (fabricCanvasRef.current) {
        console.log("Canvas já inicializado");
        return;
      }

      try {
        console.log("Criando FabricCanvas...");
        
        const canvas = new FabricCanvas(canvasRef.current, {
          width: 800,
          height: 600,
          backgroundColor: "#ffffff",
        });

        console.log("FabricCanvas criado!");

        // Configurar brush
        canvas.freeDrawingBrush.color = "#000000";
        canvas.freeDrawingBrush.width = 2;

        // Adicionar texto inicial
        const welcomeText = new FabricText(`Editando: ${document.file_name}`, {
          left: 20,
          top: 20,
          fontSize: 16,
          fill: "#333333",
        });

        const instructionText = new FabricText("Canvas funcionando! Use os botões para adicionar texto ou desenhar.", {
          left: 20,
          top: 50,
          fontSize: 14,
          fill: "#666666",
        });

        canvas.add(welcomeText);
        canvas.add(instructionText);
        canvas.renderAll();

        fabricCanvasRef.current = canvas;
        setIsReady(true);

        console.log("Canvas inicializado com sucesso!");
        
        toast({
          title: "Editor Pronto!",
          description: "O editor está funcionando",
        });

      } catch (error) {
        console.error("Erro ao criar canvas:", error);
        toast({
          title: "Erro",
          description: "Falha ao inicializar o editor",
          variant: "destructive",
        });
      }
    };

    // Aguardar o DOM estar pronto
    timeoutId = setTimeout(initializeCanvas, 200);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [document.file_name, toast]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new FabricText("Novo texto", {
      left: 100 + Math.random() * 200,
      top: 150 + Math.random() * 200,
      fontSize: 18,
      fill: "#000000",
      backgroundColor: "rgba(255, 255, 0, 0.2)",
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const toggleDrawing = () => {
    if (!fabricCanvasRef.current) return;

    const newMode = !isDrawing;
    fabricCanvasRef.current.isDrawingMode = newMode;
    setIsDrawing(newMode);

    toast({
      title: newMode ? "Desenho Ativado" : "Seleção Ativada",
      description: newMode ? "Arraste para desenhar" : "Clique para selecionar",
    });
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = "#ffffff";
    fabricCanvasRef.current.renderAll();
  };

  const downloadImage = () => {
    if (!fabricCanvasRef.current) return;

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `edited_${document.file_name}.png`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <Label>Arquivo:</Label>
          <Input value={document.file_name} readOnly className="w-64" />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={addText} disabled={!isReady} size="sm">
            <Type className="h-4 w-4 mr-1" />
            Texto
          </Button>
          
          <Button 
            onClick={toggleDrawing} 
            disabled={!isReady} 
            variant={isDrawing ? "default" : "outline"}
            size="sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            {isDrawing ? "Parar" : "Desenhar"}
          </Button>
          
          <Button onClick={clearCanvas} disabled={!isReady} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          
          <Button onClick={downloadImage} disabled={!isReady} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
          
          <Button onClick={onSave} disabled={!isReady} size="sm">
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center min-h-[600px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {!isReady ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando editor...</p>
                <p className="text-sm text-gray-600 mt-2">Aguarde um momento</p>
              </div>
            ) : (
              <div className="text-center">
                <canvas 
                  ref={canvasRef}
                  className="border border-gray-400 bg-white shadow-lg"
                />
                <div className="mt-4 text-sm text-gray-600">
                  <p>✅ Editor carregado! Use os botões acima para editar.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplePDFEditor;