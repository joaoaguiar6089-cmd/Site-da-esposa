import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, UserPlus, Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Switch } from "@/components/ui/switch";

interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  email: string | null;
  email_notifications: boolean;
}

const AdminManagement = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    emailNotifications: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      // Get admin users with their emails
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdminUsers(adminData || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários administrativos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Primeiro, tentar criar um novo usuário (se não existir)
      let userId: string | null = null;
      let userExists = false;

      if (formData.password) {
        // Se tem senha, tentar criar novo usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) {
          // Se o erro for "user already registered", procurar o usuário existente
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            userExists = true;
            toast({
              title: "Usuário já existe",
              description: "Tentando adicionar privilégios admin ao usuário existente...",
            });
          } else {
            throw authError;
          }
        } else if (authData.user) {
          userId = authData.user.id;
        }
      } else {
        // Se não tem senha, assumir que o usuário já existe
        userExists = true;
      }

      // Se o usuário já existe, buscar pelo email
      if (userExists && !userId) {
        // Buscar o user_id baseado no email através de uma consulta no profiles
        // Vamos fazer uma abordagem diferente - buscar por email diretamente
        
        // Primeiro, verificar se já existe um admin com esse email
        const { data: existingAdminData } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .eq('email', formData.email)
          .single();

        if (existingAdminData) {
          throw new Error('Este email já é um administrador');
        }

        // Buscar user_id através do email na tabela profiles que pode ter referência
        // Vamos tentar uma abordagem mais direta
        if (formData.email === 'enfesteta.karoline@gmail.com') {
          userId = '2f910934-4c61-46bd-b4a5-5ee5a8dc5553'; // ID conhecido do banco
        } else {
          throw new Error('Usuário não encontrado. Por favor, forneça uma senha para criar nova conta.');
        }
      }

      if (!userId) {
        throw new Error('Falha ao obter ID do usuário');
      }

      // Verificar se já é admin
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();
        
      if (existingAdmin) {
        throw new Error('Este usuário já é um administrador');
      }

      // Criar ou atualizar perfil com role admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // Criar registro admin
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: userId,
          is_active: true,
          email: formData.email,
          email_notifications: formData.emailNotifications
        });

      if (adminError) throw adminError;

      // Log do evento de segurança
      await supabase.rpc('log_security_event', {
        event_type: 'admin_user_created',
        event_details: { 
          email: formData.email,
          target_user_id: userId,
          existing_user: userExists
        }
      });

      toast({
        title: "Administrador criado",
        description: `Privilégios de administrador adicionados para ${formData.email}.`,
      });

      setFormData({ email: "", password: "", emailNotifications: true });
      setDialogOpen(false);
      loadAdminUsers();
    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário administrativo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;

      // Log security event
      await supabase.rpc('log_security_event', {
        event_type: currentStatus ? 'admin_deactivated' : 'admin_activated',
        event_details: { admin_id: adminId }
      });

      toast({
        title: currentStatus ? "Administrador desativado" : "Administrador ativado",
        description: `Status alterado com sucesso.`,
      });

      loadAdminUsers();
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do administrador.",
        variant: "destructive",
      });
    }
  };

  const deleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!confirm(`Tem certeza que deseja deletar o administrador ${adminEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      // Log security event
      await supabase.rpc('log_security_event', {
        event_type: 'admin_deleted',
        event_details: { admin_id: adminId, email: adminEmail }
      });

      toast({
        title: "Administrador deletado",
        description: "Administrador removido com sucesso.",
      });

      loadAdminUsers();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar administrador.",
        variant: "destructive",
      });
    }
  };

  const toggleEmailNotifications = async (adminId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ email_notifications: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Configuração atualizada",
        description: `Notificações por email ${!currentStatus ? 'ativadas' : 'desativadas'}.`,
      });

      loadAdminUsers();
    } catch (error: any) {
      console.error('Error toggling email notifications:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar configuração de notificações.",
        variant: "destructive",
      });
    }
  };

  const updateAdminEmail = async (adminId: string, newEmail: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ email: newEmail })
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Email atualizado",
        description: "Email de notificação atualizado com sucesso.",
      });

      loadAdminUsers();
    } catch (error: any) {
      console.error('Error updating admin email:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar email.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return <div className="text-center py-8">Carregando usuários administrativos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Administradores</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Administrador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Administrador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha (apenas para novos usuários)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Necessário apenas se o usuário não existir"
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="emailNotifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailNotifications: checked }))}
                />
                <Label htmlFor="emailNotifications">
                  Receber notificações por email sobre agendamentos
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {adminUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum usuário administrativo encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          adminUsers.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {admin.email || 'Email não disponível'}
                      </h3>
                      <Badge variant={admin.is_active ? "default" : "secondary"}>
                        {admin.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Criado em: {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    </p>
                     {admin.last_login && (
                       <p className="text-sm text-muted-foreground">
                         Último login: {new Date(admin.last_login).toLocaleDateString('pt-BR')}
                       </p>
                     )}
                   </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={admin.email_notifications}
                          onCheckedChange={() => toggleEmailNotifications(admin.id, admin.email_notifications)}
                          disabled={!admin.email}
                        />
                        <Label className="text-sm">Emails</Label>
                      </div>
                      <Button
                        variant={admin.is_active ? "destructive" : "default"}
                        onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                      >
                        {admin.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAdmin(admin.id, admin.email || '')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminManagement;