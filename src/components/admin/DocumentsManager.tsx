import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Edit, Download, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PDFEditor from "./PDFEditor";

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

interface DocumentsManagerProps {
  clientId: string;
  clientName: string;
  onDocumentUpdated: () => void;
}

const DocumentsManager = ({ clientId, clientName, onDocumentUpdated }: DocumentsManagerProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  const loadDocuments = async () => {
    try {
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
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [clientId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setFileName(file.name.replace(".pdf", ""));
    } else {
      toast({
        title: "Erro",
        description: "Apenas arquivos PDF são aceitos",
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !fileName) return;

    setLoading(true);
    try {
      const filePath = `${clientId}/${Date.now()}_${selectedFile.name}`;
      
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .upload(filePath, selectedFile);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("client_documents")
        .insert({
          client_id: clientId,
          file_name: fileName,
          original_file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          document_type: "pdf",
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setFileName("");
      setNotes("");
      loadDocuments();
      onDocumentUpdated();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const editDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(document.file_path);

      if (error) throw error;

      setEditingDocument(document);
      setEditDialogOpen(true);
    } catch (error) {
      console.error("Error loading document for edit:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documento para edição",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (document: Document) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso",
      });

      loadDocuments();
      onDocumentUpdated();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir documento",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Documentos do Cliente</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie documentos e termos assinados por {clientName}
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Documents List */}
      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento encontrado</p>
              <p className="text-sm">Clique em "Novo Documento" para adicionar</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <h4 className="font-medium">{doc.file_name}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Arquivo: {doc.original_file_name}</p>
                        <p>Tamanho: {formatFileSize(doc.file_size)}</p>
                        <p>Criado: {new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
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
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editDocument(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDocument(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo PDF</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={loading}
              />
            </div>
            
            {selectedFile && (
              <>
                <div>
                  <Label htmlFor="fileName">Nome do Documento</Label>
                  <Input
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Digite o nome do documento"
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre este documento"
                    disabled={loading}
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={uploadDocument}
                disabled={!selectedFile || !fileName || loading}
              >
                Enviar Documento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit PDF Dialog */}
      {editingDocument && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full lg:max-w-6xl lg:max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Editar: {editingDocument.file_name}</DialogTitle>
              <DialogDescription>
                Adicione anotações, texto e desenhos ao documento PDF.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <PDFEditor
                document={editingDocument}
                clientId={clientId}
                onSave={() => {
                  setEditDialogOpen(false);
                  setEditingDocument(null);
                  loadDocuments();
                  onDocumentUpdated();
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditingDocument(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentsManager;