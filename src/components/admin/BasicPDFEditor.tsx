import { useState, useRef, useEffect } from "react";
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

interface BasicPDFEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const BasicPDFEditor = ({ document, onSave, onCancel }: BasicPDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simular carregamento e então marcar como pronto
    console.log("Iniciando editor básico...");
    
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log("Editor básico carregado!");
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Limpar canvas
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 800, 600);
          
          // Desenhar texto inicial
          ctx.fillStyle = '#333333';
          ctx.font = '16px Arial';
          ctx.fillText(`Editando: ${document.file_name}`, 20, 40);
          
          ctx.fillStyle = '#666666';
          ctx.font = '14px Arial';
          ctx.fillText('Editor carregado! Use os botões para desenhar.', 20, 70);
        }
      }
      
      toast({
        title: "Editor Carregado",
        description: "O editor básico está funcionando!",
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [document.file_name, toast]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isReady || !canvasRef.current) return;
    
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPoint) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const addText = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const x = 100 + Math.random() * 300;
    const y = 150 + Math.random() * 200;

    ctx.fillStyle = '#000000';
    ctx.font = '18px Arial';
    ctx.fillText('Novo texto adicionado', x, y);

    toast({
      title: "Texto Adicionado",
      description: "Texto inserido no canvas",
    });
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    
    // Redesenhar texto inicial
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText(`Editando: ${document.file_name}`, 20, 40);
    
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Canvas limpo! Use os botões para desenhar.', 20, 70);

    toast({
      title: "Canvas Limpo",
      description: "Canvas foi resetado",
    });
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png');
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `edited_${document.file_name}.png`;
    link.click();

    toast({
      title: "Download Iniciado",
      description: "Imagem foi baixada",
    });
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
            Adicionar Texto
          </Button>
          
          <Button onClick={clearCanvas} disabled={!isReady} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          
          <Button onClick={downloadImage} disabled={!isReady} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Baixar PNG
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
          <div className="flex items-center justify-center min-h-[650px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {!isReady ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando editor...</p>
                <p className="text-sm text-gray-600 mt-2">Preparando canvas...</p>
              </div>
            ) : (
              <div className="text-center">
                <canvas 
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="border border-gray-400 bg-white shadow-lg cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <div className="mt-4 text-sm text-gray-600">
                  <p>✅ Editor funcionando! Clique e arraste para desenhar.</p>
                  <p>Use os botões acima para adicionar texto ou limpar o canvas.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicPDFEditor;