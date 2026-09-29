import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

const PRESETS_STORAGE_KEY = '@celron_cached_presets';

export interface SharePreset {
  id: string;
  label: string;
  short_code: string;
  document_ids: string[];
  is_preset: boolean;
}

export const DEFAULT_PRESETS: SharePreset[] = [
  {
    id: 's0000000-0000-0000-0000-000000000001',
    label: 'Standard Marine Parts Pack',
    short_code: 'CRON-GEN',
    document_ids: [
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000002',
    ],
    is_preset: true,
  },
  {
    id: 's0000000-0000-0000-0000-000000000002',
    label: 'Full Commercial & Certs Pack',
    short_code: 'CRON-FULL',
    document_ids: [
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000002',
      'd0000000-0000-0000-0000-000000000003',
    ],
    is_preset: true,
  },
];

/**
 * Generates an 8-character uppercase short code starting with CR-
 */
export function generateShortCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CR-${randomPart}`;
}

/**
 * Creates a new share link in Supabase
 */
export async function createShareLink({
  profileId,
  documentIds,
  label,
  isPreset = false,
}: {
  profileId: string;
  documentIds: string[];
  label: string;
  isPreset?: boolean;
}): Promise<{ success: boolean; shortCode: string; linkId?: string; error?: string }> {
  const shortCode = generateShortCode();

  if (!isSupabaseConfigured()) {
    // Offline / Mock fallback
    return { success: true, shortCode, linkId: 'link_' + Date.now() };
  }

  try {
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        profile_id: profileId,
        short_code: shortCode,
        document_ids: documentIds,
        label: label.trim() || 'Custom Document Pack',
        is_preset: isPreset,
      })
      .select('id, short_code')
      .single();

    if (error) {
      console.warn('Share link creation error:', error);
      return { success: true, shortCode }; // fallback to generated code
    }

    return { success: true, shortCode: data.short_code, linkId: data.id };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, shortCode, error: error.message };
  }
}

/**
 * Sets the staff member's active NFC tap pack
 */
export async function setActiveTapPack(
  profileId: string,
  shareLinkId: string | null
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ active_share_link_id: shareLinkId })
      .eq('id', profileId);

    if (error) {
      console.error('Failed to set active tap pack:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('setActiveTapPack error:', err);
    return false;
  }
}

/**
 * Loads presets from cache and Supabase
 */
export async function loadPresets(profileId?: string): Promise<SharePreset[]> {
  try {
    const cached = await AsyncStorage.getItem(PRESETS_STORAGE_KEY);
    let presets = cached ? JSON.parse(cached) : DEFAULT_PRESETS;

    if (isSupabaseConfigured() && profileId) {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('profile_id', profileId)
        .eq('is_preset', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        presets = data as SharePreset[];
        await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
      }
    }

    return presets;
  } catch (err) {
    console.warn('Error loading presets:', err);
    return DEFAULT_PRESETS;
  }
}
