import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BarChart3, Calendar, DollarSign, User, UserPlus, Tag, Stethoscope, MessageSquare, Shield, Image, Clock, Badge, MapPin, Package, Table2 } from "lucide-react";
import { useState, useCallback } from "react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTabChange = useCallback((tabId: string) => {
    console.log('AdminSidebar handleTabChange:', tabId);
    onTabChange(tabId);
  }, [onTabChange]);

  const handleMobileClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "calendar", label: "Calendário", icon: Calendar },
    { id: "appointments", label: "Histórico", icon: DollarSign },
    { id: "clients", label: "Clientes", icon: User },
    { id: "professionals", label: "Profissionais", icon: UserPlus },
    { id: "categories", label: "Categorias", icon: Tag },
    { id: "procedures", label: "Procedimentos", icon: Stethoscope },
    { id: "pricing-table", label: "Valores e metas", icon: Table2 },
    { id: "promotions", label: "Feed", icon: Badge },
    { id: "hero-image", label: "Imagem Principal", icon: Image },
    { id: "schedule", label: "Horários", icon: Clock },
    { id: "city-addresses", label: "Endereços das Unidades", icon: MapPin },
    { id: "inventory", label: "Estoque", icon: Package },
    { id: "notifications", label: "Notificações", icon: MessageSquare },
    { id: "admins", label: "Administradores", icon: Shield },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  const timezoneInfo = {
    label: "🌎 Fuso Horário: Brasil (UTC-3)",
    sublabel: "Horário de Brasília"
  };

  const MenuItem = ({ item, isMobile = false }: { item: typeof menuItems[0]; isMobile?: boolean }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    
    return (
      <button
        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
          isActive 
            ? "bg-secondary text-secondary-foreground font-medium" 
            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Direct click handler:', item.id);
          onTabChange(item.id);
          if (isMobile) setIsOpen(false);
        }}
        type="button"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="mb-4">
              <Menu className="h-4 w-4" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="mt-6 space-y-2">
              {menuItems.map((item) => (
                <MenuItem key={item.id} item={item} isMobile />
              ))}
              
              {/* Timezone Info - Mobile */}
              <div className="mt-6 pt-4 border-t">
                <div className="px-3 py-2 rounded-md bg-muted/50">
                  <p className="text-xs font-medium text-foreground">{timezoneInfo.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timezoneInfo.sublabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">Formato: DD/MM/YYYY</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 border-r bg-card">
        <div className="p-4 space-y-2">
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
          
          {/* Timezone Info */}
          <div className="mt-6 pt-4 border-t">
            <div className="px-3 py-2 rounded-md bg-muted/50">
              <p className="text-xs font-medium text-foreground">{timezoneInfo.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{timezoneInfo.sublabel}</p>
              <p className="text-xs text-muted-foreground mt-1">Formato: DD/MM/YYYY</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
