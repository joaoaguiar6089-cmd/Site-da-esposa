import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ExitFormDialog } from "./ExitFormDialog";

interface SuggestionsPanelProps {
  onRefetch: () => void;
}

export const SuggestionsPanel = ({ onRefetch }: SuggestionsPanelProps) => {
  const { toast } = useToast();
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    appointmentId: string;
    date: string;
    procedureId: string;
  } | null>(null);

  const { data: suggestions, refetch } = useQuery({
    queryKey: ["inventory-suggestions"],
    queryFn: async () => {
      // Get appointments that have passed and don't have suggestions yet
      const now = new Date();
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          procedures (
            id,
            name
          )
        `
        )
        .eq("status", "agendado")
        .lt(
          "appointment_date",
          format(now, "yyyy-MM-dd", { locale: ptBR })
        );

      if (error) throw error;

      // Filter out appointments that already have suggestions
      const { data: existingSuggestions } = await supabase
        .from("inventory_suggestions")
        .select("appointment_id");

      const existingIds = new Set(
        existingSuggestions?.map((s) => s.appointment_id) || []
      );

      return appointments?.filter((apt) => !existingIds.has(apt.id)) || [];
    },
  });

  const handleIgnore = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("inventory_suggestions").insert({
        appointment_id: appointmentId,
        suggested_date: new Date().toISOString(),
        status: "ignored",
      });

      if (error) throw error;

      toast({
        title: "Sugestão ignorada",
        description: "A sugestão foi marcada como ignorada.",
      });

      refetch();
    } catch (error) {
      console.error("Error ignoring suggestion:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ignorar a sugestão.",
        variant: "destructive",
      });
    }
  };

  const handleAccept = (appointmentId: string, date: string, procedureId: string) => {
    setSelectedSuggestion({ appointmentId, date, procedureId });
  };

  const handleExitSuccess = async () => {
    if (!selectedSuggestion) return;

    try {
      const { error } = await supabase.from("inventory_suggestions").insert({
        appointment_id: selectedSuggestion.appointmentId,
        suggested_date: new Date().toISOString(),
        status: "accepted",
      });

      if (error) throw error;

      setSelectedSuggestion(null);
      refetch();
      onRefetch();
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Badge variant="secondary">
            {suggestions.length}
          </Badge>
          Sugestões de Saída
        </h3>
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-center justify-between p-3 bg-background rounded-md"
            >
              <div>
                <div className="font-medium">
                  {suggestion.procedures?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(
                    new Date(suggestion.appointment_date),
                    "dd/MM/yyyy",
                    { locale: ptBR }
                  )}{" "}
                  às {suggestion.appointment_time}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleIgnore(suggestion.id)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleAccept(
                      suggestion.id,
                      suggestion.appointment_date,
                      suggestion.procedures?.id || ""
                    )
                  }
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedSuggestion && (
        <ExitFormDialog
          open={!!selectedSuggestion}
          onOpenChange={(open) => !open && setSelectedSuggestion(null)}
          onSuccess={handleExitSuccess}
          prefilledData={{
            date: selectedSuggestion.date,
            procedureId: selectedSuggestion.procedureId,
          }}
        />
      )}
    </>
  );
};
