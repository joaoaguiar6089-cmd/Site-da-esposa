import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockHistoryDialog } from "./StockHistoryDialog";

export const InventoryStock = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "quantity">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const { data: stockItems, isLoading } = useQuery({
    queryKey: ["inventory-stock"],
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase
        .from("inventory_items")
        .select("*")
        .order("material_name");

      if (itemsError) throw itemsError;

      const stockData = await Promise.all(
        items.map(async (item) => {
          const { data: balance } = await supabase.rpc("get_inventory_balance", {
            p_item_id: item.id,
          });
          
          return {
            ...item,
            balance: balance || 0,
          };
        })
      );

      return stockData;
    },
  });

  const filteredAndSortedItems = stockItems
    ?.filter((item) =>
      item.material_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.material_name.localeCompare(b.material_name)
          : b.material_name.localeCompare(a.material_name);
      } else {
        return sortOrder === "asc"
          ? (a.balance || 0) - (b.balance || 0)
          : (b.balance || 0) - (a.balance || 0);
      }
    });

  const toggleSort = (column: "name" | "quantity") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("name")}
                    className="gap-2"
                  >
                    Material
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("quantity")}
                    className="gap-2"
                  >
                    Estoque
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedItems?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Nenhum material encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.material_name}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.balance} {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItem(item.id)}
                      >
                        Ver Histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedItem && (
        <StockHistoryDialog
          itemId={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
        />
      )}
    </div>
  );
};
