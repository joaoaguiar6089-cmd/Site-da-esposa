import { useEffect, useState } from "react";
import ProcedureCard from "./ProcedureCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { createSlug } from "@/lib/utils";

type Procedure = Database['public']['Tables']['procedures']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'];
};

type Category = Database['public']['Tables']['categories']['Row'];

const FeaturedProcedures = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProcedures();
    loadCategories();
  }, []);

  const loadFeaturedProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          categories (*)
        `)
        .eq('is_featured', true)
        .limit(4);

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error('Erro ao carregar procedimentos em destaque:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  if (loading) {
    return (
      <section id="procedimentos" className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center">Carregando procedimentos...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="procedimentos" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Procedimentos em Destaque
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma ampla gama de tratamentos estéticos com tecnologia de ponta 
            e técnicas avançadas para realçar sua beleza natural.
          </p>
        </div>
        
        {procedures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {procedures.map((procedure) => (
              <ProcedureCard
                key={procedure.id}
                title={procedure.name}
                description={procedure.description || ''}
                price={procedure.price ? `A partir de R$ ${procedure.price.toFixed(2)}` : 'Consulte valores'}
                image={procedure.image_url || '/placeholder.svg'}
                duration={`${procedure.duration} min`}
                benefits={procedure.benefits || []}
              />
            ))}
          </div>
        ) : (
          <div className="text-center mb-12">
            <p className="text-muted-foreground">
              Nenhum procedimento em destaque cadastrado ainda.
            </p>
          </div>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="text-center">
            <h3 className="text-3xl font-bold text-primary mb-8 animate-fade-in">
              Explore por Categoria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {categories.map((category, index) => (
                <Link 
                  key={category.id} 
                  to={`/categoria/${createSlug(category.name)}`}
                  className="group block animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden rounded-xl bg-gradient-hero p-6 text-white shadow-elegant transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative z-10">
                      <h4 className="text-lg font-semibold mb-2 group-hover:text-primary-foreground transition-colors">
                        {category.name}
                      </h4>
                      <p className="text-sm text-primary-foreground/80 group-hover:text-primary-foreground/90 transition-colors">
                        Descubra nossos tratamentos
                      </p>
                      <div className="mt-4 flex items-center text-sm font-medium">
                        <span className="mr-2">Ver procedimentos</span>
                        <svg 
                          className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-xl transition-all duration-300 group-hover:scale-150 group-hover:bg-white/20" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Dúvidas sobre qual procedimento é ideal para você?
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato para uma avaliação personalizada e descubra o tratamento perfeito para suas necessidades.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProcedures;