import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import { KeyboardIcon, UploadCloud, Pen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SignaturePadDraw } from './signature-pad-draw.tsx';
import { SignaturePadType } from './signature-pad-type.tsx';
import { SignaturePadUpload } from './signature-pad-upload.tsx';

export type DocumentSignatureType = 'DRAW' | 'TYPE' | 'UPLOAD';

export type SignaturePadValue = {
  type: DocumentSignatureType;
  value: string;
};

export type SignaturePadProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value?: SignaturePadValue | null;
  onChange?: (value: SignaturePadValue) => void;
  disabled?: boolean;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
  onValidityChange?: (isValid: boolean) => void;
};

const isBase64Image = (value: string | null | undefined): boolean => {
  return !!value && value.startsWith('data:image/');
};

export const SignaturePad = ({
  value,
  onChange,
  disabled = false,
  typedSignatureEnabled = true,
  uploadSignatureEnabled = true,
  drawSignatureEnabled = true,
  className,
}: SignaturePadProps) => {
  const initialValue = value?.value || '';
  const [imageSignature, setImageSignature] = useState(
    value?.type === 'UPLOAD' ? initialValue : ''
  );
  const [drawSignature, setDrawSignature] = useState(
    value?.type === 'DRAW' ? initialValue : ''
  );
  const [typedSignature, setTypedSignature] = useState(
    value?.type === 'TYPE' ? initialValue : ''
  );

  // Get the first enabled tab that has a signature if possible
  const [tab, setTab] = useState(
    ((): 'draw' | 'text' | 'image' => {
      // First check for existing signatures
      if (drawSignatureEnabled && drawSignature) {
        return 'draw';
      }
      if (typedSignatureEnabled && typedSignature) {
        return 'text';
      }
      if (uploadSignatureEnabled && imageSignature) {
        return 'image';
      }

      // Second pass: just select the first available tab
      if (drawSignatureEnabled) {
        return 'draw';
      }
      if (typedSignatureEnabled) {
        return 'text';
      }
      if (uploadSignatureEnabled) {
        return 'image';
      }

      return 'draw';
    })(),
  );

  const onImageSignatureChange = (value: string) => {
    setImageSignature(value);
    onChange?.({
      type: 'UPLOAD',
      value,
    });
  };

  const onDrawSignatureChange = (value: string) => {
    setDrawSignature(value);
    onChange?.({
      type: 'DRAW',
      value,
    });
  };

  const onTypedSignatureChange = (value: string) => {
    setTypedSignature(value);
    onChange?.({
      type: 'TYPE',
      value,
    });
  };

  const onTabChange = (value: 'draw' | 'text' | 'image') => {
    if (disabled) {
      return;
    }

    setTab(value);

    if (value === 'draw') {
      onDrawSignatureChange(drawSignature);
    } else if (value === 'text') {
      onTypedSignatureChange(typedSignature);
    } else if (value === 'image') {
      onImageSignatureChange(imageSignature);
    }
  };

  if (!drawSignatureEnabled && !typedSignatureEnabled && !uploadSignatureEnabled) {
    return null;
  }

  return (
    <Tabs
      defaultValue={tab}
      className={cn(
        {
          'pointer-events-none': disabled,
        },
        className
      )}
      onValueChange={(value) => onTabChange(value as 'draw' | 'text' | 'image')}
    >
      <TabsList className="grid w-full grid-cols-3">
        {drawSignatureEnabled && (
          <TabsTrigger value="draw">
            <Pen className="mr-2 h-4 w-4" />
            Desenhar
          </TabsTrigger>
        )}

        {typedSignatureEnabled && (
          <TabsTrigger value="text">
            <KeyboardIcon className="mr-2 h-4 w-4" />
            Digitar
          </TabsTrigger>
        )}

        {uploadSignatureEnabled && (
          <TabsTrigger value="image">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent
        value="draw"
        className="relative flex items-center justify-center rounded-md border border-border bg-neutral-50 dark:bg-background text-center"
        style={{ aspectRatio: '2 / 1', minHeight: '200px' }}
      >
        <SignaturePadDraw
          className="h-full w-full"
          onChange={onDrawSignatureChange}
          value={drawSignature}
        />
      </TabsContent>

      <TabsContent
        value="text"
        className="relative flex items-center justify-center rounded-md border border-border bg-neutral-50 dark:bg-background text-center"
        style={{ aspectRatio: '2 / 1', minHeight: '200px' }}
      >
        <SignaturePadType value={typedSignature} onChange={onTypedSignatureChange} />
      </TabsContent>

      <TabsContent
        value="image"
        className={cn(
          'relative rounded-md border border-border bg-neutral-50 dark:bg-background',
          {
            'bg-white': imageSignature,
          }
        )}
        style={{ aspectRatio: '2 / 1', minHeight: '200px' }}
      >
        <SignaturePadUpload value={imageSignature} onChange={onImageSignatureChange} />
      </TabsContent>
    </Tabs>
  );
};
