import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Filters {
  startDate: string;
  endDate: string;
  materialId: string;
  transactionType: string;
}

interface TransactionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const TransactionFilters = ({
  filters,
  onFiltersChange,
}: TransactionFiltersProps) => {
  const { data: materials } = useQuery({
    queryKey: ["inventory-items-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, material_name")
        .order("material_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="space-y-2">
        <Label>Data Inicial</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            onFiltersChange({ ...filters, startDate: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Data Final</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            onFiltersChange({ ...filters, endDate: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Material</Label>
        <Select
          value={filters.materialId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, materialId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os materiais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os materiais</SelectItem>
            {materials?.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.material_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={filters.transactionType}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, transactionType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
