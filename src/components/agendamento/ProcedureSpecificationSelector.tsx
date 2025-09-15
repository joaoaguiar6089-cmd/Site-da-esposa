import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface AreaGroup {
  id: string;
  name: string;
  price: number;
  shapes: AreaShape[];
}

interface ProcedureSpecificationSelectorProps {
  procedureId: string;
  onSelectionChange: (selectedSpecs: ProcedureSpecification[], totalPrice: number, selectedAreas?: any[], totalAreasPrice?: number, selectedGender?: string) => void;
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
  const [areaGroups, setAreaGroups] = useState<AreaGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female');
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
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

  useEffect(() => {
    // Notify parent component of selection changes
    const selected = getSelectedSpecifications();
    const selectedAreas = areaGroups.filter(group => selectedGroupIds.includes(group.id));
    const totalAreasPrice = selectedAreas.reduce((sum, area) => sum + area.price, 0);
    onSelectionChange(selected, totalPrice, selectedAreas, totalAreasPrice, selectedGender);
  }, [selectedSpecifications, totalPrice, selectedGroupIds, areaGroups, selectedGender, onSelectionChange, getSelectedSpecifications]);

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
      
      // Load area groups for specifications that have image selection
      await loadAreaGroups();
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

  const loadAreaGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('body_area_groups')
        .select('*')
        .or(`procedure_id.eq.${procedureId},specification_id.in.(${specifications.map(s => s.id).join(',') || 'null'})`)
        .eq('gender', selectedGender);

      if (error) throw error;
      
      const groups: AreaGroup[] = (data || []).map(group => ({
        id: group.id,
        name: group.name,
        price: Number(group.price),
        shapes: (group.shapes as any) as AreaShape[]
      }));
      
      setAreaGroups(groups);
    } catch (error: any) {
      console.error('Erro ao carregar áreas:', error);
    }
  };

  const handleSpecificationChange = (specId: string, checked: boolean) => {
    selectSpecification(specId, checked);
  };

  // Load area groups when gender changes
  useEffect(() => {
    if (specifications.length > 0) {
      loadAreaGroups();
    }
  }, [selectedGender, specifications]);

  // Canvas drawing functions
  const getImageUrl = () => {
    if (bodySelectionType === 'both') {
      return selectedGender === 'male' ? bodyImageUrlMale : bodyImageUrl;
    }
    return bodyImageUrl;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw areas
    areaGroups.forEach(group => {
      const isSelected = selectedGroupIds.includes(group.id);
      const isHovered = hoveredGroupId === group.id;
      
      group.shapes.forEach(shape => {
        ctx.fillStyle = isSelected 
          ? 'rgba(34, 197, 94, 0.4)' 
          : isHovered 
            ? 'rgba(59, 130, 246, 0.3)' 
            : 'rgba(239, 68, 68, 0.2)';
        ctx.strokeStyle = isSelected 
          ? 'rgba(34, 197, 94, 0.8)' 
          : isHovered 
            ? 'rgba(59, 130, 246, 0.6)' 
            : 'rgba(239, 68, 68, 0.5)';
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

  const isPointInGroup = (x: number, y: number, group: AreaGroup): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    return group.shapes.some(shape => {
      const shapeX = (shape.x / 100) * canvas.width;
      const shapeY = (shape.y / 100) * canvas.height;
      const shapeWidth = (shape.width / 100) * canvas.width;
      const shapeHeight = (shape.height / 100) * canvas.height;
      
      return x >= shapeX && x <= shapeX + shapeWidth && 
             y >= shapeY && y <= shapeY + shapeHeight;
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const group of areaGroups) {
      if (isPointInGroup(x, y, group)) {
        toggleGroupSelection(group.id);
        break;
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let foundGroup: string | null = null;
    for (const group of areaGroups) {
      if (isPointInGroup(x, y, group)) {
        foundGroup = group.id;
        break;
      }
    }
    
    setHoveredGroupId(foundGroup);
    canvas.style.cursor = foundGroup ? 'pointer' : 'default';
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
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
  }, [areaGroups, selectedGroupIds, hoveredGroupId]);

  const getTotalAreasPrice = () => {
    return areaGroups
      .filter(group => selectedGroupIds.includes(group.id))
      .reduce((sum, group) => sum + group.price, 0);
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
          <span>Procedimentos Disponíveis</span>
          {(totalPrice > 0 || getTotalAreasPrice() > 0) && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Total: R$ {(totalPrice + getTotalAreasPrice()).toFixed(2).replace('.', ',')}
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

        {/* Body Areas Selection */}
        {areaGroups.length > 0 && bodySelectionType && (
          <div className="space-y-4 mt-6">
            <Separator />
            <div>
              <h4 className="text-lg font-semibold mb-4">Selecione as áreas</h4>
              
              {/* Gender Selection */}
              {bodySelectionType === 'both' && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Gênero</label>
                  <RadioGroup 
                    value={selectedGender} 
                    onValueChange={(value: 'female' | 'male') => setSelectedGender(value)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female">Feminino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male">Masculino</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Area Groups List */}
              <div className="mb-4 space-y-2">
                {areaGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`area-${group.id}`}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                      <label
                        htmlFor={`area-${group.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {group.name}
                      </label>
                    </div>
                    <Badge variant="outline">
                      R$ {group.price.toFixed(2).replace('.', ',')}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Canvas for body image */}
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    ref={imageRef}
                    src={getImageUrl()}
                    alt="Seleção de área corporal"
                    className="hidden"
                    onLoad={handleImageLoad}
                  />
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                    className="border rounded-lg shadow-sm max-w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {(getSelectedSpecifications().length > 0 || selectedGroupIds.length > 0) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Selecionados:</h4>
            <div className="space-y-1">
              {/* Show selected specifications */}
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
              
              {/* Show selected areas */}
              {areaGroups
                .filter(group => selectedGroupIds.includes(group.id))
                .map((group) => (
                  <div key={group.id} className="flex justify-between text-sm">
                    <span>{group.name}</span>
                    <span>R$ {group.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              
              {/* Total */}
              {(totalPrice > 0 || getTotalAreasPrice() > 0) && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>R$ {(totalPrice + getTotalAreasPrice()).toFixed(2).replace('.', ',')}</span>
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