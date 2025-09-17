import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, User, Phone, CreditCard, Calendar, MapPin, Camera, FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCPF, cleanCPF, isValidCPF } from "@/utils/cpfValidator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  celular: string;
  data_nascimento?: string;
  cidade?: string;
  created_at: string;
}

interface ClientHeaderProps {
  client: Client;
  totalProcedures: number;
  completedProcedures: number;
  scheduledProcedures: number;
  totalPhotos: number;
  onClientUpdated: () => void;
}

const ClientHeader = ({ 
  client, 
  totalProcedures, 
  completedProcedures, 
  scheduledProcedures, 
  totalPhotos,
  onClientUpdated 
}: ClientHeaderProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: client.nome,
    sobrenome: client.sobrenome,
    cpf: client.cpf,
    celular: client.celular,
    data_nascimento: client.data_nascimento || "",
    cidade: client.cidade || ""
  });

  const { toast } = useToast();

  const handleEdit = () => {
    setFormData({
      nome: client.nome,
      sobrenome: client.sobrenome,
      cpf: client.cpf,
      celular: client.celular,
      data_nascimento: client.data_nascimento || "",
      cidade: client.cidade || ""
    });
    setShowEditDialog(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.nome.trim() || !formData.sobrenome.trim() || !formData.celular.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios (Nome, Sobrenome e Celular).",
        variant: "destructive",
      });
      return;
    }

    // Validar CPF apenas se foi fornecido
    if (formData.cpf.trim() && !isValidCPF(formData.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido. Deixe em branco se não quiser informar.",
        variant: "destructive",
      });
      return;
    }

    // Validar celular
    const cleanPhone = formData.celular.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Erro",
        description: "Número de celular inválido.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        nome: formData.nome.trim(),
        sobrenome: formData.sobrenome.trim(),
        cpf: formData.cpf.trim() ? cleanCPF(formData.cpf) : client.cpf,
        celular: formData.celular.trim(),
        data_nascimento: formData.data_nascimento.trim() ? formData.data_nascimento : null,
        cidade: formData.cidade.trim() || null,
      };

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso!",
      });

      setShowEditDialog(false);
      onClientUpdated();
    } catch (error: any) {
      console.error("Erro ao atualizar cliente:", error);
      let errorMessage = "Erro ao atualizar cliente.";
      
      if (error.code === '23505') {
        errorMessage = "Este CPF já está cadastrado no sistema.";
      } else if (error.code === '23514') {
        errorMessage = "Dados inválidos. Verifique o CPF e outros campos.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-md bg-gradient-to-r from-background to-background/50">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar e informações principais */}
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {client.nome} {client.sobrenome}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Cliente desde {format(new Date(client.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>

                {/* Informações de contato */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Celular</p>
                      <p className="font-medium">{client.celular}</p>
                    </div>
                  </div>
                  
                  {client.cpf && !client.cpf.startsWith('temp_') && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">CPF</p>
                        <p className="font-medium">{formatCPF(client.cpf)}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.data_nascimento && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nascimento</p>
                        <p className="font-medium">{format(new Date(client.data_nascimento), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.cidade && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cidade</p>
                        <p className="font-medium">{client.cidade}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:w-80">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{totalProcedures}</p>
                <p className="text-sm text-blue-600">Total</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{completedProcedures}</p>
                <p className="text-sm text-green-600">Realizados</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{scheduledProcedures}</p>
                <p className="text-sm text-orange-600">Agendados</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Camera className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{totalPhotos}</p>
                <p className="text-sm text-purple-600">Fotos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Editar Cliente */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-sobrenome">Sobrenome *</Label>
                <Input
                  id="edit-sobrenome"
                  value={formData.sobrenome}
                  onChange={(e) => setFormData({...formData, sobrenome: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-cpf">CPF (opcional)</Label>
              <Input
                id="edit-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="edit-celular">Celular *</Label>
              <Input
                id="edit-celular"
                value={formData.celular}
                onChange={(e) => setFormData({...formData, celular: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-data_nascimento">Data de Nascimento (opcional)</Label>
              <Input
                id="edit-data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-cidade">Cidade (opcional)</Label>
              <Input
                id="edit-cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                placeholder="São Paulo"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientHeader;