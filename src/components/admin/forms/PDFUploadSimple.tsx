import { useState } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PDFUploadSimpleProps {
  templateId: string;
  currentPdfUrl: string | null;
  onPdfUploaded: (url: string) => void;
}

export default function PDFUploadSimple({ templateId, currentPdfUrl, onPdfUploaded }: PDFUploadSimpleProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload para o Storage
      const fileExt = 'pdf';
      const fileName = `${templateId}-${Date.now()}.${fileExt}`;
      const filePath = `form-templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('form-templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('form-templates')
        .getPublicUrl(filePath);

      // Atualizar template no banco
      const { error: updateError } = await supabase
        .from('form_templates')
        .update({ pdf_template_url: publicUrl })
        .eq('id', templateId);

      if (updateError) throw updateError;

      onPdfUploaded(publicUrl);

      toast({
        title: "Sucesso",
        description: "PDF enviado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o PDF.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    try {
      const { error } = await supabase
        .from('form_templates')
        .update({ pdf_template_url: null })
        .eq('id', templateId);

      if (error) throw error;

      onPdfUploaded('');

      toast({
        title: "Sucesso",
        description: "PDF removido com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover PDF:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {currentPdfUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">PDF Template Carregado</p>
                  <p className="text-sm text-muted-foreground">
                    Arquivo PDF configurado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={currentPdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                </a>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemovePdf}
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>💡 Dica:</strong> Para mapear os campos no PDF, vá até a aba "Campos do Formulário" 
                e configure as coordenadas de cada campo.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Enviar Template PDF</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Faça upload do arquivo PDF que será usado como template
            </p>
            
            <div className="flex items-center justify-center">
              <label htmlFor="pdf-upload">
                <Button disabled={uploading} asChild>
                  <span className="cursor-pointer">
                    {uploading ? 'Enviando...' : 'Selecionar PDF'}
                  </span>
                </Button>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Tamanho máximo: 10MB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
