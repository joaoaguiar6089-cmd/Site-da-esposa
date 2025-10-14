import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils"; // opcional: se você tiver este helper do shadcn

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

  // cover/contain dinâmico (opção 3)
  const [isTallMap, setIsTallMap] = useState<Record<string, boolean>>({});

  // embla/shadcn api para bullets e controle
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // autoplay com referência para pausar/continuar
  const autoplayRef = useRef(
    Autoplay({
      delay: 4500,
      stopOnInteraction: true,
      stopOnMouseEnter: true, // já pausa no hover
    })
  );

  // ==== FETCH ====
  const fetchPromotions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, description, image_url, display_order, procedure_id")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // ==== EMBLA bindings (bullets e estado) ====
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    setCount(api.scrollSnapList().length);
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Pausar autoplay quando a aba não está visível
  useEffect(() => {
    const onVisibility = () => {
      const plugin = autoplayRef.current;
      if (!plugin) return;
      if (document.hidden) plugin.stop();
      else plugin.play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Pausar autoplay quando o componente sair do viewport (IntersectionObserver)
  const containerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const plugin = autoplayRef.current;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!plugin) return;
        if (entry.isIntersecting) plugin.play();
        else plugin.stop();
      },
      { rootMargin: "0px", threshold: 0.2 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (loading || promotions.length === 0) return null;

  return (
    <section
      ref={(n) => (containerRef.current = n)}
      aria-label="Novidades e promoções"
      className="py-20 bg-gradient-to-br from-background via-secondary/5 to-primary/5 overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 md:mb-16">
          <div className="inline-block">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Feed da clínica
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mb-5" />
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Principais novidades e promoções da clínica, especialmente para vocês.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <Carousel
            setApi={setApi}
            plugins={[autoplayRef.current]}
            className="w-full"
            opts={{
              align: "start",
              loop: true,
              duration: 24, // animação mais suave (ms por “distância”)
            }}
            // pausa extra no hover (além do plugin)
            onMouseEnter={() => autoplayRef.current.stop()}
            onMouseLeave={() => autoplayRef.current.play()}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {promotions.map((promotion, index) => {
                const isTallImage = isTallMap[promotion.id] ?? false;

                return (
                  <CarouselItem
                    key={promotion.id}
                    className="pl-2 md:pl-4 will-change-transform"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} de ${promotions.length}`}
                  >
                    <Card
                      className="group overflow-hidden border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-shadow duration-500"
                      style={{ transform: "translateZ(0)" }}
                    >
                      <CardContent className="p-0">
                        {/* Layout: mobile empilha; desktop em 2 colunas */}
                        <div className="grid lg:grid-cols-2 gap-0">
                          {/* ==== IMAGEM: Instagram 4:5 com ajuste dinâmico ==== */}
                          <div className="relative order-2 lg:order-1 flex justify-center lg:justify-end">
                            <div
                              className="
                                relative 
                                w-[min(92vw,560px)] md:w-[min(80vw,520px)] 
                                aspect-[4/5] 
                                rounded-2xl overflow-hidden shadow-lg
                                bg-muted/10
                                my-6 md:my-8 lg:my-10
                              "
                            >
                              {/* overlay suave + brilho */}
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-primary/8 z-10 pointer-events-none" />
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] z-30 pointer-events-none" />

                              <img
                                src={promotion.image_url}
                                alt={promotion.title}
                                className={cn(
                                  "w-full h-full transition-transform duration-700 group-hover:scale-[1.015] will-change-transform",
                                  isTallImage ? "object-contain bg-white" : "object-cover"
                                )}
                                loading="lazy"
                                decoding="async"
                                sizes="(max-width: 768px) 92vw, (max-width: 1280px) 520px, 560px"
                                onLoad={(e) => {
                                  const img = e.currentTarget;
                                  if (img.naturalWidth && img.naturalHeight) {
                                    const ratio = img.naturalWidth / img.naturalHeight;
                                    const tall = ratio < 0.8; // mais estreita que 4:5
                                    setIsTallMap((prev) => {
                                      if (prev[promotion.id] === tall) return prev;
                                      return { ...prev, [promotion.id]: tall };
                                    });
                                  }
                                }}
                              />

                              {/* vinheta leve no rodapé, ajuda se a arte tem texto */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-20 pointer-events-none" />
                            </div>
                          </div>

                          {/* ==== CONTEÚDO ==== */}
                          <div className="relative flex flex-col justify-center p-6 md:p-10 lg:p-14 gap-6 order-1 lg:order-2 bg-gradient-to-br from-card via-card/95 to-card/90">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

                            <div className="relative z-10 space-y-5 md:space-y-6">
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

                              <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                                {promotion.description}
                              </p>

                              <div className="pt-1 md:pt-2">
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

            {/* Controles laterais */}
            {promotions.length > 1 && (
              <>
                <CarouselPrevious
                  aria-label="Anterior"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border border-primary/20 hover:bg-card hover:border-primary/40 shadow-lg h-11 w-11"
                />
                <CarouselNext
                  aria-label="Próximo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border border-primary/20 hover:bg-card hover:border-primary/40 shadow-lg h-11 w-11"
                />
              </>
            )}
          </Carousel>

          {/* Bullets / indicadores com progresso */}
          {count > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: count }).map((_, i) => {
                const active = i === current;
                return (
                  <button
                    key={i}
                    aria-label={`Ir para slide ${i + 1}`}
                    onClick={() => api?.scrollTo(i)}
                    className={cn(
                      "relative h-2 rounded-full transition-all duration-500",
                      active ? "w-8 bg-primary/90" : "w-3 bg-primary/30 hover:bg-primary/50"
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full bg-primary/90 origin-left animate-[grow_4.5s_linear_forwards]"
                        style={{ animationPlayState: "running" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* keyframes locais para a barrinha de progresso do bullet ativo */}
      <style>{`
        @keyframes grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}
