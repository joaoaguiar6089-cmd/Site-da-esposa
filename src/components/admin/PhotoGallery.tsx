import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Eye, Download, Trash2, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProcedureResult {
  id: string;
  appointment_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  procedure_name?: string;
}

interface PhotoGalleryProps {
  results: ProcedureResult[];
  clientId: string;
  onResultUploaded: () => void;
}

const PhotoGallery = ({ results, clientId, onResultUploaded }: PhotoGalleryProps) => {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProcedureResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadProcedures();
  }, []);

  const loadProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error("Erro ao carregar procedimentos:", error);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `client_${clientId}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('procedure-results')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('procedure-results')
        .getPublicUrl(uploadData.path);

      // Criar um "appointment" temporário para fotos - com ou sem procedimento específico
      const appointmentData = {
        client_id: clientId,
        procedure_id: selectedProcedure || null,
        appointment_date: selectedDate || new Date().toISOString().split('T')[0],
        appointment_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        status: selectedProcedure ? 'realizado' : 'foto_avulsa',
        notes: selectedProcedure ? 'Foto do procedimento' : 'Foto sem procedimento específico'
      };

      const { data: tempAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      const { error: insertError } = await supabase
        .from('procedure_results')
        .insert([{
          appointment_id: tempAppointment.id,
          image_url: urlData.publicUrl,
          description: description || "Foto sem especificação"
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Foto carregada com sucesso!",
      });

      setShowUploadDialog(false);
      setSelectedFile(null);
      setDescription("");
      setSelectedProcedure("");
      setSelectedDate("");
      onResultUploaded();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar foto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'foto-cliente.jpg';
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download da imagem.",
        variant: "destructive",
      });
    }
  };

  const deletePhoto = async (resultId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      const { error } = await supabase
        .from('procedure_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Foto excluída",
        description: "A foto foi excluída com sucesso.",
      });

      onResultUploaded();
    } catch (error) {
      console.error('Erro ao excluir foto:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir foto.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoClick = (photo: ProcedureResult) => {
    setSelectedPhoto(photo);
    setShowPhotoDialog(true);
  };

  // Ordenar por data (mais recentes primeiro)
  const sortedResults = [...results].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header com botão de upload */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Galeria de Fotos</h3>
          <p className="text-muted-foreground">
            {results.length} {results.length === 1 ? 'foto' : 'fotos'} no total
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Adicionar Foto
        </Button>
      </div>

      {/* Grid de fotos */}
      {sortedResults.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhuma foto encontrada
          </h3>
          <p className="text-muted-foreground mb-4">
            Adicione fotos dos procedimentos ou fotos avulsas do cliente.
          </p>
          <Button onClick={() => setShowUploadDialog(true)}>
            Adicionar Primeira Foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedResults.map((result) => (
            <Card key={result.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-200">
              <div className="relative">
                <img
                  src={result.image_url}
                  alt="Foto do cliente"
                  className="w-full h-48 object-cover"
                  onClick={() => handlePhotoClick(result)}
                />
                
                {/* Legenda do procedimento */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {result.procedure_name || "sem especificação"}
                  </Badge>
                </div>

                {/* Ações (aparecem no hover) */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePhotoClick(result);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(result.image_url, `foto-${result.id}.jpg`);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(result.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(result.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {result.description && result.description !== "Foto sem especificação" && (
                    <p className="text-sm text-foreground line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para upload de foto */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo-file">Selecionar Foto</Label>
              <Input
                id="photo-file"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            
            <div>
              <Label htmlFor="photo-procedure">Procedimento (opcional)</Label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um procedimento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem procedimento específico</SelectItem>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      {procedure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="photo-date">Data (opcional)</Label>
              <Input
                id="photo-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="Data do procedimento"
              />
            </div>
            
            <div>
              <Label htmlFor="photo-description">Descrição (opcional)</Label>
              <Textarea
                id="photo-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição para a foto..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUploadPhoto} disabled={loading || !selectedFile}>
                {loading ? "Carregando..." : "Salvar Foto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar foto */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Visualizar Foto</DialogTitle>
                {selectedPhoto && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {selectedPhoto.procedure_name || "sem especificação"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(selectedPhoto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPhotoDialog(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedPhoto.image_url}
                  alt="Foto do cliente"
                  className="max-w-full max-h-[70vh] object-contain rounded border"
                />
              </div>
              {selectedPhoto.description && selectedPhoto.description !== "Foto sem especificação" && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Descrição:</h4>
                  <p className="text-sm text-muted-foreground">{selectedPhoto.description}</p>
                </div>
              )}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => downloadImage(selectedPhoto.image_url, `foto-${selectedPhoto.id}.jpg`)}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => deletePhoto(selectedPhoto.id)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGallery;