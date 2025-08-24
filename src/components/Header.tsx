import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Instagram } from "lucide-react";
import { useState, useEffect } from "react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategoriesWithSubcategories();
  }, []);

  const loadCategoriesWithSubcategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) throw subcategoriesError;

      // Agrupar subcategorias por categoria
      const categoriesWithSubs = categoriesData.map(category => ({
        ...category,
        subcategories: subcategoriesData.filter(sub => sub.category_id === category.id)
      }));

      setCategories(categoriesWithSubs);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999', '_blank');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">DK</span>
              </div>
              <span className="font-bold text-lg text-primary">Dra Karoline</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="space-x-6">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                  Procedimentos
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-2">
                    {categories.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <h3 className="font-medium text-sm text-primary border-b border-border pb-1">
                          {category.name}
                        </h3>
                        <div className="space-y-1">
                          {category.subcategories && category.subcategories.length > 0 ? (
                            category.subcategories.map((subcategory) => (
                              <a
                                key={subcategory.id}
                                href={`/categoria/${category.id}/subcategoria/${subcategory.id}`}
                                className="block text-sm text-muted-foreground hover:text-primary transition-colors rounded p-1 hover:bg-accent"
                              >
                                {subcategory.name}
                              </a>
                            ))
                          ) : (
                            <a
                              href={`/categoria/${category.id}`}
                              className="block text-sm text-muted-foreground hover:text-primary transition-colors rounded p-1 hover:bg-accent"
                            >
                              Ver todos os procedimentos
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" onClick={() => window.location.href = '/area-cliente'}>
              Área do Cliente
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWhatsApp}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              WhatsApp
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://instagram.com/drakarolineferreira', '_blank')}
              className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            >
              <Instagram className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4 mt-8">
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary text-lg border-b border-border pb-2">
                    Procedimentos
                  </h3>
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-2 ml-4">
                      <h4 className="font-medium text-sm text-foreground">
                        {category.name}
                      </h4>
                      <div className="space-y-1 ml-4">
                        {category.subcategories && category.subcategories.length > 0 ? (
                          category.subcategories.map((subcategory) => (
                            <a
                              key={subcategory.id}
                              href={`/categoria/${category.id}/subcategoria/${subcategory.id}`}
                              className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                              onClick={() => setIsOpen(false)}
                            >
                              {subcategory.name}
                            </a>
                          ))
                        ) : (
                          <a
                            href={`/categoria/${category.id}`}
                            className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                            onClick={() => setIsOpen(false)}
                          >
                            Ver todos os procedimentos
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-border pt-4 space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left"
                    onClick={() => {
                      window.location.href = '/area-cliente';
                      setIsOpen(false);
                    }}
                  >
                    Área do Cliente
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left text-green-600 hover:text-green-700"
                    onClick={() => {
                      handleWhatsApp();
                      setIsOpen(false);
                    }}
                  >
                    WhatsApp
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left text-pink-600 hover:text-pink-700"
                    onClick={() => {
                      window.open('https://instagram.com/drakarolineferreira', '_blank');
                      setIsOpen(false);
                    }}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;