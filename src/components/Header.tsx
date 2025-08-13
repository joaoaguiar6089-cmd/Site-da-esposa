import { Button } from "@/components/ui/button";
import { Calendar, Instagram, MessageCircle } from "lucide-react";
import CategorySelect from "./CategorySelect";

const Header = () => {
  const whatsappLink = "https://wa.me/5597984387295";
  const instagramLink = "https://www.instagram.com/dra_karolineferreira?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col cursor-pointer" onClick={() => window.location.href = "/"}>
            <h1 className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Dra. Karoline Ferreira
            </h1>
            <p className="text-sm text-muted-foreground">
              Estética e Saúde Integrativa
            </p>
          </div>
          
          <div className="flex gap-3">
            <CategorySelect />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/agendamento"}
              className="flex items-center gap-2"
            >
              <Calendar size={16} />
              Agendar
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              onClick={() => window.open(whatsappLink, "_blank")}
              className="flex items-center gap-2"
            >
              <MessageCircle size={16} />
              WhatsApp
            </Button>
            <Button
              variant="instagram"
              size="sm"
              onClick={() => window.open(instagramLink, "_blank")}
              className="flex items-center gap-2"
            >
              <Instagram size={16} />
              Instagram
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;