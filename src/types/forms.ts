// =====================================================
// TIPOS TYPESCRIPT - SISTEMA DE FICHAS PERSONALIZADAS
// =====================================================

// =====================================================
// ENUMS E TIPOS BÁSICOS
// =====================================================

export type FieldType =
  // Campos de entrada
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'date'
  | 'time'
  | 'datetime'
  // Campos de seleção
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  // Campos especiais
  | 'file'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'color'
  // Layout
  | 'header'
  | 'divider'
  | 'spacer'
  | 'html';

export type FormResponseStatus = 'draft' | 'submitted' | 'reviewed' | 'archived';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'submit'
  | 'review'
  | 'clone'
  | 'restore';

export type EntityType = 'template' | 'field' | 'response' | 'snippet';

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'starts_with'
  | 'ends_with';

export type LogicType = 'all' | 'any'; // AND ou OR

// =====================================================
// INTERFACES DE VALIDAÇÃO
// =====================================================

export interface ValidationRule {
  // Numéricos
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;

  // Strings
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex
  
  // Arquivos
  maxSize?: number; // em bytes
  accept?: string[]; // ['image/*', '.pdf']
  
  // Custom
  custom?: string; // Nome da função de validação customizada
  errorMessage?: string;
}

export interface FieldOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  disabled?: boolean;
}

// =====================================================
// LÓGICA CONDICIONAL
// =====================================================

export interface Condition {
  field: string; // field_key do campo referenciado
  operator: ConditionalOperator;
  value: any;
}

export interface ConditionalRules {
  type: LogicType;
  conditions: Condition[];
}

export interface ConditionalLogic {
  show_if?: ConditionalRules;
  require_if?: ConditionalRules;
  disable_if?: ConditionalRules;
}

// =====================================================
// AUTO-PREENCHIMENTO
// =====================================================

export type AutoFillSource =
  // Dados do cliente
  | 'client.nome'
  | 'client.cpf'
  | 'client.email'
  | 'client.telefone'
  | 'client.data_nascimento'
  | 'client.whatsapp'
  // Dados do agendamento
  | 'appointment.date'
  | 'appointment.time'
  | 'appointment.city'
  // Dados do procedimento
  | 'procedure.name'
  | 'procedure.category'
  | 'procedure.duration'
  // Outros
  | 'system.current_date'
  | 'system.current_time'
  | 'system.current_user';

export interface AutoFillMapping {
  source: AutoFillSource | string;
  transform?: string; // Nome da função de transformação
  defaultValue?: any;
}

// =====================================================
// PDF MAPPING
// =====================================================

export interface PDFCoordinates {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
}

export interface PDFFieldMapping {
  field_key: string;
  pdf_field_name?: string; // Para PDFs com campos de formulário
  coordinates?: PDFCoordinates; // Para PDFs sem campos
  type: 'text' | 'checkbox' | 'signature' | 'image';
}

export interface PDFMapping {
  template_url: string;
  fields: PDFFieldMapping[];
}

// =====================================================
// TABELAS DO BANCO
// =====================================================

// ---- FORM TEMPLATES ----

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  version: number;
  is_active: boolean;
  is_published: boolean;
  pdf_template_url?: string;
  pdf_mapping?: PDFMapping;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_edited_by?: string;
  edit_count: number;
}

export interface FormTemplateCreate {
  name: string;
  description?: string;
  category?: string;
  is_published?: boolean;
  pdf_template_url?: string;
  pdf_mapping?: PDFMapping;
}

export interface FormTemplateUpdate extends Partial<FormTemplateCreate> {
  is_active?: boolean;
  version?: number;
}

// ---- FORM FIELDS ----

export interface FormField {
  id: string;
  template_id: string;
  field_key: string;
  label: string;
  description?: string;
  placeholder?: string;
  help_text?: string;
  field_type: FieldType;
  is_required: boolean;
  validation_rules?: ValidationRule;
  options?: FieldOption[];
  auto_fill_source?: AutoFillSource | string;
  auto_fill_mapping?: AutoFillMapping;
  conditional_logic?: ConditionalLogic;
  order_index: number;
  column_span: number;
  pdf_field_name?: string;
  pdf_coordinates?: PDFCoordinates;
  created_at: string;
  updated_at: string;
}

export interface FormFieldCreate {
  template_id: string;
  field_key: string;
  label: string;
  description?: string;
  placeholder?: string;
  help_text?: string;
  field_type: FieldType;
  is_required?: boolean;
  validation_rules?: ValidationRule;
  options?: FieldOption[];
  auto_fill_source?: string;
  auto_fill_mapping?: AutoFillMapping;
  conditional_logic?: ConditionalLogic;
  order_index?: number;
  column_span?: number;
  pdf_field_name?: string;
  pdf_coordinates?: PDFCoordinates;
}

export interface FormFieldUpdate extends Partial<FormFieldCreate> {}

// ---- FORM SNIPPETS ----

export interface FormSnippet {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  fields: Omit<FormFieldCreate, 'template_id'>[];
  is_system: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface FormSnippetCreate {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  fields: Omit<FormFieldCreate, 'template_id'>[];
}

// ---- FORM RESPONSES ----

export interface FormResponse {
  id: string;
  template_id: string;
  template_version: number;
  client_id: string;
  appointment_id?: string;
  status: FormResponseStatus;
  response_data: Record<string, any>;
  generated_pdf_url?: string;
  generated_pdf_at?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  version: number;
}

export interface FormResponseCreate {
  template_id: string;
  template_version: number;
  client_id: string;
  appointment_id?: string;
  response_data: Record<string, any>;
  status?: FormResponseStatus;
}

export interface FormResponseUpdate {
  response_data?: Record<string, any>;
  status?: FormResponseStatus;
  version: number; // Para controle de concorrência
}

// ---- FORM VERSIONS ----

export interface FormVersion {
  id: string;
  template_id: string;
  version_number: number;
  template_snapshot: FormTemplate;
  fields_snapshot: FormField[];
  change_description?: string;
  created_by?: string;
  created_at: string;
}

export interface FormVersionCreate {
  template_id: string;
  version_number: number;
  template_snapshot: FormTemplate;
  fields_snapshot: FormField[];
  change_description?: string;
}

// ---- FORM AUDIT LOG ----

export interface FormAuditLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface FormAuditLogCreate {
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
}

// ---- FORM FIELD VALIDATIONS ----

export interface FormFieldValidation {
  id: string;
  name: string;
  description?: string;
  validation_function: string;
  error_message: string;
  is_system: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

// =====================================================
// TYPES PARA COMPONENTES UI
// =====================================================

// ---- BUILDER ----

export interface FormBuilderField extends FormField {
  // Propriedades adicionais para o builder
  isSelected?: boolean;
  isDragging?: boolean;
  errors?: string[];
}

export interface SnippetInPalette extends FormSnippet {
  isExpanded?: boolean;
}

// ---- FORM FILLER ----

export interface FormFillerField extends FormField {
  // Propriedades calculadas
  isVisible: boolean;
  isRequired: boolean;
  isDisabled: boolean;
  currentValue?: any;
  errors?: string[];
  touched?: boolean;
}

export interface FormFillerState {
  template: FormTemplate;
  fields: FormFillerField[];
  values: Record<string, any>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  lastSavedAt?: Date;
}

// ---- RESPONSES COM JOINS ----

export interface FormResponseWithDetails extends FormResponse {
  template: FormTemplate;
  client: {
    id: string;
    nome: string;
    email: string;
    cpf?: string;
  };
  appointment?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
  };
  reviewed_by_user?: {
    email: string;
  };
}

export interface FormTemplateWithFields extends FormTemplate {
  fields: FormField[];
  _count?: {
    responses: number;
  };
}

// =====================================================
// TIPOS PARA HOOKS
// =====================================================

export interface UseFormTemplatesReturn {
  templates: FormTemplate[];
  isLoading: boolean;
  error: Error | null;
  createTemplate: (data: FormTemplateCreate) => Promise<FormTemplate>;
  updateTemplate: (id: string, data: FormTemplateUpdate) => Promise<FormTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  publishTemplate: (id: string) => Promise<void>;
  unpublishTemplate: (id: string) => Promise<void>;
  cloneTemplate: (id: string, newName: string) => Promise<FormTemplate>;
  refetch: () => Promise<void>;
}

export interface UseFormFieldsReturn {
  fields: FormField[];
  isLoading: boolean;
  error: Error | null;
  createField: (data: FormFieldCreate) => Promise<FormField>;
  updateField: (id: string, data: FormFieldUpdate) => Promise<FormField>;
  deleteField: (id: string) => Promise<void>;
  reorderFields: (templateId: string, fieldIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseFormResponseReturn {
  response: FormResponse | null;
  isLoading: boolean;
  error: Error | null;
  updateResponse: (data: FormResponseUpdate) => Promise<FormResponse>;
  submitResponse: () => Promise<void>;
  saveAsDraft: () => Promise<void>;
  autoSave: () => void;
}

export interface UseConditionalLogicReturn {
  evaluateField: (field: FormField, allValues: Record<string, any>) => {
    isVisible: boolean;
    isRequired: boolean;
    isDisabled: boolean;
  };
  evaluateAllFields: (
    fields: FormField[],
    values: Record<string, any>
  ) => FormFillerField[];
}

export interface UseFormValidationReturn {
  validateField: (field: FormField, value: any) => string[];
  validateForm: (fields: FormField[], values: Record<string, any>) => Record<string, string[]>;
  isFormValid: (errors: Record<string, string[]>) => boolean;
}

// =====================================================
// TIPOS PARA PDF
// =====================================================

export interface PDFGenerationOptions {
  template_url: string;
  mapping: PDFMapping;
  data: Record<string, any>;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export interface PDFGenerationResult {
  url: string;
  size: number;
  pages: number;
  generated_at: string;
}

// =====================================================
// TIPOS PARA ANALYTICS
// =====================================================

export interface FormAnalytics {
  template_id: string;
  template_name: string;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  avg_completion_time: number; // em minutos
  most_common_errors: Array<{
    field_key: string;
    field_label: string;
    error_count: number;
  }>;
  field_fill_rates: Array<{
    field_key: string;
    field_label: string;
    fill_rate: number;
  }>;
}

// =====================================================
// TIPOS PARA DRAG AND DROP
// =====================================================

export interface DragItem {
  type: 'field' | 'snippet';
  item: FormField | FormSnippet;
  index?: number;
}

export interface DropResult {
  dropIndex: number;
  dropZone: 'canvas' | 'trash';
}

// =====================================================
// EXPORT GLOBAL
// =====================================================

export type {
  // Re-export tudo para facilitar imports
  FormTemplate as Template,
  FormField as Field,
  FormResponse as Response,
  FormSnippet as Snippet,
};

// =====================================================
// TYPE HELPERS - Conversão entre tipos do Supabase e tipos locais
// =====================================================

import type { Json } from "@/integrations/supabase/types";

// Helper para converter Json em tipos específicos
export function jsonToType<T>(json: Json | null | undefined): T | null {
  if (json === null || json === undefined) return null;
  return json as T;
}

// Helper para converter tipos específicos em Json
export function typeToJson<T>(value: T | null | undefined): Json {
  if (value === null || value === undefined) return null;
  return value as unknown as Json;
}
