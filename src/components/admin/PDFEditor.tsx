import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// ===== pdf.js (ESM) + Vite: configure o worker via URL =====
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

// ⛑️ Import do Fabric robusto (cobre default e named export)
import * as FabricNS from "fabric";
/**
 * Em diferentes versões/builds, "fabric" pode vir:
 * - como named export: { fabric }
 * - como default export: export default fabric
 * - ou como o próprio namespace
 */
const fabric: typeof import("fabric")["fabric"] =
  (FabricNS as any).fabric || (FabricNS as any).default || (FabricNS as any);

// Vite resolve a URL do worker corretamente:
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// -----------------------------------------------------------

type Mode = "pan" | "draw" | "text";

function ToolbarButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-3 py-2 rounded border text-sm hover:bg-neutral-50 ${className || ""}`}
    >
      {children}
    </button>
  );
}

export interface PDFEditorProps {
  fileUrl?: string;                    // URL pública/assinada do PDF
  storagePath?: string;                // caminho no bucket (ex: clients/123/documents/a.pdf)
  bucket?: string;                     // nome do bucket (padrão "documents")
  supabase: SupabaseClient;            // client do supabase
  initialScale?: number;               // zoom inicial
  maxCanvasWidth?: number;             // largura máx p/ caber no layout
  onSaved?: (signedUrl: string) => void; // callback após salvar
}

export default function PDFEditor({
  fileUrl,
  storagePath,
  bucket = "documents",
  supabase,
  initialScale = 1,
  maxCanvasWidth = 1100,
  onSaved,
}: PDFEditorProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);      // base (pdf.js)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);  // overlay (fabric)
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [mode, setMode] = useState<Mode>("pan");
  const [drawWidth, setDrawWidth] = useState(2);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(fileUrl || null);

  // anotações por página
  const pageAnnotations = useRef<Map<number, fabric.Object[]>>(new Map());

  // Resolver URL (se vier via storagePath)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (fileUrl) {
          setResolvedUrl(fileUrl);
          return;
        }
        if (storagePath) {
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 60 * 60);
          if (error) throw error;
          if (!cancelled) setResolvedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Erro ao resolver URL do PDF:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, storagePath, bucket, supabase]);

  // Carrega o PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedUrl) return;
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument({ url: resolvedUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error("Erro ao carregar PDF:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  // Inicializa Fabric no overlay
  useEffect(() => {
    if (!overlayCanvasRef.current) return;
    const f = new fabric.Canvas(overlayCanvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = f;
    return () => {
      f.dispose();
      fabricRef.current = null;
    };
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    const pdf = pdfDocRef.current;
    const pdfCanvas = pdfCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const f = fabricRef.current;
    if (!pdf || !pdfCanvas || !overlayCanvas || !f) return;

    setLoading(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const desiredWidth = Math.min(viewport.width, maxCanvasWidth);
      const ratio = desiredWidth / viewport.width;
      const finalViewport = page.getViewport({ scale: scale * ratio });

      const ctx = pdfCanvas.getContext("2d");
      if (!ctx) return;

      pdfCanvas.width = finalViewport.width;
      pdfCanvas.height = finalViewport.height;

      await page
        .render({
          canvasContext: ctx,
          viewport: finalViewport,
        })
        .promise;

      overlayCanvas.width = pdfCanvas.width;
      overlayCanvas.height = pdfCanvas.height;
      f.setWidth(overlayCanvas.width);
      f.setHeight(overlayCanvas.height);
      f.renderAll();

      // restaura anotações
      f.clear();
      const saved = pageAnnotations.current.get(pageNumber);
      if (saved && saved.length) {
        await Promise.all(
          saved.map(
            (obj) =>
              new Promise<void>((resolve) => {
                obj.clone((clone: fabric.Object) => {
                  if (clone) f.add(clone);
                  resolve();
                });
              })
          )
        );
        f.renderAll();
      }
    } catch (err) {
      console.error("Erro ao renderizar página:", err);
    } finally {
      setLoading(false);
    }
  }, [scale, maxCanvasWidth]);

  useEffect(() => {
    if (!pdfDocRef.current) return;
    renderPage(pageNum);
  }, [pageNum, renderPage]);

  // modos
  useEffect(() => {
    const f = fabricRef.current;
    if (!f) return;
    f.isDrawingMode = mode === "draw";
    if (mode === "draw") {
      // @ts-expect-error tipos do fabric
      f.freeDrawingBrush = new fabric.PencilBrush(f);
      // @ts-expect-error tipos do fabric
      f.freeDrawingBrush.width = drawWidth;
    }
  }, [mode, drawWidth]);

  const addText = useCallback(() => {
    const f = fabricRef.current;
    if (!f) return;
    const text = new fabric.IText("Digite aqui", {
      left: 40,
      top: 40,
      fontSize: 16,
      fill: "#111",
    });
    f.add(text);
    f.setActiveObject(text);
    f.renderAll();
  }, []);

  const goToPage = useCallback(
    async (next: number) => {
      const f = fabricRef.current;
      if (f) {
        const objs = f.getObjects().map((o) => o);
        pageAnnotations.current.set(pageNum, objs);
      }
      setPageNum(next);
    },
    [pageNum]
  );

  const handleSave = useCallback(async () => {
    if (!resolvedUrl) return;
    try {
      setSaving(true);

      const f = fabricRef.current;
      if (f) {
        const objs = f.getObjects().map((o) => o);
        pageAnnotations.current.set(pageNum, objs);
      }

      const arrayBuf = await (await fetch(resolvedUrl)).arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuf);

      for (let i = 1; i <= pdfDoc.getPageCount(); i++) {
        const pdfPage = pdfDoc.getPage(i - 1);
        const width = pdfPage.getWidth();
        const height = pdfPage.getHeight();

        const overlayObjs = pageAnnotations.current.get(i);
        if (!overlayObjs || overlayObjs.length === 0) continue;

        const tempCanvasEl = document.createElement("canvas");
        tempCanvasEl.width = Math.floor(width);
        tempCanvasEl.height = Math.floor(height);
        const tempFabric = new fabric.Canvas(tempCanvasEl, { selection: false });

        const editorW = overlayCanvasRef.current?.width || width;
        const editorH = overlayCanvasRef.current?.height || height;
        const scaleX = width / editorW;
        const scaleY = height / editorH;

        for (const obj of overlayObjs) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => {
            obj.clone((clone: fabric.Object) => {
              if (!clone) return resolve();
              clone.set({
                left: (clone.left || 0) * scaleX,
                top: (clone.top || 0) * scaleY,
                scaleX: (clone.scaleX || 1) * scaleX,
                scaleY: (clone.scaleY || 1) * scaleY,
              });
              tempFabric.add(clone);
              resolve();
            });
          });
        }
        tempFabric.renderAll();

        const dataUrl = tempCanvasEl.toDataURL("image/png");
        const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
        const png = await pdfDoc.embedPng(pngBytes);

        pdfPage.drawImage(png, { x: 0, y: 0, width, height });
        tempFabric.dispose();
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      if (storagePath) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(storagePath, blob, {
            upsert: true,
            contentType: "application/pdf",
          });
        if (error) throw error;

        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60 * 60);

        onSaved?.(data?.signedUrl || "");
        alert("Documento salvo com sucesso!");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "documento-anotado.pdf";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Falha ao salvar o PDF. Veja o console para detalhes.");
    } finally {
      setSaving(false);
    }
  }, [resolvedUrl, supabase, bucket, storagePath, onSaved, pageNum]);

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToolbarButton onClick={() => setMode("pan")} className={mode === "pan" ? "bg-neutral-100" : ""}>Mover</ToolbarButton>
        <ToolbarButton onClick={() => setMode("draw")} className={mode === "draw" ? "bg-neutral-100" : ""}>Caneta</ToolbarButton>
        <ToolbarButton onClick={() => { setMode("text"); addText(); }}>Texto</ToolbarButton>

        <div className="ml-2 flex items-center gap-2">
          <label className="text-sm">Espessura</label>
          <input
            type="number"
            min={1}
            max={12}
            value={drawWidth}
            onChange={(e) => setDrawWidth(Number(e.target.value))}
            className="w-16 rounded border px-2 py-1 text-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ToolbarButton onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>-</ToolbarButton>
          <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
          <ToolbarButton onClick={() => setScale((s) => Math.min(3, s + 0.1))}>+</ToolbarButton>

          <ToolbarButton onClick={() => goToPage(Math.max(1, pageNum - 1))} disabled={pageNum <= 1}>Anterior</ToolbarButton>
          <span className="text-sm">{pageNum} / {numPages || "-"}</span>
          <ToolbarButton onClick={() => goToPage(Math.min(numPages || 1, pageNum + 1))} disabled={pageNum >= (numPages || 1)}>Próxima</ToolbarButton>

          <ToolbarButton onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</ToolbarButton>
        </div>
      </div>

      {/* Canvas base + overlay SEMPRE renderizados; loading como overlay */}
      <div className="relative w-full overflow-auto rounded border">
        <canvas ref={pdfCanvasRef} className="block max-w-full select-none" />
        <canvas
          ref={overlayCanvasRef}
          className="pointer-events-auto absolute inset-0 block max-w-full"
          style={{ touchAction: "none" }}
        />
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 mx-auto mb-2"></div>
              <p className="text-sm text-neutral-700">Carregando documento…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
