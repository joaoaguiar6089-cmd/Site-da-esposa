import { useState, useEffect, useRef, useMemo } from "react";
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

// Configure PDF.js worker - usar a versão compatível com react-pdf 10.1.0
// react-pdf 10.1.0 usa pdfjs-dist 5.3.93 internamente
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFFieldMapperProps {
  templateId: string;
  pdfUrl: string;
  onClose: () => void;
}

export default function PDFFieldMapper({ templateId, pdfUrl, onClose }: PDFFieldMapperProps) {
  const { toast } = useToast();
  const { fields } = useFormFields(templateId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    index: number;
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
    rectWidth: number;
    rectHeight: number;
  } | null>(null);
  
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [fieldPositions, setFieldPositions] = useState<PDFFieldMapping[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string>("");
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);

  // Memoizar options para evitar reloads desnecessários
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

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
      const { data, error } = await supabase
        .from('form_templates')
        .select('pdf_mapping')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (data?.pdf_mapping) {
        const mapping = data.pdf_mapping as unknown as PDFMapping;
        setFieldPositions(mapping.fields || []);
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamento:", error);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsPdfLoading(false);
    toast({
      title: "PDF carregado",
      description: `Documento com ${numPages} página(s) pronto para edição`,
    });
  };

  const getPageRect = () => {
    if (!canvasRef.current) return null;
    const pageCanvas = canvasRef.current.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement | null;
    return (pageCanvas ?? canvasRef.current).getBoundingClientRect();
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    if (!selectedFieldKey) {
      toast({
        title: "Selecione um campo",
        description: "Clique em um campo da lista à esquerda primeiro",
        variant: "destructive",
      });
      return;
    }

    const rect = getPageRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

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

    let targetIndex = existingIndex;
    if (existingIndex >= 0) {
      const newPositions = [...fieldPositions];
      newPositions[existingIndex] = newPosition;
      setFieldPositions(newPositions);
    } else {
      targetIndex = fieldPositions.length;
      setFieldPositions([...fieldPositions, newPosition]);
    }

    setSelectedPositionIndex(targetIndex);

    toast({
      title: "Campo posicionado",
      description: `Campo "${selectedFieldKey}" foi posicionado`,
    });
  };

  const handleFieldPointerDown = (event: React.PointerEvent<HTMLDivElement>, globalIndex: number) => {
    event.preventDefault();
    event.stopPropagation();

    const target = fieldPositions[globalIndex];
    const coords = target?.coordinates;
    if (!coords) return;

    const rect = getPageRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    dragStateRef.current = {
      index: globalIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: coords.x,
      initialY: coords.y,
      rectWidth: rect.width,
      rectHeight: rect.height,
    };

    setSelectedPositionIndex(globalIndex);
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return;

      const { index, startClientX, startClientY, initialX, initialY, rectWidth, rectHeight } = dragStateRef.current;
      if (!rectWidth || !rectHeight) return;

      const deltaXPercent = ((event.clientX - startClientX) / rectWidth) * 100;
      const deltaYPercent = ((event.clientY - startClientY) / rectHeight) * 100;

      setFieldPositions(prev => {
        const next = [...prev];
        const target = next[index];
        if (!target?.coordinates) return prev;

        next[index] = {
          ...target,
          coordinates: {
            ...target.coordinates,
            x: Math.max(0, Math.min(100, initialX + deltaXPercent)),
            y: Math.max(0, Math.min(100, initialY + deltaYPercent)),
          },
        };

        return next;
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handleRemovePosition = (fieldKey: string, page: number) => {
    setFieldPositions(
      fieldPositions.filter(fp => !(fp.field_key === fieldKey && fp.coordinates?.page === page))
    );
    setSelectedPositionIndex(null);
  };

  const handleUpdateFieldSize = (index: number, width: number, height: number) => {
    const newPositions = [...fieldPositions];
    if (newPositions[index]?.coordinates) {
      newPositions[index].coordinates = {
        ...newPositions[index].coordinates!,
        width: Math.max(5, Math.min(100, width)),
        height: Math.max(1, Math.min(50, height)),
      };
      setFieldPositions(newPositions);
    }
  };

  const handleUpdateFieldPosition = (index: number, deltaX: number, deltaY: number) => {
    const newPositions = [...fieldPositions];
    if (newPositions[index]?.coordinates) {
      newPositions[index].coordinates = {
        ...newPositions[index].coordinates!,
        x: Math.max(0, Math.min(100, newPositions[index].coordinates!.x + deltaX)),
        y: Math.max(0, Math.min(100, newPositions[index].coordinates!.y + deltaY)),
      };
      setFieldPositions(newPositions);
    }
  };

  const handleUpdateFontSize = (index: number, fontSize: number) => {
    const newPositions = [...fieldPositions];
    if (newPositions[index]?.coordinates) {
      newPositions[index].coordinates = {
        ...newPositions[index].coordinates!,
        fontSize: Math.max(6, Math.min(72, fontSize)),
      };
      setFieldPositions(newPositions);
    }
  };

  const handleToggleBold = (index: number) => {
    const newPositions = [...fieldPositions];
    if (newPositions[index]?.coordinates) {
      newPositions[index].coordinates = {
        ...newPositions[index].coordinates!,
        fontFamily: newPositions[index].coordinates!.fontFamily === 'Helvetica-Bold' 
          ? 'Helvetica' 
          : 'Helvetica-Bold',
      };
      setFieldPositions(newPositions);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mapping: PDFMapping = {
        template_url: pdfUrl,
        fields: fieldPositions,
      };

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
              {!signedPdfUrl ? (
                <div className="flex items-center justify-center h-96 w-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Gerando URL assinada...</p>
                  </div>
                </div>
              ) : (
                <>
                  {isPdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Carregando documento...</p>
                      </div>
                    </div>
                  )}
                  <Document
                    file={signedPdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={null}
                    onLoadError={(error) => {
                      console.error("Erro ao carregar PDF:", error);
                      setIsPdfLoading(false);
                      toast({
                        title: "Erro ao carregar PDF",
                        description: "Não foi possível carregar o documento. Verifique se o arquivo existe no storage.",
                        variant: "destructive",
                      });
                    }}
                    options={pdfOptions}
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                    />
                  </Document>
                </>
              )}

              {/* Overlay com posições dos campos */}
              {signedPdfUrl && !isPdfLoading && currentPagePositions.map((position, index) => {
                const field = fields.find(f => f.field_key === position.field_key);
                const coords = position.coordinates;
                const globalIndex = fieldPositions.findIndex(
                  fp => fp.field_key === position.field_key && fp.coordinates?.page === currentPage
                );
                const isSelected = selectedPositionIndex === globalIndex;
                
                if (!coords) return null;
                
                const isBold = coords.fontFamily === 'Helvetica-Bold';
                const fontSize = coords.fontSize || 10;
                
                return (
                  <div
                    key={`${position.field_key}-${index}`}
                    className={`absolute transition-all select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      width: `${coords.width}%`,
                      minHeight: `${Math.max(coords.height, 2)}%`,
                    }}
                    onPointerDown={(e) => handleFieldPointerDown(e, globalIndex)}
                    title={position.field_key}
                  >
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs md:text-sm shadow-sm backdrop-blur-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/15 border border-primary/60 text-primary'
                          : 'bg-white/75 border border-primary/30 text-slate-700 hover:bg-white/90'
                      }`}
                      style={{
                        fontSize: `${fontSize * scale * 0.75}px`,
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      {field?.label || position.field_key}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Legenda */}
        {selectedFieldKey && !selectedPositionIndex && (
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

      {/* Painel Direito: Controles de Edição */}
      {selectedPositionIndex !== null && fieldPositions[selectedPositionIndex] && (
        <div className="w-80 border-l">
          <div className="p-4 border-b bg-muted">
            <h3 className="font-semibold">Editar Campo</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ajuste o tamanho e posição
            </p>
          </div>
          
          <ScrollArea className="h-[calc(80vh-60px)]">
            <div className="p-4 space-y-4">
              {(() => {
                const position = fieldPositions[selectedPositionIndex];
                const field = fields.find(f => f.field_key === position.field_key);
                const coords = position.coordinates!;

                return (
                  <>
                    {/* Info do Campo */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">CAMPO</Label>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{field?.label || position.field_key}</p>
                        <p className="text-xs text-muted-foreground mt-1">{position.field_key}</p>
                      </div>
                    </div>

                    {/* Posição */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">POSIÇÃO</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">X (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={coords.x.toFixed(1)}
                            onChange={(e) => {
                              const newPositions = [...fieldPositions];
                              newPositions[selectedPositionIndex].coordinates!.x = parseFloat(e.target.value);
                              setFieldPositions(newPositions);
                            }}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={coords.y.toFixed(1)}
                            onChange={(e) => {
                              const newPositions = [...fieldPositions];
                              newPositions[selectedPositionIndex].coordinates!.y = parseFloat(e.target.value);
                              setFieldPositions(newPositions);
                            }}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {/* Botões de ajuste fino */}
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateFieldPosition(selectedPositionIndex, 0, -1)}
                          className="h-8"
                        >
                          ↑
                        </Button>
                        <div></div>
                        <div></div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateFieldPosition(selectedPositionIndex, -1, 0)}
                          className="h-8"
                        >
                          ←
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateFieldPosition(selectedPositionIndex, 0, 1)}
                          className="h-8"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateFieldPosition(selectedPositionIndex, 1, 0)}
                          className="h-8"
                        >
                          →
                        </Button>
                      </div>
                    </div>

                    {/* Tamanho */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">TAMANHO</Label>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Largura (%)</Label>
                            <span className="text-xs font-mono text-muted-foreground">
                              {coords.width.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFieldSize(selectedPositionIndex, coords.width - 5, coords.height)}
                              className="h-8"
                            >
                              -
                            </Button>
                            <Input
                              type="range"
                              min="5"
                              max="100"
                              step="1"
                              value={coords.width}
                              onChange={(e) => handleUpdateFieldSize(selectedPositionIndex, parseFloat(e.target.value), coords.height)}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFieldSize(selectedPositionIndex, coords.width + 5, coords.height)}
                              className="h-8"
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Altura (%)</Label>
                            <span className="text-xs font-mono text-muted-foreground">
                              {coords.height.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFieldSize(selectedPositionIndex, coords.width, coords.height - 1)}
                              className="h-8"
                            >
                              -
                            </Button>
                            <Input
                              type="range"
                              min="1"
                              max="50"
                              step="0.5"
                              value={coords.height}
                              onChange={(e) => handleUpdateFieldSize(selectedPositionIndex, coords.width, parseFloat(e.target.value))}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFieldSize(selectedPositionIndex, coords.width, coords.height + 1)}
                              className="h-8"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fonte */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">FONTE</Label>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Tamanho (pt)</Label>
                            <span className="text-xs font-mono text-muted-foreground">
                              {coords.fontSize || 10}pt
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFontSize(selectedPositionIndex, (coords.fontSize || 10) - 1)}
                              className="h-8"
                            >
                              -
                            </Button>
                            <Input
                              type="range"
                              min="6"
                              max="72"
                              step="1"
                              value={coords.fontSize || 10}
                              onChange={(e) => handleUpdateFontSize(selectedPositionIndex, parseFloat(e.target.value))}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateFontSize(selectedPositionIndex, (coords.fontSize || 10) + 1)}
                              className="h-8"
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs mb-2 block">Estilo</Label>
                          <Button
                            size="sm"
                            variant={coords.fontFamily === 'Helvetica-Bold' ? 'default' : 'outline'}
                            className="w-full h-8 font-bold"
                            onClick={() => handleToggleBold(selectedPositionIndex)}
                          >
                            <span className="font-bold">B</span>
                            <span className="ml-2 font-normal">
                              {coords.fontFamily === 'Helvetica-Bold' ? 'Negrito' : 'Normal'}
                            </span>
                          </Button>
                        </div>

                        {/* Preview da fonte */}
                        <div>
                          <Label className="text-xs mb-2 block">Preview</Label>
                          <div 
                            className="border rounded p-3 bg-white flex items-center justify-center min-h-[60px]"
                            style={{
                              fontSize: `${coords.fontSize || 10}pt`,
                              fontWeight: coords.fontFamily === 'Helvetica-Bold' ? 'bold' : 'normal',
                            }}
                          >
                            {field?.label || 'Texto de Exemplo'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="space-y-2 pt-4 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemovePosition(position.field_key, coords.page)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Campo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedPositionIndex(null)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Fechar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
