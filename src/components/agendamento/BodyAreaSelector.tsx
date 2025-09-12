import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

interface BodyArea {
  id: string;
  name: string;
  price: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface BodyAreaSelectorProps {
  procedureId: string;
  bodySelectionType: string;
  bodyImageUrl?: string;
  onSelectionChange: (selectedAreas: BodyArea[], totalPrice: number, gender: 'male' | 'female') => void;
}

const BodyAreaSelector: React.FC<BodyAreaSelectorProps> = ({
  procedureId,
  bodySelectionType,
  bodyImageUrl,
  onSelectionChange,
}) => {
  const [areas, setAreas] = useState<BodyArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
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

    // Para tipos que permitem seleção de gênero
    const genderSuffix = selectedGender === 'male' ? 'male' : 'female';
    const baseType = bodySelectionType.includes('face') ? 'face' : 'body';
    return defaultImages[`${baseType}_${genderSuffix}` as keyof typeof defaultImages];
  }, [bodySelectionType, bodyImageUrl, selectedGender]);

  useEffect(() => {
    loadBodyAreas();
  }, [procedureId]);

  useEffect(() => {
    drawCanvas();
  }, [areas, selectedAreaIds, hoveredArea, getImageUrl]);

  useEffect(() => {
    const selectedAreas = areas.filter(area => selectedAreaIds.includes(area.id));
    const totalPrice = selectedAreas.reduce((sum, area) => sum + area.price, 0);
    onSelectionChange(selectedAreas, totalPrice, selectedGender);
  }, [selectedAreaIds, areas, selectedGender, onSelectionChange]);

  const loadBodyAreas = async () => {
    const { data, error } = await supabase
      .from('body_areas')
      .select('*')
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('Erro ao carregar áreas:', error);
      return;
    }

    const mappedAreas: BodyArea[] = (data || []).map(area => ({
      id: area.id,
      name: area.name,
      price: area.price,
      coordinates: area.coordinates as any
    }));

    setAreas(mappedAreas);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    areas.forEach((area) => {
      const isSelected = selectedAreaIds.includes(area.id);
      const isHovered = hoveredArea === area.id;
      
      const x = (area.coordinates.x / 100) * canvas.width;
      const y = (area.coordinates.y / 100) * canvas.height;
      const width = (area.coordinates.width / 100) * canvas.width;
      const height = (area.coordinates.height / 100) * canvas.height;

      // Área selecionada
      if (isSelected) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      }
      // Área hover
      else if (isHovered) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Mostrar nome e preço
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText(`${area.name} - R$ ${area.price.toFixed(2)}`, x, y - 5);
      }
      // Área disponível
      else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
      }
    });
  }, [areas, selectedAreaIds, hoveredArea]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clickedArea = areas.find(area => 
      x >= area.coordinates.x && x <= area.coordinates.x + area.coordinates.width &&
      y >= area.coordinates.y && y <= area.coordinates.y + area.coordinates.height
    );

    if (clickedArea) {
      toggleAreaSelection(clickedArea.id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const hoveredAreaFound = areas.find(area => 
      x >= area.coordinates.x && x <= area.coordinates.x + area.coordinates.width &&
      y >= area.coordinates.y && y <= area.coordinates.y + area.coordinates.height
    );

    setHoveredArea(hoveredAreaFound ? hoveredAreaFound.id : null);
  };

  const toggleAreaSelection = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
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
  const selectedAreas = areas.filter(area => selectedAreaIds.includes(area.id));
  const totalPrice = selectedAreas.reduce((sum, area) => sum + area.price, 0);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Selecione as áreas para o procedimento</h3>
        
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

        <div className="flex gap-6">
          <div className="flex-1">
            <img
              ref={imageRef}
              src={getImageUrl()}
              alt="Áreas corporais"
              className="hidden"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-96 border border-border cursor-pointer"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Clique nas áreas destacadas para selecioná-las
            </p>
          </div>

          <div className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Áreas Disponíveis</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {areas.map((area) => (
                    <div key={area.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={area.id}
                        checked={selectedAreaIds.includes(area.id)}
                        onCheckedChange={() => toggleAreaSelection(area.id)}
                      />
                      <Label htmlFor={area.id} className="flex-1 cursor-pointer">
                        {area.name} - R$ {area.price.toFixed(2)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAreas.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Resumo da Seleção</h4>
                  <div className="space-y-1">
                    {selectedAreas.map(area => (
                      <div key={area.id} className="flex justify-between text-sm">
                        <span>{area.name}</span>
                        <span>R$ {area.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 font-semibold">
                    Total: R$ {totalPrice.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BodyAreaSelector;