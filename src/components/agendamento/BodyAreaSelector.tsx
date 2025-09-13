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

type TooltipState = {
  visible: boolean;
  text: string;
  // Posição em px relativa ao wrapper
  left: number;
  top: number;
};

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    text: '',
    left: 0,
    top: 0,
  });

  // Timer para esconder tooltip no mobile
  const hideTooltipTimer = useRef<number | null>(null);

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

  // ========= SUPABASE =========
  const loadAreaGroups = async () => {
    const { data, error } = await (supabase as any)
      .from('body_area_groups')
      .select('*')
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('Erro ao carregar grupos de áreas:', error);
      return;
    }

    const mappedGroups = (data || []).map((group: any) => ({
      id: group.id,
      name: group.name,
      price: group.price,
      shapes: group.shapes as AreaShape[]
    }));

    setAreaGroups(mappedGroups);
  };

  // ========= CANVAS =========
  const resizeCanvasToDisplaySize = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    // Tamanho CSS já é controlado pelo Tailwind (max-w-full, max-h-96).
    // Precisamos ajustar o buffer interno (atributos width/height) para DPR.
    const dpr = window.devicePixelRatio || 1;
    // Medidas calculadas via CSS (tamanho que o canvas ocupa na tela):
    const rect = canvas.getBoundingClientRect();
    // Define o buffer interno levando em conta o DPR para ficar nítido:
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Normaliza o sistema de coordenadas
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    resizeCanvasToDisplaySize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Desenha a imagem ajustada ao tamanho CSS do canvas mantendo aspect-fill (object-contain visual simulado)
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    // Dimensões naturais da imagem:
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const imageAspect = iw / ih;
    const canvasAspect = cw / ch;

    let drawW = cw;
    let drawH = ch;
    let dx = 0;
    let dy = 0;

    // "object-contain": encaixa a imagem inteira dentro do canvas
    if (imageAspect > canvasAspect) {
      // imagem mais "larga": largura bate, altura centraliza
      drawH = cw / imageAspect;
      dy = (ch - drawH) / 2;
    } else {
      // imagem mais "alta": altura bate, largura centraliza
      drawW = ch * imageAspect;
      dx = (cw - drawW) / 2;
    }

    // Fundo branco (opcional)
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cw, ch);

    ctx.drawImage(image, 0, 0, iw, ih, dx, dy, drawW, drawH);

    areaGroups.forEach((group, groupIndex) => {
      const isSelected = selectedGroupIds.includes(group.id);
      const isHovered = hoveredGroupId === group.id;

      let strokeColor = 'rgba(239, 68, 68, 0.9)'; // vermelho/hover
      let fillColor = 'transparent';
      let lineWidth = 2;

      if (isSelected) {
        strokeColor = '#22c55e'; // verde
        fillColor = 'rgba(34, 197, 94, 0.28)'; // leve transparência
        lineWidth = 3;
      } else if (isHovered) {
        strokeColor = '#ef4444';
        fillColor = 'rgba(239, 68, 68, 0.28)';
        lineWidth = 2;
      }

      group.shapes.forEach((shape) => {
        // Converter porcentagens para coordenadas dentro do retângulo desenhado (dx,dy,drawW,drawH)
        const x = dx + (shape.x / 100) * drawW;
        const y = dy + (shape.y / 100) * drawH;
        const width = (shape.width / 100) * drawW;
        const height = (shape.height / 100) * drawH;

        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth;

        if (fillColor !== 'transparent') {
          ctx.fillRect(x, y, width, height);
        }
        ctx.strokeRect(x, y, width, height);
      });

      // Marcador numérico quando não selecionado/hover (mantido)
      if (!isSelected && !isHovered && group.shapes.length > 0) {
        const s = group.shapes[0];
        const x = dx + (s.x / 100) * drawW;
        const y = dy + (s.y / 100) * drawH;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 13, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'center';
        ctx.fillText((groupIndex + 1).toString(), x + 16, y + 20);
        ctx.textAlign = 'left';
      }
    });
  }, [areaGroups, selectedGroupIds, hoveredGroupId]);

  // ========= HIT TEST =========
  const isPointInGroup = (xPct: number, yPct: number, group: AreaGroup): boolean => {
    return group.shapes.some(shape =>
      xPct >= shape.x && xPct <= shape.x + shape.width &&
      yPct >= shape.y && yPct <= shape.y + shape.height
    );
  };

  // ========= TOOLTIP HELPERS =========
  const showTooltipAt = (clientX: number, clientY: number, text: string) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    // Posição base (offset do wrapper)
    let left = clientX - wrapperRect.left + 14; // leve offset à direita
    let top = clientY - wrapperRect.top + 14;   // leve offset abaixo

    // Tamanhos estimados (ajustados depois via CSS responsivo). Para garantir que não estoure, usamos um "limite".
    const estWidth = 260;  // estimativa conservadora
    const estHeight = 56;  // estimativa conservadora

    // Ajustes para manter dentro do wrapper
    if (left + estWidth > wrapperRect.width - 8) {
      left = Math.max(8, wrapperRect.width - estWidth - 8);
    }
    if (top + estHeight > wrapperRect.height - 8) {
      top = Math.max(8, wrapperRect.height - estHeight - 8);
    }

    setTooltip({ visible: true, text, left, top });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // ========= EVENTS =========
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const clickedGroup = areaGroups.find(group => isPointInGroup(xPct, yPct, group));

    // No mobile, também mostramos tooltip fixo por alguns segundos
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (clickedGroup) {
      toggleGroupSelection(clickedGroup.id);

      const text = `${clickedGroup.name} — R$ ${clickedGroup.price.toFixed(2)}`;
      showTooltipAt(e.clientX, e.clientY, text);

      if (isMobile) {
        if (hideTooltipTimer.current) {
          window.clearTimeout(hideTooltipTimer.current);
        }
        hideTooltipTimer.current = window.setTimeout(() => {
          hideTooltip();
        }, 2500);
      }
    } else if (isMobile) {
      // Toque fora: esconde tooltip
      hideTooltip();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const hoveredGroup = areaGroups.find(group => isPointInGroup(xPct, yPct, group));
    setHoveredGroupId(hoveredGroup ? hoveredGroup.id : null);

    if (hoveredGroup) {
      const text = `${hoveredGroup.name} — R$ ${hoveredGroup.price.toFixed(2)}`;
      showTooltipAt(e.clientX, e.clientY, text);
    } else {
      hideTooltip();
    }
  };

  const handleMouseLeave = () => {
    setHoveredGroupId(null);
    hideTooltip();
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleImageLoad = () => {
    drawCanvas();
  };

  // Atualiza canvas no resize (mantém nitidez e layout)
  useEffect(() => {
    const onResize = () => drawCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawCanvas]);

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
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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

          {/* ==== LADO DO CANVAS + TOOLTIP ==== */}
          <div className="flex-1 order-2 md:order-1 flex justify-center items-start">
            <div ref={wrapperRef} className="relative inline-block">
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
                className="max-w-full max-h-96 border border-border cursor-pointer object-contain"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '24rem',
                }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleMouseLeave}
              />

              {/* TOOLTIP OVERLAY */}
              {tooltip.visible && (
                <div
                  className="
                    absolute z-10 select-none
                    px-3 py-2 rounded-xl
                    bg-black/80 text-white
                    shadow-lg border border-white/10
                    backdrop-blur-sm
                    text-sm md:text-base lg:text-lg
                    leading-tight
                    pointer-events-none
                    max-w-[80vw] md:max-w-[360px]
                  "
                  style={{
                    left: tooltip.left,
                    top: tooltip.top,
                    // pequena animação/elevação
                    transform: 'translateZ(0)',
                  }}
                >
                  <div className="font-semibold">{tooltip.text}</div>
                  {/* Indicador opcional de ajuda no mobile */}
                  <div className="mt-1 hidden [@media(max-width:768px)]:block text-[11px] opacity-80">
                    Toque novamente para selecionar/deselecionar
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
