import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { createSlug } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  categories?: {
    name: string;
  };
}

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const ProcedureSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadProcedures();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = procedures.filter(
        (proc) =>
          proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (proc.description && proc.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProcedures(filtered);
      setIsOpen(true);
    } else {
      setFilteredProcedures([]);
      setIsOpen(false);
    }
  }, [searchTerm, procedures]);

  const loadProcedures = async () => {
    try {
      // Query procedures
      const { data: proceduresData, error: proceduresError } = await supabaseClient
        .from("procedures")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (proceduresError) throw proceduresError;
      
      if (!proceduresData) return;
      
      // Query categories
      const categoryIds = [...new Set(proceduresData.map((p: any) => p.category_id))];
      const { data: categoriesData } = await supabaseClient
        .from("categories")
        .select("*")
        .in("id", categoryIds);
      
      const categoriesMap = new Map(
        (categoriesData || []).map((c: any) => [c.id, { name: c.name }])
      );
      
      const proceduresWithCategories: Procedure[] = proceduresData.map((proc: any) => ({
        id: proc.id,
        name: proc.name,
        description: proc.description,
        category_id: proc.category_id,
        categories: categoriesMap.get(proc.category_id)
      }));
      
      setProcedures(proceduresWithCategories);
    } catch (error) {
      console.error("Erro ao carregar procedimentos:", error);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleProcedureClick = (procedure: Procedure) => {
    const categorySlug = createSlug(procedure.categories?.name || "");
    window.location.href = `/categoria/${categorySlug}#procedure-${createSlug(procedure.name)}`;
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar procedimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex h-10 w-full rounded-md border border-primary/20 bg-white/90 backdrop-blur-sm px-3 py-2 pl-9 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && filteredProcedures.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-border z-50 max-h-96 overflow-y-auto">
          {filteredProcedures.map((procedure) => (
            <button
              key={procedure.id}
              onClick={() => handleProcedureClick(procedure)}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium text-foreground">{procedure.name}</div>
              {procedure.categories && (
                <div className="text-sm text-muted-foreground mt-1">
                  {procedure.categories.name}
                </div>
              )}
              {procedure.description && (
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {procedure.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm && filteredProcedures.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-border z-50 px-4 py-3 text-center text-muted-foreground">
          Nenhum procedimento encontrado
        </div>
      )}
    </div>
  );
};

export default ProcedureSearch;
