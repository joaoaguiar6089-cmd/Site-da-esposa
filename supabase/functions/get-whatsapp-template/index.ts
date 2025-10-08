import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NullableString = string | null | undefined;

const safeTrim = (value: NullableString): string => (typeof value === 'string' ? value.trim() : '');

const buildClinicLocation = (city?: {
  city_name?: NullableString;
  clinic_name?: NullableString;
  address?: NullableString;
  map_url?: NullableString;
} | null): string => {
  if (!city) return '';

  const clinicName = safeTrim(city.clinic_name);
  const cityName = safeTrim(city.city_name);
  let header = clinicName;

  if (cityName) {
    if (header) {
      const lowerHeader = header.toLowerCase();
      const lowerCity = cityName.toLowerCase();
      if (!lowerHeader.includes(lowerCity)) {
        header = `${header} - ${cityName}`;
      }
    } else {
      header = cityName;
    }
  }

  const lines: string[] = [];
  if (header) lines.push(header);

  const address = safeTrim(city.address);
  if (address) lines.push(address);

  const mapUrl = safeTrim(city.map_url);
  if (mapUrl) lines.push(mapUrl);

  return lines.join('\n');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      templateType,
      variables = {},
      cityId,
    }: {
      templateType: string;
      variables?: Record<string, NullableString>;
      cityId?: string | null;
    } = body;

    console.log('Getting template:', { templateType, variables, cityId });

    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .select('template_content')
      .eq('template_type', templateType)
      .single();

    if (error || !template) {
      console.error('Template not found:', error);
      throw new Error(`Template ${templateType} not found`);
    }

    const mergedVariables: Record<string, string> = {};

    // Primeiro, adicionar todas as variáveis como vieram
    Object.entries(variables || {}).forEach(([key, value]) => {
      mergedVariables[key] = safeTrim(value);
    });

    // Mapeamento de variáveis em português para inglês (para templates originais)
    const portugueseToEnglish: Record<string, string> = {
      'nomeCliente': 'clientName',
      'telefoneCliente': 'clientPhone', 
      'dataAgendamento': 'appointmentDate',
      'horaAgendamento': 'appointmentTime',
      'nomeProcedimento': 'procedureName',
      'nomeProfissional': 'professionalName',
      'observacoes': 'notes',
      'especificacoes': 'specifications',
      'nomeCidade': 'cityName',
      'nomeClinica': 'clinicName',
      'enderecoClinica': 'clinicAddress',
      'urlMapaClinica': 'clinicMapUrl',
      'localizacaoClinica': 'clinicLocation'
    };

    // Mapear variáveis em português para inglês
    Object.entries(variables || {}).forEach(([key, value]) => {
      const englishKey = portugueseToEnglish[key];
      if (englishKey) {
        mergedVariables[englishKey] = safeTrim(value);
      }
    });

    if (cityId) {
      const { data: cityData, error: cityError } = await supabase
        .from('city_settings')
        .select('city_name, clinic_name, address, map_url')
        .eq('id', cityId)
        .maybeSingle();

      const errorCode = (cityError as { code?: string } | null)?.code;
      if (cityError && errorCode !== 'PGRST116') {
        console.error('Error fetching city info:', cityError);
      }

      if (cityData) {
        const clinicName = safeTrim(cityData.clinic_name);
        const cityName = safeTrim(cityData.city_name);
        const address = safeTrim(cityData.address);
        const mapUrl = safeTrim(cityData.map_url);
        const location = buildClinicLocation(cityData);
        
        // Variáveis em inglês (para templates originais)
        mergedVariables.cityName = cityName;
        mergedVariables.clinicName = clinicName;
        mergedVariables.clinicAddress = address;
        mergedVariables.clinicMapUrl = mapUrl;
        mergedVariables.clinicLocation = location;
        
        // Variáveis em português (para interface nova)
        mergedVariables.nomeCidade = cityName;
        mergedVariables.nomeClinica = clinicName;
        mergedVariables.enderecoClinica = address;
        mergedVariables.urlMapaClinica = mapUrl;
        mergedVariables.localizacaoClinica = location;
      }
    }

    let message = template.template_content;

    Object.entries(mergedVariables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      message = message.replace(new RegExp(escaped, 'g'), value);
    });

    console.log('Generated message:', message.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({ message, variables: mergedVariables }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error in get-whatsapp-template function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
};

serve(handler);
