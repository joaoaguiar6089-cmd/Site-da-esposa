import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Instagram, ChevronDown, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
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

const HeaderModern = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showProcedimentos, setShowProcedimentos] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    loadCategoriesWithSubcategories();
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const navItems = [
    { name: "Procedimentos", href: "#", hasDropdown: true },
    { name: "Sobre", href: "/sobre", hasDropdown: false },
    { name: "Contato", href: "/contato", hasDropdown: false }
  ];

  const handleMobileLinkClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    // Check if the link is a subcategory link
    if (e.currentTarget.href.includes('/subcategoria/')) {
      setIsOpen(false);
    }
  };
  
  const handleMobileCategoryClick = (categoryId: string) => {
    setExpandedMobileCategory(
      expandedMobileCategory === categoryId ? 'procedimentos' : categoryId
    );
  };
  
  const isCategoryExpanded = (categoryId: string) => expandedMobileCategory === categoryId;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-lg' : 'bg-white/80 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" 
                alt="Dra Karoline" 
                className="h-14 w-auto"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center justify-center flex-1 space-x-8">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                {item.hasDropdown ? (
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowProcedimentos(true)}
                    onMouseLeave={() => setShowProcedimentos(false)}
                  >
                    <button className="flex items-center space-x-1 text-gray-700 hover:text-pink-600 font-medium transition-colors duration-200 py-2">
                      <span>{item.name}</span>
                      <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
                    </button>
                    
                    {showProcedimentos && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white rounded-xl shadow-2xl border border-gray-100 py-6 mt-4 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300">
                        <div className="flex">
                          <div className="w-1/2 border-r border-gray-200 pr-6">
                            <h3 className="text-gray-900 font-semibold text-lg mb-4 ml-6">Categorias</h3>
                            {categories.map((category) => (
                              <a
                                key={category.id}
                                href={`/categoria/${category.id}`}
                                className="flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-rose-50 hover:text-pink-600 transition-colors duration-200"
                                onMouseEnter={() => setActiveCategory(category.id)}
                              >
                                <span className="font-medium">{category.name}</span>
                                {category.subcategories && category.subcategories.length > 0 && (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </a>
                            ))}
                          </div>
                          
                          <div className="w-1/2 pl-6">
                            {activeCategory && (
                              <div className="space-y-2">
                                <h3 className="text-gray-900 font-semibold text-lg mb-4">Subcategorias</h3>
                                {categories.find(c => c.id === activeCategory)?.subcategories?.map((subcategory) => (
                                  <a
                                    key={subcategory.id}
                                    href={`/subcategoria/${subcategory.id}`}
                                    className="block px-4 py-2 text-gray-600 hover:bg-rose-50 hover:text-pink-600 rounded-lg transition-colors duration-200"
                                  >
                                    {subcategory.name}
                                  </a>
                                )) || (
                                  <p className="text-gray-500 px-4">Nenhuma subcategoria.</p>
                                )}
                                <div className="border-t border-gray-100 mt-4 pt-4">
                                  <a
                                    href={`/categoria/${activeCategory}`}
                                    className="block px-4 py-2 text-pink-600 font-medium hover:bg-rose-50 transition-colors duration-200"
                                  >
                                    Ver todos os procedimentos
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.href}
                    className="text-gray-700 hover:text-pink-600 font-medium transition-colors duration-200 py-2"
                  >
                    {item.name}
                  </a>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/agendamento'}
              className="rounded-full px-6 py-2 border-2 border-gray-300 text-gray-700 hover:border-pink-600 hover:text-pink-600 font-medium transition-all"
            >
              Agendar
            </Button>
            
            <Button
              onClick={handleWhatsApp}
              className="rounded-full px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
            >
              WhatsApp
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-700 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="left" className="w-full sm:w-80 p-0 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <a href="/" className="flex items-center space-x-3" onClick={() => setIsOpen(false)}>
                  <img src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" alt="Dra Karoline" className="h-12 w-auto" />
                </a>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-6 w-6 text-gray-700" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1 px-6">
                  {navItems.map((item) => (
                    <div key={item.name}>
                      {item.hasDropdown ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setExpandedMobileCategory(
                              expandedMobileCategory === 'procedimentos' ? null : 'procedimentos'
                            )}
                            className="flex items-center justify-between w-full px-3 py-3 text-left text-gray-700 hover:bg-rose-50 hover:text-pink-600 rounded-lg transition-colors duration-200"
                          >
                            <div className="flex items-center space-x-2">
                              <Menu className="w-4 h-4" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${
                              expandedMobileCategory === 'procedimentos' ? 'rotate-180' : ''
                            }`} />
                          </button>
                          
                          {expandedMobileCategory === 'procedimentos' && (
                            <div className="ml-4 space-y-1">
                              {categories.map((category) => (
                                <div key={category.id} className="space-y-1">
                                  <a
                                    href={`/categoria/${category.id}`}
                                    className="flex items-center justify-between w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-pink-600 rounded-lg transition-colors duration-200"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    <span>{category.name}</span>
                                    {category.subcategories && category.subcategories.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleMobileCategoryClick(category.id);
                                        }}
                                        className="text-gray-600 hover:text-pink-600"
                                      >
                                        <ChevronRight className={`w-3 h-3 transform transition-transform duration-200 ${
                                          isCategoryExpanded(category.id) ? 'rotate-90' : ''
                                        }`} />
                                      </button>
                                    )}
                                  </a>
                                  
                                  {isCategoryExpanded(category.id) && category.subcategories && category.subcategories.length > 0 && (
                                    <div className="ml-4 space-y-1">
                                      {category.subcategories.map((subcategory) => (
                                        <a
                                          key={subcategory.id}
                                          href={`/subcategoria/${subcategory.id}`}
                                          onClick={() => setIsOpen(false)}
                                          className="block px-3 py-2 text-sm text-gray-500 hover:bg-rose-50 hover:text-pink-600 rounded-lg transition-colors duration-200"
                                        >
                                          {subcategory.name}
                                        </a>
                                      ))}
                                      <a
                                        href={`/categoria/${category.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="block px-3 py-2 text-sm text-pink-600 font-medium hover:bg-rose-50 rounded-lg transition-colors duration-200"
                                      >
                                        Ver todos os procedimentos
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <a
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-3 text-gray-700 hover:bg-rose-50 hover:text-pink-600 rounded-lg transition-colors duration-200 font-medium"
                        >
                          {item.name}
                        </a>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Mobile Footer Actions */}
              <div className="border-t border-gray-200 p-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-center rounded-full border-2 border-gray-300 text-gray-700 hover:border-pink-600 hover:text-pink-600 font-medium transition-all"
                  onClick={() => {
                    window.location.href = '/agendamento';
                    setIsOpen(false);
                  }}
                >
                  Agendar
                </Button>
                
                <Button
                  className="w-full rounded-full bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
                  onClick={() => {
                    handleWhatsApp();
                    setIsOpen(false);
                  }}
                >
                  WhatsApp
                </Button>
                
                <Button
                  className="w-full rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-colors"
                  onClick={() => {
                    window.open('https://instagram.com/drakarolineferreira', '_blank');
                    setIsOpen(false);
                  }}
                >
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default HeaderModern;