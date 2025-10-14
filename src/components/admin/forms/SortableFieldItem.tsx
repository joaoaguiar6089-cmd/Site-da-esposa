import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormField } from "@/types/forms";
import { cn } from "@/lib/utils";

interface SortableFieldItemProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSaveToSnippet?: () => void;
}

export default function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
  onSaveToSnippet,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Ícone por tipo de campo
  const getFieldTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: "T",
      textarea: "¶",
      number: "#",
      email: "@",
      phone: "☎",
      cpf: "🆔",
      date: "📅",
      time: "🕐",
      datetime: "📅🕐",
      select: "▼",
      radio: "⚪",
      checkbox: "☑",
      toggle: "⏻",
      file: "📎",
      signature: "✍",
      rating: "⭐",
      slider: "━",
      color: "🎨",
      header: "H",
      divider: "―",
      spacer: "⎵",
      html: "</>",
    };
    return icons[type] || "?";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white rounded-lg border-2 transition-all",
        isSelected && "border-primary ring-2 ring-primary ring-offset-2",
        !isSelected && "border-border hover:border-primary/50",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Ícone do Tipo */}
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center font-mono text-sm">
          {getFieldTypeIcon(field.field_type)}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{field.label}</p>
            {field.is_required && (
              <Badge variant="secondary" className="text-xs">
                Obrigatório
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {field.field_type}
            </p>
            {field.conditional_logic && (
              <Badge variant="outline" className="text-xs">
                Condicional
              </Badge>
            )}
            {field.auto_fill_source && (
              <Badge variant="outline" className="text-xs">
                Auto-fill
              </Badge>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSaveToSnippet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToSnippet();
              }}
              title="Adicionar ao snippet"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Indicador de coluna */}
      {field.column_span !== 12 && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground">
          {field.column_span}/12
        </div>
      )}
    </div>
  );
}
