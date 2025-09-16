import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const selected = specifications.filter((s) => selectedSpecs.has(s.id));
    const total = selected.reduce((sum, s) => sum + (s.price || 0), 0);
    onSelectionChange?.({ selectedSpecifications: selected, totalPrice: total, selectedGender });
  }, [specifications, selectedSpecs, selectedGender, onSelectionChange]);

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

    // Draw ALL areas for CURRENT gender (selected or not)
    const specsWithAreas = specifications.filter(
      (s) => s.has_area_selection && s.area_shapes && s.gender === selectedGender
    );
    specsWithAreas.forEach((spec) => {
      const isSelected = selectedSpecs.has(spec.id);
      const isHovered = hoveredSpecId === spec.id;
      (spec.area_shapes ?? []).forEach((shape) => {
        const x = (shape.x / 100) * canvas.width;
        const y = (shape.y / 100) * canvas.height;
        const w = (shape.width / 100) * canvas.width;
        const h = (shape.height / 100) * canvas.height;
        ctx.fillStyle = isSelected
          ? isHovered
            ? "rgba(16,185,129,0.5)"
            : "rgba(16,185,129,0.3)"
          : isHovered
          ? "rgba(107,114,128,0.3)"
          : "rgba(107,114,128,0.1)";
        ctx.fillRect(x, y, w, h);
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeStyle = isSelected ? "#10B981" : "#6B7280";
        ctx.strokeRect(x, y, w, h);
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
    if (!spec.area_shapes || spec.gender !== selectedGender) return false;
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
      (s) => s.has_area_selection && s.gender === selectedGender && pointInSpec(x, y, s)
    );
    setHoveredSpecId(hovered?.id || null);
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasXY(e);
    const clicked = specifications.find(
      (s) => s.has_area_selection && s.gender === selectedGender && pointInSpec(x, y, s)
    );
    if (clicked) {
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
  const total = specifications.filter((s) => selectedSpecs.has(s.id)).reduce((sum, s) => sum + (s.price || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Especificações do procedimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnyArea && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Gênero para a imagem:</Label>
            <div className="flex gap-2">
              <Button type="button" variant={selectedGender === "female" ? "default" : "outline"} onClick={() => { setSelectedGender("female"); setHoveredSpecId(null); }} size="sm">Feminino</Button>
              <Button type="button" variant={selectedGender === "male" ? "default" : "outline"} onClick={() => { setSelectedGender("male"); setHoveredSpecId(null); }} size="sm">Masculino</Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {specifications.map((spec) => {
              const selected = selectedSpecs.has(spec.id);
              return (
                <div key={spec.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
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
                    />
                    <div>
                      <Label htmlFor={`spec-${spec.id}`} className="cursor-pointer">{spec.name}</Label>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {spec.price > 0 ? currency(spec.price) : "Sem custo adicional"}
                      </div>
                      {spec.has_area_selection && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="mr-2">seleção de área</Badge>
                          <Badge variant="outline">{spec.gender === "male" ? "masculino" : "feminino"}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{currency(total)}</span>
            </div>
          </div>

          {hasAnyArea && (
            <div>
              <Label className="text-sm mb-2 block">Clique nas áreas destacadas para (de)selecionar.</Label>
              <div className="relative border rounded-md overflow-hidden bg-muted/30 max-w-xs mx-auto">
                <canvas ref={canvasRef} className="w-full cursor-crosshair" onMouseMove={onCanvasMove} onClick={onCanvasClick} />
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
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {Array.from(selectedSpecs).length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-medium mb-1 text-sm">Selecionados:</h4>
            <div className="space-y-0.5 text-sm">
              {specifications.filter((s) => selectedSpecs.has(s.id)).map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span>{s.name}</span>
                  <span>{s.price > 0 ? currency(s.price) : "Sem custo"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcedureSpecificationSelector;
