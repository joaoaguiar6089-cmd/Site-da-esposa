import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDiscountCalculation } from "@/hooks/useDiscountCalculation";
import { cn } from "@/lib/utils";

type Gender = "female" | "male";

interface AreaShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
  has_area_selection: boolean;
  gender: Gender;
  area_shapes?: AreaShape[] | null;
}

interface ProcedureSpecificationSelectorProps {
  procedureId: string;
  onSelectionChange?: (data: {
    selectedSpecifications: ProcedureSpecification[];
    totalPrice: number;
    selectedGender: Gender;
    discountInfo: {
      originalTotal: number;
      discountAmount: number;
      finalTotal: number;
      discountPercentage: number;
    };
  }) => void;
  initialSelections?: string[];
  bodySelectionType?: string | null;
  bodyImageUrl?: string | null;
  bodyImageUrlMale?: string | null;
}

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const normalizeGender = (g: any): Gender =>
  String(g || "female").toLowerCase().startsWith("m") ? "male" : "female";

const normalizeShapes = (raw: any): AreaShape[] | undefined => {
  if (!raw) return undefined;
  try {
    const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : [raw];
    return arr.filter(Boolean).map((s: any) => ({
      x: Number(s?.x ?? 0),
      y: Number(s?.y ?? 0),
      width: Number(s?.width ?? 0),
      height: Number(s?.height ?? 0),
    }));
  } catch {
    return undefined;
  }
};

const ProcedureSpecificationSelector = ({
  procedureId,
  onSelectionChange,
  initialSelections = [],
  bodySelectionType,
  bodyImageUrl,
  bodyImageUrlMale,
}: ProcedureSpecificationSelectorProps) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set(initialSelections));
  const [selectedGender, setSelectedGender] = useState<Gender>("female");
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredSpecId, setHoveredSpecId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  // Calculate totals
  const selectedSpecifications = useMemo(() => 
    specifications.filter((s) => selectedSpecs.has(s.id)), 
    [specifications, selectedSpecs]
  );
  
  const originalTotal = useMemo(() => 
    selectedSpecifications.reduce((sum, s) => sum + (s.price || 0), 0), 
    [selectedSpecifications]
  );

  const selectedGroupsCount = selectedSpecifications.length;

  // Use discount calculation hook
  const { discountResult } = useDiscountCalculation(procedureId, selectedGroupsCount, originalTotal);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("procedure_specifications")
          .select("*")
          .eq("procedure_id", procedureId)
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (error) throw error;
        const processed: ProcedureSpecification[] = (data ?? []).map((row: any) => ({
          id: String(row.id),
          name: String(row.name ?? ""),
          description: row.description ?? null,
          price: Number(row.price ?? 0),
          display_order: Number(row.display_order ?? 0),
          is_active: Boolean(row.is_active),
          has_area_selection: Boolean(row.has_area_selection),
          gender: normalizeGender(row.gender),
          area_shapes: normalizeShapes(row.area_shapes),
        }));
        if (!cancelled) setSpecifications(processed);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Erro",
            description: "Falha ao carregar especificações do procedimento.",
            variant: "destructive",
          });
          setSpecifications([]);
          console.error("Erro ao carregar especificações:", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => void (cancelled = true);
  }, [procedureId, toast]);

  // Callback for selection changes
  const handleSelectionChange = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange({
        selectedSpecifications,
        totalPrice: discountResult.finalTotal,
        selectedGender,
        discountInfo: {
          originalTotal: discountResult.originalTotal,
          discountAmount: discountResult.discountAmount,
          finalTotal: discountResult.finalTotal,
          discountPercentage: discountResult.discountPercentage,
        }
      });
    }
  }, [selectedSpecifications, discountResult, selectedGender, onSelectionChange]);

  useEffect(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  const imageUrl = useMemo(() => {
    if (selectedGender === "male") return bodyImageUrlMale || "/images/body-male-default.png";
    return bodyImageUrl || "/images/body-female-default.png";
  }, [selectedGender, bodyImageUrl, bodyImageUrlMale]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw ALL areas for ALL specifications (regardless of gender filter)
    const allSpecsWithAreas = specifications.filter(
      (s) => s.has_area_selection && s.area_shapes && s.area_shapes.length > 0
    );
    
    console.log('Drawing areas for specifications:', allSpecsWithAreas.map(s => ({ 
      id: s.id, 
      name: s.name, 
      gender: s.gender, 
      areas: s.area_shapes?.length || 0 
    })));
    
    allSpecsWithAreas.forEach((spec) => {
      const isSelected = selectedSpecs.has(spec.id);
      const isHovered = hoveredSpecId === spec.id;
      
      // Only show areas for current gender or if no gender specified
      if (spec.gender && spec.gender !== selectedGender) {
        return;
      }
      
      (spec.area_shapes ?? []).forEach((shape, shapeIndex) => {
        console.log(`Drawing shape ${shapeIndex} for spec ${spec.name}:`, shape);
        
        const x = (shape.x / 100) * canvas.width;
        const y = (shape.y / 100) * canvas.height;
        const w = (shape.width / 100) * canvas.width;
        const h = (shape.height / 100) * canvas.height;
        
        // Fill area
        ctx.fillStyle = isSelected
          ? isHovered
            ? "rgba(16,185,129,0.5)"
            : "rgba(16,185,129,0.3)"
          : isHovered
          ? "rgba(107,114,128,0.3)"
          : "rgba(107,114,128,0.1)";
        ctx.fillRect(x, y, w, h);
        
        // Draw border
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeStyle = isSelected ? "#10B981" : "#6B7280";
        ctx.strokeRect(x, y, w, h);
        
        // Add label for better visibility during debugging
        if (isHovered || isSelected) {
          ctx.fillStyle = "#000";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(spec.name, x + w/2, y + h/2);
        }
      });
    });
  };

  const getCanvasXY = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
  };

  const pointInSpec = (x: number, y: number, spec: ProcedureSpecification) => {
    if (!spec.area_shapes) return false;
    // Allow any gender or match current gender
    if (spec.gender && spec.gender !== selectedGender) return false;
    
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    return (spec.area_shapes ?? []).some((shape) => {
      const sx = (shape.x / 100) * canvas.width;
      const sy = (shape.y / 100) * canvas.height;
      const sw = (shape.width / 100) * canvas.width;
      const sh = (shape.height / 100) * canvas.height;
      return x >= sx && x <= sx + sw && y >= sy && y <= sy + sh;
    });
  };

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasXY(e);
    const hovered = specifications.find(
      (s) => s.has_area_selection && s.area_shapes && 
             (!s.gender || s.gender === selectedGender) && 
             pointInSpec(x, y, s)
    );
    setHoveredSpecId(hovered?.id || null);
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasXY(e);
    const clicked = specifications.find(
      (s) => s.has_area_selection && s.area_shapes && 
             (!s.gender || s.gender === selectedGender) && 
             pointInSpec(x, y, s)
    );
    if (clicked) {
      console.log('Clicked on specification:', clicked.name);
      setSelectedSpecs((prev) => {
        const next = new Set(prev);
        if (next.has(clicked.id)) next.delete(clicked.id);
        else next.add(clicked.id);
        return next;
      });
    }
  };

  const onImageLoad = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const maxWidth = 400;
    const ratio = img.naturalHeight / img.naturalWidth || 4 / 3;
    canvas.width = maxWidth;
    canvas.height = Math.round(maxWidth * ratio);
    drawCanvas();
  };

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, selectedGender, specifications, selectedSpecs, hoveredSpecId]);

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
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Nenhuma especificação ativa para este procedimento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyArea = specifications.some((s) => s.has_area_selection);

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Especificações do procedimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasAnyArea && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border">
              <Label className="text-sm font-medium text-foreground">Selecione o gênero:</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={selectedGender === "female" ? "default" : "outline"} 
                  onClick={() => { setSelectedGender("female"); setHoveredSpecId(null); }} 
                  size="sm"
                  className="transition-all duration-200 hover:scale-105"
                >
                  Feminino
                </Button>
                <Button 
                  type="button" 
                  variant={selectedGender === "male" ? "default" : "outline"} 
                  onClick={() => { setSelectedGender("male"); setHoveredSpecId(null); }} 
                  size="sm"
                  className="transition-all duration-200 hover:scale-105"
                >
                  Masculino
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-3">
                {specifications.map((spec) => {
                  const selected = selectedSpecs.has(spec.id);
                  return (
                    <div 
                      key={spec.id} 
                      className={cn(
                        "rounded-lg border p-4 transition-all duration-200 hover:shadow-md",
                        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`spec-${spec.id}`}
                          checked={selected}
                          onCheckedChange={(c: boolean) =>
                            setSelectedSpecs((prev) => {
                              const next = new Set(prev);
                              if (c) next.add(spec.id);
                              else next.delete(spec.id);
                              return next;
                            })
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`spec-${spec.id}`} className="cursor-pointer font-medium leading-snug">
                            {spec.name}
                          </Label>
                          <div className="text-sm text-muted-foreground">
                            {spec.description && <p className="mb-1">{spec.description}</p>}
                            <div className="font-medium text-foreground">
                              {spec.price > 0 ? currency(spec.price) : "Sem custo adicional"}
                            </div>
                          </div>
                          {spec.has_area_selection && (
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                Seleção de área
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {spec.gender === "male" ? "Masculino" : "Feminino"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3 p-4 bg-gradient-to-r from-muted/30 to-muted/20 rounded-lg border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{currency(discountResult.originalTotal)}</span>
                </div>
                
                {discountResult.discountAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span>Desconto ({discountResult.discountPercentage}%):</span>
                      <span className="font-medium">-{currency(discountResult.discountAmount)}</span>
                    </div>
                    <Separator />
                  </>
                )}
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{currency(discountResult.finalTotal)}</span>
                </div>
                
                {discountResult.discountAmount > 0 && (
                  <div className="text-xs text-center text-green-600 font-medium">
                    Você economizou {currency(discountResult.discountAmount)}!
                  </div>
                )}
              </div>
            </div>

            {hasAnyArea && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h4 className="font-medium text-sm">Seleção de áreas</h4>
                  <p className="text-xs text-muted-foreground">
                    Clique nas áreas destacadas na imagem para selecionar
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="relative border-2 border-border rounded-xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 shadow-lg max-w-sm">
                    <canvas 
                      ref={canvasRef} 
                      className="w-full cursor-crosshair transition-all duration-200 hover:scale-[1.02]" 
                      onMouseMove={onCanvasMove} 
                      onClick={onCanvasClick} 
                    />
                    <img
                      ref={imageRef}
                      src={imageUrl || ""}
                      alt="Mapa corporal"
                      className="absolute inset-0 w-px h-px opacity-0 pointer-events-none"
                      onLoad={onImageLoad}
                      onError={() =>
                        toast({
                          title: "Imagem indisponível",
                          description: "Não foi possível carregar a imagem de apoio. Você ainda pode selecionar pela lista.",
                          variant: "destructive",
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedSpecifications.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-3 text-sm text-primary">Especificações selecionadas:</h4>
              <div className="grid gap-2">
                {selectedSpecifications.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-sm bg-background/50 p-2 rounded">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-primary font-semibold">
                      {s.price > 0 ? currency(s.price) : "Sem custo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcedureSpecificationSelector;
