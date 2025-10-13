import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  X,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFormFields } from "@/hooks/forms/useFormFields";
import type { PDFMapping, PDFFieldMapping, PDFCoordinates } from "@/types/forms";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFFieldMapperProps {
  templateId: string;
  pdfUrl: string;
  onClose: () => void;
}

export default function PDFFieldMapper({ templateId, pdfUrl, onClose }: PDFFieldMapperProps) {
  const { toast } = useToast();
  const { fields } = useFormFields(templateId);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [fieldPositions, setFieldPositions] = useState<PDFFieldMapping[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string>("");

  // Gerar URL assinada para o PDF (melhor para CORS)
  useEffect(() => {
    generateSignedUrl();
  }, [pdfUrl]);

  // Carregar mapeamento existente
  useEffect(() => {
    loadExistingMapping();
  }, [templateId]);

  const generateSignedUrl = async () => {
    try {
      // Extrair o path do PDF da URL pública
      const urlParts = pdfUrl.split('/form-pdfs/');
      if (urlParts.length < 2) {
        // Se não conseguir extrair, usa a URL direta
        setSignedPdfUrl(pdfUrl);
        return;
      }
      
      const filePath = urlParts[1];
      
      // Gerar URL assinada válida por 1 hora
      const { data, error } = await supabase.storage
        .from('form-pdfs')
        .createSignedUrl(filePath, 3600); // 1 hora

      if (error) throw error;

      setSignedPdfUrl(data.signedUrl);
    } catch (error) {
      console.error("Erro ao gerar URL assinada:", error);
      // Fallback para URL original
      setSignedPdfUrl(pdfUrl);
    }
  };

  const loadExistingMapping = async () => {
    try {
      // @ts-expect-error - form_templates table not yet in generated types
      const { data, error } = await supabase
        .from('form_templates')
        .select('pdf_mapping')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (data?.pdf_mapping) {
        const mapping = data.pdf_mapping as PDFMapping;
        setFieldPositions(mapping.fields || []);
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamento:", error);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFieldKey) {
      toast({
        title: "Selecione um campo",
        description: "Clique em um campo da lista à esquerda primeiro",
        variant: "destructive",
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / scale) / rect.width * 100;
    const y = ((event.clientY - rect.top) / scale) / rect.height * 100;

    // Verificar se já existe posição para este campo na página atual
    const existingIndex = fieldPositions.findIndex(
      fp => fp.field_key === selectedFieldKey && fp.coordinates?.page === currentPage
    );

    const newPosition: PDFFieldMapping = {
      field_key: selectedFieldKey,
      type: 'text',
      coordinates: {
        x,
        y,
        page: currentPage,
        width: 30, // largura padrão em %
        height: 3, // altura padrão em %
        fontSize: 10,
      }
    };

    if (existingIndex >= 0) {
      // Atualizar posição existente
      const newPositions = [...fieldPositions];
      newPositions[existingIndex] = newPosition;
      setFieldPositions(newPositions);
    } else {
      // Adicionar nova posição
      setFieldPositions([...fieldPositions, newPosition]);
    }

    toast({
      title: "Campo posicionado",
      description: `Campo "${selectedFieldKey}" foi posicionado`,
    });
  };

  const handleRemovePosition = (fieldKey: string, page: number) => {
    setFieldPositions(
      fieldPositions.filter(fp => !(fp.field_key === fieldKey && fp.coordinates?.page === page))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mapping: PDFMapping = {
        template_url: pdfUrl,
        fields: fieldPositions,
      };

      // @ts-expect-error - form_templates table not yet in generated types
      const { error } = await supabase
        .from('form_templates')
        .update({ pdf_mapping: mapping as any })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Mapeamento salvo!",
        description: "As posições dos campos foram salvas com sucesso.",
      });

      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar mapeamento:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPagePositions = fieldPositions.filter(fp => fp.coordinates?.page === currentPage);

  return (
    <div className="flex h-[80vh] gap-4">
      {/* Painel Esquerdo: Lista de Campos */}
      <div className="w-80 border-r">
        <div className="p-4 border-b bg-muted">
          <h3 className="font-semibold">Campos Disponíveis</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em um campo e depois clique no PDF para posicioná-lo
          </p>
        </div>
        
        <ScrollArea className="h-[calc(80vh-140px)]">
          <div className="p-4 space-y-2">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum campo criado ainda
              </p>
            ) : (
              fields.map((field) => {
                const positionsCount = fieldPositions.filter(
                  fp => fp.field_key === field.field_key
                ).length;

                return (
                  <Card
                    key={field.id}
                    className={`cursor-pointer transition-all ${
                      selectedFieldKey === field.field_key
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedFieldKey(field.field_key)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{field.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.field_key}
                          </p>
                        </div>
                        {positionsCount > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {positionsCount}x
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Mapeamento"}
          </Button>
        </div>
      </div>

      {/* Painel Central: Preview do PDF com Overlay */}
      <div className="flex-1 flex flex-col">
        {/* Controles */}
        <div className="flex items-center justify-between p-4 border-b bg-muted">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {numPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas do PDF */}
        <ScrollArea className="flex-1">
          <div className="p-8 flex justify-center">
            <div 
              ref={canvasRef}
              className="relative inline-block border-2 border-dashed border-primary/20 cursor-crosshair"
              onClick={handleCanvasClick}
            >
              {signedPdfUrl ? (
                <Document
                  file={signedPdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error("Erro ao carregar PDF:", error);
                    toast({
                      title: "Erro ao carregar PDF",
                      description: "Não foi possível carregar o documento. Verifique se o arquivo existe no storage.",
                      variant: "destructive",
                    });
                  }}
                  options={{
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                  }}
                >
              ) : (
                <div className="flex items-center justify-center h-96 w-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando PDF...</p>
                  </div>
                </div>
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              ) : null}

              {/* Overlay com posições dos campos */}
              {signedPdfUrl && currentPagePositions.map((position, index) => {
                const field = fields.find(f => f.field_key === position.field_key);
                const coords = position.coordinates;
                
                if (!coords) return null;
                
                return (
                  <div
                    key={`${position.field_key}-${index}`}
                    className="absolute bg-blue-500/20 border-2 border-blue-500 rounded flex items-center justify-center group hover:bg-blue-500/30 transition-colors"
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      width: `${coords.width}%`,
                      height: `${coords.height}%`,
                    }}
                  >
                    <span className="text-xs font-medium text-blue-900 bg-blue-100/90 px-2 py-1 rounded">
                      {field?.label || position.field_key}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePosition(position.field_key, coords.page);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Legenda */}
        {selectedFieldKey && (
          <div className="p-4 border-t bg-blue-50">
            <p className="text-sm text-blue-900">
              <strong>Campo selecionado:</strong> {selectedFieldKey}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Clique no PDF para posicionar este campo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
