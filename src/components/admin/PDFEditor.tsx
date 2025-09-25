import { useRef, useEffect } from "react";
import { Canvas as FabricCanvas, FabricText } from "fabric";
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
  const { toast } = useToast();

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
      toast({
        title: "Erro",
        description: "Erro ao inicializar editor",
        variant: "destructive",
      });
    }
  }, [document.file_name, toast]);

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
    
    // Removido enterEditing() pois não existe no FabricText
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

  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;

    try {
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

      onSave();
    } catch (error) {
      console.error("Error saving PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;

    try {
      // Converter canvas para imagem
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1
      });
      
      // Criar link de download
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
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar imagem",
        variant: "destructive",
      });
    }
  };

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
            >
              <Type className="h-4 w-4 mr-1" />
              Adicionar Texto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (fabricCanvasRef.current) {
                  fabricCanvasRef.current.isDrawingMode = !fabricCanvasRef.current.isDrawingMode;
                }
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Desenhar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Baixar
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

      <div className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Canvas Area */}
        <Card className="flex-1">
          <CardContent className="p-4">
            <Separator className="mb-4" />

            {/* Canvas */}
            <div className="border border-gray-200 rounded-lg overflow-hidden touch-manipulation">
              <canvas 
                ref={canvasRef} 
                className="max-w-full touch-none select-none"
                style={{ touchAction: 'none' }}
              />
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>• Clique em "Adicionar Texto" para inserir caixas de texto editáveis</p>
              <p>• Use "Desenhar" para fazer anotações livres</p>
              <p>• Arraste para mover elementos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFEditor;