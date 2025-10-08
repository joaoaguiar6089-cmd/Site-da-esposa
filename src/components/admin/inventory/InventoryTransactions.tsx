import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { TransactionsTable } from "./TransactionsTable";
import { TransactionFilters } from "./TransactionFilters";
import { EntryFormDialog } from "./EntryFormDialog";
import { ExitFormDialog } from "./ExitFormDialog";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { StorageHealthCheck } from "./StorageHealthCheck";

export const InventoryTransactions = () => {
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    materialId: "all",
    transactionType: "all",
  });

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["inventory-transactions", filters],
    queryFn: async () => {
      // First, get ALL transactions for balance calculation
      const { data: allTransactions, error: allError } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_items (
            id,
            material_name,
            unit
          ),
          procedures (
            id,
            name
          )
        `)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (allError) throw allError;

      // Then apply filters for display
      let query = supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_items (
            id,
            material_name,
            unit
          ),
          procedures (
            id,
            name
          )
        `)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.startDate) {
        query = query.gte("transaction_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("transaction_date", filters.endDate);
      }
      if (filters.materialId && filters.materialId !== "all") {
        query = query.eq("item_id", filters.materialId);
      }
      if (filters.transactionType && filters.transactionType !== "all") {
        query = query.eq("transaction_type", filters.transactionType);
      }

      const { data: filteredTransactions, error } = await query;
      if (error) throw error;
      
      return {
        allTransactions,
        filteredTransactions
      };
    },
  });

    return (
    <div className="space-y-6">
      <Card className="p-6">
        <StorageHealthCheck />
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowEntryDialog(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4" />
            Nova Entrada
          </Button>
          <Button onClick={() => setShowExitDialog(true)} variant="outline" className="gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
            <Plus className="h-4 w-4" />
            Nova Saída
          </Button>
        </div>
      </div>

      <SuggestionsPanel onRefetch={refetch} />

      <Card className="p-6">
        <TransactionFilters filters={filters} onFiltersChange={setFilters} />
        <TransactionsTable 
          transactions={transactions?.filteredTransactions || []} 
          allTransactions={transactions?.allTransactions || []}
          isLoading={isLoading}
          onRefetch={refetch}
        />
      </Card>

      <EntryFormDialog 
        open={showEntryDialog} 
        onOpenChange={setShowEntryDialog}
        onSuccess={refetch}
      />
      
      <ExitFormDialog 
        open={showExitDialog} 
        onOpenChange={setShowExitDialog}
        onSuccess={refetch}
      />
    </div>
  );
};
