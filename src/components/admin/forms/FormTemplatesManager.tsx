// @ts-nocheck
import { useState } from "react";
import FormTemplatesList from "./FormTemplatesList";
import FormTemplateEditor from "./FormTemplateEditor";

/**
 * Componente wrapper que gerencia a navegação entre lista e editor de fichas
 * sem usar rotas do React Router (para evitar problemas de cache)
 */
const FormTemplatesManager = () => {
  const [currentView, setCurrentView] = useState<"list" | "editor">("list");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setCurrentView("editor");
  };

  const handleBackToList = () => {
    setEditingTemplateId(null);
    setCurrentView("list");
  };

  if (currentView === "editor" && editingTemplateId) {
    return (
      <div className="h-full">
        <FormTemplateEditor 
          templateId={editingTemplateId}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return <FormTemplatesList onEdit={handleEdit} />;
};

export default FormTemplatesManager;
