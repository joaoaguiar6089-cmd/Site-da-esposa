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
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <a href="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" 
              alt="Dra Karoline" 
              className="h-10 w-auto"
            />
          </a>
          
          <nav className="hidden md:flex gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Procedimentos</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                      {categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <h3 className="font-medium text-sm text-primary border-b border-border pb-1">
                            <a href={`/categoria/${category.id}`} className="hover:text-primary/80">
                              {category.name}
                            </a>
                          </h3>
                          <div className="space-y-1">
                            {category.subcategories && category.subcategories.length > 0 ? (
                              <>
                                {category.subcategories.map((subcategory) => (
                                  <a
                                    key={subcategory.id}
                                    href={`/subcategoria/${subcategory.id}`}
                                    className="block text-sm text-muted-foreground hover:text-primary transition-colors rounded p-1 hover:bg-accent"
                                  >
                                    {subcategory.name}
                                  </a>
                                ))}
                                <a
                                  href={`/categoria/${category.id}`}
                                  className="block text-sm text-primary hover:text-primary/80 transition-colors rounded p-1 hover:bg-accent font-medium"
                                >
                                  Todos os procedimentos
                                </a>
                              </>
                            ) : (
                              <a
                                href={`/categoria/${category.id}`}
                                className="block text-sm text-muted-foreground hover:text-primary transition-colors rounded p-1 hover:bg-accent"
                              >
                                Ver procedimentos
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
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/area-cliente'}
            >
              Área do Cliente
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWhatsApp}
              className="text-green-600 hover:text-green-700"
            >
              WhatsApp
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://instagram.com/drakarolineferreira', '_blank')}
              className="text-pink-600 hover:text-pink-700"
            >
              <Instagram className="w-4 h-4" />
            </Button>
          </nav>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <a href="/" className="flex items-center">
                <img 
                  src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" 
                  alt="Dra Karoline" 
                  className="h-8 w-auto"
                />
              </a>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-primary text-lg border-b border-border pb-2">
                      Procedimentos
                    </h3>
                    {categories.map((category) => (
                      <div key={category.id} className="space-y-2 ml-4">
                        <h4 className="font-medium text-sm text-foreground">
                          <a href={`/categoria/${category.id}`} onClick={() => setIsOpen(false)}>
                            {category.name}
                          </a>
                        </h4>
                        <div className="space-y-1 ml-4">
                          {category.subcategories && category.subcategories.length > 0 ? (
                            <>
                              {category.subcategories.map((subcategory) => (
                                <a
                                  key={subcategory.id}
                                  href={`/subcategoria/${subcategory.id}`}
                                  className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                                  onClick={() => setIsOpen(false)}
                                >
                                  {subcategory.name}
                                </a>
                              ))}
                              <a
                                href={`/categoria/${category.id}`}
                                className="block text-sm text-primary hover:text-primary/80 transition-colors py-1 font-medium"
                                onClick={() => setIsOpen(false)}
                              >
                                Todos os procedimentos
                              </a>
                            </>
                          ) : (
                            <a
                              href={`/categoria/${category.id}`}
                              className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                              onClick={() => setIsOpen(false)}
                            >
                              Ver procedimentos
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
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;