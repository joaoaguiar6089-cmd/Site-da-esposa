import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const HeroImageManager = () => {
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [currentImage, setCurrentImage] = useState('/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('procedure-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(filePath);

      setCurrentImage(data.publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const getPreviewDimensions = () => {
    switch (previewMode) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      default:
        return { width: '1200px', height: '800px' };
    }
  };

  const getBgPosition = () => {
    switch (previewMode) {
      case 'mobile':
        return 'center 20%';
      case 'tablet':
        return 'center 20%';
      default:
        return 'right center';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Gerenciar Imagem Hero</h2>
        <p className="text-muted-foreground">
          Faça upload e visualize como a imagem aparece em diferentes dispositivos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Imagem
            </CardTitle>
            <CardDescription>
              Envie uma nova imagem para a seção hero (máximo 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Image className="mr-2 h-4 w-4" />
              {uploading ? 'Enviando...' : 'Selecionar Imagem'}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p>Recomendações:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Resolução mínima: 1920x1080px</li>
                <li>Formato: JPG, PNG ou WebP</li>
                <li>A pessoa deve estar posicionada à direita da imagem</li>
                <li>Fundo adequado para sobreposição de texto</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Preview Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Visualização por Dispositivo
            </CardTitle>
            <CardDescription>
              Veja como a imagem aparece em diferentes tamanhos de tela
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={previewMode === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('tablet')}
              >
                <Tablet className="mr-2 h-4 w-4" />
                Tablet
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile
              </Button>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              Preview {previewMode} ({getPreviewDimensions().width} x {getPreviewDimensions().height})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview da Imagem Hero</CardTitle>
          <CardDescription>
            Visualização em tempo real de como a imagem aparece na seção hero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto border rounded-lg">
            <div 
              className="relative min-h-[400px] flex items-center bg-black/10"
              style={{
                ...getPreviewDimensions(),
                backgroundImage: `url(${currentImage})`,
                backgroundSize: 'cover',
                backgroundPosition: getBgPosition(),
                backgroundRepeat: 'no-repeat',
                margin: '0 auto'
              }}
            >
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
              
              {/* Sample Content */}
              <div className="relative p-6 text-white max-w-2xl">
                <h1 className="text-2xl md:text-4xl font-bold mb-4">
                  Clínica Dra Karoline Ferreira
                </h1>
                <h2 className="text-lg md:text-2xl text-accent mb-4">
                  Estética e Saúde Integrativa
                </h2>
                <p className="text-gray-200 mb-6">
                  Transforme sua beleza com procedimentos estéticos de alta qualidade.
                </p>
                <div className="flex gap-3">
                  <Button variant="hero" size="sm">
                    Agendar Consulta
                  </Button>
                  <Button variant="elegant" size="sm">
                    Ver Procedimentos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroImageManager;