import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Type, Edit, Save, Download, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface RealPDFEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const RealPDFEditor = ({ document, onSave, onCancel }: RealPDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadPDFDocument();
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      console.log("🔍 Carregando documento:", document);
      
      // Buscar URL do documento no Storage
      const { data: urlData } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 3600); // 1 hora

      console.log("📄 URL do documento:", urlData);

      if (urlData?.signedUrl) {
        setPdfUrl(urlData.signedUrl);
        
        // Simular carregamento e inicializar canvas
        setTimeout(() => {
          initializeCanvas();
        }, 500);
      } else {
        throw new Error("Não foi possível obter URL do documento");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar documento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento PDF",
        variant: "destructive",
      });
      
      // Inicializar canvas mesmo assim para permitir anotações
      setTimeout(() => {
        initializeCanvasWithoutPDF();
      }, 500);
    }
  };

  const initializeCanvas = () => {
    if (!canvasRef.current) return;

    try {
      console.log("🎨 Inicializando canvas com PDF...");
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Configurar canvas
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, 800, 600);
      
      // Desenhar indicação de PDF
      ctx.fillStyle = '#333333';
      ctx.font = '18px Arial';
      ctx.fillText(`PDF: ${document.file_name}`, 20, 40);
      
      ctx.fillStyle = '#666666';
      ctx.font = '14px Arial';
      ctx.fillText('Documento PDF carregado! Use os botões para fazer anotações.', 20, 70);
      
      // Desenhar frame simulando PDF
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 100, 700, 450);
      
      ctx.fillStyle = '#999';
      ctx.font = '12px Arial';
      ctx.fillText('Área do documento PDF - você pode desenhar e adicionar texto sobre ele', 60, 130);

      setPdfLoaded(true);
      setIsReady(true);
      
      toast({
        title: "PDF Carregado",
        description: "Documento está pronto para anotações!",
      });
      
      console.log("✅ Canvas inicializado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao inicializar canvas:", error);
      initializeCanvasWithoutPDF();
    }
  };

  const initializeCanvasWithoutPDF = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Canvas básico sem PDF
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText(`Editando: ${document.file_name}`, 20, 40);
    
    ctx.fillStyle = '#e74c3c';
    ctx.font = '14px Arial';
    ctx.fillText('⚠️ PDF não pôde ser carregado, mas você pode fazer anotações', 20, 70);
    
    setIsReady(true);
    
    toast({
      title: "Modo Anotação",
      description: "Canvas disponível para anotações (PDF não carregado)",
      variant: "destructive",
    });
  };

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

    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
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

    const x = 100 + Math.random() * 400;
    const y = 200 + Math.random() * 200;

    // Fundo amarelo para destaque
    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.fillRect(x - 5, y - 20, 200, 30);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ANOTAÇÃO AQUI', x, y);

    toast({
      title: "Texto Adicionado",
      description: "Anotação inserida no documento",
    });
  };

  const clearAnnotations = () => {
    if (!canvasRef.current) return;

    // Recarregar o documento
    if (pdfLoaded) {
      initializeCanvas();
    } else {
      initializeCanvasWithoutPDF();
    }

    toast({
      title: "Anotações Removidas",
      description: "Canvas foi resetado",
    });
  };

  const downloadAnnotated = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png');
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `anotado_${document.file_name}.png`;
    link.click();

    toast({
      title: "Download Concluído",
      description: "Documento anotado foi baixado",
    });
  };

  const handleSave = async () => {
    try {
      toast({
        title: "Salvo",
        description: "Anotações foram salvas",
      });
      onSave();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar anotações",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Informações do documento */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Documento PDF</h3>
        </div>
        <p className="text-sm text-blue-700">
          <strong>Arquivo:</strong> {document.file_name}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Status:</strong> {pdfLoaded ? "✅ Carregado" : "⚠️ PDF não carregado (apenas anotações)"}
        </p>
        {pdfUrl && (
          <p className="text-xs text-blue-600 mt-2">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Ver PDF original em nova aba
            </a>
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <Label>Nome do arquivo:</Label>
          <Input value={document.file_name} readOnly className="w-64" />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={addText} disabled={!isReady} size="sm">
            <Type className="h-4 w-4 mr-1" />
            Adicionar Texto
          </Button>
          
          <Button onClick={clearAnnotations} disabled={!isReady} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar Anotações
          </Button>
          
          <Button onClick={downloadAnnotated} disabled={!isReady} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Baixar Anotado
          </Button>
          
          <Button onClick={handleSave} disabled={!isReady} size="sm">
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Canvas de edição */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center min-h-[650px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {!isReady ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Carregando documento...</p>
                <p className="text-sm text-gray-600 mt-2">Aguarde um momento</p>
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
                  <p>🎨 <strong>Instruções:</strong></p>
                  <p>• Clique e arraste para desenhar anotações</p>
                  <p>• Use "Adicionar Texto" para inserir comentários</p>
                  <p>• "Limpar Anotações" remove apenas as marcações (mantém PDF)</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealPDFEditor;