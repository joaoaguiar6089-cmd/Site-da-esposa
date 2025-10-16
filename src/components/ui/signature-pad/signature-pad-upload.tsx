import { useRef, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIGNATURE_CANVAS_DPI = 2;

const loadImage = async (file: File | undefined): Promise<HTMLImageElement> => {
  if (!file) {
    throw new Error('Nenhum arquivo selecionado');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Tipo de arquivo inválido. Selecione uma imagem.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('O tamanho da imagem deve ser menor que 5MB');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = objectUrl;
  });
};

const loadImageOntoCanvas = (
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): ImageData => {
  const scale = Math.min(
    (canvas.width * 0.8) / image.width,
    (canvas.height * 0.8) / image.height
  );
  
  const x = (canvas.width - image.width * scale) / 2;
  const y = (canvas.height - image.height * scale) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageData;
};

export type SignaturePadUploadProps = {
  className?: string;
  value: string;
  onChange: (signatureDataUrl: string) => void;
};

export const SignaturePadUpload = ({
  className,
  value,
  onChange,
}: SignaturePadUploadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const img = await loadImage(event.target.files?.[0]);

      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      imageDataRef.current = loadImageOntoCanvas(img, canvasRef.current, ctx);
      onChange(canvasRef.current.toDataURL());
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasRef.current.clientWidth * SIGNATURE_CANVAS_DPI;
      canvasRef.current.height = canvasRef.current.clientHeight * SIGNATURE_CANVAS_DPI;
    }

    if (canvasRef.current && value) {
      const ctx = canvasRef.current.getContext('2d');
      const { width, height } = canvasRef.current;

      const img = new Image();

      img.onload = () => {
        ctx?.drawImage(
          img,
          0,
          0,
          Math.min(width, img.width),
          Math.min(height, img.height)
        );
        const defaultImageData = ctx?.getImageData(0, 0, width, height) || null;
        imageDataRef.current = defaultImageData;
      };

      img.src = value;
    }
  }, [value]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: 'none' }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {!value && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-auto py-8"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="text-lg font-semibold text-muted-foreground">
              Fazer Upload da Assinatura
            </span>
            <span className="text-sm text-muted-foreground">
              (Máximo 5MB)
            </span>
          </Button>
        </div>
      )}

      {value && (
        <div className="absolute bottom-2 right-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Trocar Imagem
          </Button>
        </div>
      )}
    </div>
  );
};
