import { useState } from "react";
import { Plus, FileText, Clock, CheckCircle, Eye, Trash2 } from "lucide-react";
import { useFormTemplates } from "@/hooks/forms/useFormTemplates";
import { useFormResponses } from "@/hooks/forms/useFormResponses";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function ClientFormsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);

  // Buscar templates publicados
  const { templates: publishedTemplates, isLoading: loadingTemplates } = useFormTemplates({
    includeInactive: false,
  });

  // Buscar responses do cliente
  const { 
    responses, 
    isLoading: loadingResponses,
    deleteResponse,
    isDeleting,
  } = useFormResponses({
    // TODO: Vincular com client_id quando houver relação com auth
  });

  const drafts = responses.filter(r => r.status === 'draft');
  const submitted = responses.filter(r => r.status === 'submitted');
  const reviewed = responses.filter(r => r.status === 'reviewed');

  const handleStartForm = async (templateId: string) => {
    navigate(`/area-cliente/forms/fill/${templateId}`);
  };

  const handleContinueForm = (responseId: string) => {
    navigate(`/area-cliente/forms/fill/${responseId}`);
  };

  const handleViewForm = (responseId: string) => {
    navigate(`/area-cliente/forms/view/${responseId}`);
  };

  const handleDelete = async () => {
    if (!responseToDelete) return;
    await deleteResponse(responseToDelete);
    setResponseToDelete(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Minhas Fichas</h1>
        <p className="text-muted-foreground">
          Preencha os formulários solicitados pela clínica
        </p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">
            Disponíveis ({publishedTemplates.filter(t => t.is_published).length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Rascunhos ({drafts.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Enviadas ({submitted.length + reviewed.length})
          </TabsTrigger>
        </TabsList>

        {/* Fichas Disponíveis */}
        <TabsContent value="available" className="mt-6">
          {loadingTemplates ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando fichas disponíveis...</p>
            </div>
          ) : publishedTemplates.filter(t => t.is_published).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma ficha disponível</h3>
                <p className="text-muted-foreground">
                  No momento não há fichas para preencher
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedTemplates.filter(t => t.is_published).map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="secondary" className="w-fit">
                        {template.category}
                      </Badge>
                    )}
                    {template.description && (
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      onClick={() => handleStartForm(template.id)}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Começar a Preencher
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rascunhos */}
        <TabsContent value="drafts" className="mt-6">
          {loadingResponses ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando rascunhos...</p>
            </div>
          ) : drafts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum rascunho</h3>
                <p className="text-muted-foreground">
                  Você não tem fichas em andamento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map((response) => (
                <Card key={response.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {(response as any).form_templates?.name || 'Ficha'}
                      </CardTitle>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        Rascunho
                      </Badge>
                    </div>
                    <CardDescription>
                      Salvo em {format(new Date(response.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button 
                      onClick={() => handleContinueForm(response.id)}
                      className="flex-1"
                    >
                      Continuar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setResponseToDelete(response.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Enviadas */}
        <TabsContent value="submitted" className="mt-6">
          {loadingResponses ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando fichas enviadas...</p>
            </div>
          ) : [...submitted, ...reviewed].length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma ficha enviada</h3>
                <p className="text-muted-foreground">
                  Você ainda não enviou nenhuma ficha
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...submitted, ...reviewed].map((response) => (
                <Card key={response.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {(response as any).form_templates?.name || 'Ficha'}
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800">
                        {response.status === 'reviewed' ? 'Revisada' : 'Enviada'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Enviada em {format(new Date(response.submitted_at || response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      onClick={() => handleViewForm(response.id)}
                      variant="outline"
                      className="w-full"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Alert: Deletar Rascunho */}
      <AlertDialog open={!!responseToDelete} onOpenChange={() => setResponseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este rascunho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
