import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import Autoplay from "embla-carousel-autoplay";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  procedure_id?: string;
}

export default function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Guardar quais imagens são "tall" (mais estreitas que 4:5)
  const [isTallMap, setIsTallMap] = useState<Record<string, boolean>>({});

  const pluginRef = useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: true,
    })
  );

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, description, image_url, display_order, procedure_id")
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

  if (loading || promotions.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-background via-secondary/5 to-primary/5 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block">
            <h2 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Promoções Especiais
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mb-6" />
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Aproveite nossas ofertas exclusivas e cuide da sua beleza com preços especiais
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <Carousel
            plugins={[pluginRef.current]}
            className="w-full"
            opts={{ align: "start", loop: true }}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {promotions.map((promotion, index) => {
                const isTallImage = isTallMap[promotion.id] ?? false;

                return (
                  <CarouselItem key={promotion.id} className="pl-2 md:pl-4">
                    <Card
                      className="group overflow-hidden border-0 bg-card/60 backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.02] animate-fade-in"
                      style={{ animationDelay: `${index * 0.2}s` }}
                    >
                      <CardContent className="p-0">
                        <div className="grid lg:grid-cols-2 gap-0">
                          {/* ==== IMAGEM ESTILO INSTAGRAM (4:5) ==== */}
                          <div className="relative order-2 lg:order-1 flex justify-center lg:justify-end">
                            <div
                              className="
                                relative 
                                w-[min(92vw,560px)] md:w-[min(80vw,520px)] 
                                aspect-[4/5] 
                                rounded-2xl overflow-hidden shadow-xl
                                bg-muted/10
                                my-6 md:my-8 lg:my-10
                              "
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary/10 z-10 pointer-events-none" />

                              <img
                                src={promotion.image_url}
                                alt={promotion.title}
                                className={`w-full h-full ${
                                  isTallImage
                                    ? "object-contain bg-white"
                                    : "object-cover"
                                } transition-transform duration-700 group-hover:scale-[1.01] z-0`}
                                loading="lazy"
                                decoding="async"
                                sizes="(max-width: 768px) 92vw, (max-width: 1280px) 520px, 560px"
                                onLoad={(e) => {
                                  const img = e.currentTarget;
                                  if (img.naturalWidth && img.naturalHeight) {
                                    const ratio =
                                      img.naturalWidth / img.naturalHeight;
                                    // se for mais estreita que 0.8 (~4:5), é "alta"
                                    const tall = ratio < 0.8;
                                    setIsTallMap((prev) => ({
                                      ...prev,
                                      [promotion.id]: tall,
                                    }));
                                  }
                                }}
                              />

                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent z-20 pointer-events-none" />

                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] z-30 pointer-events-none" />
                            </div>
                          </div>

                          {/* ==== CONTEÚDO ==== */}
                          <div className="relative flex flex-col justify-center p-6 md:p-10 lg:p-14 space-y-8 order-1 lg:order-2 bg-gradient-to-br from-card via-card/95 to-card/90">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

                            <div className="relative z-10 space-y-6">
                              <div className="space-y-4">
                                <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-semibold tracking-wide uppercase">
                                  Oferta Especial
                                </div>
                                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                                  {promotion.title}
                                </h3>
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
                                  <div className="w-6 h-1 bg-primary/40 rounded-full" />
                                  <div className="w-3 h-1 bg-primary/20 rounded-full" />
                                </div>
                              </div>

                              <div className="space-y-6">
                                <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                                  {promotion.description}
                                </p>
                              </div>

                              <div className="pt-2 md:pt-4">
                                <Button
                                  size="lg"
                                  className="group/btn relative text-base md:text-lg px-7 md:px-10 py-5 md:py-7 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary border-0"
                                  onClick={() => {
                                    const url = promotion.procedure_id
                                      ? `/agendamento?procedimento=${promotion.procedure_id}`
                                      : "/agendamento";
                                    window.location.href = url;
                                  }}
                                >
                                  <span className="relative z-10 font-semibold tracking-wide">
                                    Agendar Agora
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-white/30 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            {promotions.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border-2 border-primary/20 hover:bg-card hover:border-primary/40 shadow-xl h-12 w-12" />
                <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border-2 border-primary/20 hover:bg-card hover:border-primary/40 shadow-xl h-12 w-12" />
              </>
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
