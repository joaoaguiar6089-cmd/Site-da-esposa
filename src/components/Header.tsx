import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Instagram, ChevronDown, ChevronRight, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  
  // Refs para controlar o timeout do dropdown
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCategoriesWithSubcategories();
  }, []);

  // Limpar timeouts ao desmontar o componente
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
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

  // Funções para controlar o dropdown com delay
  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setShowProcedimentos(true);
  };

  const handleDropdownMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowProcedimentos(false);
      setActiveCategory(null);
    }, 150); // 150ms de delay antes de fechar
  };

  const handleSubmenuMouseEnter = (categoryId: string) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveCategory(categoryId);
  };

  const handleSubmenuMouseLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 150); // 150ms de delay antes de fechar
  };

  const navItems = [
    { name: "Procedimentos", href: "#", hasDropdown: true }
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Elegante - Canto Esquerdo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex flex-col">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg tracking-wide">
                Dra. Karoline Ferreira
              </h1>
              <p className="text-sm text-white/90 drop-shadow-md font-light tracking-wider">
                Estética e Saúde Integrativa
              </p>
            </a>
          </div>

          {/* Spacer para empurrar navegação para direita */}
          <div className="flex-1"></div>

          {/* Desktop Navigation - Canto Direito */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Menu Procedimentos */}
            <div 
              className="relative"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              <button className="flex items-center space-x-1 text-white hover:text-red-300 font-medium transition-all duration-300 py-2 px-3 backdrop-blur-sm hover:backdrop-blur-md rounded-lg hover:bg-white/10">
                <span className="drop-shadow-md">Procedimentos</span>
                <ChevronDown className="w-4 h-4 drop-shadow-md" />
              </button>
              
              {/* Dropdown Menu */}
              {showProcedimentos && (
                <div 
                  className="absolute top-full right-0 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-4 mt-2"
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  {categories.map((category) => (
                    <div 
                      key={category.id}
                      className="relative"
                      onMouseEnter={() => handleSubmenuMouseEnter(category.id)}
                      onMouseLeave={handleSubmenuMouseLeave}
                    >
                      <a
                        href={`/categoria/${category.id}`}
                        className="flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-red-50/80 hover:text-red-600 transition-all duration-300 group"
                      >
                        <span className="font-medium">{category.name}</span>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        )}
                      </a>
                      
                      {/* Subcategories Submenu */}
                      {activeCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                        <div 
                          className="absolute right-full top-0 w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-3 mr-2"
                          onMouseEnter={() => handleSubmenuMouseEnter(category.id)}
                          onMouseLeave={handleSubmenuMouseLeave}
                        >
                          {category.subcategories.map((subcategory) => (
                            <a
                              key={subcategory.id}
                              href={`/subcategoria/${subcategory.id}`}
                              className="block px-6 py-2 text-gray-600 hover:bg-red-50/80 hover:text-red-600 transition-all duration-300 hover:translate-x-2"
                            >
                              {subcategory.name}
                            </a>
                          ))}
                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <a
                              href={`/categoria/${category.id}`}
                              className="block px-6 py-2 text-red-600 font-medium hover:bg-red-50/80 transition-all duration-300 hover:translate-x-2"
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

            {/* Botões de Ação */}
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/area-cliente'}
              className="text-white hover:text-red-300 font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 hover:border-red-300/50 transition-all duration-300"
            >
              <User className="w-4 h-4 mr-2" />
              Área do Cliente
            </Button>
            
            <Button
              onClick={handleWhatsApp}
              className="bg-green-500/90 hover:bg-green-600 text-white backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-lg"
            >
              WhatsApp
            </Button>
            
            <Button
              onClick={() => window.open('https://instagram.com/drakarolineferreira', '_blank')}
              className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 hover:from-purple-600 hover:to-pink-600 text-white backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-lg"
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
                className="lg:hidden text-white hover:text-red-300 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="left" className="w-80 p-0 bg-white/95 backdrop-blur-md">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="p-6 border-b border-gray-200/50">
                  <a href="/" className="flex flex-col" onClick={() => setIsOpen(false)}>
                    <h1 className="text-lg font-bold text-gray-800 tracking-wide">
                      Dra. Karoline Ferreira
                    </h1>
                    <p className="text-xs text-red-600 font-light tracking-wider">
                      Estética e Saúde Integrativa
                    </p>
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
                              className="flex items-center justify-between w-full px-4 py-3 text-left text-gray-700 hover:bg-red-50/80 hover:text-red-600 rounded-xl transition-all duration-300"
                            >
                              <span className="font-medium">{item.name}</span>
                              <ChevronDown className={`w-4 h-4 transform transition-all duration-300 ${
                                expandedMobileCategory === 'procedimentos' ? 'rotate-180' : ''
                              }`} />
                            </button>
                            
                            {expandedMobileCategory === 'procedimentos' && (
                              <div className="ml-4 space-y-1 animate-in slide-in-from-left duration-300">
                                {categories.map((category) => (
                                  <div key={category.id} className="space-y-1">
                                    <div className="flex items-center">
                                      <a
                                        href={`/categoria/${category.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex-1 px-4 py-2 text-left text-gray-600 hover:bg-gray-50/80 hover:text-red-600 rounded-lg transition-all duration-300"
                                      >
                                        <span>{category.name}</span>
                                      </a>
                                      {category.subcategories && category.subcategories.length > 0 && (
                                        <button
                                          onClick={() => setExpandedMobileCategory(
                                            expandedMobileCategory === category.id ? 'procedimentos' : category.id
                                          )}
                                          className="p-2 text-gray-400 hover:text-red-600 transition-all duration-300"
                                        >
                                          <ChevronRight className={`w-3 h-3 transform transition-all duration-300 ${
                                            expandedMobileCategory === category.id ? 'rotate-90' : ''
                                          }`} />
                                        </button>
                                      )}
                                    </div>
                                    
                                    {expandedMobileCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                                      <div className="ml-4 space-y-1 animate-in slide-in-from-left duration-300">
                                        {category.subcategories.map((subcategory) => (
                                          <a
                                            key={subcategory.id}
                                            href={`/subcategoria/${subcategory.id}`}
                                            onClick={() => setIsOpen(false)}
                                            className="block px-4 py-2 text-sm text-gray-500 hover:bg-red-50/80 hover:text-red-600 rounded-lg transition-all duration-300 hover:translate-x-1"
                                          >
                                            {subcategory.name}
                                          </a>
                                        ))}
                                        <a
                                          href={`/categoria/${category.id}`}
                                          onClick={() => setIsOpen(false)}
                                          className="block px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50/80 rounded-lg transition-all duration-300 hover:translate-x-1"
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
                            className="block px-4 py-3 text-gray-700 hover:bg-red-50/80 hover:text-red-600 rounded-xl transition-all duration-300 font-medium hover:translate-x-1"
                          >
                            {item.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Mobile Footer Actions */}
                <div className="border-t border-gray-200/50 p-6 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center hover:bg-red-50/80 hover:border-red-600 hover:text-red-600 transition-all duration-300"
                    onClick={() => {
                      window.location.href = '/area-cliente';
                      setIsOpen(false);
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Área do Cliente
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white hover:scale-105 transition-all duration-300"
                      onClick={() => {
                        handleWhatsApp();
                        setIsOpen(false);
                      }}
                    >
                      WhatsApp
                    </Button>
                    
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:scale-105 transition-all duration-300"
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