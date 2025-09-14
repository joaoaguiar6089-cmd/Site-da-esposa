import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpecificationCalculation, ProcedureSpecification } from "@/hooks/useSpecificationCalculation";

interface ProcedureSpecificationSelectorProps {
  procedureId: string;
  onSelectionChange: (selectedSpecs: ProcedureSpecification[], totalPrice: number) => void;
  initialSelections?: string[];
}

const ProcedureSpecificationSelector = ({ 
  procedureId, 
  onSelectionChange, 
  initialSelections = [] 
}: ProcedureSpecificationSelectorProps) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const {
    selectedSpecifications,
    totalPrice,
    selectSpecification,
    getSelectedSpecifications
  } = useSpecificationCalculation({
    specifications,
    initialSelections
  });

  useEffect(() => {
    loadSpecifications();
  }, [procedureId]);

  useEffect(() => {
    // Notify parent component of selection changes
    const selected = getSelectedSpecifications();
    onSelectionChange(selected, totalPrice);
  }, [selectedSpecifications, totalPrice, onSelectionChange, getSelectedSpecifications]);

  const loadSpecifications = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_specifications')
        .select('*')
        .eq('procedure_id', procedureId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar especificações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar especificações do procedimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSpecificationChange = (specId: string, checked: boolean) => {
    selectSpecification(specId, checked);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando especificações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (specifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhuma especificação disponível para este procedimento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Especificações Disponíveis</span>
          {totalPrice > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Total: R$ {totalPrice.toFixed(2).replace('.', ',')}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Selecione as especificações desejadas para este procedimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedSpecifications.map((spec, index) => (
          <div key={spec.id}>
            <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <Checkbox
                id={`spec-${spec.id}`}
                checked={spec.selected}
                onCheckedChange={(checked) => 
                  handleSpecificationChange(spec.id, checked as boolean)
                }
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor={`spec-${spec.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {spec.name}
                  </label>
                  {spec.price > 0 && (
                    <Badge variant="outline">
                      R$ {spec.price.toFixed(2).replace('.', ',')}
                    </Badge>
                  )}
                </div>
                {spec.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {spec.description}
                  </p>
                )}
              </div>
            </div>
            {index < selectedSpecifications.length - 1 && <Separator className="my-2" />}
          </div>
        ))}

        {getSelectedSpecifications().length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Selecionadas:</h4>
            <div className="space-y-1">
              {getSelectedSpecifications().map((spec) => (
                <div key={spec.id} className="flex justify-between text-sm">
                  <span>{spec.name}</span>
                  <span>
                    {spec.price > 0 
                      ? `R$ ${spec.price.toFixed(2).replace('.', ',')}` 
                      : 'Gratuito'
                    }
                  </span>
                </div>
              ))}
              {totalPrice > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total das Especificações:</span>
                    <span>R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcedureSpecificationSelector;