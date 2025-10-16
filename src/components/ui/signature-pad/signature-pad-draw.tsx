import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
import { useRef, useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIGNATURE_CANVAS_DPI = 2;
const SIGNATURE_MIN_COVERAGE_THRESHOLD = 0.001;

class Point {
  x: number;
  y: number;
  pressure: number;

  constructor(x: number, y: number, pressure: number = 0.5) {
    this.x = x;
    this.y = y;
    this.pressure = pressure;
  }

  static fromEvent(
    event: MouseEvent | PointerEvent | TouchEvent,
    dpi: number = 1,
    element: HTMLCanvasElement | null
  ): Point {
    if (!element) {
      return new Point(0, 0);
    }

    const rect = element.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return new Point(0, 0);
    }

    const x = (clientX - rect.left) * dpi;
    const y = (clientY - rect.top) * dpi;
    const pressure = 'pressure' in event ? event.pressure : 0.5;

    return new Point(x, y, pressure);
  }
}

const checkSignatureValidity = (canvas: HTMLCanvasElement | null): boolean => {
  if (!canvas) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let filledPixels = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) filledPixels++;
  }

  const filledPercentage = filledPixels / totalPixels;
  return filledPercentage > SIGNATURE_MIN_COVERAGE_THRESHOLD;
};

export type SignaturePadDrawProps = {
  className?: string;
  value: string;
  onChange: (signatureDataUrl: string) => void;
};

export const SignaturePadDraw = ({
  className,
  value,
  onChange,
}: SignaturePadDrawProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [lines, setLines] = useState<Point[][]>([]);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.clientWidth * SIGNATURE_CANVAS_DPI;
      canvas.height = canvas.clientHeight * SIGNATURE_CANVAS_DPI;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2 * SIGNATURE_CANVAS_DPI;
        setContext(ctx);
      }

      // Load existing signature
      if (value) {
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = value;
      }
    }
  }, [value]);

  const startDrawing = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    setIsDrawing(true);
    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, canvasRef.current);
    setCurrentLine([point]);
  };

  const draw = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, canvasRef.current);
    const newLine = [...currentLine, point];
    setCurrentLine(newLine);

    // Draw the line
    if (newLine.length > 1) {
      const lastPoint = newLine[newLine.length - 2];
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
  };

  const stopDrawing = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (!isDrawing) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    setIsDrawing(false);
    
    if (currentLine.length > 0) {
      const newLines = [...lines, currentLine];
      setLines(newLines);
      setCurrentLine([]);

      // Check validity and emit change
      if (canvasRef.current) {
        const valid = checkSignatureValidity(canvasRef.current);
        setIsValid(valid);
        
        if (valid) {
          onChange(canvasRef.current.toDataURL());
        }
      }
    }
  };

  const handleClear = () => {
    if (!context || !canvasRef.current) return;
    
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setLines([]);
    setCurrentLine([]);
    setIsValid(null);
    onChange('');
  };

  const handleUndo = () => {
    if (lines.length === 0 || !context || !canvasRef.current) return;

    const newLines = lines.slice(0, -1);
    setLines(newLines);

    // Redraw canvas
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    newLines.forEach(line => {
      if (line.length > 1) {
        context.beginPath();
        context.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) {
          context.lineTo(line[i].x, line[i].y);
        }
        context.stroke();
      }
    });

    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL());
    }
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />

      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs"
        >
          Limpar
        </Button>
      </div>

      {isValid === false && (
        <div className="absolute bottom-4 left-4">
          <span className="text-destructive text-xs">
            Assinatura muito pequena
          </span>
        </div>
      )}

      {isValid && lines.length > 0 && (
        <div className="absolute bottom-4 left-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            title="Desfazer"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
