import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FormTemplateEditor from "@/components/admin/forms/FormTemplateEditor";
import AdminAuth from "@/components/admin/AdminAuth";

const AdminFormEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, isAdmin, signOut, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.rpc('log_security_event', {
        event_type: 'admin_logout'
      });
      
      await signOut();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da área administrativa.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      await signOut();
    }
  };

  const goToHome = () => {
    window.location.href = "/";
  };

  const goBackToForms = () => {
    navigate("/admin/forms");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminAuth onAuth={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBackToForms}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar às Fichas
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Editor de Ficha</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToHome}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Início
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)]">
        <FormTemplateEditor />
      </main>
    </div>
  );
};

export default AdminFormEditor;
