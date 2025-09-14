import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { List } from 'lucide-react';
import { useSpecificationCalculation } from '@/hooks/useSpecificationCalculation';

interface ProcedureSpecificationSelectorProps {
  procedureId: string;
  onSpecificationChange: (selectedSpecifications: any[], totalPrice: number) => void;
}

const ProcedureSpecificationSelector: React.FC<ProcedureSpecificationSelectorProps> = ({
  procedureId,
  onSpecificationChange,
}) => {
  const { 
    specificationResult, 
    loading, 
    toggleSpecification, 
    selectedSpecificationIds 
  } = useSpecificationCalculation(procedureId);

  React.useEffect(() => {
    onSpecificationChange(
      specificationResult.selectedSpecifications,
      specificationResult.totalPrice
    );
  }, [specificationResult.selectedSpecifications, specificationResult.totalPrice, onSpecificationChange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando especificações...</div>
        </CardContent>
      </Card>
    );
  }

  if (specificationResult.specifications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Especificações do Procedimento
        </CardTitle>
        <CardDescription>
          Selecione uma ou mais especificações para este procedimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specificationResult.specifications.map((specification) => (
            <div
              key={specification.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedSpecificationIds.includes(specification.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={`spec-${specification.id}`}
                  checked={selectedSpecificationIds.includes(specification.id)}
                  onCheckedChange={() => toggleSpecification(specification.id)}
                />
                <div className="flex-grow" onClick={() => toggleSpecification(specification.id)}>
                  <div className="flex items-center justify-between">
                    <Label 
                      htmlFor={`spec-${specification.id}`}
                      className="text-base font-medium cursor-pointer"
                    >
                      {specification.name}
                    </Label>
                    <Badge variant="secondary" className="ml-2">
                      R$ {specification.price.toFixed(2)}
                    </Badge>
                  </div>
                  {specification.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {specification.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {specificationResult.selectedSpecifications.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  Total das Especificações:
                </span>
                <Badge variant="default" className="text-base">
                  R$ {specificationResult.totalPrice.toFixed(2)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {specificationResult.selectedSpecifications.length} especificação(ões) selecionada(s)
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcedureSpecificationSelector;