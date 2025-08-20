import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';

const AdminDebug = () => {
  const { user, session, isAdmin, loading } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [allAdmins, setAllAdmins] = useState([]);

  const checkCurrentUserAdmin = async () => {
    if (!user?.id) return;
    
    setDebugLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('Admin check result:', { data, error });
      setAdminData({ data, error });
    } catch (error) {
      console.error('Debug check error:', error);
      setAdminData({ data: null, error });
    } finally {
      setDebugLoading(false);
    }
  };

  const listAllAdmins = async () => {
    setDebugLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*');
      
      console.log('All admins:', { data, error });
      setAllAdmins(data || []);
    } catch (error) {
      console.error('List admins error:', error);
    } finally {
      setDebugLoading(false);
    }
  };

  const createAdminUser = async () => {
    if (!user?.id) return;
    
    setDebugLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .insert([{
          user_id: user.id,
          is_active: true
        }])
        .select()
        .single();
      
      console.log('Create admin result:', { data, error });
      
      if (!error) {
        alert('Usuário admin criado com sucesso!');
        checkCurrentUserAdmin();
      } else {
        alert('Erro ao criar admin: ' + error.message);
      }
    } catch (error) {
      console.error('Create admin error:', error);
      alert('Erro: ' + error.message);
    } finally {
      setDebugLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkCurrentUserAdmin();
      listAllAdmins();
    }
  }, [user?.id]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug - Status de Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Loading:</strong> {loading ? 'Sim' : 'Não'}
            </div>
            <div>
              <strong>Is Admin:</strong> {isAdmin ? 'Sim' : 'Não'}
            </div>
            <div>
              <strong>User ID:</strong> {user?.id || 'Não logado'}
            </div>
            <div>
              <strong>Email:</strong> {user?.email || 'N/A'}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={checkCurrentUserAdmin} 
              disabled={!user?.id || debugLoading}
            >
              Verificar Status Admin
            </Button>
            <Button 
              onClick={listAllAdmins} 
              disabled={debugLoading}
              variant="outline"
            >
              Listar Todos Admins
            </Button>
            <Button 
              onClick={createAdminUser} 
              disabled={!user?.id || debugLoading}
              variant="destructive"
            >
              Criar Admin Para Este Usuário
            </Button>
          </div>
        </CardContent>
      </Card>

      {adminData && (
        <Card>
          <CardHeader>
            <CardTitle>Status Admin do Usuário Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(adminData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {allAdmins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Todos os Usuários Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(allAdmins, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDebug;