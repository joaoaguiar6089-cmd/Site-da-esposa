import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, Move, Crop, RotateCcw, Check, X } from "lucide-react";

interface ImageEditorProps {
  imageFile: File | null;
  imageUrl?: string;
  onSave: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
  open: boolean;
}

export function ImageEditor({ imageFile, imageUrl, onSave, onCancel, open }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState([1]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize] = useState({ width: 400, height: 300 });

  // Load image
  useEffect(() => {
    if (!open) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      setImage(img);
      // Center image and fit to canvas
      const scaleX = canvasSize.width / img.width;
      const scaleY = canvasSize.height / img.height;
      const initialScale = Math.min(scaleX, scaleY, 1);
      setScale([initialScale]);
      setPosition({
        x: (canvasSize.width - img.width * initialScale) / 2,
        y: (canvasSize.height - img.height * initialScale) / 2
      });
    };

    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    } else if (imageUrl) {
      img.src = imageUrl;
    }
  }, [imageFile, imageUrl, open, canvasSize.width, canvasSize.height]);

  // Draw image on canvas
  const drawCanvas = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image with current scale and position
    const currentScale = scale[0];
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * currentScale,
      image.height * currentScale
    );

    // Draw crop area outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([]);
  }, [image, scale, position]);

  // Redraw when values change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x: x - position.x, y: y - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({
      x: x - dragStart.x,
      y: y - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setScale([Math.min(scale[0] * 1.1, 5)]);
  };

  const handleZoomOut = () => {
    setScale([Math.max(scale[0] * 0.9, 0.1)]);
  };

  // Reset position and scale
  const handleReset = () => {
    if (!image) return;
    
    const scaleX = canvasSize.width / image.width;
    const scaleY = canvasSize.height / image.height;
    const initialScale = Math.min(scaleX, scaleY, 1);
    setScale([initialScale]);
    setPosition({
      x: (canvasSize.width - image.width * initialScale) / 2,
      y: (canvasSize.height - image.height * initialScale) / 2
    });
  };

  // Center image
  const handleCenter = () => {
    if (!image) return;
    
    const currentScale = scale[0];
    setPosition({
      x: (canvasSize.width - image.width * currentScale) / 2,
      y: (canvasSize.height - image.height * currentScale) / 2
    });
  };

  // Save edited image
  const handleSave = () => {
    if (!canvasRef.current) return;
    
    // Create a new canvas for the final cropped image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvasSize.width;
    finalCanvas.height = canvasSize.height;
    
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx || !image) return;

    // Fill background with white
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Draw the cropped image
    const currentScale = scale[0];
    finalCtx.drawImage(
      image,
      position.x,
      position.y,
      image.width * currentScale,
      image.height * currentScale
    );

    onSave(finalCanvas);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajustar Imagem</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Canvas Container */}
          <div 
            ref={containerRef}
            className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <Label>Zoom: {Math.round(scale[0] * 100)}%</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Slider
                  value={scale}
                  onValueChange={setScale}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCenter}
                className="flex items-center gap-2"
              >
                <Move className="h-4 w-4" />
                Centralizar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Crop className="h-4 w-4" />
                <span className="font-medium">Instruções:</span>
              </div>
              <ul className="space-y-1 text-xs">
                <li>• Arraste a imagem para posicioná-la</li>
                <li>• Use o controle de zoom ou os botões +/-</li>
                <li>• A área dentro da borda pontilhada será salva</li>
                <li>• Clique em "Centralizar" para ajustar automaticamente</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Aplicar Ajustes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}