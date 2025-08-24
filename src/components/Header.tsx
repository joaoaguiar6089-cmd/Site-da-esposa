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
    }, 300); // Aumentado para 300ms
  };

  const handleSubmenuMouseEnter = (categoryId: string) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveCategory(categoryId);
  };

  const handleSubmenuMouseLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 300); // Aumentado para 300ms
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent drop-shadow-lg tracking-wide">
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
                      className="relative group"
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
                          className="absolute left-full top-0 w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-3 ml-1"
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
            
            <SheetContent side="left" className="w-80 p-0 bg-gradient-to-br from-white via-red-50/20 to-red-100/30 backdrop-blur-md border-r border-red-100/50">
              <div className="flex flex-col h-full relative overflow-hidden">
                {/* Elegant background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/20 rounded-full blur-3xl pointer-events-none transform translate-x-16 -translate-y-16"></div>
                
                {/* Mobile Header */}
                <div className="p-6 border-b border-red-100/60 bg-gradient-to-r from-white/80 to-red-50/40 backdrop-blur-sm relative z-10">
                  <a href="/" className="flex flex-col" onClick={() => setIsOpen(false)}>
                    <h1 className="text-xl font-bold text-gray-800 tracking-wide bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent">
                      Dra. Karoline Ferreira
                    </h1>
                    <p className="text-sm text-red-600/80 font-medium tracking-wider">
                      Estética e Saúde Integrativa
                    </p>
                  </a>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 overflow-y-auto py-6 relative z-10">
                  <nav className="space-y-2 px-6">
                    {navItems.map((item) => (
                      <div key={item.name}>
                        {item.hasDropdown ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => setExpandedMobileCategory(
                                expandedMobileCategory === 'procedimentos' ? null : 'procedimentos'
                              )}
                              className="flex items-center justify-between w-full px-5 py-4 text-left bg-gradient-to-r from-white/80 to-red-50/60 text-gray-800 hover:from-red-50 hover:to-red-100/80 hover:text-red-700 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md border border-red-100/40 hover:border-red-200"
                            >
                              <span className="font-semibold text-lg">{item.name}</span>
                              <div className="p-1 rounded-full bg-red-100/50">
                                <ChevronDown className={`w-4 h-4 transform transition-all duration-300 text-red-600 ${
                                  expandedMobileCategory === 'procedimentos' ? 'rotate-180' : ''
                                }`} />
                              </div>
                            </button>
                            
                            {expandedMobileCategory === 'procedimentos' && (
                              <div className="ml-3 space-y-2 animate-in slide-in-from-left duration-300 border-l-3 border-red-200/60 pl-4 bg-gradient-to-r from-white/40 to-transparent rounded-r-xl py-3">
                                {categories.map((category) => (
                                  <div key={category.id} className="space-y-1">
                                    {category.subcategories && category.subcategories.length > 0 ? (
                                      <div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedMobileCategory(
                                              expandedMobileCategory === category.id ? null : category.id
                                            );
                                          }}
                                          className="flex items-center justify-between w-full px-4 py-3 text-left bg-white/70 text-gray-700 hover:bg-red-50/80 hover:text-red-700 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md border border-white/60 hover:border-red-200"
                                        >
                                          <span className="font-medium">{category.name}</span>
                                          <div className="p-1 rounded-full bg-red-50">
                                            <ChevronRight className={`w-3 h-3 transform transition-all duration-300 text-red-500 ${
                                              expandedMobileCategory === category.id ? 'rotate-90' : ''
                                            }`} />
                                          </div>
                                        </button>
                                        
                                        {/* Subcategories */}
                                        {expandedMobileCategory === category.id && (
                                          <div className="ml-3 mt-2 space-y-1 animate-in slide-in-from-left duration-300 border-l-2 border-red-200/60 pl-3 bg-gradient-to-r from-red-50/30 to-transparent rounded-r-lg py-2">
                                            <a
                                              href={`/categoria/${category.id}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIsOpen(false);
                                                window.location.href = `/categoria/${category.id}`;
                                              }}
                                              className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold hover:from-red-700 hover:to-red-600 rounded-lg transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg"
                                            >
                                              <span className="mr-2">📋</span>
                                              Todos os procedimentos
                                            </a>
                                            {category.subcategories.map((subcategory) => (
                                              <a
                                                key={subcategory.id}
                                                href={`/subcategoria/${subcategory.id}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsOpen(false);
                                                  window.location.href = `/subcategoria/${subcategory.id}`;
                                                }}
                                                className="block px-4 py-2 text-sm bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-300 hover:translate-x-1 shadow-sm hover:shadow-md border border-white/80 hover:border-red-200"
                                              >
                                                <span className="mr-2">•</span>
                                                {subcategory.name}
                                              </a>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <a
                                        href={`/categoria/${category.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsOpen(false);
                                          window.location.href = `/categoria/${category.id}`;
                                        }}
                                        className="block px-4 py-3 text-left bg-white/70 text-gray-700 hover:bg-red-50/80 hover:text-red-700 rounded-lg transition-all duration-300 hover:translate-x-1 shadow-sm hover:shadow-md border border-white/60 hover:border-red-200"
                                      >
                                        <span className="font-medium">{category.name}</span>
                                      </a>
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
                            className="block px-5 py-4 bg-gradient-to-r from-white/80 to-red-50/60 text-gray-800 hover:from-red-50 hover:to-red-100/80 hover:text-red-700 rounded-xl transition-all duration-300 font-semibold hover:translate-x-1 shadow-sm hover:shadow-md border border-red-100/40 hover:border-red-200"
                          >
                            {item.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Mobile Footer Actions */}
                <div className="border-t border-red-100/60 bg-gradient-to-r from-white/90 to-red-50/50 backdrop-blur-sm p-6 space-y-4 relative z-10">
                    <Button 
                      variant="outline" 
                      className="w-full justify-center hover:bg-red-50/80 hover:border-red-600 hover:text-red-600 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        window.location.href = '/area-cliente';
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