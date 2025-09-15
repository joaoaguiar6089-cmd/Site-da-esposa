import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSpecificationCalculation, ProcedureSpecification } from "@/hooks/useSpecificationCalculation";

interface AreaShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcedureSpecificationSelectorProps {
  procedureId: string;
  onSelectionChange: (data: {
    selectedSpecifications: ProcedureSpecification[];
    totalPrice: number;
    selectedGender?: string;
  }) => void;
  initialSelections?: string[];
  bodySelectionType?: string;
  bodyImageUrl?: string;
  bodyImageUrlMale?: string;
}

const ProcedureSpecificationSelector = ({ 
  procedureId, 
  onSelectionChange, 
  initialSelections = [],
  bodySelectionType,
  bodyImageUrl,
  bodyImageUrlMale
}: ProcedureSpecificationSelectorProps) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female');
  const [hoveredSpecId, setHoveredSpecId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
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

  // Update total when selections change
  useEffect(() => {
    onSelectionChange?.({
      selectedSpecifications: getSelectedSpecifications(),
      totalPrice,
      selectedGender
    });
  }, [selectedSpecifications, totalPrice, selectedGender]);

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

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw areas for selected specifications
    selectedSpecifications
      .filter(spec => spec.selected && spec.has_area_selection && spec.area_shapes && spec.gender === selectedGender)
      .forEach(spec => {
        const isHovered = hoveredSpecId === spec.id;
        
        (spec.area_shapes as any[])?.forEach((shape: any) => {
          ctx.strokeStyle = '#10B981';
          ctx.fillStyle = isHovered ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)';
          ctx.lineWidth = 2;

          const x = (shape.x / 100) * canvas.width;
          const y = (shape.y / 100) * canvas.height;
          const width = (shape.width / 100) * canvas.width;
          const height = (shape.height / 100) * canvas.height;

          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        });
      });
  };

  const isPointInSpecification = (x: number, y: number, spec: any) => {
    if (!spec.area_shapes || spec.gender !== selectedGender) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    return (spec.area_shapes as any[]).some((shape: any) => {
      const shapeX = (shape.x / 100) * canvas.width;
      const shapeY = (shape.y / 100) * canvas.height;
      const shapeWidth = (shape.width / 100) * canvas.width;
      const shapeHeight = (shape.height / 100) * canvas.height;
      
      return x >= shapeX && x <= shapeX + shapeWidth &&
             y >= shapeY && y <= shapeY + shapeHeight;
    });
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredSpec = selectedSpecifications.find(spec => 
      spec.selected && isPointInSpecification(x, y, spec)
    );
    setHoveredSpecId(hoveredSpec?.id || null);
  };

  const handleSpecificationChange = (specId: string, checked: boolean) => {
    selectSpecification(specId, checked);
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    // Set canvas size to match image aspect ratio
    const maxWidth = 400;
    const aspectRatio = image.naturalHeight / image.naturalWidth;
    canvas.width = maxWidth;
    canvas.height = maxWidth * aspectRatio;
    
    drawCanvas();
  };

  useEffect(() => {
    drawCanvas();
  }, [selectedSpecifications, selectedGender, hoveredSpecId]);

  const getImageUrl = () => {
    if (!bodySelectionType) return '';
    
    if (bodySelectionType === 'face') {
      return selectedGender === 'male' 
        ? '/images/face-male-default.png'
        : '/images/face-female-default.png';
    } else {
      return selectedGender === 'male'
        ? bodyImageUrlMale || '/images/body-male-default.png'
        : bodyImageUrl || '/images/body-female-default.png';
    }
  };

  // Check if any specification has area selection (regardless of being selected)
  const hasAreaSelection = specifications.some(spec => 
    spec.has_area_selection && spec.area_shapes
  );
  
  // Check if any selected specification has area selection for the current gender
  const hasSelectedAreaForGender = selectedSpecifications.some(spec => 
    spec.selected && spec.has_area_selection && spec.area_shapes && spec.gender === selectedGender
  );

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
          <span>Procedimentos Disponíveis</span>
          {totalPrice > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Total: R$ {totalPrice.toFixed(2).replace('.', ',')}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Selecione os procedimentos desejados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Specifications Selection */}
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

        {/* Area Selection for specifications */}
        {hasAreaSelection && (
          <div className="space-y-4">
            {/* Gender Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecione o gênero:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedGender === 'female' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGender('female')}
                >
                  Feminino
                </Button>
                <Button
                  type="button" 
                  variant={selectedGender === 'male' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGender('male')}
                >
                  Masculino
                </Button>
              </div>
            </div>

            {/* Interactive Canvas */}
            {hasSelectedAreaForGender && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Áreas selecionadas:</Label>
                <div className="relative border rounded-md overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={600}
                    className="w-full"
                    onMouseMove={handleCanvasMouseMove}
                  />
                  <img
                    ref={imageRef}
                    src={getImageUrl()}
                    alt="Áreas selecionadas"
                    className="hidden"
                    onLoad={handleImageLoad}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selection Summary */}
        {getSelectedSpecifications().length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Selecionados:</h4>
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
                    <span>Total:</span>
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