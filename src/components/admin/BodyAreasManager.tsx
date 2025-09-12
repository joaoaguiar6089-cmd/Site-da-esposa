import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BodyArea {
  id?: string;
  name: string;
  price: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isSymmetric?: boolean;
}

interface BodyAreasManagerProps {
  procedureId: string;
  imageUrl: string;
  open: boolean;
  onClose: () => void;
}

const BodyAreasManager: React.FC<BodyAreasManagerProps> = ({
  procedureId,
  imageUrl,
  open,
  onClose,
}) => {
  const [areas, setAreas] = useState<BodyArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentArea, setCurrentArea] = useState<Partial<BodyArea> | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', price: 0 });
  const [editingArea, setEditingArea] = useState<BodyArea & { id: string } | null>(null);
  const [createSymmetric, setCreateSymmetric] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragAreaIndex, setDragAreaIndex] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open && procedureId) {
      loadBodyAreas();
    }
  }, [open, procedureId]);

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
      coordinates: area.coordinates as any,
      isSymmetric: (area as any).is_symmetric || false
    }));

    setAreas(mappedAreas);
  };

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: ((e.clientX - rect.left) * scaleX / canvas.width) * 100,
      y: ((e.clientY - rect.top) * scaleY / canvas.height) * 100
    };
  }, []);

  const drawAreas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Desenhar áreas existentes
    areas.forEach((area, index) => {
      const drawArea = (coords: any, isSymmetric = false) => {
        const x = (coords.x / 100) * canvas.width;
        const y = (coords.y / 100) * canvas.height;
        const width = (coords.width / 100) * canvas.width;
        const height = (coords.height / 100) * canvas.height;

        ctx.strokeStyle = '#ef4444';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);

        if (!isSymmetric) {
          // Label apenas na área principal
          ctx.fillStyle = '#ef4444';
          ctx.font = '12px Arial';
          ctx.fillText(`${index + 1}. ${area.name}`, x, y - 5);
        }
      };

      // Desenhar área principal
      drawArea(area.coordinates);

      // Se for simétrica, desenhar área espelhada
      if (area.isSymmetric) {
        const centerX = 50;
        const originalCenterX = area.coordinates.x + (area.coordinates.width / 2);
        const distanceFromCenter = originalCenterX - centerX;
        const mirroredCenterX = centerX - distanceFromCenter;
        const mirroredX = mirroredCenterX - (area.coordinates.width / 2);

        if (mirroredX >= 0 && mirroredX + area.coordinates.width <= 100) {
          const mirroredCoords = {
            x: mirroredX,
            y: area.coordinates.y,
            width: area.coordinates.width,
            height: area.coordinates.height
          };
          drawArea(mirroredCoords, true);
        }
      }
    });

    // Desenhar área atual sendo criada
    if (currentArea?.coordinates) {
      const drawCurrentArea = (coords: any, isSymmetric = false) => {
        const x = (coords.x / 100) * canvas.width;
        const y = (coords.y / 100) * canvas.height;
        const width = (coords.width / 100) * canvas.width;
        const height = (coords.height / 100) * canvas.height;

        ctx.strokeStyle = '#22c55e';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      };

      // Desenhar área principal sendo criada
      drawCurrentArea(currentArea.coordinates);

      // Se for simétrica, desenhar área espelhada sendo criada
      if (createSymmetric) {
        const centerX = 50;
        const originalCenterX = currentArea.coordinates.x + (currentArea.coordinates.width / 2);
        const distanceFromCenter = originalCenterX - centerX;
        const mirroredCenterX = centerX - distanceFromCenter;
        const mirroredX = mirroredCenterX - (currentArea.coordinates.width / 2);

        if (mirroredX >= 0 && mirroredX + currentArea.coordinates.width <= 100) {
          const mirroredCoords = {
            x: mirroredX,
            y: currentArea.coordinates.y,
            width: currentArea.coordinates.width,
            height: currentArea.coordinates.height
          };
          drawCurrentArea(mirroredCoords, true);
        }
      }
    }
  }, [areas, currentArea, createSymmetric]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    // Verificar se clicou em uma área existente para arrastar
    const clickedAreaIndex = areas.findIndex(area => {
      // Verificar área principal
      const inMainArea = coords.x >= area.coordinates.x && 
        coords.x <= area.coordinates.x + area.coordinates.width &&
        coords.y >= area.coordinates.y && 
        coords.y <= area.coordinates.y + area.coordinates.height;

      // Se for simétrica, verificar também a área espelhada
      if (area.isSymmetric) {
        const centerX = 50;
        const originalCenterX = area.coordinates.x + (area.coordinates.width / 2);
        const distanceFromCenter = originalCenterX - centerX;
        const mirroredCenterX = centerX - distanceFromCenter;
        const mirroredX = mirroredCenterX - (area.coordinates.width / 2);

        const inMirroredArea = coords.x >= mirroredX && 
          coords.x <= mirroredX + area.coordinates.width &&
          coords.y >= area.coordinates.y && 
          coords.y <= area.coordinates.y + area.coordinates.height;

        return inMainArea || inMirroredArea;
      }

      return inMainArea;
    });

    if (clickedAreaIndex !== -1) {
      setIsDragging(true);
      setDragAreaIndex(clickedAreaIndex);
      setDragStart({ x: coords.x, y: coords.y });
    } else {
      setIsDrawing(true);
      setCurrentArea({
        coordinates: {
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0
        }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    if (isDragging && dragStart && dragAreaIndex !== null) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      setAreas(prev => prev.map((area, index) => {
        if (index === dragAreaIndex) {
          const newX = Math.max(0, Math.min(100 - area.coordinates.width, area.coordinates.x + deltaX));
          const newY = Math.max(0, Math.min(100 - area.coordinates.height, area.coordinates.y + deltaY));
          
          return {
            ...area,
            coordinates: {
              ...area.coordinates,
              x: newX,
              y: newY
            }
          };
        }
        return area;
      }));
      
      setDragStart({ x: coords.x, y: coords.y });
    } else if (isDrawing && currentArea?.coordinates) {
      setCurrentArea(prev => ({
        ...prev!,
        coordinates: {
          ...prev!.coordinates!,
          width: Math.abs(coords.x - prev!.coordinates!.x),
          height: Math.abs(coords.y - prev!.coordinates!.y),
          x: Math.min(coords.x, prev!.coordinates!.x),
          y: Math.min(coords.y, prev!.coordinates!.y)
        }
      }));
    }

    drawAreas();
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragAreaIndex(null);
      setDragStart(null);
      return;
    }

    if (!isDrawing || !currentArea?.coordinates) return;

    const area: BodyArea = {
      name: '',
      price: 0,
      coordinates: currentArea.coordinates,
      isSymmetric: createSymmetric
    };

    setAreas(prev => [...prev, area]);
    setIsDrawing(false);
    setCurrentArea(null);
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    drawAreas();
  };

  useEffect(() => {
    drawAreas();
  }, [drawAreas]);

  const saveAreas = async () => {
    try {
      // Deletar áreas existentes
      await supabase
        .from('body_areas')
        .delete()
        .eq('procedure_id', procedureId);

      // Inserir novas áreas
      if (areas.length > 0) {
        const { error } = await supabase
          .from('body_areas')
          .insert(
            areas.map(area => ({
              procedure_id: procedureId,
              name: area.name,
              price: area.price,
              coordinates: area.coordinates,
              is_symmetric: area.isSymmetric || false
            }))
          );

        if (error) throw error;
      }

      toast.success('Áreas salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar áreas:', error);
      toast.error('Erro ao salvar áreas');
    }
  };

  const deleteArea = (index: number) => {
    setAreas(prev => prev.filter((_, i) => i !== index));
  };

  const editArea = (index: number) => {
    const area = areas[index];
    setEditingArea({ ...area, id: index.toString() });
    setAreaForm({ name: area.name, price: area.price });
  };

  const updateArea = () => {
    if (!editingArea) return;
    
    const index = parseInt(editingArea.id || '0');
    setAreas(prev => prev.map((area, i) => 
      i === index ? { ...area, name: areaForm.name, price: areaForm.price } : area
    ));
    
    setEditingArea(null);
    setAreaForm({ name: '', price: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gerenciar Áreas do Corpo</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[70vh]">
          <div className="flex-1" ref={containerRef}>
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="symmetric"
                  checked={createSymmetric}
                  onCheckedChange={(checked) => setCreateSymmetric(checked === true)}
                />
                <Label htmlFor="symmetric">Criar Área Simétrica Automaticamente</Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Clique e arraste para criar áreas. Áreas existentes podem ser arrastadas para reposicionamento.
              </p>
            </div>
            
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Áreas corporais"
              className="hidden"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full border border-border cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsDrawing(false);
                setIsDragging(false);
                setCurrentArea(null);
              }}
            />
          </div>

          <div className="w-80 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold mb-2">Áreas Definidas</h3>
              <div className="space-y-2">
                {areas.map((area, index) => (
                  <div key={index} className="border p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Área {index + 1}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editArea(index)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteArea(index)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Nome:</strong> {area.name || 'Não definido'}</p>
                      <p><strong>Preço:</strong> R$ {area.price.toFixed(2)}</p>
                      {area.isSymmetric && (
                        <p className="text-blue-600"><strong>Área Simétrica</strong></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingArea ? (
              <div className="border p-4 rounded-lg">
                <h4 className="font-medium mb-3">Editando Área</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-name">Nome da Área</Label>
                    <Input
                      id="edit-name"
                      value={areaForm.name}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Testa, Bochecha..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-price">Preço (R$)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={areaForm.price}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={updateArea} className="flex-1">
                      Salvar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingArea(null);
                        setAreaForm({ name: '', price: 0 });
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={saveAreas} className="flex-1">
                Salvar Áreas
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BodyAreasManager;