import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  file_name: string;
  original_file_name: string;
  file_path: string;
  file_size: number;
  document_type: string;
  created_at: string;
  notes?: string;
}

interface ClientDocumentsProps {
  clientId?: string;
}

const ClientDocuments = ({ clientId }: ClientDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDocuments = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [clientId]);

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.file_name}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento",
        variant: "destructive",
      });
    }
  };

  const viewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Erro",
        description: "Erro ao visualizar documento",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Carregando documentos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Seus Documentos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Visualize e baixe os documentos e termos que você assinou
        </p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum documento encontrado</p>
            <p className="text-sm">Você ainda não possui documentos assinados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <h4 className="font-medium">{doc.file_name}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Tamanho: {formatFileSize(doc.file_size)}</p>
                        <p>Assinado em: {new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
                        {doc.notes && <p>Observações: {doc.notes}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewDocument(doc)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;