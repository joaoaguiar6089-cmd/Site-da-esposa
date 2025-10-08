import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AttachmentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName?: string;
}

export const AttachmentPreview = ({
  open,
  onOpenChange,
  fileUrl,
  fileName = "Anexo",
}: AttachmentPreviewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState<"pdf" | "image" | "unknown">("unknown");
  const [signedUrl, setSignedUrl] = useState<string>("");

  useEffect(() => {
    if (open && fileUrl) {
      loadFile();
    }
  }, [open, fileUrl]);

  const loadFile = async () => {
    try {
      setLoading(true);
      
      // Check if it's a storage URL or external URL
      if (fileUrl.includes('supabase.co/storage')) {
        // Extract bucket and path from URL
        const urlParts = fileUrl.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const [bucket, ...pathParts] = urlParts[1].split('/');
          const path = pathParts.join('/');
          
          // Get signed URL for better security (optional, but recommended)
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 hour expiry

          if (error) {
            console.error('Error getting signed URL:', error);
            // Fallback to public URL
            setSignedUrl(fileUrl);
          } else if (data?.signedUrl) {
            setSignedUrl(data.signedUrl);
          }
        } else {
          setSignedUrl(fileUrl);
        }
      } else {
        // External URL
        setSignedUrl(fileUrl);
      }

      // Detect file type from URL
      const lowerUrl = fileUrl.toLowerCase();
      if (lowerUrl.endsWith('.pdf')) {
        setFileType('pdf');
      } else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setFileType('image');
      } else {
        // Try to detect from content-type
        try {
          const response = await fetch(fileUrl, { method: 'HEAD' });
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('pdf')) {
            setFileType('pdf');
          } else if (contentType?.includes('image')) {
            setFileType('image');
          }
        } catch (err) {
          console.error('Error detecting file type:', err);
        }
      }
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: "Erro ao carregar anexo",
        description: "Não foi possível carregar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(signedUrl || fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'anexo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(signedUrl || fileUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Visualização de Anexo</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Nova Guia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-muted/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando anexo...</p>
              </div>
            </div>
          ) : fileType === 'pdf' ? (
            <iframe
              src={signedUrl || fileUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : fileType === 'image' ? (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={signedUrl || fileUrl}
                alt="Anexo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Não foi possível visualizar este tipo de arquivo.
                </p>
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar Arquivo
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
