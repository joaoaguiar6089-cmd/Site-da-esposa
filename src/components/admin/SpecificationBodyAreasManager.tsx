import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface SpecificationBodyAreasManagerProps {
  specificationId: string;
  imageUrl: string;
  imageUrlMale?: string;
  bodySelectionType?: string;
  open: boolean;
  onClose: () => void;
}

const SpecificationBodyAreasManager: React.FC<SpecificationBodyAreasManagerProps> = ({
  specificationId,
  imageUrl,
  imageUrlMale,
  bodySelectionType,
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
  const [currentGender, setCurrentGender] = useState<'female' | 'male'>('female');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open && specificationId) {
      loadAreaGroups();
    }
  }, [open, specificationId, currentGender]);

  const getCurrentImageUrl = useCallback(() => {
    // Se for tipo customizado, usar as imagens fornecidas
    if (bodySelectionType === 'custom') {
      return currentGender === 'male' && imageUrlMale ? imageUrlMale : imageUrl;
    }

    // Mapas de imagens padrão
    const defaultImages = {
      'face_male': '/images/face-male-default.png',
      'face_female': '/images/face-female-default.png',
      'body_male': '/images/body-male-default.png',
      'body_female': '/images/body-female-default.png'
    } as const;

    // Se o tipo já especifica gênero, usar diretamente
    if (bodySelectionType && bodySelectionType.includes('_')) {
      const imageKey = bodySelectionType as keyof typeof defaultImages;
      return defaultImages[imageKey] || imageUrl || '';
    }

    // Para tipos genéricos (body, face), construir baseado no gênero selecionado
    if (bodySelectionType) {
      const baseType = bodySelectionType.includes('body') ? 'body' : 'face';
      const genderSuffix = currentGender;
      const imageKey = `${baseType}_${genderSuffix}` as keyof typeof defaultImages;
      return defaultImages[imageKey] || imageUrl || '';
    }
    
    // Fallback para imagem padrão baseada no gênero
    return defaultImages[`body_${currentGender}`] || imageUrl || '';
  }, [bodySelectionType, imageUrl, imageUrlMale, currentGender]);

  const loadAreaGroups = async () => {
    const { data, error } = await supabase
      .from('body_area_groups')
      .select('*')
      .eq('specification_id', specificationId)
      .eq('gender', currentGender);

    if (error) {
      console.error('Erro ao carregar grupos de áreas:', error);
      return;
    }

    const mappedGroups: AreaGroup[] = (data || []).map(group => ({
      id: group.id,
      name: group.name,
      price: group.price,
      shapes: (group.shapes as unknown) as AreaShape[]
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

    // Set canvas size to fit container while maintaining aspect ratio
    const maxWidth = 600;
    const maxHeight = 600;
    
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / aspectRatio;
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * aspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    
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
      // Deletar grupos existentes para a especificação atual
      await supabase
        .from('body_area_groups')
        .delete()
        .eq('specification_id', specificationId)
        .eq('gender', currentGender);

      // Inserir novos grupos
      if (areaGroups.length > 0) {
        const { error } = await supabase
          .from('body_area_groups')
          .insert(
            areaGroups.map(group => ({
              specification_id: specificationId,
              name: group.name,
              price: group.price,
              shapes: group.shapes as any,
              gender: currentGender
            }))
          );

        if (error) throw error;
      }

      toast.success(`Áreas da especificação (${currentGender === 'male' ? 'Masculino' : 'Feminino'}) salvas com sucesso!`);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar áreas:', error);
      toast.error('Erro ao salvar áreas da especificação');
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Áreas da Especificação</DialogTitle>
        </DialogHeader>
        
        {/* Seletor de Gênero */}
        {!bodySelectionType || 
         (!bodySelectionType.includes('_male') && !bodySelectionType.includes('_female')) ||
         bodySelectionType === 'custom' ? (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Configurar áreas para:</span>
            <div className="flex gap-2">
              <Button
                variant={currentGender === 'female' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentGender('female')}
              >
                Feminino
              </Button>
              <Button
                variant={currentGender === 'male' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentGender('male')}
              >
                Masculino
              </Button>
            </div>
          </div>
        ) : null}
        
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Clique e arraste para criar áreas. Você pode criar várias formas para um mesmo grupo.
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
              className="border border-border cursor-crosshair block mx-auto"
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

          <div className="w-80 space-y-4">
            {/* Formulário para o grupo atual */}
            {currentShapes.length > 0 && (
              <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-green-800">Grupo Atual ({currentShapes.length} formas)</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="group-name">Nome da Área</Label>
                    <Input
                      id="group-name"
                      value={areaForm.name}
                      onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Testa, Olheiras, Zigomático..."
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

            {/* Lista de grupos criados */}
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                <h4 className="font-medium">Grupos Criados ({areaGroups.length})</h4>
                {areaGroups.map((group, index) => (
                  <div key={index} className="border p-3 rounded bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium text-sm">{group.name}</h5>
                        <p className="text-xs text-muted-foreground">
                          R$ {group.price.toFixed(2)} • {group.shapes.length} forma(s)
                        </p>
                      </div>
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
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Formulário de edição */}
            {editingGroup && (
              <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-blue-800">Editando Grupo</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-name">Nome</Label>
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

            {/* Botões de ação */}
            <div className="space-y-2">
              <Button onClick={saveAreaGroups} className="w-full">
                Salvar Áreas
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpecificationBodyAreasManager;