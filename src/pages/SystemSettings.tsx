import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimezoneSettings from "@/components/admin/TimezoneSettings";
import { Settings } from "lucide-react";

const SystemSettings = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Configure as preferências e comportamentos do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="timezone" className="w-full">
        <TabsList>
          <TabsTrigger value="timezone">Fuso Horário</TabsTrigger>
          <TabsTrigger value="general" disabled>Geral</TabsTrigger>
          <TabsTrigger value="notifications" disabled>Notificações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timezone" className="mt-6">
          <TimezoneSettings />
        </TabsContent>
        
        <TabsContent value="general">
          <p className="text-muted-foreground">Em breve...</p>
        </TabsContent>
        
        <TabsContent value="notifications">
          <p className="text-muted-foreground">Em breve...</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
