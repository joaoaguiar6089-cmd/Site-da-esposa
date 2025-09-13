import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

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

interface BodyAreaSelectorProps {
  procedureId: string;
  bodySelectionType: string;
  bodyImageUrl?: string;
  bodyImageUrlMale?: string;
  onSelectionChange: (selectedGroups: AreaGroup[], totalPrice: number, gender: 'male' | 'female') => void;
}

const BodyAreaSelector: React.FC<BodyAreaSelectorProps> = ({
  procedureId,
  bodySelectionType,
  bodyImageUrl,
  onSelectionChange,
}) => {
  const [areaGroups, setAreaGroups] = useState<AreaGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const getImageUrl = useCallback(() => {
    if (bodySelectionType === 'custom' && bodyImageUrl) {
      return bodyImageUrl;
    }
    
    const defaultImages = {
      'face_male': '/images/face-male-default.png',
      'face_female': '/images/face-female-default.png',
      'body_male': '/images/body-male-default.png',
      'body_female': '/images/body-female-default.png'
    };

    if (bodySelectionType.includes('male') || bodySelectionType.includes('female')) {
      return defaultImages[bodySelectionType as keyof typeof defaultImages];
    }

    const genderSuffix = selectedGender === 'male' ? 'male' : 'female';
    const baseType = bodySelectionType.includes('face') ? 'face' : 'body';
    return defaultImages[`${baseType}_${genderSuffix}` as keyof typeof defaultImages];
  }, [bodySelectionType, bodyImageUrl, selectedGender]);

  useEffect(() => {
    loadAreaGroups();
  }, [procedureId]);

  useEffect(() => {
    drawCanvas();
  }, [areaGroups, selectedGroupIds, hoveredGroupId, getImageUrl]);

  useEffect(() => {
    const selectedGroups = areaGroups.filter(group => selectedGroupIds.includes(group.id));
    const totalPrice = selectedGroups.reduce((sum, group) => sum + group.price, 0);
    onSelectionChange(selectedGroups, totalPrice, selectedGender);
  }, [selectedGroupIds, areaGroups, selectedGender, onSelectionChange]);

  const loadAreaGroups = async () => {
    const { data, error } = await supabase
      .from('body_area_groups')
      .select('*')
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('Erro ao carregar grupos de áreas:', error);
      return;
    }

    const mappedGroups = (data || []).map(group => ({
      id: group.id,
      name: group.name,
      price: group.price,
      shapes: group.shapes as AreaShape[]
    }));

    setAreaGroups(mappedGroups);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    areaGroups.forEach((group, groupIndex) => {
      const isSelected = selectedGroupIds.includes(group.id);
      const isHovered = hoveredGroupId === group.id;
      
      let strokeColor = 'rgba(239, 68, 68, 0.9)';
      let fillColor = 'transparent';
      let lineWidth = 2;
      
      if (isSelected) {
        strokeColor = '#22c55e';
        fillColor = 'rgba(34, 197, 94, 0.4)';
        lineWidth = 3;
      } else if (isHovered) {
        strokeColor = '#ef4444';
        fillColor = 'rgba(239, 68, 68, 0.5)';
        lineWidth = 2;
      }

      group.shapes.forEach((shape) => {
        const x = (shape.x / 100) * canvas.width;
        const y = (shape.y / 100) * canvas.height;
        const width = (shape.width / 100) * canvas.width;
        const height = (shape.height / 100) * canvas.height;

        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth;
        
        if (fillColor !== 'transparent') {
          ctx.fillRect(x, y, width, height);
        }
        ctx.strokeRect(x, y, width, height);
      });

      if (isHovered && group.shapes.length > 0) {
        const firstShape = group.shapes[0];
        const x = (firstShape.x / 100) * canvas.width;
        const y = (firstShape.y / 100) * canvas.height;
        
        const textMetrics = ctx.measureText(`${group.name} - R$ ${group.price.toFixed(2)}`);
        const textWidth = textMetrics.width + 10;
        const textHeight = 22;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y - textHeight - 5, textWidth, textHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText(`${group.name} - R$ ${group.price.toFixed(2)}`, x + 5, y - 10);
      }
      
      if (!isSelected && !isHovered && group.shapes.length > 0) {
        const firstShape = group.shapes[0];
        const x = (firstShape.x / 100) * canvas.width;
        const y = (firstShape.y / 100) * canvas.height;
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.beginPath();
        ctx.arc(x + 15, y + 15, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((groupIndex + 1).toString(), x + 15, y + 19);
        ctx.textAlign = 'left';
      }
    });
  }, [areaGroups, selectedGroupIds, hoveredGroupId]);

  const isPointInGroup = (x: number, y: number, group: AreaGroup): boolean => {
    return group.shapes.some(shape => 
      x >= shape.x && x <= shape.x + shape.width &&
      y >= shape.y && y <= shape.y + shape.height
    );
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clickedGroup = areaGroups.find(group => isPointInGroup(x, y, group));

    if (clickedGroup) {
      toggleGroupSelection(clickedGroup.id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const hoveredGroup = areaGroups.find(group => isPointInGroup(x, y, group));
    setHoveredGroupId(hoveredGroup ? hoveredGroup.id : null);
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

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    drawCanvas();
  };

  const needsGenderSelection = !bodySelectionType.includes('male') && !bodySelectionType.includes('female');
  const selectedGroups = areaGroups.filter(group => selectedGroupIds.includes(group.id));
  const totalPrice = selectedGroups.reduce((sum, group) => sum + group.price, 0);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Selecione os procedimentos desejados</h3>
        
        {needsGenderSelection && (
          <div>
            <Label>Sexo do Cliente</Label>
            <RadioGroup value={selectedGender} onValueChange={(value) => setSelectedGender(value as 'male' | 'female')}>
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

        <div className="flex flex-col md:flex-row md:gap-6">
          <div className="w-full md:w-80 order-1 md:order-2 mb-4 md:mb-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Procedimentos Disponíveis</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {areaGroups.map((group, index) => (
                    <div key={group.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={group.id}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={group.id} className="cursor-pointer font-medium">
                          {index + 1}. {group.name}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          <p>R$ {group.price.toFixed(2)}</p>
                          <p>{group.shapes.length} área{group.shapes.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGroups.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Resumo da Seleção</h4>
                  <div className="space-y-2">
                    {selectedGroups.map(group => (
                      <div key={group.id} className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="font-medium">{group.name}</span>
                        <span>R$ {group.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3 font-semibold text-lg">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="text-green-600">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedGroups.length === 0 && areaGroups.length > 0 && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Selecione pelo menos um procedimento para continuar
                  </p>
                </div>
              )}

              {areaGroups.length === 0 && (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Nenhum procedimento configurado ainda.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 order-2 md:order-1">
            <img
              ref={imageRef}
              src={getImageUrl()}
              alt="Seleção de procedimentos"
              className="hidden"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-96 border border-border cursor-pointer w-full"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredGroupId(null)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BodyAreaSelector;