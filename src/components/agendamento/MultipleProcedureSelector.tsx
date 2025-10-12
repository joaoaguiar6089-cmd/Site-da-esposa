import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface SelectedProcedureItem {
  id: string;
  procedure: Procedure;
}

interface MultipleProcedureSelectorProps {
  procedures: Procedure[];
  selectedProcedures: SelectedProcedureItem[];
  onProceduresChange: (procedures: SelectedProcedureItem[]) => void;
  disabled?: boolean;
}

const MultipleProcedureSelector = ({
  procedures,
  selectedProcedures,
  onProceduresChange,
  disabled = false
}: MultipleProcedureSelectorProps) => {
  const [openProcedureIndex, setOpenProcedureIndex] = useState<number | null>(null);

  const addProcedure = () => {
    const newProcedure: SelectedProcedureItem = {
      id: `temp-${Date.now()}`,
      procedure: {} as Procedure
    };
    onProceduresChange([...selectedProcedures, newProcedure]);
  };

  const removeProcedure = (index: number) => {
    const newProcedures = selectedProcedures.filter((_, i) => i !== index);
    onProceduresChange(newProcedures);
  };

  const updateProcedure = (index: number, procedure: Procedure) => {
    const newProcedures = [...selectedProcedures];
    newProcedures[index] = {
      ...newProcedures[index],
      procedure
    };
    onProceduresChange(newProcedures);
    setOpenProcedureIndex(null);
  };

  const getTotalDuration = () => {
    return selectedProcedures.reduce((total, item) => {
      return total + (item.procedure?.duration || 0);
    }, 0);
  };

  const getTotalPrice = () => {
    return selectedProcedures.reduce((total, item) => {
      return total + (item.procedure?.price || 0);
    }, 0);
  };

  const getAvailableProcedures = (currentIndex: number) => {
    const selectedIds = selectedProcedures
      .map((p, i) => i !== currentIndex ? p.procedure?.id : null)
      .filter(Boolean);
    return procedures.filter(p => !selectedIds.includes(p.id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {selectedProcedures.map((selectedItem, index) => (
          <div key={selectedItem.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Popover
                open={openProcedureIndex === index}
                onOpenChange={(open) => setOpenProcedureIndex(open ? index : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    aria-expanded={openProcedureIndex === index}
                    className="w-full justify-between"
                  >
                    {selectedItem.procedure?.name || `Selecione o procedimento ${index + 1}`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar procedimento..." />
                    <CommandList>
                      <CommandEmpty>Nenhum procedimento encontrado.</CommandEmpty>
                      <CommandGroup>
                        {getAvailableProcedures(index).map((procedure) => (
                          <CommandItem
                            key={procedure.id}
                            value={procedure.name}
                            onSelect={() => updateProcedure(index, procedure)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedItem.procedure?.id === procedure.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{procedure.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {procedure.duration} min • R$ {(procedure.price || 0).toFixed(2)}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedItem.procedure?.name && (
                <div className="text-xs text-muted-foreground mt-1 ml-1">
                  Duração: {selectedItem.procedure.duration} min • Valor: R$ {(selectedItem.procedure.price || 0).toFixed(2)}
                </div>
              )}
            </div>
            {index > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => removeProcedure(index)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || selectedProcedures.some(p => !p.procedure?.id)}
        onClick={addProcedure}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar mais um procedimento
      </Button>

      {selectedProcedures.length > 1 && (
        <div className="bg-muted/50 p-3 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duração Total:</span>
            <span className="font-semibold">{getTotalDuration()} minutos</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-semibold">R$ {getTotalPrice().toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleProcedureSelector;
export type { SelectedProcedureItem };
