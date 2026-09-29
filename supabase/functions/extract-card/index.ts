import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storage_path_front, storage_path_back } = await req.json();

    if (!storage_path_front) {
      return new Response(
        JSON.stringify({ error: 'storage_path_front is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Download front image
    const { data: frontBlob, error: frontError } = await supabase.storage
      .from('scanned-cards')
      .download(storage_path_front);

    if (frontError || !frontBlob) {
      throw new Error(`Failed to download front image: ${frontError?.message}`);
    }

    const frontBuffer = await frontBlob.arrayBuffer();
    const frontBase64 = btoa(String.fromCharCode(...new Uint8Array(frontBuffer)));

    // 3. Download back image (if provided)
    let backBase64: string | null = null;
    if (storage_path_back) {
      const { data: backBlob, error: backError } = await supabase.storage
        .from('scanned-cards')
        .download(storage_path_back);

      if (!backError && backBlob) {
        const backBuffer = await backBlob.arrayBuffer();
        backBase64 = btoa(String.fromCharCode(...new Uint8Array(backBuffer)));
      }
    }

    // 4. Gemini API Configuration
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in Supabase Secrets');
    }

    const parts: any[] = [
      {
        text: `You are an expert OCR AI specializing in global marine, shipping, and offshore industrial business cards.
Analyze the attached business card image(s) (Front and optional Back).
Merge details from both sides.
NEVER invent or hallucinate data. If a field is not present, use an empty string or empty array.
If Chinese, Japanese, Korean or other non-Latin characters appear, extract the text accurately in other_languages_text.

Return STRICT JSON only matching this exact JSON schema:
{
  "full_name": string,
  "job_title": string,
  "company_name": string,
  "phones": [
    { "label": "mobile" | "office" | "fax", "number": string }
  ],
  "emails": [string],
  "website": string,
  "address": string,
  "country": string,
  "other_languages_text": string,
  "products_or_services": string,
  "confidence": {
    "full_name": number between 0 and 1,
    "job_title": number between 0 and 1,
    "company_name": number between 0 and 1,
    "phones": number between 0 and 1,
    "emails": number between 0 and 1,
    "address": number between 0 and 1
  }
}`,
      },
      {
        inline_data: {
          mime_type: 'image/jpeg',
          data: frontBase64,
        },
      },
    ];

    if (backBase64) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: backBase64,
        },
      });
    }

    // 5. Send request to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error (${geminiRes.status}): ${errText}`);
    }

    const geminiJson = await geminiRes.json();
    const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API did not return text response');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText.trim());
    } catch (parseErr) {
      // Clean possible markdown code fences
      const cleanJson = candidateText.replace(/^```json\s*|\s*```$/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResult,
        ai_raw: geminiJson,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in extract-card function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
