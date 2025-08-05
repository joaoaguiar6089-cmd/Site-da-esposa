import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Calendar, Users, LogOut, Home } from "lucide-react";
import AdminAuth from "@/components/admin/AdminAuth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AppointmentsList from "@/components/admin/AppointmentsList";
import { useToast } from "@/hooks/use-toast";


const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const authStatus = localStorage.getItem("admin_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado da área administrativa.",
    });
  };

  const goToHome = () => {
    window.location.href = "/";
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuth={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <div className="container mx-auto p-6">
        {/* Header da Admin */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Área Administrativa
            </h1>
            <p className="text-muted-foreground">
              Dra. Karoline Ferreira - Estética e Saúde
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToHome} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Ir para o Site
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Navegação por Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agendamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AppointmentsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;