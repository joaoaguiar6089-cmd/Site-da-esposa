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
      // Query procedures - only those with categories
      const { data: proceduresData, error: proceduresError } = await supabaseClient
        .from("procedures")
        .select("*")
        .not("category_id", "is", null)
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
    const procedureSlug = createSlug(procedure.name);
    
    // Navigate with hash to trigger scroll
    window.location.href = `/categoria/${categorySlug}#procedure-${procedureSlug}`;
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
        <input
          type="text"
          placeholder="Buscar procedimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 w-full rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-4 py-2 pl-11 pr-11 text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/20 transition-all hover:bg-white/15 hover:border-white/40"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && filteredProcedures.length > 0 && (
        <div className="absolute top-full mt-3 w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 z-50 max-h-96 overflow-y-auto">
          {filteredProcedures.map((procedure) => (
            <button
              key={procedure.id}
              onClick={() => handleProcedureClick(procedure)}
              className="w-full px-5 py-3 text-left hover:bg-red-50/80 transition-all border-b border-gray-100/50 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl group"
            >
              <div className="font-semibold text-gray-900 text-base group-hover:text-red-600 transition-colors">{procedure.name}</div>
              {procedure.categories && (
                <div className="text-sm text-gray-600 mt-1">
                  {procedure.categories.name}
                </div>
              )}
              {procedure.description && (
                <div className="text-sm text-gray-500 mt-1.5 line-clamp-2">
                  {procedure.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm && filteredProcedures.length === 0 && (
        <div className="absolute top-full mt-3 w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 z-50 px-5 py-4 text-center text-sm text-gray-500">
          Nenhum procedimento encontrado
        </div>
      )}
    </div>
  );
};

export default ProcedureSearch;
