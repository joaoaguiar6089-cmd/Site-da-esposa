import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StockHistoryDialogProps {
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StockHistoryDialog = ({
  itemId,
  open,
  onOpenChange,
}: StockHistoryDialogProps) => {
  const { data: item } = useQuery({
    queryKey: ["inventory-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  const { data: transactions } = useQuery({
    queryKey: ["inventory-history", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(
          `
          *,
          procedures (
            id,
            name
          )
        `
        )
        .eq("item_id", itemId)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Histórico: {item?.material_name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Procedimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!transactions || transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(
                        new Date(transaction.transaction_date),
                        "dd/MM/yyyy",
                        { locale: ptBR }
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.transaction_type === "entrada"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {transaction.transaction_type === "entrada"
                          ? "Entrada"
                          : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.quantity} {item?.unit}
                    </TableCell>
                    <TableCell>
                      {transaction.total_value
                        ? `R$ ${transaction.total_value.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {transaction.procedures?.name || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
