import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Calendar,
  Eye,
  Edit,
  Copy,
  Loader2,
  CheckCircle2,
  Clock,
  FileCheck,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFormResponses } from "@/hooks/forms/useFormResponses";
import { useToast } from "@/hooks/use-toast";
import FormFillerDialog from "./FormFillerDialog";
import { TemplateSelector } from "./TemplateSelector";

interface ClientFormsAreaProps {
  clientId: string;
  clientName: string;
}

export function ClientFormsArea({ clientId, clientName }: ClientFormsAreaProps) {
  const { toast } = useToast();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showFormFiller, setShowFormFiller] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);

  const { responses = [], isLoading, deleteResponse, isDeleting } = useFormResponses({ clientId });

  const handleNewForm = () => {
    setShowTemplateSelector(true);
  };

  const handleTemplateSelected = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setSelectedResponseId(null);
    setEditMode(false);
    setShowTemplateSelector(false);
    setShowFormFiller(true);
  };

  const handleViewResponse = (responseId: string) => {
    setSelectedResponseId(responseId);
    setEditMode(false);
    setShowFormFiller(true);
    // Vai direto para preview
  };

  const handleEditResponse = (responseId: string) => {
    setSelectedResponseId(responseId);
    setEditMode(true);
    setShowFormFiller(true);
  };

  const handleFormClose = () => {
    setShowFormFiller(false);
    setSelectedTemplateId(null);
    setSelectedResponseId(null);
    setEditMode(false);
  };

  const handleDeleteClick = (responseId: string) => {
    setResponseToDelete(responseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!responseToDelete) return;

    try {
      await deleteResponse(responseToDelete);
      toast({
        title: "Ficha deletada",
        description: "A ficha foi removida com sucesso.",
      });
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar ficha:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar a ficha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          label: 'Rascunho', 
          icon: Clock, 
          variant: 'secondary' as const,
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'submitted':
        return { 
          label: 'Enviada', 
          icon: CheckCircle2, 
          variant: 'default' as const,
          color: 'bg-green-100 text-green-800'
        };
      case 'reviewed':
        return { 
          label: 'Revisada', 
          icon: FileCheck, 
          variant: 'default' as const,
          color: 'bg-blue-100 text-blue-800'
        };
      default:
        return { 
          label: status, 
          icon: FileText, 
          variant: 'outline' as const,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Fichas de {clientName}
          </h2>
          <p className="text-muted-foreground">
            Gerencie as fichas personalizadas deste cliente
          </p>
        </div>
        <Button onClick={handleNewForm} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nova Ficha
        </Button>
      </div>

      {/* Lista de Fichas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma ficha encontrada
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece criando uma nova ficha para este cliente
            </p>
            <Button onClick={handleNewForm}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Ficha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {responses.map((response) => {
            const statusInfo = getStatusInfo(response.status);
            const StatusIcon = statusInfo.icon;
            const template = response.form_templates;

            return (
              <Card key={response.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {template?.name || 'Ficha'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template?.description || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    <Badge className={statusInfo.color} variant="secondary">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metadados */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    {response.submitted_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Enviada em {format(new Date(response.submitted_at), "dd/MM/yyyy", { 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewResponse(response.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditResponse(response.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(response.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Seletor de Template */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecione o Tipo de Ficha</DialogTitle>
          </DialogHeader>
          <TemplateSelector
            onSelect={handleTemplateSelected}
            onCancel={() => setShowTemplateSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Formulário */}
      <Dialog open={showFormFiller} onOpenChange={setShowFormFiller}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Editar Ficha' : selectedResponseId ? 'Visualizar Ficha' : 'Nova Ficha'}
            </DialogTitle>
          </DialogHeader>
          <FormFillerDialog
            templateId={selectedTemplateId || undefined}
            clientId={clientId}
            existingResponseId={selectedResponseId || undefined}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ficha será permanentemente deletada do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
