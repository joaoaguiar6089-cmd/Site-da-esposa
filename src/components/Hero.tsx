import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import heroImage from "/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png";

const Hero = () => {
  const whatsappLink = "https://wa.me/5597984387295";

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-2xl text-white">
          <div className="flex items-center gap-2 mb-6 animate-fade-in">
            <Sparkles className="text-accent animate-float" size={24} />
            <span className="text-accent font-medium">Estética e Bem-estar</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            Clínica Dra Karoline Ferreira
          </h1>
          
          <h2 className="text-2xl md:text-3xl text-accent mb-6 animate-fade-in">
            Estética e Saúde Integrativa
          </h2>
          
          <p className="text-xl text-gray-200 mb-8 leading-relaxed animate-fade-in">
            Transforme sua beleza com procedimentos estéticos de alta qualidade. 
            Cuidado personalizado e resultados naturais que realçam sua autoestima.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => window.open(whatsappLink, "_blank")}
            >
              Agendar Consulta
            </Button>
            <Button 
              variant="elegant" 
              size="lg"
              onClick={() => {
                document.getElementById('procedimentos')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              Ver Procedimentos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;