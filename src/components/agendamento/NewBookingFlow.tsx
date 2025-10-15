import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CheckCircle, Calendar as CalendarIcon, MessageCircle, Sparkles, Loader2, MapPin, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDateBrazil } from '@/utils/dateUtils';
import type { Client } from "@/types/client";
import ProcedureSpecificationSelector, { ProcedureSpecification } from "./ProcedureSpecificationSelector";
import LoginPhone from "./LoginPhone";
import CadastroCliente from "./CadastroCliente";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  requires_specifications?: boolean;
  body_image_url?: string;
  body_image_url_male?: string;
  body_selection_type?: string;
}

interface Professional {
  id: string;
  name: string;
}

interface BookingData {
  procedure_id: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  city_id: string;
  specifications?: ProcedureSpecification[];
}

interface NewBookingFlowProps {
  onBack: () => void;
  onSuccess: () => void;
  preSelectedProcedureId?: string;
  adminMode?: boolean;
  initialClient?: Client | null;
  sendNotification?: boolean;
  selectedDate?: Date;
  allowPastDates?: boolean;
  editingAppointmentId?: string;
  initialAppointment?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    city_id?: string | null;
    notes?: string | null;
    procedures: {
      id?: string;
      name: string;
      duration: number;
      price: number;
    };
    appointments_procedures?: Array<{
      order_index?: number | null;
      procedure?: Procedure | null;
      custom_price?: number | null;
    }> | null;
    professional_id?: string | null;
    professional?: {
      id?: string;
      name: string;
    } | null;
    appointment_specifications?: {
      specification_id: string;
      specification_name: string;
      specification_price: number;
    }[] | null;
    city_settings?: {
      city_name?: string | null;
    } | null;
  } | null;
}

type ViewMode = 'form' | 'phone' | 'cadastro' | 'confirmation';

type SelectedProcedure = {
  id: string;
  procedure: Procedure | null;
  customPrice?: number | null;
  specifications?: ProcedureSpecification[];
  specificationsTotal?: number;
};

type FormSnapshot = {
  formData: {
    procedure_id: string;
    appointment_date: string;
    appointment_time: string;
    professional_id: string;
    city_id: string;
    notes: string;
  };
  procedureIds: string[];
  specsByProcedure: Record<string, string[]>;
  customPrices: Record<string, number | null | undefined>;
};

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const NewBookingFlow = ({ 
  onBack, 
  onSuccess, 
  preSelectedProcedureId,
  adminMode = false,
  initialClient = null,
  sendNotification = true,
  selectedDate,
  allowPastDates = false,
  editingAppointmentId,
  initialAppointment = null,
}: NewBookingFlowProps) => {
  const [currentView, setCurrentView] = useState<ViewMode>('form');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [cities, setCities] = useState<{
    id: string,
    city_name: string,
    clinic_name?: string | null,
    address?: string | null,
    map_url?: string | null
  }[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [formData, setFormData] = useState({
    procedure_id: preSelectedProcedureId || "",
    appointment_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : "",
    appointment_time: "",
    notes: "",
    city_id: "",
    professional_id: initialAppointment?.professional_id ?? "",
  });
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProcedureSpecification[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([
  { id: 'proc-1', procedure: null, customPrice: null, specifications: [], specificationsTotal: 0 },
]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [showSpecifications, setShowSpecifications] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const isEditing = Boolean(editingAppointmentId);
  const hasLoadedEditingData = useRef(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<FormSnapshot | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [prefilledFromInitial, setPrefilledFromInitial] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceEditValue, setPriceEditValue] = useState<string>("");
  const { toast } = useToast();

  const sanitizeNotes = (value: string) => (value || "").trim();

  const ensureCityPresent = (cityId?: string | null, fallbackName?: string | null) => {
    if (!cityId) return;
    setCities(prev => {
      if (prev.some(city => city.id === cityId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: cityId,
          city_name: fallbackName || "Cidade selecionada",
          clinic_name: null,
          address: null,
          map_url: null,
        },
      ];
    });
  };

  const ensureProfessionalPresent = (professionalId?: string | null, fallbackName?: string | null) => {
    if (!professionalId) return;
    setProfessionals(prev => {
      if (prev.some(pro => pro.id === professionalId)) {
        return prev;
      }
      const next = [
        ...prev,
        {
          id: professionalId,
          name: fallbackName || "Profissional selecionado",
        },
      ];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const areArraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  const createSnapshot = (
    formState: typeof formData,
    proceduresState: typeof selectedProcedures
  ): FormSnapshot => {
    const procedureIds = proceduresState
      .filter((sp) => sp.procedure)
      .map((sp) => sp.procedure!.id);

    const specsByProcedure = proceduresState.reduce<Record<string, string[]>>((acc, item) => {
      if (item.procedure) {
        acc[item.procedure.id] = (item.specifications || [])
          .map((spec) => spec.id)
          .sort();
      }
      return acc;
    }, {});

    return {
      formData: {
        procedure_id: formState.procedure_id,
        appointment_date: formState.appointment_date,
        appointment_time: formState.appointment_time,
        professional_id: formState.professional_id || "",
        city_id: formState.city_id,
        notes: sanitizeNotes(formState.notes),
      },
      procedureIds,
      specsByProcedure,
      customPrices: proceduresState.reduce<Record<string, number | null | undefined>>((acc, item) => {
        if (item.procedure) {
          acc[item.procedure.id] = item.customPrice;
        }
        return acc;
      }, {}),
    };
  };

  const filteredProcedures = useMemo(() => {
    if (!procedureSearch) return procedures;
    const searchTerm = procedureSearch.toLowerCase();
    return procedures.filter((proc) =>
      proc.name.toLowerCase().includes(searchTerm)
    );
  }, [procedures, procedureSearch]);

  const getDefaultProcedurePrice = (item: {
    procedure: Procedure | null;
    specifications?: ProcedureSpecification[];
    specificationsTotal?: number;
  }) => {
    if (item.specifications && item.specifications.length > 0) {
      return item.specificationsTotal || 0;
    }
    return item.procedure?.price || 0;
  };

  const getEffectiveProcedurePrice = (item: typeof selectedProcedures[number]) => {
    if (item.customPrice !== null && item.customPrice !== undefined) {
      return item.customPrice;
    }
    return getDefaultProcedurePrice(item);
  };

  const getProceduresTotal = (proceduresList: typeof selectedProcedures) => {
    return proceduresList
      .filter(sp => sp.procedure)
      .reduce((sum, sp) => sum + getEffectiveProcedurePrice(sp), 0);
  };

  const handleOpenPriceEditor = (procedureId: string) => {
    const target = selectedProcedures.find(sp => sp.id === procedureId);
    if (!target) return;
    const baseValue = target.customPrice ?? getDefaultProcedurePrice(target);
    setPriceEditId(procedureId);
    setPriceEditValue(baseValue > 0 ? baseValue.toString() : "");
  };

  const handleCancelPriceEdit = () => {
    setPriceEditId(null);
    setPriceEditValue("");
  };

  const handleApplyCustomPrice = (procedureId: string) => {
    const parsed = parseFloat(priceEditValue.replace(",", ".").trim());
    if (Number.isNaN(parsed) || parsed < 0) {
      toast({
        title: "Valor invalido",
        description: "Informe um valor numerico maior ou igual a zero.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProcedures(prev =>
      prev.map(item =>
        item.id === procedureId
          ? { ...item, customPrice: parsed }
          : item
      )
    );
    handleCancelPriceEdit();
  };

  const handleResetCustomPrice = (procedureId: string) => {
    setSelectedProcedures(prev =>
      prev.map(item =>
        item.id === procedureId
          ? { ...item, customPrice: null }
          : item
      )
    );
    handleCancelPriceEdit();
  };

  useEffect(() => {
    loadData();
    loadSiteSettings();
    // SÃ³ definir cliente inicial se estiver em modo admin
    if (adminMode && initialClient) {
      setSelectedClient(initialClient);
    }
  }, [adminMode, initialClient]);

  useEffect(() => {
    hasLoadedEditingData.current = false;
    if (!editingAppointmentId) {
      setOriginalSnapshot(null);
      setIsDirty(false);
      setPrefilledFromInitial(false);
    }
  }, [editingAppointmentId]);

  useEffect(() => {
    if (formData.city_id) {
      loadCityAvailability();
    }
  }, [formData.city_id]);

  useEffect(() => {
    if (!isEditing || !editingAppointmentId) {
      return;
    }
    if (loadingProcedures || procedures.length === 0) {
      return;
    }
    if (hasLoadedEditingData.current) {
      return;
    }

    loadAppointmentForEdit(editingAppointmentId);
  }, [isEditing, editingAppointmentId, loadingProcedures, procedures.length]);

  useEffect(() => {
    if (!isEditing || !initialAppointment || prefilledFromInitial) {
      return;
    }

    const proceduresFromInitial = (initialAppointment.appointments_procedures && initialAppointment.appointments_procedures.length > 0)
      ? initialAppointment.appointments_procedures
          .slice()
          .sort((a, b) => (a?.order_index ?? 0) - (b?.order_index ?? 0))
          .map((entry, index) => {
            const procedure = entry?.procedure || null;
            if (!procedure) return null;
            const matched = procedure.id ? procedures.find((proc) => proc.id === procedure.id) : null;
            const customPrice = entry?.custom_price;
            return {
              id: `initial-${index + 1}`,
              procedure: (matched || procedure) as Procedure,
              customPrice: customPrice === null || customPrice === undefined ? null : Number(customPrice),
              specifications: [] as ProcedureSpecification[],
              specificationsTotal: 0,
            };
          })
          .filter((item): item is {
            id: string;
            procedure: Procedure;
            customPrice: number | null;
            specifications: ProcedureSpecification[];
            specificationsTotal: number;
          } => item !== null)
      : (() => {
          const baseProc = initialAppointment.procedures;
          if (!baseProc) return [];
          const matched = baseProc.id ? procedures.find((proc) => proc.id === baseProc.id) : null;
          const finalProcedure = matched || {
            id: baseProc.id || "",
            name: baseProc.name,
            duration: baseProc.duration,
            price: baseProc.price,
          };
          const fallbackCustomPrice = initialAppointment.appointments_procedures?.[0]?.custom_price ?? null;
          return [
            {
              id: 'initial-1',
              procedure: finalProcedure as Procedure,
              customPrice: fallbackCustomPrice === null || fallbackCustomPrice === undefined ? null : Number(fallbackCustomPrice),
              specifications: [] as ProcedureSpecification[],
              specificationsTotal: 0,
            },
          ];
        })();

    const updatedFormData = {
      procedure_id: proceduresFromInitial[0]?.procedure?.id || initialAppointment.procedures?.id || "",
      appointment_date: initialAppointment.appointment_date || "",
      appointment_time: initialAppointment.appointment_time || "",
      city_id: initialAppointment.city_id || "",
      professional_id: initialAppointment.professional_id || "",
      notes: sanitizeNotes(initialAppointment.notes || ""),
    };

    ensureCityPresent(updatedFormData.city_id, initialAppointment.city_settings?.city_name ?? null);
    ensureProfessionalPresent(initialAppointment.professional_id, initialAppointment.professional?.name ?? null);

    if (proceduresFromInitial.length > 0) {
      const missingProcedures = proceduresFromInitial
        .map((entry) => entry.procedure)
        .filter(
          (proc): proc is Procedure =>
            Boolean(proc && proc.id && !procedures.some(existing => existing.id === proc.id))
        );
      if (missingProcedures.length > 0) {
        setProcedures(prev => {
          const existingIds = new Set(prev.map(proc => proc.id));
          const merged = [
            ...prev,
            ...missingProcedures.filter(proc => proc.id && !existingIds.has(proc.id)),
          ];
          return merged.sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      setSelectedProcedures(proceduresFromInitial);
      setFormData(updatedFormData);
      if (!originalSnapshot) {
        setOriginalSnapshot(createSnapshot(updatedFormData, proceduresFromInitial));
      }
    } else {
      setFormData(updatedFormData);
      if (!originalSnapshot) {
        setOriginalSnapshot(createSnapshot(updatedFormData, selectedProcedures));
      }
    }

    setPrefilledFromInitial(true);
    setOpenSelectId(null);
    setProcedureSearch("");
  }, [isEditing, initialAppointment, prefilledFromInitial, procedures, originalSnapshot, selectedProcedures]);

  useEffect(() => {
    if (!isEditing) {
      setIsDirty(false);
      return;
    }
    if (!originalSnapshot) {
      setIsDirty(false);
      return;
    }

    const currentSnapshot = createSnapshot(formData, selectedProcedures);

    const sameFormData =
      originalSnapshot.formData.procedure_id === currentSnapshot.formData.procedure_id &&
      originalSnapshot.formData.appointment_date === currentSnapshot.formData.appointment_date &&
      originalSnapshot.formData.appointment_time === currentSnapshot.formData.appointment_time &&
      originalSnapshot.formData.city_id === currentSnapshot.formData.city_id &&
      originalSnapshot.formData.notes === currentSnapshot.formData.notes;

    const sameProcedures = areArraysEqual(
      originalSnapshot.procedureIds,
      currentSnapshot.procedureIds
    );

    const originalSpecKeys = Object.keys(originalSnapshot.specsByProcedure).sort();
    const currentSpecKeys = Object.keys(currentSnapshot.specsByProcedure).sort();
    const sameSpecKeys = areArraysEqual(originalSpecKeys, currentSpecKeys);
    const sameSpecs = sameSpecKeys
      ? originalSpecKeys.every((procedureId) =>
          areArraysEqual(
            originalSnapshot.specsByProcedure[procedureId] || [],
            currentSnapshot.specsByProcedure[procedureId] || []
          )
        )
      : false;

    const originalCustomKeys = Object.keys(originalSnapshot.customPrices || {}).sort();
    const currentCustomKeys = Object.keys(currentSnapshot.customPrices || {}).sort();
    const sameCustomKeys = areArraysEqual(originalCustomKeys, currentCustomKeys);
    const sameCustomPrices = sameCustomKeys
      ? originalCustomKeys.every((procedureId) => {
          const originalValue = originalSnapshot.customPrices[procedureId] ?? null;
          const currentValue = currentSnapshot.customPrices[procedureId] ?? null;
          if (originalValue === null && currentValue === null) return true;
          if (originalValue === null || currentValue === null) return false;
          return Number(originalValue) === Number(currentValue);
        })
      : false;

    setIsDirty(!(sameFormData && sameProcedures && sameSpecs && sameCustomPrices));
  }, [isEditing, originalSnapshot, formData, selectedProcedures]);

  useEffect(() => {
    if (!formData.appointment_date || !formData.city_id) return;

    if (adminMode && !formData.professional_id) {
      setAvailableTimes([]);
      return;
    }

    loadAvailableTimes(
      formData.appointment_date,
      adminMode ? (formData.professional_id || null) : undefined
    );
  }, [formData.appointment_date, formData.city_id, formData.professional_id, adminMode]);

  // Sincronizar formData.procedure_id com o primeiro procedimento
  useEffect(() => {
    if (selectedProcedures.length > 0 && selectedProcedures[0].procedure) {
      setFormData(prev => ({ ...prev, procedure_id: selectedProcedures[0].procedure!.id }));
    }
  }, [selectedProcedures]);

  const loadSiteSettings = async () => {
    try {
      const { data: logoData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_logo_url')
        .maybeSingle();
      
      if (logoData?.setting_value) {
        setLogoUrl(logoData.setting_value);
      }

      const { data: whatsappData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'social_media_whatsapp_public')
        .maybeSingle();
      
      if (whatsappData?.setting_value) {
        setWhatsappNumber(whatsappData.setting_value);
      }
    } catch (error) {
      console.error('Erro ao carregar configuraÃ§Ãµes:', error);
    }
  };

  const loadCityAvailability = async () => {
    if (!formData.city_id) return;

    try {
      // Novo sistema flexÃ­vel: nÃ£o bloqueamos mais datas
      // Apenas limpamos as restriÃ§Ãµes e permitimos todos os dias
      setAvailableDates(new Set());
      setUnavailableDates(new Set());
      
      // Nota: O sistema de avisos serÃ¡ implementado na funÃ§Ã£o de seleÃ§Ã£o de data
      // quando o usuÃ¡rio selecionar uma data onde a Dra. estÃ¡ em outra cidade
    } catch (error) {
      console.error('Erro ao carregar disponibilidade da cidade:', error);
    }
  };

  const checkDateAvailability = async (date: string, cityId: string) => {
    try {
      // Verificar se a doutora estarÃ¡ disponÃ­vel na cidade selecionada
      const { data: cityAvailability, error: availabilityError } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', cityId)
        .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`);

      if (availabilityError) {
        console.error('Erro ao verificar disponibilidade:', availabilityError);
        setAvailabilityWarning('');
        return;
      }

      if (!cityAvailability || cityAvailability.length === 0) {
        // Verificar se ela estarÃ¡ em outra cidade
        const { data: otherCityAvailability, error: otherError } = await supabase
          .from('city_availability')
          .select(`
            *,
            city_settings (
              city_name
            )
          `)
          .or(`and(date_start.lte.${date},date_end.gte.${date}),and(date_start.eq.${date},date_end.is.null)`)
          .neq('city_id', cityId);

        if (otherError) {
          console.error('Erro ao verificar outras cidades:', otherError);
          setAvailabilityWarning('A Dra. Karoline nÃ£o estarÃ¡ disponÃ­vel nesta data.');
          return;
        }

        if (otherCityAvailability && otherCityAvailability.length > 0) {
          const otherCity = otherCityAvailability[0];
          const cityName = (otherCity.city_settings as any)?.city_name || 'outra cidade';
          
          // Buscar mensagem configurÃ¡vel
          const { data: messageSetting } = await supabase
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'availability_message')
            .single();

          const defaultMessage = 'A Dra. Karoline estarÃ¡ em {cidade} nesta data.';
          const messageTemplate = messageSetting?.setting_value || defaultMessage;
          const finalMessage = messageTemplate.replace('{cidade}', cityName);
          
          setAvailabilityWarning(finalMessage);
        } else {
          setAvailabilityWarning('A Dra. Karoline nÃ£o estarÃ¡ disponÃ­vel nesta data.');
        }
      } else {
        setAvailabilityWarning('');
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade da data:', error);
      setAvailabilityWarning('');
    }
  };

  const loadData = async () => {
    try {
      // Carregar procedimentos
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('*')
        .order('name');

      if (proceduresError) throw proceduresError;
      const fetchedProcedures = proceduresData || [];
      setProcedures(prev => {
        if (prev.length === 0) {
          return fetchedProcedures;
        }
        const fetchedMap = new Map<string, Procedure>();
        fetchedProcedures.forEach(proc => {
          if (proc.id) {
            fetchedMap.set(proc.id, proc);
          }
        });
        const combined = [
          ...fetchedProcedures,
          ...prev.filter(proc => !proc.id || !fetchedMap.has(proc.id)),
        ];
        return combined.sort((a, b) => a.name.localeCompare(b.name));
      });

      // Carregar cidades ativas
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (citiesError) throw citiesError;
      setCities(citiesData || []);

      if (adminMode) {
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('id, name')
          .order('name');

        if (professionalsError) {
          console.error('Erro ao carregar profissionais:', professionalsError);
        } else {
          setProfessionals(professionalsData || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingProcedures(false);
    }
  };

  const loadAvailableTimes = async (selectedDate: string, professionalId?: string | null) => {
    if (!formData.city_id || !selectedDate) return;

    if (adminMode && !professionalId) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    
    try {
      const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);
      const procedureDuration = selectedProcedure?.duration || 60;

      const { data: cityAvailability } = await supabase
        .from('city_availability')
        .select('*')
        .eq('city_id', formData.city_id)
        .lte('date_start', selectedDate)
        .or(`date_end.gte.${selectedDate},date_end.is.null`);

      if (!cityAvailability || cityAvailability.length === 0) {
        setAvailableTimes([]);
        return;
      }

      const { data: scheduleSettings } = await supabase
        .from('schedule_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!scheduleSettings) {
        setAvailableTimes([]);
        return;
      }

      const { data: scheduleExceptions } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .lte('date_start', selectedDate)
        .or(`date_end.gte.${selectedDate},date_end.is.null`);

      const exception = scheduleExceptions?.find(ex => {
        const start = new Date(ex.date_start);
        const end = ex.date_end ? new Date(ex.date_end) : start;
        const current = new Date(selectedDate);
        return current >= start && current <= end;
      });

      if (exception?.is_closed) {
        setAvailableTimes([]);
        return;
      }

      const startTime = exception?.custom_start_time || scheduleSettings.start_time;
      const endTime = exception?.custom_end_time || scheduleSettings.end_time;
      const intervalMinutes = exception?.custom_interval_minutes || scheduleSettings.interval_minutes;

      const timeSlots: string[] = [];
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(timeString);
      }

      let appointmentsQuery = supabase
        .from('appointments')
        .select('id, appointment_time, professional_id, procedures(duration)')
        .eq('appointment_date', selectedDate)
        .neq('status', 'cancelado');

      if (adminMode && professionalId) {
        appointmentsQuery = appointmentsQuery.eq('professional_id', professionalId);
      }

      const { data: appointments } = await appointmentsQuery;

      const occupiedSlots = new Set<string>();
      appointments?.forEach(apt => {
        if (isEditing && editingAppointmentId && apt.id === editingAppointmentId) {
          return;
        }
        const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
        const aptStartMinutes = aptHour * 60 + aptMinute;
        const aptDuration = apt.procedures?.duration || 60;
        
        for (let i = 0; i < aptDuration; i += intervalMinutes) {
          const blockedMinutes = aptStartMinutes + i;
          const blockedHour = Math.floor(blockedMinutes / 60);
          const blockedMinute = blockedMinutes % 60;
          const blockedTime = `${blockedHour.toString().padStart(2, '0')}:${blockedMinute.toString().padStart(2, '0')}`;
          occupiedSlots.add(blockedTime);
        }
      });

      const now = new Date();
      const currentDateStr = format(now, 'yyyy-MM-dd');
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      const available = timeSlots.filter(time => {
        if (occupiedSlots.has(time)) return false;
        
        const [hour, minute] = time.split(':').map(Number);
        const timeMinutes = hour * 60 + minute;
        const endTimeMinutes = timeMinutes + procedureDuration;
        
        if (endTimeMinutes > endMinutes) return false;
        
        if (selectedDate === currentDateStr && timeMinutes <= currentTimeMinutes) {
          return false;
        }

        for (let i = 0; i < procedureDuration; i += intervalMinutes) {
          const checkMinutes = timeMinutes + i;
          const checkHour = Math.floor(checkMinutes / 60);
          const checkMinute = checkMinutes % 60;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
          if (occupiedSlots.has(checkTime)) return false;
        }
        
        return true;
      });

      const enrichedAvailable = [...available];
      if (
        isEditing &&
        formData.appointment_date === selectedDate &&
        formData.appointment_time &&
        !enrichedAvailable.includes(formData.appointment_time)
      ) {
        enrichedAvailable.push(formData.appointment_time);
        enrichedAvailable.sort();
      }

      setAvailableTimes(enrichedAvailable);
    } catch (error) {
      console.error('Erro ao carregar horarios:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const loadAppointmentForEdit = async (appointmentId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          notes,
          city_id,
          professional_id,
          city_settings:city_settings (
            city_name,
            clinic_name,
            address,
            map_url
          ),
          clients (*),
          procedures (*),
          professionals (
            id,
            name
          ),
          appointments_procedures (
            order_index,
            custom_price,
            procedure:procedures (*)
          ),
          appointment_specifications (
            specification_id,
            specification_name,
            specification_price,
            specification:procedure_specifications (*)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Agendamento n?o encontrado.');

      const proceduresFromAppointment = (data.appointments_procedures && data.appointments_procedures.length > 0
        ? data.appointments_procedures
            .sort((a: any, b: any) => (a?.order_index || 0) - (b?.order_index || 0))
            .map((item: any) => item?.procedure)
        : [data.procedures]
      ).filter(Boolean);

      const hasSingleProcedure = proceduresFromAppointment.length <= 1;

      const normalizedProcedures = proceduresFromAppointment.length > 0
        ? proceduresFromAppointment.map((procedure: any, index: number) => {
            // Encontrar o entry correspondente em appointments_procedures para pegar o custom_price
            const apEntry = data.appointments_procedures?.find((ap: any) => ap.procedure?.id === procedure.id);
            
            const specsForProcedure = (data.appointment_specifications || [])
              .filter((spec: any) => {
                const procedureIdFromSpec = spec?.specification?.procedure_id;
                if (procedureIdFromSpec) {
                  return procedureIdFromSpec === procedure.id;
                }
                return hasSingleProcedure;
              })
              .map((spec: any) => ({
                id: spec?.specification?.id || spec?.specification_id,
                name: spec?.specification?.name || spec?.specification_name,
                description: spec?.specification?.description ?? null,
                price: spec?.specification_price ?? spec?.specification?.price ?? 0,
                display_order: spec?.specification?.display_order ?? 0,
                is_active: spec?.specification?.is_active ?? true,
                has_area_selection: spec?.specification?.has_area_selection ?? false,
                gender: spec?.specification?.gender ?? null,
                area_shapes: spec?.specification?.area_shapes ?? null,
              }));

            const specificationsTotal = specsForProcedure.reduce(
              (sum: number, spec: ProcedureSpecification) => sum + (spec.price || 0),
              0
            );

            return {
              id: `proc-${index + 1}`,
              procedure: procedure as Procedure,
              customPrice: apEntry?.custom_price !== null && apEntry?.custom_price !== undefined ? Number(apEntry.custom_price) : null,
              specifications: specsForProcedure,
              specificationsTotal,
            };
          })
        : [];

      if (normalizedProcedures.length === 0) {
        normalizedProcedures.push({
          id: 'proc-1',
          procedure: null,
          customPrice: null,
          specifications: [],
          specificationsTotal: 0,
        });
      }

      const newFormState = {
        procedure_id: normalizedProcedures[0]?.procedure?.id || '',
        appointment_date: data.appointment_date || '',
        appointment_time: data.appointment_time || '',
        notes: data.notes || '',
        city_id: data.city_id || '',
        professional_id: data.professional_id || '',
      };

      ensureCityPresent(newFormState.city_id, (data as any)?.city_settings?.city_name ?? null);
      ensureProfessionalPresent(data.professional_id, (data as any)?.professionals?.name ?? null);

      setSelectedProcedures(normalizedProcedures);
      setFormData(newFormState);
      if (data.clients) {
        setSelectedClient(data.clients);
      }

      const snapshot = createSnapshot(newFormState, normalizedProcedures);
      setOriginalSnapshot(snapshot);
      setIsDirty(false);
      hasLoadedEditingData.current = true;
    } catch (error) {
      console.error('Erro ao carregar agendamento para ediÃ§Ã£o:', error);
      toast({
        title: "Erro ao carregar agendamento",
        description: "N?o foi poss?vel carregar os dados do agendamento para edi??o.",
        variant: "destructive",
      });
      hasLoadedEditingData.current = true;
    } finally {
      setLoading(false);
    }
  };

  const handleClientFound = (client: Client) => {
    setSelectedClient(client);
    setLoading(true);
    createAppointment(client);
  };

  const handleClientNotFound = (phone: string) => {
    setPendingPhone(phone);
    setCurrentView('cadastro');
  };

  const handleClientRegistered = (client: Client) => {
    setSelectedClient(client);
    setLoading(true);
    createAppointment(client);
  };

  const createAppointment = async (client: Client) => {
    setLoading(true);
    
    try {
      const procedure = procedures.find(p => p.id === formData.procedure_id);
      const city = cities.find(c => c.id === formData.city_id);
      
      const appointmentData = {
        client_id: client.id,
        procedure_id: formData.procedure_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes,
        status: 'agendado',
        city_id: formData.city_id,
        total_body_areas_price: selectedSpecifications.reduce((sum, spec) => sum + spec.price, 0)
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      if (selectedSpecifications.length > 0) {
        const specificationsData = selectedSpecifications.map(spec => ({
          appointment_id: appointment.id,
          specification_id: spec.id,
          specification_name: spec.name,
          specification_price: spec.price
        }));

        const { error: specsError } = await supabase
          .from('appointment_specifications')
          .insert(specificationsData);

        if (specsError) throw specsError;
      }

      setAppointmentDetails(appointment);
      
      // Enviar evento para Meta Pixel
      try {
        await supabase.functions.invoke('send-meta-event', {
          body: {
            event_name: 'Lead',
            event_data: {
              content_name: procedure?.name || 'Procedimento',
              content_category: 'Agendamento',
              value: procedure?.price || 0,
              currency: 'BRL',
              source_url: window.location.href,
            },
            user_data: {
              ph: client.celular, // phone
              fn: client.nome, // first name
              ct: city?.city_name || '', // city
            }
          }
        });
      } catch (metaError) {
        console.error('Erro ao enviar evento Meta:', metaError);
      }
      
      // Enviar notificaÃ§Ãµes
      try {
        await sendWhatsAppNotification(client, appointment, procedure, city);
        await sendOwnerNotification(client, appointment, procedure, city);
        await sendAdminNotification(client, appointment, procedure, city);
      } catch (notificationError) {
        console.error('Erro ao enviar notificaÃ§Ãµes:', notificationError);
      }

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso. Uma confirmaÃ§Ã£o serÃ¡ enviada via WhatsApp.",
      });

      setCurrentView('confirmation');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any, 
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      console.log('=== INÃƒÂCIO WHATSAPP NOTIFICATION ===');
      console.log('Client:', client);
      console.log('Appointment:', appointment);
      console.log('Procedure:', procedure);
      console.log('City:', city);

      const notes = appointment.notes ? `\n?? ObservaÃ§Ãµes: ${appointment.notes}` : '';
      console.log('Notes formatadas:', notes);

      // Buscar dados da cidade
      console.log('Buscando dados da cidade com ID:', appointment.city_id);
      const { data: cityData, error: cityError } = await supabase
        .from('city_settings')
        .select('city_name, map_url')
        .eq('id', appointment.city_id)
        .single();

      console.log('City data:', cityData);
      console.log('City error:', cityError);

      // FormataÃ§Ã£o simples do local da clÃ­nica usando dados disponÃ­veis
      const cityName = cityData?.city_name || city?.city_name || '';
      const clinicLocation = `?? ClÃƒÂ­nica Dra. Karoline Ferreira Ã¢â‚¬â€ ${cityName}`;
      
      console.log('Clinic location formatada:', clinicLocation);

      // Buscar template do banco de dados
      console.log('Buscando template do banco...');
      const { data: templateData, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('template_content')
        .eq('template_type', 'agendamento_cliente')
        .single();

      console.log('Template encontrado:', templateData);
      console.log('Template error:', templateError);

      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      // Preparar variÃ¡veis para substituiÃ§Ã£o
      const variables = {
        clientName: client.nome,
        appointmentDate: format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR }),
        appointmentTime: appointment.appointment_time,
        procedureName: procedureName,
        notes: notes,
        clinicLocation: clinicLocation,
        cityName: cityName,
        clinicName: 'ClÃƒÂ­nica Dra. Karoline Ferreira',
        clinicMapUrl: cityData?.map_url || '',
        specifications: appointment.specifications || ''
      };

      console.log('VariÃ¡veis preparadas:', variables);

      // Processar template ou usar fallback
      let message = templateData?.template_content || `?? *Agendamento Confirmado*

OlÃ¡ {clientName}!

?? Data: {appointmentDate}
? HorÃ¡rio: {appointmentTime}
?? Procedimento: {procedureName}{notes}

{clinicLocation}

? Aguardamos vocÃƒÂª!`;

      console.log('Template inicial:', message);

      // Substituir todas as variÃ¡veis
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        const oldMessage = message;
        message = message.replace(regex, value || '');
        if (oldMessage !== message) {
          console.log(`Substituiu {${key}} por:`, value);
        }
      });

      console.log('Mensagem final processada:', message);

      // Enviar WhatsApp
      console.log('Enviando WhatsApp para:', client.celular);
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: client.celular,
          message
        }
      });

      if (sendError) {
        console.error('Erro ao enviar WhatsApp:', sendError);
      } else {
        console.log('WhatsApp enviado com sucesso');
      }

      console.log('=== FIM WHATSAPP NOTIFICATION ===');

    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
    }
  };

  const sendOwnerNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any,
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      const totalDuration = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0)
        : undefined;

      await supabase.functions.invoke('notify-owner', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedureName,
          cityName: city?.city_name || '',
          notes: appointment.notes || '',
          hasMultipleProcedures: hasMultipleProcedures,
          totalDuration: totalDuration
        }
      });
    } catch (error) {
      console.error('Erro ao notificar proprietÃ¡ria:', error);
    }
  };

  const sendAdminNotification = async (
    client: Client, 
    appointment: any, 
    procedure: any, 
    city: any,
    hasMultipleProcedures: boolean = false,
    proceduresToSave?: Array<{id: string, procedure: Procedure | null}>
  ) => {
    try {
      // Preparar nome dos procedimentos
      const procedureName = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
        : procedure?.name || '';

      const totalDuration = hasMultipleProcedures && proceduresToSave
        ? proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0)
        : undefined;

      await supabase.functions.invoke('notify-admins', {
        body: {
          type: 'agendamento',
          clientName: client.nome,
          clientPhone: client.celular,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          procedureName: procedureName,
          cityName: city?.city_name || '',
          notes: appointment.notes || '',
          hasMultipleProcedures: hasMultipleProcedures,
          totalDuration: totalDuration
        }
      });
    } catch (error) {
      console.error('Erro ao notificar admins:', error);
    }
  };

  const handleBookingSubmit = async (proceduresOverride?: typeof selectedProcedures) => {
    if (!selectedClient) return;

    try {
      setLoading(true);

      const proceduresToSave = proceduresOverride ?? selectedProcedures.filter(sp => sp.procedure !== null);
      const hasMultipleProcedures = proceduresToSave.length > 1;
      const primaryProcedureId = proceduresToSave[0]?.procedure?.id || formData.procedure_id;
      const primaryProcedure =
        procedures.find(p => p.id === primaryProcedureId) ||
        proceduresToSave[0]?.procedure ||
        null;
      const selectedCity = cities.find(c => c.id === formData.city_id);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: selectedClient.id,
          procedure_id: primaryProcedureId,
          professional_id: formData.professional_id || null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          notes: sanitizeNotes(formData.notes) || null,
          status: 'agendado',
          city_id: formData.city_id || null,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      if (proceduresToSave.length > 0) {
        const proceduresData = proceduresToSave.map((sp, index) => ({
          appointment_id: appointment.id,
          procedure_id: sp.procedure!.id,
          order_index: index,
          custom_price: sp.customPrice !== null && sp.customPrice !== undefined ? sp.customPrice : null,
        }));

        const { error: proceduresError } = await (supabase as any)
          .from('appointments_procedures')
          .insert(proceduresData);

        if (proceduresError) {
          console.error('Erro ao salvar procedimentos:', proceduresError);
          throw proceduresError;
        }
      }

      const allSpecifications = proceduresToSave.flatMap((sp) =>
        (sp.specifications || []).map((spec) => ({
          appointment_id: appointment.id,
          specification_id: spec.id,
          specification_name: spec.name,
          specification_price: spec.price || 0,
        }))
      );

      if (allSpecifications.length > 0) {
        const { error: specificationsError } = await supabase
          .from('appointment_specifications')
          .insert(allSpecifications);

        if (specificationsError) throw specificationsError;
      }

      if (sendNotification) {
        await sendWhatsAppNotification(
          selectedClient,
          appointment,
          primaryProcedure,
          selectedCity,
          hasMultipleProcedures,
          proceduresToSave
        );
        await sendOwnerNotification(
          selectedClient,
          appointment,
          primaryProcedure,
          selectedCity,
          hasMultipleProcedures,
          proceduresToSave
        );
        await sendAdminNotification(
          selectedClient,
          appointment,
          primaryProcedure,
          selectedCity,
          hasMultipleProcedures,
          proceduresToSave
        );
      }

      setAppointmentDetails(appointment);
      setCurrentView('confirmation');
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointment = async (proceduresToPersist: typeof selectedProcedures) => {
    if (!editingAppointmentId) return;

    try {
      setLoading(true);

      const updateData = {
        procedure_id: proceduresToPersist[0]?.procedure?.id || formData.procedure_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: sanitizeNotes(formData.notes) || null,
        city_id: formData.city_id || null,
        professional_id: formData.professional_id || null,
      };

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', editingAppointmentId);

      if (updateError) throw updateError;

      await supabase
        .from('appointments_procedures')
        .delete()
        .eq('appointment_id', editingAppointmentId);

      if (proceduresToPersist.length > 0) {
        const appointmentProcedures = proceduresToPersist.map((sp, index) => ({
          appointment_id: editingAppointmentId,
          procedure_id: sp.procedure!.id,
          order_index: index,
          custom_price: sp.customPrice !== null && sp.customPrice !== undefined ? sp.customPrice : null,
        }));

        const { error: insertProceduresError } = await (supabase as any)
          .from('appointments_procedures')
          .insert(appointmentProcedures);

        if (insertProceduresError) throw insertProceduresError;
      }

      await supabase
        .from('appointment_specifications')
        .delete()
        .eq('appointment_id', editingAppointmentId);

      const specsPayload = proceduresToPersist.flatMap((sp) =>
        (sp.specifications || []).map((spec) => ({
          appointment_id: editingAppointmentId,
          specification_id: spec.id,
          specification_name: spec.name,
          specification_price: spec.price || 0,
        }))
      );

      if (specsPayload.length > 0) {
        const { error: insertSpecsError } = await supabase
          .from('appointment_specifications')
          .insert(specsPayload);

        if (insertSpecsError) throw insertSpecsError;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message || "Nao foi possivel salvar as alteracoes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validProcedures = selectedProcedures.filter(sp => sp.procedure !== null);
    if (validProcedures.length === 0) {
      toast({
        title: "Procedimento obrigatorio",
        description: "Selecione pelo menos um procedimento.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.appointment_date || !formData.appointment_time || !formData.city_id || (adminMode && !formData.professional_id)) {
      toast({
        title: "Campos obrigatorios",
        description: adminMode
          ? "Por favor, preencha todos os campos obrigatorios (profissional, cidade, data e horario)."
          : "Por favor, preencha todos os campos obrigatorios (cidade, data e horario).",
        variant: "destructive",
      });
      return;
    }
    }

    for (const sp of validProcedures) {
      if (sp.procedure?.requires_specifications && (!sp.specifications || sp.specifications.length === 0)) {
        toast({
          title: "Especificacao obrigatoria",
          description: `Por favor, selecione especificacoes para ${sp.procedure.name}.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (adminMode && selectedClient) {
      if (isEditing) {
        if (!isDirty) {
          toast({
            title: "Sem alteracoes",
            description: "Altere algum dado antes de salvar.",
            variant: "destructive",
          });
          return;
        }
        handleUpdateAppointment(validProcedures);
      } else {
        handleBookingSubmit(validProcedures);
      }
      return;
    }
    
    setCurrentView('phone');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'phone':
        return (
          <LoginPhone
            onClientFound={handleClientFound}
            onClientNotFound={handleClientNotFound}
            onBack={() => setCurrentView('form')}
          />
        );
      
      case 'cadastro':
        return (
          <CadastroCliente
            phone={pendingPhone}
            onClientRegistered={handleClientRegistered}
            onBack={() => setCurrentView('phone')}
          />
        );
      
      case 'confirmation':
        const validProceduresForDisplay = selectedProcedures.filter(sp => sp.procedure !== null);
        const procedureName = validProceduresForDisplay.length > 1
          ? validProceduresForDisplay.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join(', ')
          : validProceduresForDisplay[0]?.procedure?.name || '';
        const cityName = cities.find(c => c.id === formData.city_id)?.city_name || '';
        
        return (
          <Card className="w-full max-w-2xl mx-auto shadow-2xl border-0 bg-gradient-to-br from-card via-card to-card/80">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                Agendamento Confirmado!
              </CardTitle>
              <p className="text-muted-foreground text-lg mt-2">
                Seu agendamento foi realizado com sucesso.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg text-muted-foreground">Processando agendamento...</p>
                </div>
              )}
              {!loading && appointmentDetails && (
                <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl space-y-3 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Procedimento</p>
                      <p className="font-semibold text-lg">{procedureName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data e HorÃ¡rio</p>
                      <p className="font-semibold text-lg">
                        {format(parseISO(appointmentDetails.appointment_date), "dd/MM/yyyy", { locale: ptBR })} ÃƒÂ s {appointmentDetails.appointment_time}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const cityRec = cities.find(c => c.id === appointmentDetails?.city_id);
                    return (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cidade</p>
                          <p className="font-semibold text-lg">{cityRec?.city_name || cityName}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {/* EndereÃƒÂ§o da clÃƒÂ­nica conforme cidade do agendamento */}
                  {(() => {
                    const cityRec = cities.find(c => c.id === appointmentDetails?.city_id);
                    const clinicName = cityRec?.clinic_name;
                    const address = cityRec?.address;
                    const mapUrl = cityRec?.map_url;
                    if (!address && !clinicName) return null;
                    return (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Unidade</p>
                          <p className="font-semibold">{clinicName ? `${clinicName} - ${cityRec?.city_name || cityName}` : cityRec?.city_name || cityName}</p>
                          {address && (
                            <p className="text-sm text-foreground mt-1">
                              {address}
                              {mapUrl ? (
                                <>
                                  {" Ã¢â‚¬Â¢ "}
                                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver no mapa</a>
                                </>
                              ) : null}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {appointmentDetails.total_body_areas_price > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-2xl text-primary">{currency(appointmentDetails.total_body_areas_price)}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {adminMode ? (
                  <Button
                    onClick={onSuccess}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Voltar para o CalendÃ¡rio
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => window.location.href = '/area-cliente'}
                      variant="outline"
                      className="w-full h-12 text-base font-medium"
                    >
                      Ver Meus Agendamentos
                    </Button>
                    <Button
                      onClick={onSuccess}
                      className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      Concluir
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        if (loadingProcedures) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            </div>
          );
        }

        return (
          <Card className="w-full max-w-4xl mx-auto shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm">
            <CardHeader className="text-center space-y-6 pb-8 bg-gradient-to-br from-primary/5 to-transparent">
              {logoUrl && (
                <div className="flex justify-center">
                  <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg">
                    <CalendarIcon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                    Agendar Consulta
                  </CardTitle>
                </div>
                <p className="text-muted-foreground text-lg">
                  Preencha os dados abaixo para realizar seu agendamento
                </p>
              </div>
              {true && (
                <div className="flex justify-center">
                  <a
                    href={"https://wa.me/5597984387295"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Tire suas dÃºvidas no WhatsApp
                  </a>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* SeÃ§Ã£o de Procedimentos - Formato Vertical */}
                <div className="space-y-6">
                  {selectedProcedures.map((item, index) => (
                    <div key={item.id} className="space-y-4">
                      {/* Dropdown do Procedimento */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Procedimento {selectedProcedures.length > 1 ? `${index + 1}` : ''} <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={item.procedure?.id || ""} 
                          onValueChange={(value) => {
                            const procedure = procedures.find(p => p.id === value);
                            const newProcedures = [...selectedProcedures];
                            newProcedures[index] = { 
                              ...item, 
                              procedure: procedure || null, 
                              specifications: [],
                              specificationsTotal: 0
                            };
                            setSelectedProcedures(newProcedures);
                            setOpenSelectId(null);
                            setProcedureSearch("");
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              setOpenSelectId(item.id);
                              setProcedureSearch("");
                            } else if (openSelectId === item.id) {
                              setOpenSelectId(null);
                              setProcedureSearch("");
                            }
                          }}
                        >
                          <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                            <SelectValue placeholder="Selecione um procedimento" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[320px]">
                            <div className="p-2 sticky top-0 bg-background z-10">
                              <Input
                                placeholder="Buscar procedimento..."
                                value={procedureSearch}
                                onChange={(e) => setProcedureSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            {(() => {
                              const proceduresToDisplay =
                                openSelectId === item.id && procedureSearch
                                  ? filteredProcedures
                                  : procedures;

                              if (proceduresToDisplay.length === 0) {
                                return (
                                  <div className="py-4 text-center text-sm text-muted-foreground">
                                    Nenhum procedimento encontrado.
                                  </div>
                                );
                              }

                              return proceduresToDisplay.map((procedure) => (
                                <SelectItem key={procedure.id} value={procedure.id} className="py-3">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{procedure.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {procedure.duration}min â€¢ {currency(procedure.price || 0)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>                      </div>

                      {/* Box de DescriÃ§Ã£o do Procedimento */}
                      {item.procedure && (
                        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-md flex-shrink-0">
                                <Sparkles className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-xl font-bold text-foreground">{item.procedure.name}</h3>
                                  {index > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newProcedures = selectedProcedures.filter((_, i) => i !== index);
                                        setSelectedProcedures(newProcedures);
                                      }}
                                      className="text-destructive hover:text-destructive flex-shrink-0"
                                      title="Remover procedimento"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                {item.procedure.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] line-clamp-4">
                                    {item.procedure.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium whitespace-nowrap">Valor:</span>
                                    <span className="text-sm text-primary font-bold">{currency(getEffectiveProcedurePrice(item))}</span>
                                  </div>
                                  {item.customPrice !== null && item.customPrice !== undefined && (
                                    <Badge variant="outline" className="text-xs text-primary border-primary/60">
                                      Valor personalizado
                                    </Badge>
                                  )}
                                  {adminMode && (
                                    <Button
                                      type="button"
                                      variant="link"
                                      className="h-auto p-0 text-sm"
                                      onClick={() => handleOpenPriceEditor(item.id)}
                                    >
                                      Editar valor
                                    </Button>
                                  )}
                                </div>
                                {adminMode && priceEditId === item.id && (
                                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditValue}
                                      onChange={(e) => setPriceEditValue(e.target.value)}
                                      className="sm:w-40"
                                      placeholder="Novo valor"
                                    />
                                    <div className="flex gap-2">
                                      <Button type="button" onClick={() => handleApplyCustomPrice(item.id)}>
                                        Aplicar
                                      </Button>
                                      <Button type="button" variant="outline" onClick={handleCancelPriceEdit}>
                                        Cancelar
                                      </Button>
                                      {item.customPrice !== null && item.customPrice !== undefined && (
                                        <Button type="button" variant="ghost" onClick={() => handleResetCustomPrice(item.id)}>
                                          Restaurar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {adminMode && item.customPrice !== null && item.customPrice !== undefined && (
                                  <p className="text-xs text-muted-foreground">
                                    Valor original: {currency(getDefaultProcedurePrice(item))}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* EspecificaÃ§Ãµes (se necessÃ¡rio) */}
                      {item.procedure?.requires_specifications && (
                        <div className="space-y-3">
                          <ProcedureSpecificationSelector
                            procedureId={item.procedure.id}
                            onSelectionChange={(data) => {
                              const newProcedures = [...selectedProcedures];
                              newProcedures[index] = { 
                                ...item, 
                                specifications: data.selectedSpecifications,
                                specificationsTotal: data.totalPrice // Salvar o preÃƒÂ§o total com desconto
                              };
                              setSelectedProcedures(newProcedures);
                            }}
                            initialSelections={item.specifications?.map(s => s.id) || []}
                            bodySelectionType={item.procedure.body_selection_type ?? null}
                            bodyImageUrl={item.procedure.body_image_url ?? null}
                            bodyImageUrlMale={item.procedure.body_image_url_male ?? null}
                          />
                        </div>
                      )}

                      {/* Link/BotÃƒÂ£o para adicionar mais procedimentos */}
                      {index === selectedProcedures.length - 1 && item.procedure && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProcedures([...selectedProcedures, { 
                              id: `proc-${Date.now()}`, 
                              procedure: null,
                              specifications: [],
                              specificationsTotal: 0
                            }]);
                          }}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar mais um procedimento
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Box de Resumo - SÃƒÂ­ntese dos Procedimentos */}
                {selectedProcedures.filter(p => p.procedure).length > 0 && (
                  <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Resumo do Agendamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {selectedProcedures.filter(p => p.procedure).map((item, index) => {
                          const totalPrice = getEffectiveProcedurePrice(item);                          
                          return (
                            <div key={item.id} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
                              <div className="flex-1">
                                <span className="font-medium">{item.procedure!.name}</span>
                                {item.specifications && item.specifications.length > 0 && (
                                  <span className="text-muted-foreground text-sm">
                                    {' '}({item.specifications.map(s => s.name).join(', ')})
                                  </span>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.procedure!.duration}min
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-right">
                                {currency(totalPrice)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Totais */}
                      {selectedProcedures.filter(p => p.procedure).length > 1 && (
                        <div className="pt-3 border-t-2 border-primary/20 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">DuraÃ§Ã£o Total:</span>
                            <span className="font-bold">
                              {selectedProcedures
                                .filter(p => p.procedure)
                                .reduce((sum, p) => sum + (p.procedure?.duration || 0), 0)} minutos
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold">Valor Total:</span>
                            <span className="text-lg font-bold text-primary">
                              {currency(
                                selectedProcedures
                                  .filter(p => p.procedure)
                                  .reduce((sum, p) => sum + getEffectiveProcedurePrice(p), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {adminMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                      Profissional <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.professional_id || ""}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, professional_id: value, appointment_time: "" }))}
                      disabled={professionals.length === 0}
                    >
                      <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                        <SelectValue
                          placeholder={
                            professionals.length === 0
                              ? "Nenhum profissional cadastrado"
                              : "Selecione um profissional"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id} className="py-3">
                            <span className="font-medium">{professional.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {professionals.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cadastre profissionais na area administrativa para habilitar esta selecao.
                      </p>
                    )}
                    {professionals.length > 0 && !formData.professional_id && (
                      <p className="text-xs text-muted-foreground">
                        Selecione um profissional para visualizar os horarios disponiveis.
                      </p>
                    )}
                  </div>
                )}

                {/* Cidade */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Cidade <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.city_id} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, city_id: value, appointment_date: '' }));
                      setAvailableTimes([]);
                    }}
                  >
                    <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                      <SelectValue placeholder="Selecione uma cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id} className="py-3">
                          <span className="font-medium">{city.city_name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data com CalendÃ¡rio */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Data <span className="text-destructive">*</span>
                  </label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-14 justify-start text-left font-normal border-2 hover:border-primary/50 transition-all duration-200",
                          !formData.appointment_date && "text-muted-foreground"
                        )}
                        disabled={!formData.city_id}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {formData.appointment_date ? (
                          format(parseISO(formData.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          <span>{formData.city_id ? "Selecione uma data" : "Selecione a cidade primeiro"}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.appointment_date ? parseISO(formData.appointment_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const selectedDate = format(date, 'yyyy-MM-dd');
                            setFormData(prev => ({ ...prev, appointment_date: selectedDate }));
                            
                            // Verificar disponibilidade para mostrar aviso
                            if (formData.city_id) {
                              checkDateAvailability(selectedDate, formData.city_id);
                            }
                            
                            setCalendarOpen(false);
                          }
                        }}
                        disabled={(date) => {
                          // Se allowPastDates for true, nÃƒÂ£o desabilitar nenhuma data
                          if (allowPastDates) return false;
                          
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Apenas desabilitar datas passadas
                          return date < today;
                        }}
                        locale={ptBR}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Aviso de disponibilidade */}
                  {availabilityWarning && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        Ã¢Å¡Â Ã¯Â¸Â {availabilityWarning}
                      </p>
                    </div>
                  )}
                </div>

                {/* HorÃ¡rio */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    HorÃ¡rio <span className="text-destructive">*</span>
                  </label>
                  <Select 
                    value={formData.appointment_time} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_time: value }))}
                    disabled={!formData.appointment_date || loadingTimes}
                  >
                    <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-all duration-200 bg-background">
                      <SelectValue placeholder={
                        loadingTimes ? "Carregando horarios..." : 
                        !formData.appointment_date ? "Selecione a data primeiro" : 
                        availableTimes.length === 0 ? "Sem horarios disponiveis" :
                        "Selecione um horario"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimes.map((time) => (
                        <SelectItem key={time} value={time} className="py-3">
                          <span className="font-medium">{time}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ObservaÃ§Ãµes */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    ObservaÃ§Ãµes (opcional)
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione qualquer observaÃ§Ã£o relevante sobre o agendamento..."
                    className="min-h-[100px] border-2 hover:border-primary/50 transition-all duration-200"
                  />
                </div>

                {/* BotÃµes de AÃ§Ã£o */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={onBack}
                    variant="outline"
                    className="flex-1 h-12 text-base"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (isEditing && !isDirty)}
                    className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Processando...
                      </span>
                    ) : isEditing ? 'Salvar alteracoes' : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      {renderCurrentView()}
    </div>
  );
}

export default NewBookingFlow;

