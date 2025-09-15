import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface BodyAreasManagerProps {
  procedureId: string;
  imageUrl?: string;
  imageUrlMale?: string;
  bodySelectionType?: string;
  open: boolean;
  onClose: () => void;
}

const BodyAreasManager: FC<BodyAreasManagerProps> = ({
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Funcionalidade Atualizada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O gerenciamento de áreas corporais foi integrado diretamente no gerenciamento de especificações. 
            Agora, ao criar uma nova especificação para um procedimento que requer seleção de área, 
            você pode configurar a área diretamente no formulário de especificação.
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Entendi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BodyAreasManager;