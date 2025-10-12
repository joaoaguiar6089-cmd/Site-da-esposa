import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TIMEZONE } from '@/utils/timezones';
import { clearTimezoneCache } from '@/utils/dateUtils';

interface TimezoneContextType {
  timezone: string;
  timezoneName: string;
  dateFormat: string;
  timeFormat: string;
  loading: boolean;
  updateTimezone: (timezone: string, timezoneName: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [timezoneName, setTimezoneName] = useState<string>('Brasília (UTC-3)');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<string>('HH:mm');
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('setting_key, setting_value')
        .in('setting_key', ['timezone', 'timezone_name', 'date_format', 'time_format']);

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        const settings = data.reduce((acc: Record<string, string>, item: any) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string>);

        const newTimezone = settings.timezone || DEFAULT_TIMEZONE;
        
        setTimezone(newTimezone);
        setTimezoneName(settings.timezone_name || 'Brasília (UTC-3)');
        setDateFormat(settings.date_format || 'DD/MM/YYYY');
        setTimeFormat(settings.time_format || 'HH:mm');
        
        // Limpar cache para forçar o dateUtils a carregar o novo timezone
        clearTimezoneCache();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimezone = async (newTimezone: string, newTimezoneName: string) => {
    try {
      // Atualizar timezone
      const { error: tzError } = await supabase
        .from('system_settings' as any)
        .update({ setting_value: newTimezone, updated_at: new Date().toISOString() })
        .eq('setting_key', 'timezone');

      if (tzError) throw tzError;

      // Atualizar timezone_name
      const { error: nameError } = await supabase
        .from('system_settings' as any)
        .update({ setting_value: newTimezoneName, updated_at: new Date().toISOString() })
        .eq('setting_key', 'timezone_name');

      if (nameError) throw nameError;

      // Limpar cache do dateUtils para forçar reload do novo timezone
      clearTimezoneCache();

      // Atualizar estado local
      setTimezone(newTimezone);
      setTimezoneName(newTimezoneName);
    } catch (error) {
      console.error('Erro ao atualizar timezone:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <TimezoneContext.Provider
      value={{
        timezone,
        timezoneName,
        dateFormat,
        timeFormat,
        loading,
        updateTimezone,
        refreshSettings,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    // Retornar valores padrão ao invés de lançar erro
    console.warn('useTimezone foi usado fora do TimezoneProvider. Usando valores padrão.');
    return {
      timezone: DEFAULT_TIMEZONE,
      timezoneName: 'Brasília (UTC-3)',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      loading: false,
      updateTimezone: async () => {
        console.error('updateTimezone chamado fora do TimezoneProvider');
      },
      refreshSettings: async () => {
        console.error('refreshSettings chamado fora do TimezoneProvider');
      },
    };
  }
  return context;
}
