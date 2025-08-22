import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BarChart3, Calendar, Users, UserPlus, Tag, Stethoscope, MessageSquare, Shield, Image, Clock } from "lucide-react";
import { useState } from "react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "appointments", label: "Agendamentos", icon: Calendar },
    { id: "professionals", label: "Profissionais", icon: UserPlus },
    { id: "categories", label: "Categorias", icon: Tag },
    { id: "procedures", label: "Procedimentos", icon: Stethoscope },
    { id: "hero-image", label: "Imagem Hero", icon: Image },
    { id: "schedule", label: "Horários", icon: Clock },
    { id: "notifications", label: "Notificações", icon: MessageSquare },
    { id: "admins", label: "Administradores", icon: Shield },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  const MenuItem = ({ item, isMobile = false }: { item: typeof menuItems[0]; isMobile?: boolean }) => {
    const Icon = item.icon;
    
    const handleClick = () => {
      console.log('MenuItem handleClick called for:', item.id);
      onTabChange(item.id);
      if (isMobile) setIsOpen(false);
    };
    
    const handleMouseDown = () => {
      console.log('MenuItem mousedown for:', item.id);
    };
    
    return (
      <div
        className={`w-full p-2 rounded-md cursor-pointer hover:bg-accent flex items-center gap-2 transition-colors ${
          activeTab === item.id ? "bg-accent text-accent-foreground" : ""
        }`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        role="button"
        tabIndex={0}
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </div>
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
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;