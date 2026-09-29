import { createClient } from '@supabase/supabase-js';

// Reads environment variables with safe defaults for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

// Create a single supabase client for browser interactions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Telemetry helper to log scans (QR, NFC tap, or shared link)
export async function logScanRecord({
  shareLinkId,
  profileId,
  source,
  userAgent,
}: {
  shareLinkId?: string | null;
  profileId: string;
  source: 'qr' | 'nfc' | 'link';
  userAgent?: string;
}) {
  if (!isSupabaseConfigured()) {
    console.log(`[Telemetry Mock] Logged scan: source=${source}, profileId=${profileId}, linkId=${shareLinkId}`);
    return;
  }

  try {
    await supabase.from('scans').insert({
      share_link_id: shareLinkId || null,
      profile_id: profileId,
      source: source,
      user_agent: userAgent?.slice(0, 500) || null,
    });
  } catch (err) {
    console.error('Failed to log scan telemetry:', err);
  }
}
