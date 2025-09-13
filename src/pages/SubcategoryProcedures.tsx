import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProcedureCard from "@/components/ProcedureCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Procedure {
  id: string;
  name: string;
  description: string;
  indication: string;
  image_url: string;
  price: number;
  duration: number;
  sessions: number;
  benefits: string[];
  subcategory_id: string;
  categories: {
    id: string;
    name: string;
  };
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
}

const SubcategoryProcedures = () => {
  const { subcategoryId } = useParams();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      loadSubcategoryData();
      loadProcedures();
    }
  }, [subcategoryId]);

  // Scroll automático para o procedimento específico
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#procedure-')) {
      // Aguarda um pouco para garantir que os elementos foram renderizados
      const timer = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          // Adiciona um destaque temporário
          element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 2000);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [procedures]);

  const loadSubcategoryData = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .single();

      if (error) throw error;
      setSubcategory(data);
    } catch (error) {
      console.error('Erro ao carregar subcategoria:', error);
    }
  };

  const loadProcedures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('subcategory_id', subcategoryId);

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error('Erro ao carregar procedimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">{/* pt-24 para compensar o header fixo */}
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">{/* pt-24 para compensar o header fixo */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </Link>

          {subcategory && (
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-primary">
                {subcategory.name}
              </h1>
              {subcategory.description && (
                <p className="text-lg text-muted-foreground max-w-3xl">
                  {subcategory.description}
                </p>
              )}
            </div>
          )}
        </div>

        {procedures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {procedures.map((procedure) => (
              <ProcedureCard 
                key={procedure.id}
                title={procedure.name}
                description={procedure.description}
                indication={procedure.indication}
                price={procedure.price ? `R$ ${procedure.price}` : "Consultar"}
                image={procedure.image_url || "/placeholder.svg"}
                duration={`${procedure.duration} min`}
                sessions={procedure.sessions}
                benefits={procedure.benefits || []}
                procedureId={procedure.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-muted-foreground mb-4">
              Nenhum procedimento encontrado nesta subcategoria
            </h3>
            <Link to="/">
              <Button>
                Voltar ao Início
              </Button>
            </Link>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default SubcategoryProcedures;