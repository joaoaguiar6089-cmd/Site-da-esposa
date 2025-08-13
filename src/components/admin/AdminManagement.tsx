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
  profiles: {
    user_id: string;
    cpf: string | null;
  };
  auth_users: {
    email: string;
  } | null;
}

const AdminManagement = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    cpf: "",
    adminEmail: "",
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
      // Get admin users with email and notification settings
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*, email, email_notifications')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Then get profiles for each admin user
      const usersWithProfiles = await Promise.all(
        (adminData || []).map(async (admin) => {
          try {
            // Get profile data
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, cpf')
              .eq('user_id', admin.user_id)
              .single();

            // For email, use a simple mapping based on known admin CPFs
            let userEmail = 'Email não disponível';
            if (profile?.cpf === '47164591873') {
              userEmail = 'admin@clinica.com ou joaoaguiar6089@gmail.com';
            }

            return {
              ...admin,
              profiles: profile || { user_id: admin.user_id, cpf: null },
              auth_users: { email: userEmail }
            };
          } catch (error) {
            console.error('Error loading admin profile:', error);
            return {
              ...admin,
              profiles: { user_id: admin.user_id, cpf: null },
              auth_users: { email: 'Email não disponível' }
            };
          }
        })
      );

      setAdminUsers(usersWithProfiles);
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
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create profile with admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          cpf: formData.cpf.replace(/\D/g, ''),
          role: 'admin'
        });

      if (profileError) throw profileError;

      // Create admin user record with email settings
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: authData.user.id,
          is_active: true,
          email: formData.adminEmail || formData.email,
          email_notifications: formData.emailNotifications
        });

      if (adminError) throw adminError;

      // Log security event
      await supabase.rpc('log_security_event', {
        event_type: 'admin_user_created',
        event_details: { 
          email: formData.email,
          target_user_id: authData.user.id 
        }
      });

      toast({
        title: "Administrador criado",
        description: "Usuário administrativo criado com sucesso.",
      });

      setFormData({ email: "", password: "", cpf: "", adminEmail: "", emailNotifications: true });
      setDialogOpen(false);
      loadAdminUsers();
    } catch (error: any) {
      console.error('Error creating admin:', error);
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

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const match = numbers.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return numbers;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.replace(/\D/g, '').length <= 11) {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
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
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
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
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email para Notificações (opcional)</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="Se diferente do email de login"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                />
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
                        {admin.auth_users?.email || 'Email não disponível'}
                      </h3>
                      <Badge variant={admin.is_active ? "default" : "secondary"}>
                        {admin.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {admin.profiles?.cpf && (
                      <p className="text-sm text-muted-foreground">
                        CPF: {formatCPF(admin.profiles.cpf)}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Criado em: {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    </p>
                     {admin.last_login && (
                       <p className="text-sm text-muted-foreground">
                         Último login: {new Date(admin.last_login).toLocaleDateString('pt-BR')}
                       </p>
                     )}
                     {admin.email && (
                       <p className="text-sm text-muted-foreground">
                         Email notificações: {admin.email}
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
                        onClick={() => deleteAdmin(admin.id, admin.auth_users?.email || '')}
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