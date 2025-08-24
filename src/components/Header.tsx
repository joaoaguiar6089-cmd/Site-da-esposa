import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Instagram, ChevronDown, ChevronRight } from "lucide-react";
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

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showProcedimentos, setShowProcedimentos] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

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
    { name: "Procedimentos", href: "#", hasDropdown: true }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo com Nome */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" 
                alt="Dra Karoline" 
                className="h-12 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-800">Dra. Karoline Ferreira</h1>
                <p className="text-sm text-gray-600">Estética e Saúde Integrativa</p>
              </div>
            </a>
          </div>

          {/* Desktop Navigation - Centralizado */}
          <nav className="hidden lg:flex items-center justify-center flex-1">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                {item.hasDropdown ? (
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowProcedimentos(true)}
                    onMouseLeave={() => {
                      setShowProcedimentos(false);
                      setActiveCategory(null);
                    }}
                  >
                    <button className="flex items-center space-x-2 text-gray-700 hover:text-rose-600 font-medium transition-colors duration-200 py-2 px-4">
                      <Menu className="w-4 h-4" />
                      <span>{item.name}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showProcedimentos && (
                      <div className="absolute top-full left-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-4 mt-1">
                        {categories.map((category) => (
                          <div 
                            key={category.id}
                            className="relative"
                            onMouseEnter={() => setActiveCategory(category.id)}
                          >
                            <a
                              href={`/categoria/${category.id}`}
                              className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors duration-200"
                            >
                              <span className="font-medium">{category.name}</span>
                              {category.subcategories && category.subcategories.length > 0 && (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </a>
                            
                            {/* Subcategories Submenu */}
                            {activeCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                              <div className="absolute left-full top-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 ml-1">
                                {category.subcategories.map((subcategory) => (
                                  <a
                                    key={subcategory.id}
                                    href={`/subcategoria/${subcategory.id}`}
                                    className="block px-4 py-2 text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors duration-200"
                                  >
                                    {subcategory.name}
                                  </a>
                                ))}
                                <div className="border-t border-gray-100 mt-2 pt-2">
                                  <a
                                    href={`/categoria/${category.id}`}
                                    className="block px-4 py-2 text-rose-600 font-medium hover:bg-rose-50 transition-colors duration-200"
                                  >
                                    Ver todos os procedimentos
                                  </a>
                                </div>
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
                    className="text-gray-700 hover:text-rose-600 font-medium transition-colors duration-200 py-2 px-4"
                  >
                    {item.name}
                  </a>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/agendamento'}
              className="text-gray-700 hover:text-rose-600 hover:border-rose-600 font-medium"
            >
              Agendar
            </Button>
            
            <Button
              onClick={handleWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2"
            >
              WhatsApp
            </Button>
            
            <Button
              onClick={() => window.open('https://instagram.com/drakarolineferreira', '_blank')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2"
            >
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="left" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="p-6 border-b border-gray-200">
                  <a href="/" className="flex items-center space-x-3" onClick={() => setIsOpen(false)}>
                    <img 
                      src="/lovable-uploads/648c7c53-0d63-4091-b28f-2ded7b542feb.png" 
                      alt="Dra Karoline" 
                      className="h-10 w-auto"
                    />
                    <div>
                      <h1 className="text-lg font-bold text-gray-800">Dra. Karoline Ferreira</h1>
                      <p className="text-xs text-gray-600">Estética e Saúde Integrativa</p>
                    </div>
                  </a>
                </div>

                {/* Mobile Navigation */}
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
                              className="flex items-center justify-between w-full px-3 py-3 text-left text-gray-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors duration-200"
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
                                      className="flex items-center justify-between w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-rose-600 rounded-lg transition-colors duration-200"
                                      onClick={() => setIsOpen(false)}
                                    >
                                      <span>{category.name}</span>
                                      {category.subcategories && category.subcategories.length > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault(); // Impede o link de ser acionado
                                            setExpandedMobileCategory(
                                              expandedMobileCategory === category.id ? 'procedimentos' : category.id
                                            );
                                          }}
                                          className="text-gray-600 hover:text-rose-600"
                                        >
                                          <ChevronRight className={`w-3 h-3 transform transition-transform duration-200 ${
                                            expandedMobileCategory === category.id ? 'rotate-90' : ''
                                          }`} />
                                        </button>
                                      )}
                                    </a>
                                    
                                    {expandedMobileCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                                      <div className="ml-4 space-y-1">
                                        {category.subcategories.map((subcategory) => (
                                          <a
                                            key={subcategory.id}
                                            href={`/subcategoria/${subcategory.id}`}
                                            onClick={() => setIsOpen(false)}
                                            className="block px-3 py-2 text-sm text-gray-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors duration-200"
                                          >
                                            {subcategory.name}
                                          </a>
                                        ))}
                                        <a
                                          href={`/categoria/${category.id}`}
                                          onClick={() => setIsOpen(false)}
                                          className="block px-3 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition-colors duration-200"
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
                            className="block px-3 py-3 text-gray-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors duration-200 font-medium"
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
                    className="w-full justify-center hover:bg-rose-50 hover:border-rose-600 hover:text-rose-600"
                    onClick={() => {
                      window.location.href = '/agendamento';
                      setIsOpen(false);
                    }}
                  >
                    Agendar
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => {
                        handleWhatsApp();
                        setIsOpen(false);
                      }}
                    >
                      WhatsApp
                    </Button>
                    
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      onClick={() => {
                        window.open('https://instagram.com/drakarolineferreira', '_blank');
                        setIsOpen(false);
                      }}
                    >
                      <Instagram className="w-4 h-4 mr-1" />
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