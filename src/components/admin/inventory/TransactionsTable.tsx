import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Pencil, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  quantity: number;
  unit_price: number | null;
  total_value: number | null;
  invoice_url: string | null;
  inventory_items: {
    id: string;
    material_name: string;
    unit: string;
  } | null;
  procedures: {
    id: string;
    name: string;
  } | null;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  allTransactions?: Transaction[];
  isLoading: boolean;
  onRefetch: () => void;
}

export const TransactionsTable = ({
  transactions,
  allTransactions,
  isLoading,
  onRefetch,
}: TransactionsTableProps) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Calculate running balance for each item (working backwards since transactions are in descending order)
  const transactionsWithBalance = useMemo(() => {
    if (!transactions.length) return [];

    // Use allTransactions for balance calculation if available, otherwise use filtered transactions
    const transactionsForBalance = allTransactions && allTransactions.length > 0 ? allTransactions : transactions;

    // Group transactions by item and calculate balances
    const itemBalances: Record<string, number> = {};
    
    // First, calculate current balance for each item by going through all transactions
    transactionsForBalance.forEach((transaction) => {
      const itemId = transaction.inventory_items?.id || "";
      if (!itemBalances[itemId]) itemBalances[itemId] = 0;
      
      const change = transaction.transaction_type === "entrada" 
        ? transaction.quantity 
        : -transaction.quantity;
      itemBalances[itemId] += change;
    });

    // Now, calculate historical balances for each filtered transaction
    const result = [];
    
    for (const transaction of transactions) {
      const itemId = transaction.inventory_items?.id || "";
      
      // Get all transactions for this item up to and including this transaction's date
      const transactionsUpToDate = transactionsForBalance.filter(t => {
        const isSameItem = t.inventory_items?.id === itemId;
        const isBeforeOrSame = new Date(t.transaction_date) <= new Date(transaction.transaction_date);
        const isSameTransaction = t.id === transaction.id;
        
        // Include if it's the same item AND (before/same date OR same transaction)
        return isSameItem && (isBeforeOrSame || isSameTransaction);
      });
      
      // Calculate balance up to this transaction
      let balanceAtThisPoint = 0;
      transactionsUpToDate.forEach(t => {
        const change = t.transaction_type === "entrada" ? t.quantity : -t.quantity;
        balanceAtThisPoint += change;
      });
      
      result.push({
        ...transaction,
        balance: balanceAtThisPoint,
      });
    }
    
    return result;
  }, [transactions, allTransactions]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("inventory_transactions")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi marcada como excluída com sucesso.",
      });
      onRefetch();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["Data", "Material", "Qtd Entrada", "Qtd Saída", "Saldo", "Valor"];
    const rows = transactionsWithBalance.map((t) => [
      format(new Date(t.transaction_date), "dd/MM/yyyy", { locale: ptBR }),
      t.inventory_items?.material_name || "-",
      t.transaction_type === "entrada" ? t.quantity : "",
      t.transaction_type === "saida" ? t.quantity : "",
      t.balance,
      t.total_value ? `R$ ${t.total_value.toFixed(2)}` : "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estoque-extrato-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando transações...
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-center">Qtd Entrada</TableHead>
              <TableHead className="text-center">Qtd Saída</TableHead>
              <TableHead className="text-center">Saldo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsWithBalance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              transactionsWithBalance.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {transaction.inventory_items?.material_name}
                      </div>
                      {transaction.procedures && (
                        <div className="text-xs text-muted-foreground">
                          Procedimento: {transaction.procedures.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.transaction_type === "entrada" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {transaction.quantity} {transaction.inventory_items?.unit}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.transaction_type === "saida" && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {transaction.quantity} {transaction.inventory_items?.unit}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {transaction.balance} {transaction.inventory_items?.unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.total_value
                      ? `R$ ${transaction.total_value.toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {transaction.invoice_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(transaction.invoice_url!, "_blank")}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? O registro será
              mantido para transparência, mas marcado como excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
