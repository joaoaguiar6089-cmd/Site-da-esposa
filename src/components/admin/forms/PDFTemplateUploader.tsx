// @ts-nocheck
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Settings, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PDFFieldMapper from "./PDFFieldMapper";

interface PDFTemplateUploaderProps {
  templateId: string;
  currentPdfUrl?: string;
  onUploadComplete: () => void;
}

export default function PDFTemplateUploader({ 
  templateId, 
  currentPdfUrl,
  onUploadComplete 
}: PDFTemplateUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMapper, setShowMapper] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    await uploadPDF(file);
  };

  const uploadPDF = async (file: File) => {
    setIsUploading(true);
    try {
      // Upload para storage
      const filePath = `form-templates/${templateId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('form-pdfs')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública (salvamos o path também para gerar URL assinada depois)
      const { data: urlData } = supabase.storage
        .from('form-pdfs')
        .getPublicUrl(filePath);

      // Atualizar template com URL do PDF e path
      // @ts-expect-error - form_templates table not yet in generated types
      const { error: updateError } = await supabase
        .from('form_templates')
        .update({ 
          pdf_template_url: urlData.publicUrl,
          // Salvar também o path para poder gerar signed URL
          pdf_template_path: filePath
        })
        .eq('id', templateId);

      if (updateError) throw updateError;

      toast({
        title: "PDF carregado!",
        description: "Agora você pode configurar os campos no PDF.",
      });

      onUploadComplete();
    } catch (error: any) {
      console.error("Erro ao fazer upload do PDF:", error);
      toast({
        title: "Erro ao carregar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePDF = async () => {
    if (!currentPdfUrl) return;

    try {
      // Extrair caminho do arquivo da URL
      const urlParts = currentPdfUrl.split('/form-pdfs/');
      if (urlParts.length < 2) throw new Error("URL inválida");
      
      const filePath = urlParts[1];

      // Deletar do storage
      const { error: deleteError } = await supabase.storage
        .from('form-pdfs')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Remover URL do template
      // @ts-expect-error - form_templates table not yet in generated types
      const { error: updateError } = await supabase
        .from('form_templates')
        .update({ 
          pdf_template_url: null,
          pdf_mapping: null 
        })
        .eq('id', templateId);

      if (updateError) throw updateError;

      toast({
        title: "PDF removido",
        description: "O template PDF foi removido com sucesso.",
      });

      onUploadComplete();
    } catch (error: any) {
      console.error("Erro ao deletar PDF:", error);
      toast({
        title: "Erro ao remover PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Template PDF (Opcional)
        </Label>

        {currentPdfUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="flex-1">PDF configurado</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMapper(true)}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Campos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeletePDF}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Faça upload de um PDF para mapear os campos e gerar fichas preenchidas
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Dialog do Mapper */}
      <Dialog open={showMapper} onOpenChange={setShowMapper}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Configurar Campos no PDF</DialogTitle>
            <DialogDescription>
              Clique no PDF para posicionar cada campo onde ele deve aparecer no documento final
            </DialogDescription>
          </DialogHeader>
          {currentPdfUrl && (
            <PDFFieldMapper
              templateId={templateId}
              pdfUrl={currentPdfUrl}
              onClose={() => setShowMapper(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
