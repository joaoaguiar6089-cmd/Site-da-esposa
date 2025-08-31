import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
}

export default function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(4);

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const nextPromotion = () => {
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const prevPromotion = () => {
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  if (loading || promotions.length === 0) {
    return null;
  }

  const currentPromotion = promotions[currentIndex];

  return (
    <section className="py-16 bg-gradient-to-br from-background to-secondary/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Promoções Especiais
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Aproveite nossas ofertas exclusivas e cuide da sua beleza com preços especiais
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <Card className="overflow-hidden shadow-2xl bg-card/80 backdrop-blur-sm border-0">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2 gap-0 min-h-[500px]">
                {/* Imagem da Promoção */}
                <div className="relative overflow-hidden">
                  <img
                    src={currentPromotion.image_url}
                    alt={currentPromotion.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>

                {/* Conteúdo da Promoção */}
                <div className="flex flex-col justify-center p-8 lg:p-12 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                      {currentPromotion.title}
                    </h3>
                    <div className="w-16 h-1 bg-primary rounded-full" />
                  </div>

                  <div className="space-y-4">
                    <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                      {currentPromotion.description}
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      size="lg" 
                      className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => window.location.href = '/agendamento'}
                    >
                      Agendar Agora
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controles de Navegação */}
          {promotions.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm border-2 hover:bg-background/90 shadow-lg"
                onClick={prevPromotion}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm border-2 hover:bg-background/90 shadow-lg"
                onClick={nextPromotion}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {/* Indicadores */}
              <div className="flex justify-center mt-8 space-x-3">
                {promotions.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? "bg-primary shadow-lg"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}