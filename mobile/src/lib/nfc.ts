import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

const TAGS_STORAGE_KEY = '@celron_my_nfc_tags';

export interface NfcTagRecord {
  id: string;
  profile_id: string;
  tag_uid: string;
  label: string;
  written_at: string;
  is_active: boolean;
}

// Sample offline NFC tag for Ronald Tan
export const SAMPLE_NFC_TAGS: NfcTagRecord[] = [
  {
    id: 'nfc_001',
    profile_id: 'a0000000-0000-0000-0000-000000000002',
    tag_uid: '04:A1:B2:C3:D4:E5:F6',
    label: 'Primary NTAG215 Card',
    written_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    is_active: true,
  },
];

// Dynamically and safely import NfcManager to prevent crashes on Web or Simulators
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;

try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
  Ndef = nfcModule.Ndef;
} catch (e) {
  // Native module not linked in web / simulator
  console.log('[NFC] Native NFC manager not available on this platform/environment');
}

/**
 * Checks if NFC is supported on this device
 */
export async function isNfcAvailable(): Promise<boolean> {
  if (Platform.OS === 'web' || !NfcManager) {
    return false;
  }
  try {
    const isSupported = await NfcManager.isSupported();
    return Boolean(isSupported);
  } catch (err) {
    return false;
  }
}

/**
 * Initializes NFC Manager
 */
export async function initNfc(): Promise<void> {
  if (!NfcManager) return;
  try {
    await NfcManager.start();
  } catch (err) {
    console.warn('Failed to start NfcManager:', err);
  }
}

/**
 * Writes an NDEF URI record (e.g. PUBLIC_BASE_URL/t/[staff_slug]) to a physical NFC card/sticker (NTAG213/215/216)
 */
export async function writeNfcCard(
  url: string,
  lockReadOnly: boolean = false
): Promise<{ success: boolean; tagUid?: string; error?: string }> {
  // If running in simulator, web, or device without NFC chip, provide realistic test simulation
  if (!NfcManager || Platform.OS === 'web') {
    // Generate realistic NXP NTAG UID (7 bytes in hex: 04:XX:XX:XX:XX:XX:XX)
    const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    const simulatedUid = `04:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;
    return { success: true, tagUid: simulatedUid };
  }

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold your NFC card/sticker near the top of your phone to write.',
    });

    const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);
    if (!bytes) {
      throw new Error('Failed to encode NDEF URI record');
    }

    await NfcManager.ndefHandler.writeNdefMessage(bytes);

    let tagUid = 'NFC_' + Date.now().toString(16).toUpperCase();
    try {
      const tag = await NfcManager.getTag();
      if (tag && tag.id) {
        tagUid = tag.id;
      }
    } catch (e) {
      // UID fallback
    }

    // Lock as read-only if requested
    if (lockReadOnly && NfcManager.ndefHandler.makeReadOnly) {
      try {
        await NfcManager.ndefHandler.makeReadOnly();
      } catch (lockErr) {
        console.warn('Could not make tag read-only:', lockErr);
      }
    }

    return { success: true, tagUid };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || 'NFC write was cancelled or failed' };
  } finally {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (e) {}
  }
}

/**
 * Reads an NDEF NFC tag and returns its encoded URL and tag UID
 */
export async function readNfcCard(): Promise<{
  success: boolean;
  url?: string;
  tagUid?: string;
  error?: string;
}> {
  if (!NfcManager || Platform.OS === 'web') {
    return {
      success: true,
      url: 'https://celron.com.sg/t/ronald-tan',
      tagUid: '04:A1:B2:C3:D4:E5:F6',
    };
  }

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold your NFC card near your phone to verify the link.',
    });

    const tag = await NfcManager.getTag();
    const ndefMessage = tag?.ndefMessage;
    let decodedUrl = '';

    if (ndefMessage && ndefMessage.length > 0) {
      const record = ndefMessage[0];
      if (Ndef.uri.decodePayload) {
        decodedUrl = Ndef.uri.decodePayload(record.payload);
      }
    }

    return {
      success: true,
      url: decodedUrl || 'Valid Cel-Ron NFC Tag',
      tagUid: tag?.id || 'Unknown UID',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || 'NFC read cancelled or timed out' };
  } finally {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (e) {}
  }
}

/**
 * Saves a written tag to Supabase and local cache
 */
export async function saveNfcTagRecord({
  profileId,
  tagUid,
  label = 'Physical NFC Card',
}: {
  profileId: string;
  tagUid: string;
  label?: string;
}): Promise<NfcTagRecord> {
  const newRecord: NfcTagRecord = {
    id: 'tag_' + Date.now(),
    profile_id: profileId,
    tag_uid: tagUid,
    label: label.trim() || 'Physical NFC Card',
    written_at: new Date().toISOString(),
    is_active: true,
  };

  if (!isSupabaseConfigured()) {
    const cached = await fetchMyNfcTags(profileId);
    const updated = [newRecord, ...cached];
    await AsyncStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(updated));
    return newRecord;
  }

  try {
    const { data, error } = await supabase
      .from('nfc_tags')
      .insert({
        profile_id: profileId,
        tag_uid: tagUid,
        label: label.trim() || 'Physical NFC Card',
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      return data as NfcTagRecord;
    }
  } catch (err) {
    console.error('Error saving tag record to Supabase:', err);
  }

  return newRecord;
}

/**
 * Fetches NFC tags for this staff member
 */
export async function fetchMyNfcTags(profileId?: string): Promise<NfcTagRecord[]> {
  try {
    const cachedStr = await AsyncStorage.getItem(TAGS_STORAGE_KEY);
    let list: NfcTagRecord[] = cachedStr ? JSON.parse(cachedStr) : SAMPLE_NFC_TAGS;

    if (isSupabaseConfigured() && profileId) {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('profile_id', profileId)
        .order('written_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data as NfcTagRecord[];
        await AsyncStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(list));
      }
    }

    return list;
  } catch (err) {
    return SAMPLE_NFC_TAGS;
  }
}

/**
 * Deactivates an NFC tag (e.g. lost card)
 */
export async function deactivateNfcTag(tagId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('nfc_tags')
        .update({ is_active: false })
        .eq('id', tagId);
    } catch (e) {}
  }

  try {
    const cachedStr = await AsyncStorage.getItem(TAGS_STORAGE_KEY);
    if (cachedStr) {
      const list: NfcTagRecord[] = JSON.parse(cachedStr);
      const updated = list.map((t) => (t.id === tagId ? { ...t, is_active: false } : t));
      await AsyncStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  return true;
}
