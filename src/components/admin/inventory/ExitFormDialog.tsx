import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";

interface ExitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledData?: {
    date?: string;
    procedureId?: string;
  };
}

interface ExitFormData {
  materialId: string;
  exitDate: string;
  quantity: number;
  procedureId?: string;
}

export const ExitFormDialog = ({ open, onOpenChange, onSuccess, prefilledData }: ExitFormProps) => {
  const { toast } = useToast();
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState(prefilledData?.procedureId || "");
  const [procedureSearch, setProcedureSearch] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ExitFormData>({
    defaultValues: {
      exitDate: prefilledData?.date || "",
      procedureId: prefilledData?.procedureId || "",
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("material_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: procedures } = useQuery({
    queryKey: ["procedures-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const materialUnit = materials?.find((m) => m.id === selectedMaterial)?.unit;

  const onSubmit = async (data: ExitFormData) => {
    try {
      // Get latest unit price
      const { data: unitPriceData } = await supabase.rpc("get_latest_unit_price", {
        p_item_id: data.materialId,
      });

      const unitPrice = unitPriceData || 0;
      const totalValue = unitPrice * data.quantity;

      const { error } = await supabase.from("inventory_transactions").insert({
        item_id: data.materialId,
        transaction_type: "saida",
        transaction_date: data.exitDate,
        quantity: data.quantity,
        total_value: totalValue,
        procedure_id: data.procedureId || null,
      });

      if (error) throw error;

      toast({
        title: "Saída registrada",
        description: "A saída foi registrada com sucesso.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating exit:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a saída.",
        variant: "destructive",
      });
    }
  };

  const filteredProcedures = procedures?.filter((p) =>
    p.name.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Saída</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="materialId">Material</Label>
            <Select
              value={selectedMaterial}
              onValueChange={(value) => {
                setSelectedMaterial(value);
                setValue("materialId", value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                {materials?.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.material_name} ({material.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.materialId && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="exitDate">Data</Label>
            <Input
              id="exitDate"
              type="date"
              {...register("exitDate", { required: true })}
            />
            {errors.exitDate && (
              <span className="text-sm text-destructive">Campo obrigatório</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantidade{materialUnit && ` (${materialUnit})`}
            </Label>
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
            <Label>Procedimento (Opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {selectedProcedure
                    ? procedures?.find((p) => p.id === selectedProcedure)?.name
                    : "Selecione um procedimento"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar procedimento..."
                    value={procedureSearch}
                    onValueChange={setProcedureSearch}
                  />
                  <CommandEmpty>Nenhum procedimento encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredProcedures?.map((procedure) => (
                      <CommandItem
                        key={procedure.id}
                        value={procedure.id}
                        onSelect={() => {
                          setSelectedProcedure(procedure.id);
                          setValue("procedureId", procedure.id);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedProcedure === procedure.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        {procedure.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
