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
  console.log('🟢 TimezoneProvider FUNÇÃO EXECUTADA');
  
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [timezoneName, setTimezoneName] = useState<string>('Brasília (UTC-3)');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<string>('HH:mm');
  const [loading, setLoading] = useState(true);
  
  console.log('🟢 TimezoneProvider STATE INICIALIZADO:', { timezone, timezoneName, loading });

  const loadSettings = async () => {
    console.log('🔵 TimezoneProvider.loadSettings iniciado');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('setting_key, setting_value')
        .in('setting_key', ['timezone', 'timezone_name', 'date_format', 'time_format']);

      if (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        return;
      }

      console.log('📊 Dados carregados do banco:', data);

      if (data) {
        const settings = data.reduce((acc: Record<string, string>, item: any) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string>);

        console.log('📋 Settings processados:', settings);

        const newTimezone = settings.timezone || DEFAULT_TIMEZONE;
        
        console.log('🌍 Configurando timezone:', newTimezone);
        console.log('📛 Configurando timezoneName:', settings.timezone_name || 'Brasília (UTC-3)');
        
        setTimezone(newTimezone);
        setTimezoneName(settings.timezone_name || 'Brasília (UTC-3)');
        setDateFormat(settings.date_format || 'DD/MM/YYYY');
        setTimeFormat(settings.time_format || 'HH:mm');
        
        // Limpar cache para forçar o dateUtils a carregar o novo timezone
        clearTimezoneCache();
        console.log('✅ loadSettings concluído');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
      console.log('🔵 loadSettings finalizado (loading = false)');
    }
  };

  const updateTimezone = async (newTimezone: string, newTimezoneName: string) => {
    console.log('🔵 useTimezone.updateTimezone chamado:', { newTimezone, newTimezoneName });
    
    try {
      // Atualizar timezone
      console.log('🟡 Atualizando timezone no banco...');
      const { error: tzError } = await supabase
        .from('system_settings' as any)
        .update({ setting_value: newTimezone, updated_at: new Date().toISOString() })
        .eq('setting_key', 'timezone');

      if (tzError) {
        console.error('❌ Erro ao atualizar timezone:', tzError);
        throw tzError;
      }
      console.log('✅ Timezone atualizado no banco');

      // Atualizar timezone_name
      console.log('🟡 Atualizando timezone_name no banco...');
      const { error: nameError } = await supabase
        .from('system_settings' as any)
        .update({ setting_value: newTimezoneName, updated_at: new Date().toISOString() })
        .eq('setting_key', 'timezone_name');

      if (nameError) {
        console.error('❌ Erro ao atualizar timezone_name:', nameError);
        throw nameError;
      }
      console.log('✅ Timezone_name atualizado no banco');

      // Limpar cache do dateUtils para forçar reload do novo timezone
      console.log('🟡 Limpando cache do dateUtils...');
      clearTimezoneCache();
      console.log('✅ Cache limpo');

      // Atualizar estado local
      console.log('🟡 Atualizando estado local...');
      setTimezone(newTimezone);
      setTimezoneName(newTimezoneName);
      console.log('✅ Estado local atualizado');
      
      console.log('✅ updateTimezone concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar timezone:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    console.log('🚀 TimezoneProvider montado - iniciando loadSettings');
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
  console.log('🔵 useTimezone chamado');
  const context = useContext(TimezoneContext);
  console.log('🔍 context recebido:', context);
  
  if (context === undefined) {
    // Retornar valores padrão ao invés de lançar erro
    console.warn('useTimezone foi usado fora do TimezoneProvider. Usando valores padrão.');
    console.trace('Stack trace de onde foi chamado:');
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
  console.log('✅ useTimezone retornando context válido');
  return context;
}
