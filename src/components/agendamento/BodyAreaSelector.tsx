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
      i
