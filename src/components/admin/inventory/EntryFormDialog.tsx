import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface EntryFormData {
  purchaseDate: string;
  materialName: string;
  unit: string;
  quantity: number;
  totalValue: number;
}

export const EntryFormDialog = ({ open, onOpenChange, onSuccess }: EntryFormProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntryFormData>();

  const onSubmit = async (data: EntryFormData) => {
    try {
      setUploading(true);

      // Check if material already exists
      const { data: existingItem } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("material_name", data.materialName)
        .single();

      let itemId = existingItem?.id;

      // Create material if it doesn't exist
      if (!itemId) {
        const { data: newItem, error: itemError } = await supabase
          .from("inventory_items")
          .insert({
            material_name: data.materialName,
            unit: data.unit,
          })
          .select("id")
          .single();

        if (itemError) throw itemError;
        itemId = newItem.id;
      }

      // Upload invoice if provided
      let invoiceUrl = null;
      if (invoiceFile) {
        const fileExt = invoiceFile.name.split(".").pop();
        const fileName = `${itemId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("client-documents")
          .upload(`invoices/${fileName}`, invoiceFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("client-documents")
          .getPublicUrl(`invoices/${fileName}`);

        invoiceUrl = publicUrl;
      }

      // Create entry transaction
      const unitPrice = data.totalValue / data.quantity;
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: itemId,
          transaction_type: "entrada",
          transaction_date: data.purchaseDate,
          quantity: data.quantity,
          unit_price: unitPrice,
          total_value: data.totalValue,
          invoice_url: invoiceUrl,
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Entrada registrada",
        description: "A entrada foi registrada com sucesso.",
      });

      reset();
      setInvoiceFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a entrada.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entrada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Data de Compra</Label>
            <Input
              id="purchaseDate"
              type="date"
              {...register("purchaseDate", { required: true })}
            />
            {errors.purchaseDate && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialName">Nome do Material</Label>
            <Input
              id="materialName"
              {...register("materialName", { required: true })}
              placeholder="Ex: Ácido Hialurônico"
            />
            {errors.materialName && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <Input
              id="unit"
              {...register("unit", { required: true })}
              placeholder="Ex: ml, caixa, litro"
            />
            {errors.unit && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              {...register("quantity", { required: true, min: 0.01 })}
            />
            {errors.quantity && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalValue">Valor Total (R$)</Label>
            <Input
              id="totalValue"
              type="number"
              step="0.01"
              {...register("totalValue", { required: true, min: 0.01 })}
            />
            {errors.totalValue && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice">Nota Fiscal (Opcional)</Label>
            <div className="flex gap-2">
              <Input
                id="invoice"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
              />
              {invoiceFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoiceFile(null)}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
