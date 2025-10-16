// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFormResponse, formResponsesKeys } from "@/hooks/forms/useFormResponses";
import { useQueryClient } from "@tanstack/react-query";
import { cleanCPF, formatCPF, isValidCPF } from "@/utils/cpfValidator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Download, ArrowLeft, Check } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SignaturePad, SignaturePadValue } from "@/components/ui/signature-pad/signature-pad.tsx";
import { Checkbox } from "@/components/ui/checkbox";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FormSignatureDialogProps {
  responseId: string;
  onClose: () => void;
  onSigned?: () => void;
}

type SignatureLogEntry = {
  cpf: string;
  cpf_raw?: string;
  signed_at: string;
  pages: number[];
  message: string;
};

const COLOR_PALETTE = ["#111827", "#000000", "#2563eb", "#16a34a", "#ea580c", "#b91c1c", "#7c3aed"];

export function FormSignatureDialog({ responseId, onClose, onSigned }: FormSignatureDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { response, isLoading } = useFormResponse(responseId);

  const [step, setStep] = useState<"cpf" | "sign" | "apply">("cpf");
  const [cpfInput, setCpfInput] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [signatureValue, setSignatureValue] = useState<SignaturePadValue | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [signaturePositions, setSignaturePositions] = useState<Record<number, { x: number; y: number }>>({});

  const pdfPathRef = useRef<string | null>(null);

  const signatureLog = useMemo<SignatureLogEntry[]>(() => {
    const rawData = (response?.response_data as Record<string, any> | undefined)?.__signatures;
    return Array.isArray(rawData) ? rawData : [];
  }, [response?.response_data]);

  useEffect(() => {
    setStep("cpf");
    setCpfInput("");
    setPdfUrl(null);
    setPageDimensions({});
    setSignatureValue(null);
    setSelectedPages([]);
  }, [responseId]);

  useEffect(() => {
    if (step === "sign" || step === "apply") {
      preparePdf();
    }
  }, [step, response]);

  const handleCpfChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setCpfInput(cleaned);
    }
  };

  const formattedCpfForInput = cpfInput ? formatCPF(cpfInput) : "";
  const isCpfValid = isValidCPF(cpfInput);

  const preparePdf = async () => {
    if (!response) return;
    if (pdfUrl) return;

    setIsPreparingPdf(true);
    try {
      let pdfPath = (response as any).filled_pdf_path as string | null | undefined;
      let signedUrl: string | null = null;

      if (!pdfPath) {
        const { data, error } = await supabase.functions.invoke("generate-filled-pdf", {
          body: { response_id: responseId },
        });
        if (error) throw error;
        pdfPath = data?.pdf_path || data?.file_path || null;
        signedUrl = data?.pdf_url || null;
      }

      if (!pdfPath) {
        throw new Error("PDF do formulário não disponível.");
      }

      if (!signedUrl) {
        const { data: signed, error: signedError } = await supabase.storage
          .from("form-pdfs")
          .createSignedUrl(pdfPath, 3600);
        if (signedError || !signed?.signedUrl) {
          throw signedError || new Error("Não foi possível gerar URL assinada para o PDF.");
        }
        signedUrl = signed.signedUrl;
      }

      pdfPathRef.current = pdfPath;
      setPdfUrl(signedUrl);
    } catch (error: any) {
      console.error("Erro ao preparar PDF para assinatura:", error);
      toast({
        title: "Erro ao carregar PDF",
        description: error?.message || "Não foi possível carregar o documento para assinatura.",
        variant: "destructive",
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleDocumentLoad = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageRenderSuccess = (pageNumber: number, page: any) => {
    setPageDimensions(prev => {
      const existing = prev[pageNumber];
      if (existing && existing.width === page.width && existing.height === page.height) {
        return prev;
      }
      return { ...prev, [pageNumber]: { width: page.width, height: page.height } };
    });
  };

  const handlePageToggle = (pageNumber: number) => {
    setSelectedPages(prev => 
      prev.includes(pageNumber) 
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber]
    );
  };

  const selectAllPages = () => {
    setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank");
  };

  const handleContinueToApply = () => {
    if (!signatureValue || !signatureValue.value) {
      toast({
        title: "Assinatura vazia",
        description: "Crie sua assinatura antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    setStep("apply");
  };

  const handleSaveSignature = async () => {
    if (!isValidCPF(cpfInput)) {
      toast({
        title: "CPF inválido",
        description: "Informe um CPF válido para registrar a assinatura.",
        variant: "destructive",
      });
      setStep("cpf");
      return;
    }

    if (!signatureValue || !signatureValue.value) {
      toast({
        title: "Sem assinatura",
        description: "Crie uma assinatura antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPages.length === 0) {
      toast({
        title: "Nenhuma página selecionada",
        description: "Selecione pelo menos uma página para aplicar a assinatura.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const sourceUrl = pdfUrl;
      if (!sourceUrl) throw new Error("PDF não carregado.");

      const pdfBytes = await fetch(sourceUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const now = new Date();
      const formattedCpf = formatCPF(cpfInput);

      console.log('Salvando assinatura:', {
        selectedPages,
        signatureValue: signatureValue?.type,
        hasValue: !!signatureValue?.value
      });

      // Embed signature image
      let pngImage;
      try {
        pngImage = await pdfDoc.embedPng(signatureValue.value);
        console.log('Imagem PNG incorporada com sucesso');
      } catch (error) {
        console.error('Erro ao incorporar PNG:', error);
        throw new Error('Erro ao processar imagem da assinatura');
      }

      for (const pageNumber of selectedPages) {
        const page = pages[pageNumber - 1];
        if (!page) {
          console.warn(`Página ${pageNumber} não encontrada`);
          continue;
        }

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const dimensions = pageDimensions[pageNumber];
        
        console.log(`Processando página ${pageNumber}:`, {
          pageWidth,
          pageHeight,
          dimensions
        });
        
        if (!dimensions) {
          console.warn(`Dimensões não encontradas para página ${pageNumber}, usando valores padrão`);
          // Use default position if dimensions not available
          const signatureWidth = 180;
          const signatureHeight = 72;
          const margin = 20;
          
          const pdfX = pageWidth - signatureWidth - margin;
          const pdfY = margin;

          page.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: signatureWidth,
            height: signatureHeight,
          });

          const legend = `Assinado digitalmente por CPF ${formattedCpf}`;
          const legendDate = `em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
          const legendFontSize = 7;

          page.drawText(legend, {
            x: pdfX,
            y: pdfY - 12,
            size: legendFontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          
          page.drawText(legendDate, {
            x: pdfX,
            y: pdfY - 22,
            size: legendFontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          
          console.log(`Assinatura aplicada na página ${pageNumber} (posição padrão)`);
          continue;
        }

        // Get signature position (use custom position or default)
        const signaturePos = signaturePositions[pageNumber] || { 
          x: dimensions.width * 0.65, 
          y: dimensions.height * 0.05 
        };
        
        // Calculate scale factor between rendered PDF and actual PDF
        const scaleX = pageWidth / dimensions.width;
        const scaleY = pageHeight / dimensions.height;
        
        // Signature dimensions
        const signatureWidth = 180;
        const signatureHeight = 72;
        
        // Convert position from screen coordinates to PDF coordinates
        const pdfX = signaturePos.x * scaleX;
        const pdfY = pageHeight - (signaturePos.y * scaleY) - (signatureHeight * scaleY);

        console.log(`Desenhando assinatura na página ${pageNumber}:`, {
          signaturePos,
          scaleX,
          scaleY,
          pdfX,
          pdfY,
          signatureWidth: signatureWidth * scaleX,
          signatureHeight: signatureHeight * scaleY
        });

        // Draw signature
        page.drawImage(pngImage, {
          x: pdfX,
          y: pdfY,
          width: signatureWidth * scaleX,
          height: signatureHeight * scaleY,
        });

        // Add legend below signature
        const legend = `Assinado digitalmente por CPF ${formattedCpf}`;
        const legendDate = `em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
        const legendFontSize = 7;

        page.drawText(legend, {
          x: pdfX,
          y: pdfY - 12,
          size: legendFontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        
        page.drawText(legendDate, {
          x: pdfX,
          y: pdfY - 22,
          size: legendFontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        
        console.log(`Assinatura aplicada com sucesso na página ${pageNumber}`);
      }

      console.log('Salvando PDF modificado...');
      const signedPdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([signedPdfBytes], { type: "application/pdf" });
      
      console.log('PDF salvo, tamanho:', signedBlob.size, 'bytes');

      const basePath = pdfPathRef.current || `signed-forms/${response?.client_id || "unknown"}/${responseId}_${Date.now()}.pdf`;
      
      console.log('Fazendo upload para:', basePath);
      
      const { error: uploadError } = await supabase.storage
        .from("form-pdfs")
        .upload(basePath, signedBlob, { upsert: true });

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload concluído com sucesso!');

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("form-pdfs")
        .createSignedUrl(basePath, 3600);

      if (signedUrlError) {
        console.error('Erro ao criar URL assinada:', signedUrlError);
        throw signedUrlError;
      }
      
      console.log('URL assinada gerada:', signedUrlData?.signedUrl);

      pdfPathRef.current = basePath;
      setPdfUrl(signedUrlData?.signedUrl || null);

      const existingData = (response?.response_data as Record<string, any>) || {};
      const existingLog = Array.isArray(existingData.__signatures) ? existingData.__signatures : [];
      const newLog: SignatureLogEntry = {
        cpf: formattedCpf,
        cpf_raw: cpfInput,
        signed_at: now.toISOString(),
        pages: selectedPages,
        message: `Assinado por ${formattedCpf} em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      };
      
      console.log('Atualizando banco de dados com caminho:', basePath);

      const { error: updateError } = await supabase
        .from("form_responses")
        .update({
          response_data: {
            ...existingData,
            __signatures: [...existingLog, newLog],
          },
          filled_pdf_path: basePath,
        })
        .eq("id", responseId);
        
      if (updateError) {
        console.error('Erro ao atualizar banco de dados:', updateError);
        throw updateError;
      }
      
      console.log('Banco de dados atualizado com sucesso!');

      queryClient.invalidateQueries({ queryKey: formResponsesKeys.details() });
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });

      toast({
        title: "Assinatura salva",
        description: "O documento foi assinado e salvo com sucesso.",
      });

      // Reset signature and selections
      setSignatureValue(null);
      setSelectedPages([]);
      
      console.log('Processo de assinatura concluído!');

      if (onSigned) onSigned();
    } catch (error: any) {
      console.error("Erro ao salvar assinatura:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível salvar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="text-center text-muted-foreground py-10">
        Não foi possível localizar a ficha selecionada.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === "cpf" ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cpf-assinatura">CPF da assinatura</Label>
            <Input
              id="cpf-assinatura"
              placeholder="Digite o CPF de quem está assinando"
              value={formattedCpfForInput}
              onChange={(event) => handleCpfChange(event.target.value)}
              maxLength={14}
            />
            <p className="text-xs text-muted-foreground">
              O CPF será registrado juntamente com a data e hora da assinatura para fins de auditoria.
            </p>
            {!isCpfValid && cpfInput.length > 0 && (
              <p className="text-xs text-destructive">Informe um CPF válido com 11 dígitos.</p>
            )}
          </div>

          {signatureLog.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <h4 className="text-sm font-semibold">Assinaturas registradas</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {signatureLog.map((log, index) => (
                  <li key={`${log.signed_at}-${index}`} className="flex flex-col">
                    <span>{log.message}</span>
                    {log.pages && log.pages.length > 0 && (
                      <span className="text-xs">Páginas: {log.pages.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => setStep("sign")} disabled={!isCpfValid}>
              Continuar para assinatura
            </Button>
          </div>
        </div>
      ) : step === "sign" ? (
        <div className="flex flex-col h-full max-h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("cpf")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Trocar CPF
              </Button>
              <div className="text-sm text-muted-foreground">
                Assinando como <span className="font-medium text-foreground">{formatCPF(cpfInput)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <Label className="font-semibold">Crie sua assinatura</Label>
            <div className="border rounded-lg bg-white flex-1 min-h-0" style={{ maxHeight: '400px' }}>
              <SignaturePad
                value={signatureValue}
                onChange={setSignatureValue}
                className="h-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Escolha entre desenhar, digitar ou fazer upload da sua assinatura.
            </p>
          </div>

          <div className="flex justify-between items-center gap-4 pt-4 mt-4 border-t bg-background">
            <Button variant="outline" onClick={onClose} size="lg">
              Cancelar
            </Button>
            <Button 
              onClick={handleContinueToApply} 
              size="lg"
              className="min-w-[200px]"
              disabled={!signatureValue || !signatureValue.value}
            >
              Continuar para aplicar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("sign")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar para assinatura
              </Button>
              <div className="text-sm text-muted-foreground">
                Assinando como <span className="font-medium text-foreground">{formatCPF(cpfInput)}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pdfUrl}>
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
          </div>

          {signatureValue && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Assinatura criada</Label>
                <Button variant="ghost" size="sm" onClick={() => setStep("sign")}>
                  Editar assinatura
                </Button>
              </div>
              <div className="border rounded bg-white p-4 flex items-center justify-center" style={{ height: '120px' }}>
                {signatureValue.type === 'TYPE' ? (
                  <div 
                    className="text-4xl"
                    style={{ 
                      fontFamily: 'Dancing Script, cursive',
                      fontWeight: 400
                    }}
                  >
                    {signatureValue.value}
                  </div>
                ) : (
                  <img 
                    src={signatureValue.value} 
                    alt="Assinatura" 
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            {isPreparingPdf ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>Preparando documento para assinatura...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <ScrollArea className="h-[70vh]">
                <div className="flex flex-col gap-6 p-6 items-center">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoad}
                    loading={null}
                  >
                    {Array.from({ length: numPages }, (_, index) => {
                      const pageNumber = index + 1;
                      const isSelected = selectedPages.includes(pageNumber);
                      const dimensions = pageDimensions[pageNumber];
                      const signaturePos = signaturePositions[pageNumber] || { 
                        x: dimensions ? dimensions.width * 0.65 : 0, 
                        y: dimensions ? dimensions.height * 0.05 : 0 
                      };
                      
                      return (
                        <div 
                          key={pageNumber} 
                          className={`relative inline-block shadow border-2 transition-all ${
                            isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Page
                            pageNumber={pageNumber}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={(page) => handlePageRenderSuccess(pageNumber, page)}
                            scale={1.0}
                          />
                          
                          {/* Checkbox para selecionar página */}
                          <div className="absolute top-3 left-3 z-10">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handlePageToggle(pageNumber)}
                              className="bg-white"
                            />
                          </div>
                          
                          {isSelected && signatureValue && dimensions && (
                            <div 
                              className="absolute cursor-move group"
                              style={{ 
                                left: `${signaturePos.x}px`,
                                top: `${signaturePos.y}px`,
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                const rect = e.currentTarget.getBoundingClientRect();
                                e.dataTransfer.setData('offsetX', String(e.clientX - rect.left));
                                e.dataTransfer.setData('offsetY', String(e.clientY - rect.top));
                              }}
                              onDragEnd={(e) => {
                                const pageElement = e.currentTarget.closest('.relative');
                                if (!pageElement) return;
                                const pageRect = pageElement.getBoundingClientRect();
                                const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
                                const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');
                                const newX = Math.max(0, Math.min(e.clientX - pageRect.left - offsetX, dimensions.width - 180));
                                const newY = Math.max(0, Math.min(e.clientY - pageRect.top - offsetY, dimensions.height - 80));
                                setSignaturePositions(prev => ({
                                  ...prev,
                                  [pageNumber]: { x: newX, y: newY }
                                }));
                              }}
                            >
                              <div 
                                className="bg-white/95 border-2 border-primary rounded p-2 shadow-xl group-hover:shadow-2xl transition-shadow"
                                style={{ 
                                  width: '180px',
                                  height: '72px'
                                }}
                              >
                                {signatureValue.type === 'TYPE' ? (
                                  <div 
                                    className="text-2xl flex items-center justify-center h-full"
                                    style={{ 
                                      fontFamily: 'Dancing Script, cursive',
                                      fontWeight: 400
                                    }}
                                  >
                                    {signatureValue.value}
                                  </div>
                                ) : (
                                  <img 
                                    src={signatureValue.value} 
                                    alt="Preview assinatura" 
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                Arraste
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                            Página {pageNumber}
                          </div>
                        </div>
                      );
                    })}
                  </Document>
                </div>
              </ScrollArea>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Não foi possível carregar o PDF para assinatura.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Páginas selecionadas: {selectedPages.length} de {numPages}</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllPages}>
                  Selecionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllPages}>
                  Desmarcar todas
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              ✓ <strong>Marque o checkbox</strong> nas páginas onde deseja aplicar a assinatura
              <br />
              ✓ <strong>Arraste a assinatura</strong> para posicioná-la no local desejado
              <br />
              ✓ A legenda com CPF, data e hora será adicionada automaticamente
            </p>
          </div>

          <div className="flex justify-between items-center gap-4 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving} size="lg">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSignature} 
              disabled={isSaving || isPreparingPdf || selectedPages.length === 0}
              size="lg"
              className="min-w-[200px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvando assinatura...
                </>
              ) : (
                "Salvar assinatura no documento"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
