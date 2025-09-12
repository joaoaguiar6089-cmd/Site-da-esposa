import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

interface AreaShape {
  x: number; // % da largura
  y: number; // % da altura
  width: number;  // % da largura
  height: number; // % da altura
}
interface AreaGroup {
  id: string;
  name: string;
  price: number;
  shapes: AreaShape[];
}
interface BodyAreaSelectorProps {
  procedureId: string;
  bodySelectionType: string; // ex: 'face', 'face_male', 'body', 'custom' etc.
  bodyImageUrl?: string;     // imagem custom feminina
  bodyImageUrlMale?: string; // imagem custom masculina
  onSelectionChange: (selectedGroups: AreaGroup[], totalPrice: number, gender: 'male' | 'female') => void;
}

const DRAW_STYLES = {
  // estados
  idle: {
    stroke: 'rgba(239, 68, 68, 0.9)',   // vermelho forte
    fill:   'rgba(239, 68, 68, 0.35)',  // preenchimento visível
    line:   2,
  },
  hover: {
    stroke: 'rgba(239, 68, 68, 1.0)',
    fill:   'rgba(239, 68, 68, 0.45)',
    line:   3,
  },
  selected: {
    stroke: '#16a34a',                  // green-600
    fill:   'rgba(22, 163, 74, 0.45)',
    line:   3,
  },
  // tooltip
  tooltip: {
    bg:   'rgba(0, 0, 0, 0.9)',
    padX: 10,
    padY: 8,
    // fonte maior e legível
    font: (scale: number) => `${Math.max(16, Math.round(16 * scale))}px system-ui, Arial`,
    color: '#fff',
  },
  // badge numerado (marcador fixo)
  badge: {
    bg:   'rgba(239, 68, 68, 0.9)',
    txt:  '#fff',
    r:    12,
    font: (scale: number) => `bold ${Math.max(10, Math.round(10 * scale))}px Arial`,
  },
};

const BodyAreaSelector: React.FC<BodyAreaSelectorProps> = ({
  procedureId,
  bodySelectionType,
  bodyImageUrl,
  bodyImageUrlMale,
  onSelectionChange,
}) => {
  const [areaGroups, setAreaGroups] = useState<AreaGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Escala visual para tipografia/raios baseada no tamanho do canvas
  const getUIScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const base = 480; // referência
    return Math.max(0.75, Math.min(1.5, canvas.clientWidth / base));
  }, []);

  const getImageUrl = useCallback(() => {
    if (bodySelectionType === 'custom') {
      const genderSuffix = selectedGender === 'male' ? bodyImageUrlMale : bodyImageUrl;
      if (genderSuffix) return genderSuffix;
      // fallback se não houver as custom
    }
    const defaults = {
      face_male:  '/images/face-male-default.png',
      face_female:'/images/face-female-default.png',
      body_male:  '/images/body-male-default.png',
      body_female:'/images/body-female-default.png',
    } as const;

    if (bodySelectionType in defaults) {
      return (defaults as any)[bodySelectionType];
    }

    const gender = selectedGender === 'male' ? 'male' : 'female';
    const baseType = bodySelectionType.includes('face') ? 'face' : 'body';
    return (defaults as any)[`${baseType}_${gender}`];
  }, [bodySelectionType, bodyImageUrl, bodyImageUrlMale, selectedGender]);

  // HiDPI + responsivo
  const fitCanvasToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const containerWidth = container.clientWidth; // CSS px
    const aspect = img.naturalWidth / img.naturalHeight || 1;
    const cssWidth = containerWidth;
    const cssHeight = Math.round(cssWidth / aspect);

    // Set CSS size
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    // Set real pixels for HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // mapeia unidades para CSS px
  }, []);

  const loadAreaGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('body_area_groups')
      .select('*')
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('Erro ao carregar grupos de áreas:', error);
      return;
    }
    const mapped: AreaGroup[] = (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      price: g.price,
      shapes: g.shapes as AreaShape[],
    }));
    setAreaGroups(mapped);
  }, [procedureId]);

  useEffect(() => {
    loadAreaGroups();
  }, [loadAreaGroups]);

  // redesenha quando algo visual muda
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    // limpa e desenha a base
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);

    const uiScale = getUIScale();

    areaGroups.forEach((group, index) => {
      const isSelected = selectedGroupIds.includes(group.id);
      const isHovered = hoveredGroupId === group.id;

      const style = isSelected
        ? DRAW_STYLES.selected
        : isHovered
        ? DRAW_STYLES.hover
        : DRAW_STYLES.idle;

      ctx.lineWidth = style.line;
      ctx.strokeStyle = style.stroke;
      ctx.fillStyle = style.fill;

      // Desenha cada shape do grupo
      group.shapes.forEach((shape) => {
        const x = (shape.x / 100) * canvas.clientWidth;
        const y = (shape.y / 100) * canvas.clientHeight;
        const w = (shape.width / 100) * canvas.clientWidth;
        const h = (shape.height / 100) * canvas.clientHeight;

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      });

      // Tooltip (hover/touch) – 1 por grupo
      if (isHovered && group.shapes.length > 0) {
        const first = group.shapes[0];
        const x = (first.x / 100) * canvas.clientWidth;
        const y = (first.y / 100) * canvas.clientHeight;
        const text = `${group.name} — R$ ${group.price.toFixed(2)}`;

        ctx.font = DRAW_STYLES.tooltip.font(uiScale);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const metrics = ctx.measureText(text);
        const boxW = metrics.width + DRAW_STYLES.tooltip.padX * 2;
        const boxH = Math.max(24, Math.round(22 * uiScale)) + DRAW_STYLES.tooltip.padY;

        // manter tooltip visível dentro do canvas
        const tipX = Math.min(x, canvas.clientWidth - boxW - 6);
        const tipY = Math.max(y - 8, boxH + 6);

        ctx.fillStyle = DRAW_STYLES.tooltip.bg;
        ctx.fillRect(tipX, tipY - boxH, boxW, boxH);

        ctx.fillStyle = DRAW_STYLES.tooltip.color;
        ctx.fillText(text, tipX + DRAW_STYLES.tooltip.padX, tipY - 6);
      }

      // Badge numerado (sempre visível se não selecionado)
      if (!isSelected && group.shapes.length > 0) {
        const f = group.shapes[0];
        const bx = (f.x / 100) * canvas.clientWidth + 15;
        const by = (f.y / 100) * canvas.clientHeight + 15;

        ctx.beginPath();
        ctx.fillStyle = DRAW_STYLES.badge.bg;
        ctx.arc(bx, by, DRAW_STYLES.badge.r * uiScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = DRAW_STYLES.badge.txt;
        ctx.font = DRAW_STYLES.badge.font(uiScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), bx, by + 0.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    });
  }, [areaGroups, selectedGroupIds, hoveredGroupId, getUIScale]);

  // Redesenhar em mudanças visuais
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Seleção / hover helpers
  const isPointInGroup = (pxPct: number, pyPct: number, group: AreaGroup): boolean =>
    group.shapes.some(s =>
      pxPct >= s.x && pxPct <= s.x + s.width &&
      pyPct >= s.y && pyPct <= s.y + s.height
    );

  const findGroupAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;
    return areaGroups.find(g => isPointInGroup(xPct, yPct, g)) || null;
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Mouse
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = findGroupAt(e.clientX, e.clientY);
    if (g) toggleGroupSelection(g.id);
  };
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = findGroupAt(e.clientX, e.clientY);
    setHoveredGroupId(g ? g.id : null);
  };

  // Touch (mobile)
  const touchHideTimer = useRef<number | null>(null);
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    const g = findGroupAt(t.clientX, t.clientY);
    if (g) {
      // mostra tooltip por um curto tempo
      setHoveredGroupId(g.id);
      // alterna seleção no segundo toque rápido
      toggleGroupSelection(g.id);

      if (touchHideTimer.current) window.clearTimeout(touchHideTimer.current);
      touchHideTimer.current = window.setTimeout(() => setHoveredGroupId(null), 1200);
    }
  };

  // carregar imagem e ajustar canvas
  const handleImageLoad = () => {
    fitCanvasToContainer();
    drawCanvas();
  };

  // resize responsivo
  useEffect(() => {
    const onResize = () => {
      fitCanvasToContainer();
      drawCanvas();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitCanvasToContainer, drawCanvas]);

  // emitir mudanças
  useEffect(() => {
    const selected = areaGroups.filter(g => selectedGroupIds.includes(g.id));
    const total = selected.reduce((sum, g) => sum + g.price, 0);
    onSelectionChange(selected, total, selectedGender);
  }, [selectedGroupIds, areaGroups, selectedGender, onSelectionChange]);

  const needsGenderSelection = !bodySelectionType.includes('male') && !bodySelectionType.includes('female');
  const selectedGroups = areaGroups.filter(g => selectedGroupIds.includes(g.id));
  const totalPrice = selectedGroups.reduce((sum, g) => sum + g.price, 0);

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold">Selecione as áreas de aplicação</h3>

        {needsGenderSelection && (
          <div>
            <Label>Sexo do Cliente</Label>
            <RadioGroup
              value={selectedGender}
              onValueChange={(v) => setSelectedGender(v as 'male' | 'female')}
              className="mt-2 grid grid-cols-2 gap-3 max-w-xs"
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

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Área da imagem/canvas */}
          <div className="flex-1">
            <div ref={containerRef} className="w-full max-w-full">
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
                className="w-full max-h-[520px] sm:max-h-[640px] border border-border rounded-md touch-manipulation"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoveredGroupId(null)}
                onTouchStart={handleCanvasTouchStart}
              />
            </div>

            <div className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1">
              <p>• Toque ou clique nas áreas para selecionar</p>
              <p>• Passe o mouse (desktop) para ver os detalhes</p>
              <p>• Áreas em verde estão selecionadas</p>
            </div>
          </div>

          {/* Lista de áreas */}
          <div className="lg:w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Áreas Disponíveis</h4>
                <div className="space-y-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
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
                        <div className="text-xs sm:text-sm text-muted-foreground">
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
                    Selecione pelo menos uma área para continuar
                  </p>
                </div>
              )}

              {areaGroups.length === 0 && (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Nenhuma área configurada ainda.
                  </p>
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
