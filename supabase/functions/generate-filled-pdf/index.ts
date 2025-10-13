import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  response_id: string;
}

interface PDFCoordinates {
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
}

interface PDFFieldMapping {
  field_key: string;
  type: string;
  coordinates?: PDFCoordinates;
}

interface PDFMapping {
  template_url: string;
  fields: PDFFieldMapping[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response_id }: GeneratePDFRequest = await req.json();

    if (!response_id) {
      return new Response(
        JSON.stringify({ error: 'response_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('=== Generate Filled PDF Function ===');
    console.log('Response ID:', response_id);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar a response com todos os dados relacionados
    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .select(`
        *,
        form_templates (
          id,
          name,
          pdf_template_url,
          pdf_template_path,
          pdf_mapping
        )
      `)
      .eq('id', response_id)
      .single();

    if (responseError || !response) {
      console.error('Erro ao buscar response:', responseError);
      return new Response(
        JSON.stringify({ error: 'Response não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const template = (response as any).form_templates;
    
    if (!template?.pdf_template_path) {
      return new Response(
        JSON.stringify({ error: 'Template não possui PDF configurado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Template:', template.name);
    console.log('PDF Path:', template.pdf_template_path);

    // 2. Baixar o PDF template do Storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-pdfs')
      .download(template.pdf_template_path);

    if (downloadError || !pdfData) {
      console.error('Erro ao baixar PDF template:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao baixar PDF template' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('PDF template baixado, tamanho:', pdfData.size);

    // 3. Carregar o PDF com pdf-lib
    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Carregar fontes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    console.log('PDF carregado, páginas:', pages.length);

    // 4. Obter mapeamento de campos
    const mapping = template.pdf_mapping as unknown as PDFMapping;
    
    if (!mapping || !mapping.fields || mapping.fields.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum campo mapeado no PDF' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Campos mapeados:', mapping.fields.length);

    // 5. Preencher campos no PDF
    const responseData = response.response_data as Record<string, any>;

    for (const fieldMapping of mapping.fields) {
      const coords = fieldMapping.coordinates;
      if (!coords) continue;

      const value = responseData[fieldMapping.field_key];
      if (value === undefined || value === null || value === '') continue;

      // Converter valor para string
      let textValue = '';
      if (typeof value === 'boolean') {
        textValue = value ? 'Sim' : 'Não';
      } else if (Array.isArray(value)) {
        textValue = value.join(', ');
      } else {
        textValue = String(value);
      }

      // Obter página (ajustar para índice 0-based)
      const pageIndex = coords.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.warn(`Página ${coords.page} não existe no PDF`);
        continue;
      }

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const fontSize = coords.fontSize || 10;
      
      // Escolher fonte
      const font = coords.fontFamily === 'Helvetica-Bold' ? helveticaBoldFont : helveticaFont;

      // Converter coordenadas de % para pixels
      // coords.y vem como % do TOPO (0% = topo, 100% = fundo)
      // PDF usa origem no canto inferior esquerdo, então invertemos
      const x = (coords.x / 100) * pageWidth;
      const y = pageHeight - ((coords.y / 100) * pageHeight) - fontSize; // Subtrair fontSize para texto ficar na linha

      // Calcular largura máxima
      const maxWidth = (coords.width / 100) * pageWidth;

      // Desenhar texto
      try {
        // Verificar se texto cabe
        const textWidth = font.widthOfTextAtSize(textValue, fontSize);
        
        if (textWidth > maxWidth) {
          // Texto muito longo, tentar reduzir fonte
          const scaleFactor = maxWidth / textWidth;
          const adjustedFontSize = fontSize * scaleFactor * 0.95; // 95% para margem
          
          page.drawText(textValue, {
            x,
            y,
            size: adjustedFontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          console.log(`Campo ${fieldMapping.field_key}: fonte ajustada para ${adjustedFontSize.toFixed(1)}pt`);
        } else {
          // Texto cabe normalmente
          page.drawText(textValue, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          console.log(`Campo ${fieldMapping.field_key}: preenchido com "${textValue.substring(0, 30)}..."`);
        }
      } catch (error) {
        console.error(`Erro ao desenhar campo ${fieldMapping.field_key}:`, error);
      }
    }

    // 6. Salvar PDF preenchido
    const filledPdfBytes = await pdfDoc.save();
    
    // 7. Upload para Storage
    const timestamp = Date.now();
    const clientId = response.client_id || 'unknown';
    const filePath = `filled-forms/${clientId}/${response_id}_${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('form-pdfs')
      .upload(filePath, filledPdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do PDF preenchido:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar PDF preenchido' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('PDF preenchido salvo:', filePath);

    // 8. Gerar URL assinada válida por 24 horas
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('form-pdfs')
      .createSignedUrl(filePath, 86400); // 24 horas

    if (signedUrlError || !signedUrlData) {
      console.error('Erro ao gerar URL assinada:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar URL do PDF' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 9. Atualizar response com caminho do PDF preenchido
    await supabase
      .from('form_responses')
      .update({ 
        filled_pdf_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', response_id);

    console.log('=== PDF Gerado com Sucesso ===');

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: signedUrlData.signedUrl,
        pdf_path: filePath,
        fields_filled: mapping.fields.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao gerar PDF',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
