import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Canvas as FabricCanvas, PencilBrush, Text } from "fabric";
import { Type, Edit, Save, Download, Trash2, FileText, Signature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument } from "pdf-lib";

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface AdvancedPDFEditorProps {
  document: ClientDocument;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const AdvancedPDFEditor = ({ document, clientId, onSave, onCancel }: AdvancedPDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [formFields, setFormFields] = useState<any[]>([]);
  const [addingFieldType, setAddingFieldType] = useState<string | null>(null);

  useEffect(() => {
    loadPDFDocument();
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [document]);

  const loadPDFDocument = async () => {
    try {
      setIsLoading(true);
      
      // Obter URL assinada do documento
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(document.file_path, 7200);

      if (urlError || !urlData?.signedUrl) {
        throw new Error('Não foi possível obter o URL do documento');
      }

      setPdfUrl(urlData.signedUrl);

      // Baixar o PDF para processamento
      const response = await fetch(urlData.signedUrl);
      const pdfArrayBuffer = await response.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfArrayBuffer);
      setOriginalPdfBytes(pdfBytes);

      // Carregar PDF com pdf-lib
      const pdf = await PDFDocument.load(pdfBytes);
      setPdfDoc(pdf);

      // Inicializar canvas Fabric.js
      setTimeout(() => {
        initializeFabricCanvas();
      }, 100);

      toast({
        title: "PDF Carregado",
        description: "Documento pronto para edição e assinatura",
      });
    } catch (error) {
      console.error("Erro ao carregar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o documento PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a basic draggable form field (rectangle + label)
  const addFormField = (type: string = 'text') => {
    if (!fabricCanvas) return;
    const id = `field_${Date.now()}`;
    const rect = new (FabricCanvas as any).Rect({
      left: 120,
      top: 120,
      width: 200,
      height: 40,
      fill: 'rgba(255, 255, 0, 0.25)',
      stroke: '#f59e0b',
      strokeWidth: 1,
    });

    // attach metadata
    (rect as any).isFormField = true;
    (rect as any).fieldMeta = { id, type, label: type === 'signature' ? 'Assinatura' : 'Campo de texto', key: id };

    const label = new (FabricCanvas as any).Text((rect as any).fieldMeta.label, {
      left: rect.left || 120,
      top: (rect.top || 120) - 18,
      fontSize: 12,
      selectable: false,
      evented: false,
    });

    const group = new (FabricCanvas as any).Group([rect, label], { left: rect.left, top: rect.top });
    // store metadata on group
    (group as any).isFormField = true;
    (group as any).fieldMeta = (rect as any).fieldMeta;

    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    setFormFields(prev => [...prev, (group as any).fieldMeta]);
    setAddingFieldType(null);
  };

  const initializeFabricCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });

    // Configurar brush para desenho
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = "#000000";

    setFabricCanvas(canvas);

    toast({
      title: "Editor Pronto",
      description: "Canvas inicializado para edições",
    });
  };

  const enableDrawing = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.freeDrawingBrush.color = "#e74c3c";
    fabricCanvas.freeDrawingBrush.width = 3;
    
    toast({
      title: "Modo Desenho",
      description: "Clique e arraste para desenhar",
    });
  };

  const addSignature = () => {
    if (!fabricCanvas) return;
    
    // Criar uma assinatura simples
    const signatureText = "Assinatura Digital";
    
    fabricCanvas.add(new Text(signatureText, {
      left: 200,
      top: 400,
      fontFamily: 'Cursive',
      fontSize: 24,
      fill: '#000080',
      fontStyle: 'italic'
    }));

    toast({
      title: "Assinatura Adicionada",
      description: "Assinatura inserida no documento",
    });
  };

  const addTextAnnotation = () => {
    if (!fabricCanvas) return;
    
    const text = "Texto editado";
    
    fabricCanvas.add(new Text(text, {
      left: 100,
      top: 200,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
      backgroundColor: 'rgba(255, 255, 0, 0.3)'
    }));

    toast({
      title: "Texto Adicionado",
      description: "Anotação inserida no documento",
    });
  };

  const clearAnnotations = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();

    toast({
      title: "Anotações Removidas",
      description: "Canvas foi resetado",
    });
  };

  const downloadAnnotated = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    });
    
    const link = window.document.createElement('a');
    link.href = dataURL;
    link.download = `editado_${document.file_name}.png`;
    link.click();

    toast({
      title: "Download Concluído",
      description: "Documento editado foi baixado como imagem",
    });
  };

  const savePDFWithAnnotations = async () => {
    if (!fabricCanvas || !pdfDoc || !originalPdfBytes) {
      toast({
        title: "Erro",
        description: "Documento não está pronto para salvamento",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Converter canvas para imagem
      const canvasDataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // Criar novo PDF com anotações
      const pdfDocCopy = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDocCopy.getPages();
      const firstPage = pages[0];

      // Converter dataURL para bytes
      const imageBytes = await fetch(canvasDataURL).then(res => res.arrayBuffer());
      const image = await pdfDocCopy.embedPng(imageBytes);

      // Adicionar imagem ao PDF (sobrepondo)
      const { width, height } = firstPage.getSize();
      firstPage.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
        opacity: 0.8
      });

      // Gerar PDF final
      const finalPdfBytes = await pdfDocCopy.save();

      // Criar um nome único para o arquivo editado
      const timestamp = Date.now();
      const editedFileName = `editado_${timestamp}_${document.original_file_name}`;
      const editedFilePath = `${clientId}/editado_${timestamp}_${document.file_path.split('/').pop()}`;

      // Upload do PDF editado
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(editedFilePath, finalPdfBytes, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Salvar registro no banco de dados
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          file_name: `Editado - ${document.file_name}`,
          original_file_name: editedFileName,
          file_path: editedFilePath,
          file_size: finalPdfBytes.length,
          document_type: 'pdf',
          notes: `Documento editado baseado em: ${document.file_name}`
        });

      // Save form fields metadata (sidecar JSON) if any form fields were placed
      try {
        const placedFields: any[] = [];
        fabricCanvas.getObjects().forEach((obj: any) => {
          if (obj && obj.isFormField && obj.fieldMeta) {
            const left = obj.left || 0;
            const top = obj.top || 0;
            const width = obj.width * (obj.scaleX || 1) || obj.width || 0;
            const height = obj.height * (obj.scaleY || 1) || obj.height || 0;
            placedFields.push({ ...obj.fieldMeta, left, top, width, height });
          }
        });

        if (placedFields.length > 0) {
          const sidecarPath = `${clientId}/annotations/${document.file_path.split('/').pop()}.fields.json`;
          const blob = new Blob([JSON.stringify(placedFields, null, 2)], { type: 'application/json' });
          const { error: metaUploadError } = await supabase.storage
            .from('client-documents')
            .upload(sidecarPath, blob, { upsert: true });

          if (metaUploadError) {
            console.warn('Erro ao salvar metadata de campos:', metaUploadError);
          } else {
            toast({ title: 'Campos salvos', description: 'Metadados dos campos foram gravados com sucesso.' });
          }
        }
      } catch (metaErr) {
        console.error('Erro ao salvar sidecar metadata:', metaErr);
      }

      if (dbError) throw dbError;

      toast({
        title: "Documento Salvo",
        description: "PDF editado foi salvo com sucesso",
      });

      onSave();
    } catch (error) {
      console.error("Erro ao salvar PDF editado:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar documento editado",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-3 bg-blue-50 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-base">Editar PDF: {document.file_name}</h3>
              <p className="text-xs text-blue-700 mt-1">
                Adicione assinaturas, texto e anotações diretamente no documento.
              </p>
            </div>
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              {isLoading ? "⏳ Carregando..." : 
               fabricCanvas ? "✅ Pronto para edição" : 
               "Aguardando..."}
            </span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 border-b shrink-0 flex-wrap">
          <Button 
            onClick={enableDrawing} 
            disabled={!fabricCanvas} 
            size="sm"
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            Desenhar
          </Button>
          
          <Button 
            onClick={addSignature} 
            disabled={!fabricCanvas} 
            size="sm"
            variant="outline"
          >
            <Signature className="h-4 w-4 mr-2" />
            Assinar
          </Button>
          
          <Button 
            onClick={addTextAnnotation} 
            disabled={!fabricCanvas} 
            size="sm"
            variant="outline"
          >
            <Type className="h-4 w-4 mr-2" />
            Texto
          </Button>
          
          <Button 
            onClick={clearAnnotations} 
            disabled={!fabricCanvas} 
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          
          <Button 
            onClick={downloadAnnotated} 
            disabled={!fabricCanvas} 
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Imagem
          </Button>
          
          <div className="flex gap-2 ml-auto">
            <Button 
              onClick={savePDFWithAnnotations} 
              disabled={!fabricCanvas || isSaving} 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar PDF Editado"}
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 flex">
            {/* PDF Preview */}
            <div className="w-1/2 border-r bg-white overflow-auto">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Original"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Carregando PDF...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Editor */}
            <div className="w-1/2 bg-gray-50 overflow-auto">
              <div className="p-4">
                <h4 className="text-sm font-medium mb-2 text-gray-700">Área de Edição</h4>
                {isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="border border-gray-300 bg-white">
                    <canvas 
                      ref={canvasRef}
                      className="block"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-700 bg-green-50 p-3 border-t shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">✏️</span>
            <div className="flex-1">
              <strong className="text-green-800">Instruções:</strong>
              <span className="ml-2">
                Use "Desenhar" para desenhar livre • "Assinar" para adicionar assinatura • 
                "Texto" para anotações • "Salvar PDF Editado" cria nova versão
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPDFEditor;