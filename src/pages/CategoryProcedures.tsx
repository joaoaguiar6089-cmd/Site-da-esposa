import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProcedureCard from "@/components/ProcedureCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { isUUID, createSlug } from "@/lib/utils";

type Procedure = Database['public']['Tables']['procedures']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'];
};

type Category = Database['public']['Tables']['categories']['Row'];

const CategoryProcedures = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  useEffect(() => {
    if (category) {
      loadProcedures();
    }
  }, [category]);

  // Scroll automático para o procedimento específico (por slug ou UUID)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#procedure-')) {
      const procedureIdentifier = hash.replace('#procedure-', '');
      
      // Aguarda um pouco para garantir que os elementos foram renderizados
      const timer = setTimeout(() => {
        // Tenta encontrar o elemento pelo slug ou UUID
        const element = procedures.find(p => 
          p.id === procedureIdentifier || createSlug(p.name) === procedureIdentifier
        );
        
        if (element) {
          const domElement = document.getElementById(`procedure-${element.id}`);
          if (domElement) {
            domElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            // Adiciona um destaque temporário
            domElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
            setTimeout(() => {
              domElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
            }, 2000);
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [procedures]);

  const loadCategoryData = async () => {
    if (!categoryId) return;
    
    try {
      // Se for UUID, busca diretamente
      if (isUUID(categoryId)) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();

        if (error) throw error;
        setCategory(data);
      } else {
        // Se não for UUID, busca por slug
        const { data: allCategories, error } = await supabase
          .from('categories')
          .select('*');
        
        if (error) throw error;
        
        const foundCategory = allCategories?.find(cat => 
          createSlug(cat.name) === categoryId
        );
        
        if (foundCategory) {
          setCategory(foundCategory);
        } else {
          console.error('Categoria não encontrada');
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      navigate('/');
    }
  };

  const loadProcedures = async () => {
    if (!category) return;
    
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          categories (*)
        `)
        .eq('category_id', category.id);

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
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-20 pt-24">{/* pt-24 para compensar o header fixo */}
          <div className="text-center">Carregando...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="py-20 pt-24 bg-gradient-subtle">{/* pt-24 para compensar o header fixo */}
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link to="/">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </Link>
            
            <h1 className="text-4xl font-bold text-primary mb-4">
              {category?.name || 'Categoria'}
            </h1>
            
            {category?.description && (
              <p className="text-xl text-muted-foreground max-w-2xl">
                {category.description}
              </p>
            )}
          </div>

          {procedures.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {procedures.map((procedure) => (
                <ProcedureCard
                  key={procedure.id}
                  title={procedure.name}
                  description={procedure.description || ''}
                  price={procedure.price ? `A partir de R$ ${procedure.price.toFixed(2)}` : 'Consulte valores'}
                  image={procedure.image_url || '/placeholder.svg'}
                  duration={`${procedure.duration} min`}
                  benefits={procedure.benefits || []}
                  sessions={procedure.sessions}
                  indication={procedure.indication || undefined}
                  procedureId={procedure.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                Nenhum procedimento encontrado nesta categoria.
              </p>
              <Link to="/">
                <Button className="mt-4">
                  Ver Todos os Procedimentos
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CategoryProcedures;