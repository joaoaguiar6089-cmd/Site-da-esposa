import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, Settings } from 'lucide-react';
import ProcedureSpecificationsManager from './ProcedureSpecificationsManager';

interface ProcedureSpecificationsCardProps {
  procedureId: string;
  requiresSpecifications: boolean;
}

const ProcedureSpecificationsCard: React.FC<ProcedureSpecificationsCardProps> = ({
  procedureId,
  requiresSpecifications,
}) => {
  const [specificationsManagerOpen, setSpecificationsManagerOpen] = useState(false);

  if (!requiresSpecifications) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <List className="w-5 h-5 text-primary" />
            Especificações do Procedimento
          </CardTitle>
          <CardDescription>
            Configure as diferentes especificações/aplicações que os clientes podem escolher para este procedimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>📋 <strong>Como funciona:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Configure diferentes especificações (ex: Vitamina C, Hidratação, etc.)</li>
                <li>Cada especificação pode ter preço e descrição próprios</li>
                <li>Clientes podem selecionar múltiplas especificações</li>
                <li>O sistema soma automaticamente os valores</li>
                <li>Promoções por quantidade também se aplicam às especificações</li>
              </ul>
            </div>
            
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSpecificationsManagerOpen(true);
              }}
              className="w-full"
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Especificações
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProcedureSpecificationsManager
        procedureId={procedureId}
        open={specificationsManagerOpen}
        onClose={() => setSpecificationsManagerOpen(false)}
      />
    </>
  );
};

export default ProcedureSpecificationsCard;