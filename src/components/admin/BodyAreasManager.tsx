import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AreaShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AreaGroup {
  id?: string;
  name: string;
  price: number;
  shapes: AreaShape[];
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
  const [areaGroups, setAreaGroups] = useState<AreaGroup[]>([]);
  const [currentShapes, setCurrentShapes] = useState<AreaShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<AreaShape | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', price: 0 });
  const [editingGroup, setEditingGroup] = useState<AreaGroup & { id: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragShapeIndex, setDragShapeIndex] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open && procedureId) {
      loadAreaGroups();
    }
  }, [open, procedureId]);

  const loadAreaGroups = async () => {
    const { data, error } = await supabase
      .from('body_area_groups')
      .select('*')
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('Erro ao carregar grupos de áreas:', error);
      return;
    }

    const mappedGroups: AreaGroup[] = (data || []).map(group => ({
      id: group.id,
      name: group.name,
      price: group.price,
      shapes: group.shapes as AreaShape[]
    }));

    setAreaGroups(mappedGroups);
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

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Desenhar grupos de áreas salvos
    areaGroups.forEach((group, groupIndex) => {
      group.shapes.forEach((shape) => {
        const x = (shape.x / 100) * canvas.width;
        const y = (shape.y / 100) * canvas.height;
        const width = (shape.width / 100) * canvas.width;
        const height = (shape.height / 100) * canvas.height;

        ctx.strokeStyle = '#ef4444';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      });

      // Label do grupo (apenas uma vez por grupo)
      if (group.shapes.length > 0) {
        const firstShape = group.shapes[0];
        const x = (firstShape.x / 100) * canvas.width;
        const y = (firstShape.y / 100) * canvas.height;
        
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px Arial';
        ctx.fillText(`${groupIndex + 1}. ${group.name}`, x, y - 5);
      }
    });

    // Desenhar formas temporárias (em criação)
    currentShapes.forEach((shape) => {
      const x = (shape.x / 100) * canvas.width;
      const y = (shape.y / 100) * canvas.height;
      const width = (shape.width / 100) * canvas.width;
      const height = (shape.height / 100) * canvas.height;

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    });

    // Desenhar forma atual sendo desenhada
    if (currentShape) {
      const x = (currentShape.x / 100) * canvas.width;
      const y = (currentShape.y / 100) * canvas.height;
      const width = (currentShape.width / 100) * canvas.width;
      const height = (currentShape.height / 100) * canvas.height;

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
  }, [areaGroups, currentShapes, currentShape]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    // Verificar se clicou em uma forma existente para arrastar
    let clickedShapeIndex = -1;

    for (let i = 0; i < currentShapes.length; i++) {
      const shape = currentShapes[i];
      const inShape = coords.x >= shape.x && 
        coords.x <= shape.x + shape.width &&
        coords.y >= shape.y && 
        coords.y <= shape.y + shape.height;

      if (inShape) {
        clickedShapeIndex = i;
        break;
      }
    }

    if (clickedShapeIndex !== -1) {
      setIsDragging(true);
      setDragShapeIndex(clickedShapeIndex);
      setDragStart({ x: coords.x, y: coords.y });
    } else {
      setIsDrawing(true);
      setCurrentShape({
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    if (isDragging && dragStart && dragShapeIndex !== null) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      setCurrentShapes(prev => prev.map((shape, index) => {
        if (index === dragShapeIndex) {
          const newX = Math.max(0, Math.min(100 - shape.width, shape.x + deltaX));
          const newY = Math.max(0, Math.min(100 - shape.height, shape.y + deltaY));
          
          return {
            ...shape,
            x: newX,
            y: newY
          };
        }
        return shape;
      }));
      
      setDragStart({ x: coords.x, y: coords.y });
    } else if (isDrawing && currentShape) {
      setCurrentShape({
        x: Math.min(coords.x, currentShape.x),
        y: Math.min(coords.y, currentShape.y),
        width: Math.abs(coords.x - currentShape.x),
        height: Math.abs(coords.y - currentShape.y)
      });
    }

    drawCanvas();
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragShapeIndex(null);
      setDragStart(null);
      return;
    }

    if (!isDrawing || !currentShape) return;

    // Adicionar a forma atual às formas temporárias
    if (currentShape.width > 1 && currentShape.height > 1) {
      setCurrentShapes(prev => [...prev, currentShape]);
    }
    
    setIsDrawing(false);
    setCurrentShape(null);
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    drawCanvas();
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const finishCurrentGroup = () => {
    if (currentShapes.length === 0) {
      toast.error('Desenhe pelo menos uma área antes de finalizar');
      return;
    }

    if (!areaForm.name.trim()) {
      toast.error('Digite um nome para a área');
      return;
    }

    const newGroup: AreaGroup = {
      name: areaForm.name,
      price: areaForm.price,
      shapes: [...currentShapes]
    };

    setAreaGroups(prev => [...prev, newGroup]);
    setCurrentShapes([]);
    setAreaForm({ name: '', price: 0 });
    toast.success('Grupo de áreas criado!');
  };

  const clearCurrentShapes = () => {
    setCurrentShapes([]);
    setAreaForm({ name: '', price: 0 });
  };

  const deleteCurrentShape = (index: number) => {
    setCurrentShapes(prev => prev.filter((_, i) => i !== index));
  };

  const saveAreaGroups = async () => {
    try {
      // Deletar grupos existentes
      await supabase
        .from('body_area_groups')
        .delete()
        .eq('procedure_id', procedureId);

      // Inserir novos grupos
      if (areaGroups.length > 0) {
        const { error } = await supabase
          .from('body_area_groups')
          .insert(
            areaGroups.map(group => ({
              procedure_id: procedureId,
              name: group.name,
              price: group.price,
              shapes: group.shapes
            }))
          );

        if (error) throw error;
      }

      toast.success('Grupos de áreas salvos com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar grupos:', error);
      toast.error('Erro ao salvar grupos de áreas');
    }
  };

  const deleteGroup = (index: number) => {
    setAreaGroups(prev => prev.filter((_, i) => i !== index));
  };

  const editGroup = (index: number) => {
    const group = areaGroups[index];
    setEditingGroup({ ...group, id: index.toString() });
    setAreaForm({ name: group.name, price: group.price });
  };

  const updateGroup = () => {
    if (!editingGroup) return;
    
    const index = parseInt(editingGroup.id || '0');
    setAreaGroups(prev => prev.map((group, i) => 
      i === index ? { ...group, name: areaForm.name, price: areaForm.price } : group
    ));
    
    setEditingGroup(null);
    setAreaForm({ name: '', price: 0 });
    toast.success('Grupo atualizado!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Configurar Áreas do Procedimento</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[70vh]">
          <div className="flex-1" ref={containerRef}>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Clique e arraste para criar áreas. Você pode criar várias formas para um mesmo grupo de procedimento.
                Quando terminar de desenhar todas as formas de um grupo, clique em "Finalizar Grupo".
              </p>
            </div>
            
            <img
              ref={imageRef}
              src={getCurrentImageUrl()}
              alt="Configuração de áreas"
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
                setCurrentShape(null);
              }}
            />
          </div>

          <div className="w-80 space-y-4 overflow-y-auto">
            {/* Formulário para o grupo atual */}
            {currentShapes.length > 0 && (
              <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-green-800">Grupo Atual ({currentShapes.length} formas)</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="group-name">Nome do Procedimento</Label>
                    <Input
                      id="group-name"
                      value={areaForm.name}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Botox Testa, Preenchimento Zigomático..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="group-price">Preço (R$)</Label>
                    <Input
                      id="group-price"
                      type="number"
                      step="0.01"
                      value={areaForm.price}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Formas Criadas:</Label>
                    {currentShapes.map((_, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                        <span>Forma {index + 1}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCurrentShape(index)}
                        >
                          Excluir
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={finishCurrentGroup} className="flex-1">
                      Finalizar Grupo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={clearCurrentShapes}
                      className="flex-1"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Grupos salvos */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Grupos Configurados</h3>
              <div className="space-y-2">
                {areaGroups.map((group, index) => (
                  <div key={index} className="border p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Grupo {index + 1}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editGroup(index)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteGroup(index)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Nome:</strong> {group.name}</p>
                      <p><strong>Preço:</strong> R$ {group.price.toFixed(2)}</p>
                      <p><strong>Formas:</strong> {group.shapes.length}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário de edição */}
            {editingGroup && (
              <div className="border p-4 rounded-lg bg-blue-50">
                <h4 className="font-medium mb-3">Editando Grupo</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-name">Nome do Procedimento</Label>
                    <Input
                      id="edit-name"
                      value={areaForm.name}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
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
                    <Button onClick={updateGroup} className="flex-1">
                      Salvar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingGroup(null);
                        setAreaForm({ name: '', price: 0 });
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={saveAreaGroups} className="flex-1">
                Salvar Configuração
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