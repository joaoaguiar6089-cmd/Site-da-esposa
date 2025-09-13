import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, Gift } from 'lucide-react';

interface DiscountSummaryProps {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  discountPercentage: number;
  groupsCount: number;
  hasDiscount: boolean;
}

const DiscountSummary: React.FC<DiscountSummaryProps> = ({
  originalTotal,
  discountAmount,
  finalTotal,
  discountPercentage,
  groupsCount,
  hasDiscount,
}) => {
  if (!hasDiscount) {
    return (
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total:</span>
            <span className="text-lg font-bold text-primary">
              R$ {originalTotal.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-200 bg-green-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <Gift className="w-4 h-4" />
          <span className="font-medium">Promoção Aplicada!</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            -{discountPercentage}%
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal ({groupsCount} grupos):</span>
            <span>R$ {originalTotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-green-600">
            <div className="flex items-center gap-1">
              <Percent className="w-3 h-3" />
              <span>Desconto ({discountPercentage}%):</span>
            </div>
            <span>-R$ {discountAmount.toFixed(2)}</span>
          </div>
          
          <hr className="border-green-200" />
          
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total Final:</span>
            <span className="text-green-700">R$ {finalTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
          🎉 Você economizou R$ {discountAmount.toFixed(2)} selecionando múltiplos grupos!
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscountSummary;