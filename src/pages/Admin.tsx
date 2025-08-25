import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Home } from "lucide-react";
import AdminAuth from "@/components/admin/AdminAuth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminCalendar from "@/components/admin/AdminCalendar";
import AppointmentsList from "@/components/admin/AppointmentsList";
import ClientManagement from "@/components/admin/ClientManagement";
import ProfessionalsList from "@/components/admin/ProfessionalsList";
import CategoriesList from "@/components/admin/CategoriesList";
import ProceduresManagement from "@/components/admin/ProceduresManagement";
import NotificationDebug from "@/components/admin/NotificationDebug";
import AdminManagement from "@/components/admin/AdminManagement";
import SecurityAuditLog from "@/components/admin/SecurityAuditLog";
import HeroImageManager from "@/components/admin/HeroImageManager";
import ScheduleSettings from "@/components/admin/ScheduleSettings";
import NotificationSettings from "@/components/admin/NotificationSettings";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";


const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const { user, isAdmin, signOut, loading } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    try {
      // Log security event
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
      // Force logout even if logging fails
      await signOut();
    }
  };

  const goToHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminAuth onAuth={() => {}} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "calendar":
        return <AdminCalendar />;
      case "appointments":
        return <AppointmentsList />;
      case "clients":
        return <ClientManagement />;
      case "professionals":
        return <ProfessionalsList />;
      case "categories":
        return <CategoriesList />;
      case "procedures":
        return <ProceduresManagement />;
      case "hero-image":
        return <HeroImageManager />;
      case "schedule":
        return <ScheduleSettings />;
    case "notifications":
      return <NotificationSettings />;
    case "notification-debug":
      return <NotificationDebug />;
    case "admins":
        return <AdminManagement />;
      case "security":
        return <SecurityAuditLog />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <div className="flex">
        <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="flex-1">
          {/* Header da Admin */}
          <div className="border-b bg-card p-4 lg:p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Área Administrativa
                </h1>
                <p className="text-muted-foreground text-sm lg:text-base">
                  Dra. Karoline Ferreira - Estética e Saúde
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Ir para o Site</span>
                  <span className="sm:hidden">Site</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 lg:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;