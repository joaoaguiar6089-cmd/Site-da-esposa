import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BodyArea {
  id?: string;
  name: string;
  price: number;
  coordinates: {
    x: number; // percentual
    y: number; // percentual
    width: number; // percentual
    height: number; // percentual
  };
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
  const [currentArea, setCurrentArea] = useState<BodyArea | null>(null);
  const [editingArea, setEditingArea] = useState<BodyArea | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [isSymmetric, setIsSymmetric] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [areaForm, setAreaForm] = useState({
    name: '',
    price: 0
  });

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
      coordinates: area.coordinates as {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }));

    setAreas(mappedAreas);
  };

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };

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
      const x = (area.coordinates.x / 100) * canvas.width;
      const y = (area.coordinates.y / 100) * canvas.height;
      const width = (area.coordinates.width / 100) * canvas.width;
      const height = (area.coordinates.height / 100) * canvas.height;

      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // Label
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px Arial';
      ctx.fillText(`${index + 1}. ${area.name}`, x, y - 5);
    });

    // Desenhar área atual sendo criada
    if (currentArea) {
      const x = (currentArea.coordinates.x / 100) * canvas.width;
      const y = (currentArea.coordinates.y / 100) * canvas.height;
      const width = (currentArea.coordinates.width / 100) * canvas.width;
      const height = (currentArea.coordinates.height / 100) * canvas.height;

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
  }, [areas, currentArea]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    setStartPoint(coords);
    setIsDrawing(true);
    setCurrentArea({
      name: areaForm.name || 'Nova Área',
      price: areaForm.price,
      coordinates: {
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentArea) return;

    const coords = getCanvasCoordinates(e);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);

    setCurrentArea({
      ...currentArea,
      coordinates: { x, y, width, height }
    });
  };

  const handleMouseUp = () => {
    if (!currentArea || !isDrawing) return;

    if (currentArea.coordinates.width > 1 && currentArea.coordinates.height > 1) {
      if (!areaForm.name.trim()) {
        toast.error('Por favor, insira o nome da área');
        setCurrentArea(null);
        setIsDrawing(false);
        return;
      }
      
      const newArea = { ...currentArea, name: areaForm.name, price: areaForm.price };
      let areasToAdd = [newArea];
      
      // Se simétrico está marcado, criar área espelhada
      if (isSymmetric) {
        const mirroredArea = createMirroredArea(newArea);
        if (mirroredArea) {
          areasToAdd.push(mirroredArea);
        }
      }
      
      setAreas(prev => [...prev, ...areasToAdd]);
      setAreaForm({ name: '', price: 0 });
    }

    setCurrentArea(null);
    setIsDrawing(false);
  };

  const createMirroredArea = (originalArea: BodyArea): BodyArea | null => {
    // Calcular a posição espelhada baseada no centro da imagem (50%)
    const centerX = 50;
    const originalCenterX = originalArea.coordinates.x + (originalArea.coordinates.width / 2);
    const distanceFromCenter = originalCenterX - centerX;
    
    // Criar a área espelhada
    const mirroredCenterX = centerX - distanceFromCenter;
    const mirroredX = mirroredCenterX - (originalArea.coordinates.width / 2);
    
    // Verificar se a área espelhada está dentro dos limites (0-100%)
    if (mirroredX < 0 || mirroredX + originalArea.coordinates.width > 100) {
      toast.error('Área simétrica ficaria fora dos limites da imagem');
      return null;
    }
    
    return {
      name: `${originalArea.name} (Espelhado)`,
      price: originalArea.price,
      coordinates: {
        x: mirroredX,
        y: originalArea.coordinates.y,
        width: originalArea.coordinates.width,
        height: originalArea.coordinates.height
      }
    };
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
              coordinates: area.coordinates
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
          <DialogTitle>Gerenciar Áreas Selecionáveis</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-full">
          {/* Canvas Area */}
          <div className="flex-1" ref={containerRef}>
            <div className="relative">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Área corporal"
                className="hidden"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
              />
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-96 border border-border cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="w-80 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Nova Área</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="area-name">Nome da Área</Label>
                  <Input
                    id="area-name"
                    value={areaForm.name}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Testa, Bochecha..."
                  />
                </div>
                <div>
                  <Label htmlFor="area-price">Preço (R$)</Label>
                  <Input
                    id="area-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={areaForm.price}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                {/* Checkbox para área simétrica */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="symmetric-area"
                    checked={isSymmetric}
                    onChange={(e) => setIsSymmetric(e.target.checked)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                  />
                  <Label htmlFor="symmetric-area" className="text-sm">
                    Criar área simétrica automaticamente
                  </Label>
                </div>
                
                {isSymmetric && (
                  <p className="text-xs text-muted-foreground">
                    ⚡ Ao desenhar uma área, será criada automaticamente uma área espelhada do lado oposto
                  </p>
                )}
                
                {editingArea && (
                  <div className="flex gap-2">
                    <Button onClick={updateArea} size="sm">Atualizar</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setEditingArea(null);
                        setAreaForm({ name: '', price: 0 });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Áreas Definidas ({areas.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {areas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{area.name}</p>
                      <p className="text-xs text-muted-foreground">R$ {area.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editArea(index)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteArea(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-2">
              <Button onClick={saveAreas} className="flex-1">
                Salvar Áreas
              </Button>
              <Button variant="outline" onClick={onClose}>
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