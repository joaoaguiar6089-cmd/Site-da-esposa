import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, Settings } from 'lucide-react';
import DiscountConfigManager from './DiscountConfigManager';

interface ProcedureDiscountManagerProps {
  procedureId: string;
  requiresBodySelection: boolean;
  requiresSpecifications?: boolean;
}

const ProcedureDiscountManager: React.FC<ProcedureDiscountManagerProps> = ({
  procedureId,
  requiresBodySelection,
  requiresSpecifications = false,
}) => {
  const [discountManagerOpen, setDiscountManagerOpen] = useState(false);

  if (!requiresBodySelection && !requiresSpecifications) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="w-5 h-5 text-primary" />
            Promoções por {requiresBodySelection ? 'Grupos' : 'Especificações'}
          </CardTitle>
          <CardDescription>
            Configure descontos automáticos baseados na quantidade de {requiresBodySelection ? 'grupos de áreas' : 'especificações'} selecionados pelo cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>📋 <strong>Como funciona:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Configure diferentes faixas de desconto (ex: 2-3 {requiresBodySelection ? 'grupos' : 'especificações'} = 10%, 4+ {requiresBodySelection ? 'grupos' : 'especificações'} = 20%)</li>
                <li>Os descontos são aplicados automaticamente no agendamento</li>
                <li>O sistema escolhe o maior desconto aplicável</li>
                <li>Incentiva clientes a selecionar mais {requiresBodySelection ? 'procedimentos' : 'especificações'}</li>
              </ul>
            </div>
            
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDiscountManagerOpen(true);
              }}
              className="w-full"
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Promoções
            </Button>
          </div>
        </CardContent>
      </Card>

      <DiscountConfigManager
        procedureId={procedureId}
        open={discountManagerOpen}
        onClose={() => setDiscountManagerOpen(false)}
      />
    </>
  );
};

export default ProcedureDiscountManager;