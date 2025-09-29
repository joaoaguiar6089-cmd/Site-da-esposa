import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { createSlug } from "@/lib/utils";

type Category = Database['public']['Tables']['categories']['Row'];

const CategorySelect = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleCategorySelect = (categoryName: string) => {
    navigate(`/categoria/${createSlug(categoryName)}`);
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <List size={16} />
          Procedimentos
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {categories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => handleCategorySelect(category.name)}
            className="cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <span className="text-sm text-muted-foreground">
                  {category.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CategorySelect;