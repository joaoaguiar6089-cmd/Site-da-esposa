import { Button } from "@/components/ui/button";
import { Calendar, Instagram, MessageCircle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import CategorySelect from "./CategorySelect";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const whatsappLink = "https://wa.me/5597984387295";
  const instagramLink = "https://www.instagram.com/dra_karolineferreira?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex flex-col cursor-pointer" onClick={() => window.location.href = "/"}>
            <h1 className="text-xl sm:text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Dra. Karoline Ferreira
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Estética e Saúde Integrativa
            </p>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-3">
            <CategorySelect />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/agendamento"}
              className="flex items-center gap-2"
            >
              <Calendar size={14} />
              Agendar
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              onClick={() => window.open(whatsappLink, "_blank")}
              className="flex items-center gap-2"
            >
              <MessageCircle size={14} />
              WhatsApp
            </Button>
            <Button
              variant="instagram"
              size="sm"
              onClick={() => window.open(instagramLink, "_blank")}
              className="flex items-center gap-2"
            >
              <Instagram size={14} />
              Instagram
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="mt-6 space-y-4">
                  <div className="text-lg font-semibold text-primary mb-6">
                    Menu
                  </div>
                  
                  {/* Procedimentos */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Procedimentos</p>
                    <CategorySelect />
                  </div>
                  
                  {/* Agendar */}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.location.href = "/agendamento";
                      setIsMenuOpen(false);
                    }}
                  >
                    <Calendar size={18} />
                    <span className="text-base">Agendar Consulta</span>
                  </Button>
                  
                  {/* WhatsApp */}
                  <Button
                    variant="whatsapp"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.open(whatsappLink, "_blank");
                      setIsMenuOpen(false);
                    }}
                  >
                    <MessageCircle size={18} />
                    <span className="text-base">WhatsApp</span>
                  </Button>
                  
                  {/* Instagram */}
                  <Button
                    variant="instagram"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.open(instagramLink, "_blank");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Instagram size={18} />
                    <span className="text-base">Instagram</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;