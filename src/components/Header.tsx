import { Button } from "@/components/ui/button";
import { Calendar, Instagram, MessageCircle } from "lucide-react";
import CategorySelect from "./CategorySelect";

const Header = () => {
  const whatsappLink = "https://wa.me/5597984387295";
  const instagramLink = "https://www.instagram.com/dra_karolineferreira?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col cursor-pointer" onClick={() => window.location.href = "/"}>
            <h1 className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Dra. Karoline Ferreira
            </h1>
            <p className="text-sm text-muted-foreground">
              Estética e Saúde Integrativa
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="order-1 sm:order-1">
              <CategorySelect />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/agendamento"}
                className="flex items-center justify-center gap-2 text-xs sm:text-sm min-w-0"
              >
                <Calendar size={14} />
                <span className="hidden sm:inline">Agendar</span>
                <span className="sm:hidden">Agendar</span>
              </Button>
              <Button
                variant="whatsapp"
                size="sm"
                onClick={() => window.open(whatsappLink, "_blank")}
                className="flex items-center justify-center gap-2 text-xs sm:text-sm min-w-0"
              >
                <MessageCircle size={14} />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">WA</span>
              </Button>
              <Button
                variant="instagram"
                size="sm"
                onClick={() => window.open(instagramLink, "_blank")}
                className="flex items-center justify-center gap-2 text-xs sm:text-sm min-w-0"
              >
                <Instagram size={14} />
                <span className="hidden sm:inline">Instagram</span>
                <span className="sm:hidden">IG</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;