import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Filter, Search, TrendingUp } from "lucide-react";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"];
type SpecificationRow = Database["public"]["Tables"]["procedure_specifications"]["Row"];
type GoalRow = Database["public"]["Tables"]["procedure_monthly_goals"]["Row"];

type ProcedureWithRelations = ProcedureRow & {
  categories?: { name: string | null } | null;
  subcategories?: { name: string | null } | null;
};

type SpecificationWithProcedure = SpecificationRow & {
  procedures?: ProcedureWithRelations | null;
};

type GoalWithRelations = GoalRow & {
  procedures?: ProcedureWithRelations | null;
  procedure_specifications?: SpecificationRow | null;
};

type PricingRow = {
  rowKey: string;
  type: "procedure" | "specification";
  procedureId: string;
  specificationId?: string;
  displayName: string;
  price: number | null;
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
};

type GoalDetail = GoalWithRelations & {
  displayName: string;
  unitPrice: number;
  categoryName?: string | null;
  subcategoryName?: string | null;
};

const ALL_CATEGORIES = "all";
const ALL_SUBCATEGORIES = "all";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const getCurrentMonthKey = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const formatCurrency = (value: number) => currencyFormatter.format(value);

const parsePriceInput = (value: string): number | null => {
  if (!value) return null;
  const trimmed = value.replace(/R\$/gi, "").trim();
  if (!trimmed) return null;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized = trimmed;

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
};

const getMonthLabel = (isoDate: string | null) => {
  if (!isoDate) return "";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return monthFormatter.format(parsed);
};
const ProcedurePricingTable = () => {
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(ALL_SUBCATEGORIES);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  const [goals, setGoals] = useState<GoalWithRelations[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalQuantityMap, setGoalQuantityMap] = useState<Record<string, string>>({});
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [selectedGoalTarget, setSelectedGoalTarget] = useState("");
  const [goalQuantity, setGoalQuantity] = useState("1");
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [removingGoalId, setRemovingGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
    loadPricingRows();
    loadGoals();
  }, []);

  useEffect(() => {
    if (selectedSubcategory === ALL_SUBCATEGORIES) return;

    const belongsToCategory = subcategories.some(
      (sub) =>
        sub.id === selectedSubcategory &&
        (selectedCategory === ALL_CATEGORIES || sub.category_id === selectedCategory),
    );

    if (!belongsToCategory) {
      setSelectedSubcategory(ALL_SUBCATEGORIES);
    }
  }, [selectedCategory, selectedSubcategory, subcategories]);

  const loadMetadata = async () => {
    try {
      const [{ data: categoryData, error: categoryError }, { data: subcategoryData, error: subcategoryError }] =
        await Promise.all([
          supabase.from("categories").select("id, name, description").order("name"),
          supabase.from("subcategories").select("id, name, description, category_id").order("name"),
        ]);

      if (categoryError) throw categoryError;
      if (subcategoryError) throw subcategoryError;

      setCategories(categoryData || []);
      setSubcategories(subcategoryData || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Nao foi possivel carregar categorias e subcategorias.",
        variant: "destructive",
      });
    }
  };

  const loadPricingRows = async () => {
    setLoadingRows(true);
    try {
      const { data: proceduresData, error: proceduresError } = await supabase
        .from("procedures")
        .select(
          `
            id,
            name,
            price,
            category_id,
            subcategory_id,
            categories ( name ),
            subcategories ( name )
          `,
        )
        .order("name");

      if (proceduresError) throw proceduresError;

      const { data: specificationsData, error: specificationsError } = await supabase
        .from("procedure_specifications")
        .select(
          `
            id,
            name,
            price,
            is_active,
            procedure_id,
            procedures (
              id,
              name,
              price,
              category_id,
              subcategory_id,
              categories ( name ),
              subcategories ( name )
            )
          `,
        )
        .eq("is_active", true)
        .order("name");

      if (specificationsError) throw specificationsError;

      const procedureRows: PricingRow[] =
        (proceduresData as ProcedureWithRelations[] | null)?.map((procedure) => ({
          rowKey: `procedure-${procedure.id}`,
          type: "procedure",
          procedureId: procedure.id,
          displayName: procedure.name,
          price: procedure.price,
          categoryId: procedure.category_id,
          subcategoryId: procedure.subcategory_id,
          categoryName: procedure.categories?.name ?? null,
          subcategoryName: procedure.subcategories?.name ?? null,
        })) ?? [];

      const specificationRows: PricingRow[] =
        (specificationsData as SpecificationWithProcedure[] | null)
          ?.filter((spec) => spec.procedures)
          .map((spec) => ({
            rowKey: `spec-${spec.id}`,
            type: "specification",
            procedureId: spec.procedure_id,
            specificationId: spec.id,
            displayName: `${spec.procedures?.name ?? "Procedimento"} - ${spec.name}`,
            price: spec.price,
            categoryId: spec.procedures?.category_id ?? null,
            subcategoryId: spec.procedures?.subcategory_id ?? null,
            categoryName: spec.procedures?.categories?.name ?? null,
            subcategoryName: spec.procedures?.subcategories?.name ?? null,
          })) ?? [];

      const combined = [...procedureRows, ...specificationRows];
      combined.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));

      setRows(combined);
      setEditingValues({});
    } catch (error: any) {
      console.error("Erro ao carregar precos:", error);
      toast({
        title: "Erro ao carregar procedimentos",
        description: "Confira sua conexao e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const currentMonthKey = getCurrentMonthKey();
      const { data, error } = await supabase
        .from("procedure_monthly_goals")
        .select(
          `
            id,
            procedure_id,
            specification_id,
            quantity,
            target_month,
            created_at,
            procedures (
              id,
              name,
              price,
              category_id,
              subcategory_id,
              categories ( name ),
              subcategories ( name )
            ),
            procedure_specifications (
              id,
              name,
              price,
              procedure_id
            )
          `,
        )
        .eq("target_month", currentMonthKey)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const goalList = (data as GoalWithRelations[] | null) ?? [];
      setGoals(goalList);
      setGoalQuantityMap(
        goalList.reduce<Record<string, string>>((acc, goal) => {
          acc[goal.id] = goal.quantity.toString();
          return acc;
        }, {}),
      );
    } catch (error: any) {
      console.error("Erro ao carregar metas:", error);
      toast({
        title: "Erro ao carregar metas",
        description: "Nao foi possivel recuperar as metas do mes.",
        variant: "destructive",
      });
    } finally {
      setGoalsLoading(false);
    }
  };

  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return subcategories;
    return subcategories.filter((sub) => sub.category_id === selectedCategory);
  }, [selectedCategory, subcategories]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      if (selectedCategory !== ALL_CATEGORIES && row.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedSubcategory !== ALL_SUBCATEGORIES && row.subcategoryId !== selectedSubcategory) {
        return false;
      }
      if (normalizedSearch && !row.displayName.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [rows, selectedCategory, selectedSubcategory, searchTerm]);

  const goalsWithDetails = useMemo<GoalDetail[]>(() => {
    return goals.map((goal) => {
      const matchingRow = goal.specification_id
        ? rows.find((row) => row.type === "specification" && row.specificationId === goal.specification_id)
        : rows.find((row) => row.type === "procedure" && row.procedureId === goal.procedure_id);

      const procedureName =
        matchingRow?.type === "specification"
          ? matchingRow.displayName.split(" - ")[0]
          : matchingRow?.displayName ?? goal.procedures?.name ?? "Procedimento";

      const specificationName = goal.specification_id
        ? goal.procedure_specifications?.name ?? matchingRow?.displayName.split(" - ")[1] ?? "Especificacao"
        : null;

      const displayName = specificationName ? `${procedureName} - ${specificationName}` : procedureName;

      const unitPrice =
        matchingRow?.price ??
        (goal.specification_id
          ? goal.procedure_specifications?.price ?? 0
          : goal.procedures?.price ?? 0);

      const categoryName = matchingRow?.categoryName ?? goal.procedures?.categories?.name ?? null;
      const subcategoryName = matchingRow?.subcategoryName ?? goal.procedures?.subcategories?.name ?? null;

      return {
        ...goal,
        displayName,
        unitPrice: unitPrice ?? 0,
        categoryName,
        subcategoryName,
      };
    });
  }, [goals, rows]);

  const totalGoalsValue = useMemo(() => {
    return goalsWithDetails.reduce((sum, goal) => sum + goal.quantity * (goal.unitPrice ?? 0), 0);
  }, [goalsWithDetails]);

  const currentMonthLabel = useMemo(() => {
    const key = getCurrentMonthKey();
    return getMonthLabel(key);
  }, []);
  const handlePriceChange = (rowKey: string, value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
  };

  const handlePriceBlur = async (row: PricingRow, rawValue: string) => {
    const parsedValue = parsePriceInput(rawValue);
    const currentPrice = row.price ?? null;

    if (parsedValue === null) {
      toast({
        title: "Valor invalido",
        description: "Informe um valor numerico maior ou igual a zero.",
        variant: "destructive",
      });
      setEditingValues((prev) => ({
        ...prev,
        [row.rowKey]: currentPrice !== null ? currentPrice.toString() : "",
      }));
      return;
    }

    if (currentPrice !== null && Math.abs(currentPrice - parsedValue) < 0.001) {
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });
      return;
    }

    setSavingRowKey(row.rowKey);
    try {
      if (row.type === "procedure") {
        const { error } = await supabase.from("procedures").update({ price: parsedValue }).eq("id", row.procedureId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("procedure_specifications")
          .update({ price: parsedValue })
          .eq("id", row.specificationId);
        if (error) throw error;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.rowKey === row.rowKey
            ? {
                ...item,
                price: parsedValue,
              }
            : item,
        ),
      );

      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });

      toast({
        title: "Valor atualizado",
        description: "O valor foi sincronizado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar valor:", error);
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel salvar o novo valor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingRowKey(null);
    }
  };

  const resetGoalDialog = () => {
    setSelectedGoalTarget("");
    setGoalQuantity("1");
    setCreatingGoal(false);
  };

  const handleCreateGoal = async () => {
    if (!selectedGoalTarget) {
      toast({
        title: "Selecione um item",
        description: "Escolha um procedimento ou especificacao para a meta.",
        variant: "destructive",
      });
      return;
    }

    const parsedQuantity = Number.parseInt(goalQuantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Quantidade invalida",
        description: "Informe uma quantidade inteira maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const [targetType, targetId] = selectedGoalTarget.split("|");
    if (!targetType || !targetId) {
      toast({
        title: "Item invalido",
        description: "Nao foi possivel identificar o item selecionado.",
        variant: "destructive",
      });
      return;
    }

    const selectedRow =
      targetType === "procedure"
        ? rows.find((item) => item.type === "procedure" && item.procedureId === targetId)
        : rows.find((item) => item.type === "specification" && item.specificationId === targetId);

    if (!selectedRow) {
      toast({
        title: "Item nao encontrado",
        description: "Atualize a pagina e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setCreatingGoal(true);
    try {
      const currentMonthKey = getCurrentMonthKey();
      const { error } = await supabase.from("procedure_monthly_goals").insert([
        {
          procedure_id: selectedRow.procedureId,
          specification_id: selectedRow.type === "specification" ? selectedRow.specificationId : null,
          quantity: parsedQuantity,
          target_month: currentMonthKey,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Meta ja cadastrada",
            description: "Este item ja possui uma meta para o mes atual.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Meta criada",
          description: "A meta foi adicionada com sucesso.",
        });
        await loadGoals();
        setGoalDialogOpen(false);
        resetGoalDialog();
      }
    } catch (error: any) {
      console.error("Erro ao criar meta:", error);
      toast({
        title: "Erro ao criar meta",
        description: "Nao foi possivel salvar a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleGoalQuantityChange = (goalId: string, value: string) => {
    setGoalQuantityMap((prev) => ({
      ...prev,
      [goalId]: value,
    }));
  };

  const handleGoalQuantityBlur = async (goal: GoalWithRelations, rawValue: string) => {
    const parsedQuantity = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Quantidade invalida",
        description: "Informe um valor inteiro maior que zero.",
        variant: "destructive",
      });
      setGoalQuantityMap((prev) => ({
        ...prev,
        [goal.id]: goal.quantity.toString(),
      }));
      return;
    }

    if (parsedQuantity === goal.quantity) {
      return;
    }

    setUpdatingGoalId(goal.id);
    try {
      const { error } = await supabase
        .from("procedure_monthly_goals")
        .update({ quantity: parsedQuantity })
        .eq("id", goal.id);
      if (error) throw error;

      setGoals((prev) =>
        prev.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                quantity: parsedQuantity,
              }
            : item,
        ),
      );

      toast({
        title: "Meta atualizada",
        description: "A quantidade foi atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar meta:", error);
      toast({
        title: "Erro ao atualizar meta",
        description: "Nao foi possivel atualizar a quantidade. Tente novamente.",
        variant: "destructive",
      });
      setGoalQuantityMap((prev) => ({
        ...prev,
        [goal.id]: goal.quantity.toString(),
      }));
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const handleRemoveGoal = async (goal: GoalWithRelations) => {
    setRemovingGoalId(goal.id);
    try {
      const { error } = await supabase.from("procedure_monthly_goals").delete().eq("id", goal.id);
      if (error) throw error;

      setGoals((prev) => prev.filter((item) => item.id !== goal.id));
      setGoalQuantityMap((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });

      toast({
        title: "Meta removida",
        description: "A meta foi excluida com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao remover meta:", error);
      toast({
        title: "Erro ao remover meta",
        description: "Nao foi possivel remover a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRemovingGoalId(null);
    }
  };

  const targetOptions = useMemo(() => {
    return rows.map((row) => ({
      value: row.type === "procedure" ? `procedure|${row.procedureId}` : `specification|${row.specificationId}`,
      label: row.displayName,
    }));
  }, [rows]);
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-background to-rose-50 shadow-md">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-foreground">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <TrendingUp className="h-6 w-6" />
              </span>
              Metas do M\u00eas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhe as metas de vendas para {currentMonthLabel || "o m\u00eas atual"}.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-primary/15 bg-background/95 px-5 py-4 text-right shadow-sm sm:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total previsto</span>
            <span className="text-3xl font-bold text-primary">{formatCurrency(totalGoalsValue)}</span>
            <Button variant="secondary" size="sm" onClick={() => setGoalDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar meta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="bg-background/70">
          {goalsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando metas...
            </div>
          ) : goalsWithDetails.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-background p-8 text-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 text-primary/60" />
              <p className="max-w-xs text-sm">
                Nenhuma meta cadastrada para este m\u00eas. Clique em &quot;Criar meta&quot; para adicionar uma nova meta.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goalsWithDetails.map((goal) => {
                const quantityValue = goalQuantityMap[goal.id] ?? goal.quantity.toString();
                const totalValue = goal.unitPrice * goal.quantity;
                const monthLabel = getMonthLabel(goal.target_month);

                return (
                  <div
                    key={goal.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {goal.specification_id ? (
                            <Badge variant="secondary" className="text-xs">
                              Especificacao
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Procedimento
                            </Badge>
                          )}
                          {goal.categoryName && (
                            <span className="text-xs text-muted-foreground">{goal.categoryName}</span>
                          )}
                        </div>
                        <h3 className="mt-1 text-base font-semibold text-foreground">{goal.displayName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {goal.subcategoryName && <span>{goal.subcategoryName} \u2022 </span>}
                          {monthLabel || currentMonthLabel}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveGoal(goal)}
                        disabled={removingGoalId === goal.id || updatingGoalId === goal.id}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {removingGoalId === goal.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                        <div className="sm:col-span-1">
                          <Label htmlFor={`goal-qty-${goal.id}`} className="text-xs font-medium text-muted-foreground">
                            Quantidade
                          </Label>
                          <Input
                            id={`goal-qty-${goal.id}`}
                            value={quantityValue}
                            onChange={(event) => handleGoalQuantityChange(goal.id, event.target.value)}
                            onBlur={(event) => handleGoalQuantityBlur(goal, event.target.value)}
                            inputMode="numeric"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor unitario</p>
                          <p className="text-sm font-medium text-foreground">{formatCurrency(goal.unitPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total previsto</p>
                          <p className="text-lg font-semibold text-primary">{formatCurrency(totalValue)}</p>
                        </div>
                      </div>
                      {updatingGoalId === goal.id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando alteracoes...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/95 shadow-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold text-foreground">Tabela de Procedimentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Atualize rapidamente os valores de procedimentos e especificacoes com filtros semelhantes a uma planilha.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar procedimento ou especificacao"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSubcategory}
                onValueChange={setSelectedSubcategory}
                disabled={!filteredSubcategories.length}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Todas as subcategorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SUBCATEGORIES}>Todas as subcategorias</SelectItem>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Procedimento / Especificacao</TableHead>
                  <TableHead className="w-[220px] text-right">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRows ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <div className="flex items-center gap-2 py-6 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando tabela de precos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <div className="py-6 text-center text-muted-foreground">
                        Nenhum procedimento encontrado com os filtros selecionados.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const inputValue =
                      editingValues[row.rowKey] ??
                      (row.price !== null && row.price !== undefined ? row.price.toString() : "");

                    return (
                      <TableRow key={row.rowKey} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.type === "specification" ? (
                                <Badge variant="secondary" className="text-xs">
                                  Especificacao
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Procedimento
                                </Badge>
                              )}
                              <span className="font-medium text-foreground">{row.displayName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.categoryName && <span>{row.categoryName}</span>}
                              {row.subcategoryName && (
                                <span>
                                  {row.categoryName ? " \u2022 " : ""}
                                  {row.subcategoryName}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              value={inputValue}
                              onChange={(event) => handlePriceChange(row.rowKey, event.target.value)}
                              onBlur={(event) => handlePriceBlur(row, event.target.value)}
                              inputMode="decimal"
                              placeholder="0,00"
                              className="max-w-[140px] text-right"
                            />
                            {savingRowKey === row.rowKey && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={goalDialogOpen}
        onOpenChange={(open) => {
          setGoalDialogOpen(open);
          if (!open) {
            resetGoalDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar nova meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Procedimento ou especificacao</Label>
              <Select value={selectedGoalTarget} onValueChange={setSelectedGoalTarget}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o item para a meta" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {targetOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-quantity" className="text-sm font-medium text-muted-foreground">
                Quantidade desejada no mes
              </Label>
              <Input
                id="goal-quantity"
                value={goalQuantity}
                onChange={(event) => setGoalQuantity(event.target.value)}
                inputMode="numeric"
                placeholder="Ex: 10"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGoal} disabled={creatingGoal}>
              {creatingGoal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcedurePricingTable;
