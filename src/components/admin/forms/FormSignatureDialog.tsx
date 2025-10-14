// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SignatureCanvas from "react-signature-canvas";
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
import { Loader2, Palette, Eraser, Download, ArrowLeft } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

  const [step, setStep] = useState<"cpf" | "sign">("cpf");
  const [cpfInput, setCpfInput] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [penColor, setPenColor] = useState(COLOR_PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(2.5);

  const signatureRefs = useRef<Record<number, SignatureCanvas | null>>({});
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
    signatureRefs.current = {};
  }, [responseId]);

  useEffect(() => {
    if (step === "sign") {
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

  const clearPage = (pageNumber: number) => {
    signatureRefs.current[pageNumber]?.clear();
  };

  const clearAllPages = () => {
    Object.values(signatureRefs.current).forEach(ref => ref?.clear());
  };

  const getSignatureBounds = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let hasPixel = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          hasPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixel) return null;

    return { minX, maxX, minY, maxY, width, height };
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank");
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

    const canvases = Object.entries(signatureRefs.current).filter(
      ([, ref]) => ref && !ref.isEmpty()
    ) as Array<[string, SignatureCanvas]>;

    if (canvases.length === 0) {
      toast({
        title: "Sem assinatura",
        description: "Desenhe a assinatura no documento antes de salvar.",
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
      const logEntryPages: number[] = [];

      for (const [pageKey, canvasRef] of canvases) {
        const pageNumber = Number(pageKey);
        const page = pages[pageNumber - 1];
        if (!page) continue;

        const canvas = canvasRef.getCanvas();
        const pngDataUrl = canvas.toDataURL("image/png");
        const pngImage = await pdfDoc.embedPng(pngDataUrl);

        const { width: pageWidth, height: pageHeight } = page.getSize();
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });

        const bounds = getSignatureBounds(canvas);
        if (bounds) {
          const scaleX = pageWidth / bounds.width;
          const scaleY = pageHeight / bounds.height;
          const margin = 12;
          const textX = Math.max(bounds.minX * scaleX, 10);
          const textYPixels = Math.min(bounds.maxY + margin, bounds.height - 8);
          const textY = pageHeight - textYPixels * scaleY;
          const legend = `Assinado digitalmente por ${formattedCpf} em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;

          page.drawText(legend, {
            x: textX,
            y: Math.max(textY, 10),
            size: 10,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        logEntryPages.push(pageNumber);
      }

      const signedPdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([signedPdfBytes], { type: "application/pdf" });

      const basePath = pdfPathRef.current || `signed-forms/${response?.client_id || "unknown"}/${responseId}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("form-pdfs")
        .upload(basePath, signedBlob, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("form-pdfs")
        .createSignedUrl(basePath, 3600);

      if (signedUrlError) {
        throw signedUrlError;
      }

      pdfPathRef.current = basePath;
      setPdfUrl(signedUrlData?.signedUrl || null);

      const existingData = (response?.response_data as Record<string, any>) || {};
      const existingLog = Array.isArray(existingData.__signatures) ? existingData.__signatures : [];
      const newLog: SignatureLogEntry = {
        cpf: formattedCpf,
        cpf_raw: cpfInput,
        signed_at: now.toISOString(),
        pages: logEntryPages,
        message: `Assinado por ${formattedCpf} em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      };

      await supabase
        .from("form_responses")
        .update({
          response_data: {
            ...existingData,
            __signatures: [...existingLog, newLog],
          },
          filled_pdf_path: basePath,
        })
        .eq("id", responseId);

      queryClient.invalidateQueries({ queryKey: formResponsesKeys.details() });
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });

      toast({
        title: "Assinatura salva",
        description: "O documento foi assinado e salvo com sucesso.",
      });

      Object.values(signatureRefs.current).forEach(ref => ref?.clear());

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
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("cpf")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Trocar CPF
              </Button>
              <div className="text-sm text-muted-foreground">
                Assinando como <span className="font-medium text-foreground">{formatCPF(cpfInput)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPenColor(color)}
                    className={`h-7 w-7 rounded-full border transition-all ${
                      penColor === color ? "scale-110 border-primary ring-2 ring-primary/40" : "border-muted"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Espessura</Label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={strokeWidth}
                  onChange={(event) => setStrokeWidth(parseFloat(event.target.value))}
                  className="w-28"
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearAllPages}>
                <Eraser className="h-4 w-4 mr-1" />
                Limpar tudo
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pdfUrl}>
                <Download className="h-4 w-4 mr-1" />
                Baixar atual
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isPreparingPdf ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>Preparando documento para assinatura...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <ScrollArea className="max-h-[60vh]">
                <div className="flex flex-col gap-10 p-6 items-center">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoad}
                    loading={null}
                  >
                    {Array.from({ length: numPages }, (_, index) => {
                      const pageNumber = index + 1;
                      const dimensions = pageDimensions[pageNumber];
                      return (
                        <div key={pageNumber} className="relative inline-block shadow border">
                          <Page
                            pageNumber={pageNumber}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={(page) => handlePageRenderSuccess(pageNumber, page)}
                          />
                          {dimensions && (
                            <>
                              <SignatureCanvas
                                ref={(ref) => {
                                  signatureRefs.current[pageNumber] = ref;
                                }}
                                canvasProps={{
                                  width: dimensions.width,
                                  height: dimensions.height,
                                  className: "absolute top-0 left-0 w-full h-full",
                                  style: { width: "100%", height: "100%", touchAction: "none" },
                                }}
                                penColor={penColor}
                                backgroundColor="transparent"
                                minWidth={strokeWidth}
                                maxWidth={strokeWidth * 1.8}
                              />
                              <div className="absolute top-3 right-3 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => clearPage(pageNumber)}
                                >
                                  <Eraser className="h-3 w-3 mr-1" />
                                  Limpar
                                </Button>
                              </div>
                            </>
                          )}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
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

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Use uma caneta ou o mouse para desenhar sua assinatura diretamente sobre o documento.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSignature} disabled={isSaving || isPreparingPdf}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar assinatura"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
