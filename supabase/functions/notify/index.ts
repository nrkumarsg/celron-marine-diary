import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  profile_id?: string;
  company_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { title, body, data = {}, profile_id, company_id } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find recipient push tokens
    let tokens: string[] = [];

    if (profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', profile_id)
        .single();

      if (profile?.expo_push_token) {
        tokens.push(profile.expo_push_token);
      }
    } else {
      // Broadcast to company staff
      let query = supabase
        .from('profiles')
        .select('expo_push_token')
        .not('expo_push_token', 'is', null);

      if (company_id) {
        query = query.eq('company_id', company_id);
      }

      const { data: profiles } = await query;
      if (profiles) {
        tokens = profiles
          .map((p) => p.expo_push_token)
          .filter((t): t is string => Boolean(t) && t.startsWith('ExponentPushToken['));
      }
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No registered push tokens found for recipient(s)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format Expo Push Messages
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId: 'visitor-alerts',
      priority: 'high',
    }));

    // Send to Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json();

    return new Response(
      JSON.stringify({ success: true, count: tokens.length, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error dispatching push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
