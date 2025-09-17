import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, X, Upload, Image, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import ProcedureDiscountManager from "./ProcedureDiscountManager";

interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
  has_area_selection: boolean;
  area_shapes: any;
  gender: string;
  created_at: string;
  updated_at: string;
}

interface ProcedureSpecificationsManagerProps {
  procedureId: string;
  procedureName: string;
  onClose: () => void;
}

const ProcedureSpecificationsManager = ({ procedureId, procedureName, onClose }: ProcedureSpecificationsManagerProps) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<ProcedureSpecification | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    display_order: "1"
  });

  // Estado para seleção de áreas no formulário
  const [currentShapes, setCurrentShapes] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<any | null>(null);
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female');
  
  // Estado para armazenar áreas por gênero separadamente
  const [areasByGender, setAreasByGender] = useState<{
    female: any[];
    male: any[];
  }>({
    female: [],
    male: []
  });
  
  // Refs para canvas integrado
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Procedure-level settings
  const [procedureSettings, setProcedureSettings] = useState({
    requires_body_image_selection: false,
    body_selection_type: "",
    body_image_url: "",
    body_image_url_male: "",
    requires_specifications: false
  });

  // Image uploads
  const [selectedBodyImageFile, setSelectedBodyImageFile] = useState<File | null>(null);
  const [selectedBodyImageMaleFile, setSelectedBodyImageMaleFile] = useState<File | null>(null);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [uploadingBodyImageMale, setUploadingBodyImageMale] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadSpecifications();
    loadProcedureSettings();
  }, [procedureId]);

  const loadSpecifications = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_specifications')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('display_order');

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar especificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProcedureSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('requires_body_image_selection, body_selection_type, body_image_url, body_image_url_male, requires_specifications')
        .eq('id', procedureId)
        .single();

      if (error) throw error;
      setProcedureSettings({
        requires_body_image_selection: data?.requires_body_image_selection || false,
        body_selection_type: data?.body_selection_type || "",
        body_image_url: data?.body_image_url || "",
        body_image_url_male: data?.body_image_url_male || "",
        requires_specifications: data?.requires_specifications || false
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProcedureSettings = async (settings: Partial<typeof procedureSettings>) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update(settings)
        .eq('id', procedureId);

      if (error) throw error;

      setProcedureSettings(prev => ({ ...prev, ...settings }));
      
      toast({
        title: "Configurações atualizadas",
        description: "As configurações do procedimento foram atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadBodyImage = async (file: File) => {
    if (!file) return;

    setUploadingBodyImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `body-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('procedure-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(fileName);

      await updateProcedureSettings({ body_image_url: publicUrl });

      setSelectedBodyImageFile(null);
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBodyImage(false);
    }
  };

  const uploadBodyImageMale = async (file: File) => {
    if (!file) return;

    setUploadingBodyImageMale(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `body-male-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('procedure-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('procedure-images')
        .getPublicUrl(fileName);

      await updateProcedureSettings({ body_image_url_male: publicUrl });

      setSelectedBodyImageMaleFile(null);
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBodyImageMale(false);
    }
  };

  // Salvar áreas do gênero atual
  const saveCurrentGenderAreas = () => {
    setAreasByGender(prev => ({
      ...prev,
      [selectedGender]: currentShapes
    }));
    
    toast({
      title: "Áreas salvas",
      description: `Áreas do gênero ${selectedGender === 'female' ? 'feminino' : 'masculino'} foram salvas.`,
    });
  };

  // Trocar de gênero carregando as áreas salvas
  const switchGender = (newGender: 'female' | 'male') => {
    // Salvar áreas atuais antes de trocar
    setAreasByGender(prev => ({
      ...prev,
      [selectedGender]: currentShapes
    }));
    
    // Trocar para o novo gênero e carregar suas áreas
    setSelectedGender(newGender);
    setCurrentShapes(areasByGender[newGender]);
    setCurrentShape(null);
  };

  const clearCurrentShapes = () => {
    setCurrentShapes([]);
    setCurrentShape(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da especificação é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Validação para novas especificações que requerem área
    if (!editingSpec && procedureSettings.requires_body_image_selection && currentShapes.length === 0) {
      toast({
        title: "Área obrigatória",
        description: "Selecione pelo menos uma área para esta especificação.",
        variant: "destructive",
      });
      return;
    }

    try {
      const specData = {
        procedure_id: procedureId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price) || 0,
        display_order: parseInt(formData.display_order) || 1,
        is_active: true
      };

      if (editingSpec) {
        const { error } = await supabase
          .from('procedure_specifications')
          .update({
            name: specData.name,
            description: specData.description,
            price: specData.price,
            display_order: specData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSpec.id);

        if (error) throw error;
        
        // Atualizando especificação existente - atualizar áreas se necessário
        if (procedureSettings.requires_body_image_selection) {
          const finalAreas = currentShapes.length > 0 ? currentShapes : areasByGender[selectedGender];
          
          const areaUpdateData = finalAreas && finalAreas.length > 0 ? {
            has_area_selection: true,
            area_shapes: finalAreas,
            gender: selectedGender
          } : {
            has_area_selection: false,
            area_shapes: null,
            gender: selectedGender
          };

          const { error: areasError } = await supabase
            .from('procedure_specifications')
            .update(areaUpdateData)
            .eq('id', editingSpec.id);

          if (areasError) {
            console.warn('Erro ao salvar áreas:', areasError);
          }
        }
        
        toast({
          title: "Especificação atualizada",
          description: "A especificação foi atualizada com sucesso.",
        });
      } else {
        // Criar nova especificação
        const { data: newSpec, error: specError } = await supabase
          .from('procedure_specifications')
          .insert([specData])
          .select()
          .single();

        if (specError) throw specError;

        // Se há áreas selecionadas, atualizar a especificação com as áreas
        if (procedureSettings.requires_body_image_selection) {
          const finalAreas = currentShapes.length > 0 ? currentShapes : areasByGender[selectedGender];
          
          if (finalAreas && finalAreas.length > 0) {
            const { error: areasError } = await supabase
              .from('procedure_specifications')
              .update({
                has_area_selection: true,
                area_shapes: finalAreas,
                gender: selectedGender
              })
              .eq('id', newSpec.id);

            if (areasError) {
              console.warn('Erro ao salvar áreas:', areasError);
            }
          }
        }
        
        toast({
          title: "Especificação criada",
          description: "A especificação foi criada com sucesso.",
        });
      }

      resetForm();
      setDialogOpen(false);
      loadSpecifications();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (spec: ProcedureSpecification) => {
    setEditingSpec(spec);
    setFormData({
      name: spec.name,
      description: spec.description || "",
      price: spec.price.toString(),
      display_order: spec.display_order.toString()
    });
    
    // Carregar áreas existentes se houver para o gênero específico
    if (spec.has_area_selection && spec.area_shapes) {
      const specGender = spec.gender as 'female' | 'male';
      setSelectedGender(specGender);
      setCurrentShapes(spec.area_shapes as any[]);
      
      // Atualizar o estado das áreas por gênero
      setAreasByGender(prev => ({
        ...prev,
        [specGender]: spec.area_shapes as any[]
      }));
    } else {
      setCurrentShapes([]);
      setSelectedGender('female'); // Default para feminino
      setAreasByGender({
        female: [],
        male: []
      });
    }
    
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a especificação "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('procedure_specifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Especificação removida",
        description: "A especificação foi excluída com sucesso.",
      });
      
      loadSpecifications();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      display_order: "1"
    });
    setEditingSpec(null);
    setCurrentShapes([]);
    setCurrentShape(null);
    setAreasByGender({
      female: [],
      male: []
    });
    setSelectedGender('female');
  };

  // Funções para desenho de áreas no formulário
  const getCurrentImageUrl = useCallback(() => {
    if (procedureSettings.body_selection_type === 'custom') {
      return selectedGender === 'male' && procedureSettings.body_image_url_male 
        ? procedureSettings.body_image_url_male 
        : procedureSettings.body_image_url;
    }

    const defaultImages = {
      'face_male': '/images/face-male-default.png',
      'face_female': '/images/face-female-default.png',
      'body_male': '/images/body-male-default.png',
      'body_female': '/images/body-female-default.png'
    } as const;

    if (procedureSettings.body_selection_type && procedureSettings.body_selection_type.includes('_')) {
      const imageKey = procedureSettings.body_selection_type as keyof typeof defaultImages;
      return defaultImages[imageKey] || procedureSettings.body_image_url || '';
    }

    return defaultImages[`body_${selectedGender}`] || procedureSettings.body_image_url || '';
  }, [procedureSettings, selectedGender]);

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

    // Desenhar formas temporárias
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
  }, [currentShapes, currentShape]);

  // Handle area selection
  const [draggedShape, setDraggedShape] = useState<{ index: number; offset: { x: number; y: number } } | null>(null);

  const getShapeAtPoint = (x: number, y: number) => {
    for (let i = currentShapes.length - 1; i >= 0; i--) {
      const shape = currentShapes[i];
      if (x >= shape.x && x <= shape.x + shape.width &&
          y >= shape.y && y <= shape.y + shape.height) {
        return i;
      }
    }
    return -1;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const shapeIndex = getShapeAtPoint(coords.x, coords.y);
    
    if (shapeIndex >= 0) {
      const shape = currentShapes[shapeIndex];
      setDraggedShape({
        index: shapeIndex,
        offset: {
          x: coords.x - shape.x,
          y: coords.y - shape.y
        }
      });
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

    if (draggedShape !== null) {
      const newShapes = [...currentShapes];
      newShapes[draggedShape.index] = {
        ...newShapes[draggedShape.index],
        x: coords.x - draggedShape.offset.x,
        y: coords.y - draggedShape.offset.y
      };
      setCurrentShapes(newShapes);
      drawCanvas();
    } else if (isDrawing && currentShape) {
      setCurrentShape({
        x: Math.min(coords.x, currentShape.x),
        y: Math.min(coords.y, currentShape.y),
        width: Math.abs(coords.x - currentShape.x),
        height: Math.abs(coords.y - currentShape.y)
      });
      drawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (draggedShape !== null) {
      setDraggedShape(null);
    } else if (isDrawing && currentShape) {
      if (currentShape.width > 1 && currentShape.height > 1) {
        setCurrentShapes(prev => [...prev, currentShape]);
      }
      setIsDrawing(false);
      setCurrentShape(null);
    }
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const maxWidth = 400;
    const maxHeight = 400;
    
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

  const handleNewSpec = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando especificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Especificações do Procedimento</h2>
          <p className="text-muted-foreground">{procedureName}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewSpec}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Especificação  
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Procedure Image Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Imagem para Seleção de Área</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_body_image_selection"
              checked={procedureSettings.requires_body_image_selection}
              onCheckedChange={(checked) => 
                updateProcedureSettings({ requires_body_image_selection: checked as boolean })
              }
            />
            <Label htmlFor="requires_body_image_selection" className="text-sm font-medium">
              Requer imagem para seleção de área
            </Label>
          </div>

          {procedureSettings.requires_body_image_selection && (
            <div className="space-y-4 ml-6">
              <div>
                <Label htmlFor="body_selection_type">Tipo de Seleção</Label>
                <Select 
                  value={procedureSettings.body_selection_type} 
                  onValueChange={(value) => updateProcedureSettings({ body_selection_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="face_male">Rosto Masculino</SelectItem>
                    <SelectItem value="face_female">Rosto Feminino</SelectItem>
                    <SelectItem value="body_male">Corpo Masculino</SelectItem>
                    <SelectItem value="body_female">Corpo Feminino</SelectItem>
                    <SelectItem value="custom">Imagem Customizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {procedureSettings.body_selection_type === 'custom' && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Imagens Personalizadas</h4>
                  
                  {/* Female Image Upload */}
                  <div className="space-y-2 p-3 border rounded">
                    <h5 className="font-medium text-sm">Imagem Feminina</h5>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedBodyImageFile(e.target.files?.[0] || null)}
                    />
                    {selectedBodyImageFile && (
                      <Button
                        type="button"
                        onClick={() => uploadBodyImage(selectedBodyImageFile)}
                        disabled={uploadingBodyImage}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingBodyImage ? 'Enviando...' : 'Upload'}
                      </Button>
                    )}
                    {procedureSettings.body_image_url && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={procedureSettings.body_image_url} 
                          alt="Preview feminino" 
                          className="w-20 h-20 object-contain rounded border" 
                        />
                        <Badge variant="secondary">Imagem carregada</Badge>
                      </div>
                    )}
                  </div>

                  {/* Male Image Upload */}
                  <div className="space-y-2 p-3 border rounded">
                    <h5 className="font-medium text-sm">Imagem Masculina (Opcional)</h5>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedBodyImageMaleFile(e.target.files?.[0] || null)}
                    />
                    {selectedBodyImageMaleFile && (
                      <Button
                        type="button"
                        onClick={() => uploadBodyImageMale(selectedBodyImageMaleFile)}
                        disabled={uploadingBodyImageMale}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingBodyImageMale ? 'Enviando...' : 'Upload'}
                      </Button>
                    )}
                    {procedureSettings.body_image_url_male && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={procedureSettings.body_image_url_male} 
                          alt="Preview masculino" 
                          className="w-20 h-20 object-contain rounded border" 
                        />
                        <Badge variant="secondary">Imagem carregada</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {specifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma especificação cadastrada para este procedimento.
            </p>
            <Button onClick={handleNewSpec}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Especificação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Especificações Cadastradas ({specifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specifications.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell className="font-medium">{spec.name}</TableCell>
                    <TableCell>
                      {spec.description ? (
                        <span className="text-sm text-muted-foreground">
                          {spec.description.length > 50 
                            ? `${spec.description.substring(0, 50)}...` 
                            : spec.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem descrição</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {spec.price > 0 ? (
                        <span className="font-medium">
                          R$ {spec.price.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Gratuito</span>
                      )}
                    </TableCell>
                    <TableCell>{spec.display_order}</TableCell>
                    <TableCell>
                      <Badge variant={spec.is_active ? "default" : "secondary"}>
                        {spec.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(spec)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(spec.id, spec.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sistema de Promoções */}
      <ProcedureDiscountManager 
        procedureId={procedureId}
        requiresBodySelection={procedureSettings.requires_body_image_selection}
        requiresSpecifications={procedureSettings.requires_specifications}
      />

      {/* Dialog para criar/editar especificação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSpec ? "Editar Especificação" : "Nova Especificação"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Especificação *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vitamina C, Ácido Hialurônico..."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os benefícios e características desta especificação..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
            </div>

            {/* Seleção de áreas - aparece quando o procedimento requer imagem */}
            {procedureSettings.requires_body_image_selection && procedureSettings.body_selection_type && (
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Selecione as Áreas da Especificação
                </Label>
                
                {/* Seletor de Gênero - só aparece para imagens customizadas com ambos os gêneros */}
                {(procedureSettings.body_selection_type === 'custom' && 
                  procedureSettings.body_image_url && procedureSettings.body_image_url_male) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Gênero:</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={selectedGender === 'female' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => switchGender('female')}
                      >
                        Feminino
                      </Button>
                      <Button
                        type="button"
                        variant={selectedGender === 'male' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => switchGender('male')}
                      >
                        Masculino
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center space-y-2">
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
                    className="border border-border cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      setIsDrawing(false);
                      setDraggedShape(null);
                    }}
                  />
                  
                  {currentShapes.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {currentShapes.length} área(s) desenhada(s). Use "Salvar Áreas" para confirmar.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button 
                    type="button" 
                    onClick={saveCurrentGenderAreas} 
                    variant="default" 
                    size="sm"
                    disabled={currentShapes.length === 0}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Salvar Áreas ({selectedGender === 'female' ? 'Feminino' : 'Masculino'})
                  </Button>
                  <Button 
                    type="button" 
                    onClick={clearCurrentShapes} 
                    variant="outline" 
                    size="sm"
                  >
                    Limpar Áreas
                  </Button>
                </div>
                
                {/* Indicador de áreas salvas */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span>Feminino:</span> 
                    <Badge variant={areasByGender.female.length > 0 ? "default" : "secondary"}>
                      {areasByGender.female.length} área(s)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Masculino:</span> 
                    <Badge variant={areasByGender.male.length > 0 ? "default" : "secondary"}>
                      {areasByGender.male.length} área(s)
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSpec ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcedureSpecificationsManager;