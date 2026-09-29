import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify X-Hub-Signature-256 from Meta
async function verifyMetaSignature(signatureHeader: string | null, rawBody: string, appSecret: string): Promise<boolean> {
  if (!signatureHeader || !appSecret) return true; // allow pass-through if secret not set yet
  try {
    const signature = signatureHeader.replace('sha256=', '');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const calculatedSignatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const calculatedHex = Array.from(new Uint8Array(calculatedSignatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return signature.toLowerCase() === calculatedHex.toLowerCase();
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// Generate random uppercase 8-character visit code
function generateVisitCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  const url = new URL(req.url);

  // 1. GET: META WEBHOOK VERIFICATION HANDSHAKE
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'celron_visitor_secret_verify_token';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful!');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      console.warn('[WhatsApp Webhook] Verification token mismatch:', { received: token, expected: expectedToken });
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 2. OPTIONS PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 3. POST: PROCESS INCOMING WHATSAPP MESSAGES
  try {
    const rawBody = await req.text();
    const appSecret = Deno.env.get('WHATSAPP_APP_SECRET') || '';

    // Verify HMAC SHA-256 signature if appSecret is configured
    if (appSecret) {
      const sigHeader = req.headers.get('x-hub-signature-256');
      const isValid = await verifyMetaSignature(sigHeader, rawBody, appSecret);
      if (!isValid) {
        console.warn('[WhatsApp Webhook] Invalid HMAC signature!');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a WhatsApp status update or message payload
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes || !changes.messages || changes.messages.length === 0) {
      // It might be a delivery receipt or status update; acknowledge 200 OK
      return new Response(JSON.stringify({ status: 'ignored_non_message' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = changes.messages[0];
    const waMessageId = message.id;
    const rawFrom = message.from; // e.g. "6591234567"
    const messageText = message.text?.body || message.button?.text || '';
    const contactProfile = changes.contacts?.[0]?.profile;
    const senderName = contactProfile?.name || 'Visitor';

    // Normalize phone number to international + format
    let cleanPhone = rawFrom.replace(/[^\+0-9]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`;
    }

    console.log(`[WhatsApp Webhook] Incoming message from ${cleanPhone} (${senderName}): "${messageText}"`);

    // Deduplication check in whatsapp_messages table
    const { data: existingMsg } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('wa_message_id', waMessageId)
      .maybeSingle();

    if (existingMsg) {
      console.log('[WhatsApp Webhook] Duplicate message ID ignored:', waMessageId);
      return new Response(JSON.stringify({ status: 'duplicate_ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get company ID for Cel-Ron
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('Cel-Ron company record not initialized in database');
    }

    // Check visitor in visitors table
    let visitorId: string;
    let isReturning = false;
    let existingCompany: string | null = null;

    const { data: visitor } = await supabase
      .from('visitors')
      .select('*')
      .eq('company_id', company.id)
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (visitor) {
      visitorId = visitor.id;
      isReturning = true;
      existingCompany = visitor.visitor_company;

      await supabase
        .from('visitors')
        .update({
          whatsapp_name: senderName,
          last_visit_at: new Date().toISOString(),
          visit_count: (visitor.visit_count || 1) + 1,
        })
        .eq('id', visitor.id);
    } else {
      // Check if phone matches any scanned business cards
      const phoneDigits = cleanPhone.replace(/[^0-9]/g, '').slice(-8);
      const { data: scannedCard } = await supabase
        .from('scanned_contacts')
        .select('id, company_name, full_name')
        .eq('company_id', company.id)
        .like('phones::text', `%${phoneDigits}%`)
        .limit(1)
        .maybeSingle();

      const { data: newVisitor, error: createVisitorError } = await supabase
        .from('visitors')
        .insert({
          company_id: company.id,
          phone: cleanPhone,
          whatsapp_name: senderName,
          full_name: scannedCard?.full_name || senderName,
          visitor_company: scannedCard?.company_name || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          visit_count: 1,
          scanned_contact_id: scannedCard?.id || null,
        })
        .select()
        .single();

      if (createVisitorError || !newVisitor) {
        throw new Error(`Failed to create visitor: ${createVisitorError?.message}`);
      }
      visitorId = newVisitor.id;
      existingCompany = scannedCard?.company_name || null;
    }

    // Check 30-minute deduplication window for visits
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentVisit } = await supabase
      .from('visits')
      .select('*')
      .eq('visitor_id', visitorId)
      .gte('checked_in_at', thirtyMinutesAgo)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let visitId: string;
    let visitCode: string;

    if (recentVisit) {
      visitId = recentVisit.id;
      visitCode = recentVisit.visit_code;
      console.log(`[WhatsApp Webhook] Reusing active visit code ${visitCode} within 30-min window`);
    } else {
      visitCode = generateVisitCode();
      const { data: newVisit, error: createVisitError } = await supabase
        .from('visits')
        .insert({
          visit_code: visitCode,
          visitor_id: visitorId,
          purpose: 'Spare parts enquiry',
          party_size: 1,
          location: 'Cel-Ron Office',
          checked_in_at: new Date().toISOString(),
          details_completed: false,
          consent_given: true,
          source: 'whatsapp',
        })
        .select()
        .single();

      if (createVisitError || !newVisit) {
        throw new Error(`Failed to create visit record: ${createVisitError?.message}`);
      }
      visitId = newVisit.id;
    }

    // Log the incoming message to whatsapp_messages table
    await supabase.from('whatsapp_messages').insert({
      wa_message_id: waMessageId,
      from_phone: cleanPhone,
      text: messageText,
      received_at: new Date().toISOString(),
      visit_id: visitId,
    });

    // Send WhatsApp Cloud API Auto-Reply (if enabled)
    const whatsappEnabled = Deno.env.get('WHATSAPP_ENABLED') === 'true';
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const webBaseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://celron.com.sg';

    const completionUrl = `${webBaseUrl}/visit/${visitCode}`;

    const greeting = isReturning
      ? `Welcome back to Cel-Ron Enterprises, ${senderName}! ⚓`
      : `Welcome to Cel-Ron Enterprises Pte Ltd, ${senderName}! ⚓`;

    const replyMessage = `${greeting}\n\nThank you for checking in at our Sim Lim Tower office. Please take a few seconds to complete your visit details and select your host staff:\n\n👉 ${completionUrl}\n\nOur team has been notified of your arrival.`;

    if (whatsappEnabled && whatsappToken && phoneNumberId) {
      try {
        const sendResponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone.replace('+', ''),
              type: 'text',
              text: {
                preview_url: true,
                body: replyMessage,
              },
            }),
          }
        );

        const sendResult = await sendResponse.json();
        console.log('[WhatsApp Webhook] Auto-reply sent:', sendResult);
      } catch (waErr) {
        console.error('[WhatsApp Webhook] Failed to send WhatsApp auto-reply:', waErr);
      }
    } else {
      console.log('[WhatsApp Webhook] WhatsApp API not enabled/configured. Auto-reply preview:', {
        to: cleanPhone,
        text: replyMessage,
      });
    }

    // Trigger Expo push notification to office staff via notify Edge Function
    try {
      const notifyUrl = `${supabaseUrl}/functions/v1/notify`;
      await fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🔔 New Visitor Arrival (WhatsApp)',
          body: `${senderName}${existingCompany ? ` (${existingCompany})` : ''} checked in via WhatsApp.`,
          data: { visit_id: visitId, visit_code: visitCode },
          company_id: company.id,
        }),
      });
    } catch (pushErr) {
      console.warn('[WhatsApp Webhook] Could not dispatch push notification:', pushErr);
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        visit_code: visitCode,
        is_returning: isReturning,
        auto_replied: whatsappEnabled,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    // Always return 200 to Meta so it does not keep retrying errored messages forever
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
