import { useRef, useEffect } from "react";
import { Canvas as FabricCanvas, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Type, Edit, Save, Download, Trash2 } from "lucide-react";

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

const PDFEditor = ({ document, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
      });

      canvas.isDrawingMode = false;
      fabricCanvasRef.current = canvas;

      // Adicionar conteúdo básico
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

      canvas.add(pageText);
      canvas.add(instructions);
      canvas.renderAll();

      return () => {
        if (canvas) {
          canvas.dispose();
        }
      };
    } catch (error) {
      console.error("Error creating canvas:", error);
    }
  }, [document.file_name]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new FabricText("Clique para editar", {
      left: 100,
      top: 150,
      fontSize: 16,
      fill: "#000000",
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = "#ffffff";
    
    // Recriar conteúdo básico
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

    fabricCanvasRef.current.add(pageText);
    fabricCanvasRef.current.add(instructions);
    fabricCanvasRef.current.renderAll();
  };

  const handleSave = () => {
    console.log("Salvando documento...");
    onSave();
  };

  const handleDownload = () => {
    console.log("Baixando documento...");
    // Implementar download
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="w-48">
            <Label htmlFor="fileName">Nome do Arquivo</Label>
            <Input
              id="fileName"
              defaultValue={document.file_name}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={addText}>
              <Type className="h-4 w-4 mr-1" />
              Texto
            </Button>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef} 
                className="max-w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;