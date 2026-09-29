import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { Visit, Visitor } from '../types';

const VISITS_CACHE_KEY = '@celron_visits_cache_v1';

export interface ActiveStaff {
  id: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
}

// Fallback staff list for offline or demo use
export const FALLBACK_STAFF: ActiveStaff[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Ronald Tan',
    job_title: 'Marine Sales Director',
    phone: '+65 9123 4567',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    full_name: 'Celine Lim',
    job_title: 'Customer Service Lead',
    phone: '+65 9234 5678',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Cel-Ron Operations Admin',
    job_title: 'Head of Operations',
    phone: '+65 8196 2270',
  },
];

// Realistic mock visits for instant demonstration and offline mode
export const MOCK_VISITS: Visit[] = [
  {
    id: 'v-001',
    visit_code: 'MAERSK01',
    visitor_id: 'vis-001',
    purpose: 'Technical Discussion - Main Engine Parts',
    host_profile_id: 'a0000000-0000-0000-0000-000000000002',
    party_size: 1,
    location: 'Cel-Ron Sim Lim Office',
    checked_in_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 mins ago
    checked_out_at: null,
    details_completed: true,
    consent_given: true,
    source: 'whatsapp',
    notes: 'Inquired about Yanmar cylinder liner stock and urgent lead time.',
    visitor: {
      id: 'vis-001',
      company_id: 'c0000000-0000-0000-0000-000000000001',
      phone: '+65 8765 4321',
      whatsapp_name: 'Capt. Alex Hansen',
      full_name: 'Capt. Alex Hansen',
      visitor_company: 'Maersk Line Singapore Pte Ltd',
      first_visit_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      last_visit_at: new Date().toISOString(),
      visit_count: 3,
    },
    host: {
      id: 'a0000000-0000-0000-0000-000000000002',
      full_name: 'Ronald Tan',
      job_title: 'Marine Sales Director',
      phone: '+65 9123 4567',
    },
  },
  {
    id: 'v-002',
    visit_code: 'KEPPEL02',
    visitor_id: 'vis-002',
    purpose: 'Spare parts enquiry - Marine Pumps & Valves',
    host_profile_id: 'a0000000-0000-0000-0000-000000000002',
    party_size: 2,
    location: 'Cel-Ron Sim Lim Office',
    checked_in_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(), // ~2 hours ago
    checked_out_at: null,
    details_completed: true,
    consent_given: true,
    source: 'qr_form',
    notes: 'Checking replacement impeller availability for tugboat project.',
    visitor: {
      id: 'vis-002',
      company_id: 'c0000000-0000-0000-0000-000000000001',
      phone: '+65 9876 5432',
      whatsapp_name: 'Johnathan Goh',
      full_name: 'Johnathan Goh',
      visitor_company: 'Keppel Offshore & Marine Ltd',
      first_visit_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      last_visit_at: new Date().toISOString(),
      visit_count: 2,
    },
    host: {
      id: 'a0000000-0000-0000-0000-000000000002',
      full_name: 'Ronald Tan',
      job_title: 'Marine Sales Director',
      phone: '+65 9123 4567',
    },
  },
  {
    id: 'v-003',
    visit_code: 'COSCO03',
    visitor_id: 'vis-003',
    purpose: 'Meeting',
    host_profile_id: 'a0000000-0000-0000-0000-000000000003',
    party_size: 1,
    location: 'Cel-Ron Sim Lim Office',
    checked_in_at: new Date(Date.now() - 210 * 60 * 1000).toISOString(), // 3.5 hours ago
    checked_out_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // checked out 1.5 hours ago
    details_completed: true,
    consent_given: true,
    source: 'manual',
    notes: 'Annual vendor review and catalogue update.',
    visitor: {
      id: 'vis-003',
      company_id: 'c0000000-0000-0000-0000-000000000001',
      phone: '+65 9345 6789',
      whatsapp_name: 'Michael Zhang',
      full_name: 'Michael Zhang',
      visitor_company: 'COSCO Shipping Lines',
      first_visit_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      last_visit_at: new Date().toISOString(),
      visit_count: 5,
    },
    host: {
      id: 'a0000000-0000-0000-0000-000000000003',
      full_name: 'Celine Lim',
      job_title: 'Customer Service Lead',
      phone: '+65 9234 5678',
    },
  },
];

/**
 * Loads visits from Supabase or cached offline storage.
 */
export async function getVisits(filter: 'today' | 'active' | 'week' | 'all' = 'today'): Promise<Visit[]> {
  try {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('visits')
        .select(`
          id,
          visit_code,
          visitor_id,
          purpose,
          host_profile_id,
          party_size,
          location,
          checked_in_at,
          checked_out_at,
          details_completed,
          consent_given,
          source,
          notes,
          visitor:visitors!visitor_id (*),
          host:profiles!host_profile_id (id, full_name, job_title, phone)
        `)
        .order('checked_in_at', { ascending: false });

      const now = new Date();
      if (filter === 'today' || filter === 'active') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('checked_in_at', startOfDay);
        if (filter === 'active') {
          query = query.is('checked_out_at', null);
        }
      } else if (filter === 'week') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        query = query.gte('checked_in_at', sevenDaysAgo);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const formatted = (data as any[]).map((item) => ({
          ...item,
          visitor: Array.isArray(item.visitor) ? item.visitor[0] : item.visitor,
          host: Array.isArray(item.host) ? item.host[0] : item.host,
        })) as Visit[];

        // Cache fetched visits
        await AsyncStorage.setItem(VISITS_CACHE_KEY, JSON.stringify(formatted));
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Supabase fetch visits failed, using cache:', err);
  }

  // Fallback to local storage or mock visits
  try {
    const cached = await AsyncStorage.getItem(VISITS_CACHE_KEY);
    let list: Visit[] = cached ? JSON.parse(cached) : MOCK_VISITS;

    // Apply client filter on mock/cached
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filter === 'today') {
      return list.filter((v) => new Date(v.checked_in_at).getTime() >= startOfDay);
    }
    if (filter === 'active') {
      return list.filter((v) => !v.checked_out_at);
    }
    if (filter === 'week') {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      return list.filter((v) => new Date(v.checked_in_at).getTime() >= sevenDaysAgo);
    }
    return list;
  } catch {
    return MOCK_VISITS;
  }
}

/**
 * Checks out a visitor by setting checked_out_at to current timestamp.
 */
export async function checkOutVisit(visitId: string): Promise<boolean> {
  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ checked_out_at: timestamp })
        .eq('id', visitId);

      if (!error) return true;
      console.warn('Error checking out visit via Supabase:', error);
    } catch (err) {
      console.warn('Network error checking out visit:', err);
    }
  }

  // Update in local cache
  try {
    const cached = await AsyncStorage.getItem(VISITS_CACHE_KEY);
    const list: Visit[] = cached ? JSON.parse(cached) : [...MOCK_VISITS];
    const updated = list.map((item) =>
      item.id === visitId ? { ...item, checked_out_at: timestamp } : item
    );
    await AsyncStorage.setItem(VISITS_CACHE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export interface ManualCheckInParams {
  fullName: string;
  phone: string;
  company?: string;
  hostProfileId?: string;
  purpose?: string;
  partySize?: number;
  notes?: string;
}

/**
 * Creates a walk-in check-in record directly from the staff mobile app.
 */
export async function createManualCheckIn(params: ManualCheckInParams): Promise<{ success: boolean; visit?: Visit; error?: string }> {
  const cleanPhone = params.phone.trim().replace(/[^\+0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('+')
    ? cleanPhone
    : cleanPhone.length === 8
    ? `+65${cleanPhone}`
    : `+${cleanPhone}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('check_in_visitor', {
        p_phone: formattedPhone,
        p_full_name: params.fullName.trim(),
        p_visitor_company: params.company?.trim() || null,
        p_purpose: params.purpose?.trim() || 'Meeting',
        p_host_profile_id: params.hostProfileId || null,
        p_party_size: params.partySize || 1,
        p_consent_given: true,
        p_source: 'manual',
      });

      if (!error && data?.status === 'ok') {
        return { success: true };
      }
      if (error) {
        console.warn('Supabase check_in_visitor RPC error:', error);
      }
    } catch (err: any) {
      console.warn('Manual check-in RPC call failed:', err);
    }
  }

  // Fallback local mock insertion
  try {
    const cached = await AsyncStorage.getItem(VISITS_CACHE_KEY);
    const list: Visit[] = cached ? JSON.parse(cached) : [...MOCK_VISITS];

    const hostStaff = FALLBACK_STAFF.find((s) => s.id === params.hostProfileId) || FALLBACK_STAFF[0];
    const newVisitor: Visitor = {
      id: `vis-${Date.now()}`,
      company_id: 'c0000000-0000-0000-0000-000000000001',
      phone: formattedPhone,
      whatsapp_name: params.fullName,
      full_name: params.fullName,
      visitor_company: params.company || null,
      first_visit_at: new Date().toISOString(),
      last_visit_at: new Date().toISOString(),
      visit_count: 1,
    };

    const newVisit: Visit = {
      id: `v-${Date.now()}`,
      visit_code: `CR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      visitor_id: newVisitor.id,
      purpose: params.purpose || 'Meeting',
      host_profile_id: hostStaff.id,
      party_size: params.partySize || 1,
      location: 'Cel-Ron Sim Lim Office',
      checked_in_at: new Date().toISOString(),
      checked_out_at: null,
      details_completed: true,
      consent_given: true,
      source: 'manual',
      notes: params.notes || null,
      visitor: newVisitor,
      host: hostStaff,
    };

    const updated = [newVisit, ...list];
    await AsyncStorage.setItem(VISITS_CACHE_KEY, JSON.stringify(updated));

    return { success: true, visit: newVisit };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save walk-in visitor' };
  }
}

/**
 * Fetches active staff profiles for the "Person to meet" dropdown.
 */
export async function getActiveStaff(): Promise<ActiveStaff[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, phone')
        .order('full_name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as ActiveStaff[];
      }
    } catch (err) {
      console.warn('Failed to load active staff from Supabase:', err);
    }
  }
  return FALLBACK_STAFF;
}

/**
 * Subscribes to realtime visit events from Supabase.
 * Automatically triggers a local push notification alert when a new visitor checks in.
 */
export function subscribeToVisitsRealtime(onNewVisit: () => void) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('realtime:visits_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        async (payload) => {
          console.log('[Realtime] New visit check-in detected:', payload);

          // Trigger local high-priority notification sound & banner
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '🔔 New Visitor Arrival!',
                body: 'A visitor has checked in at reception.',
                sound: 'default',
              },
              trigger: null, // show immediately
            });
          } catch (e) {
            console.warn('Could not schedule local arrival notification:', e);
          }

          onNewVisit();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visits' },
        (payload) => {
          console.log('[Realtime] Visit updated:', payload);
          onNewVisit();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription failed to initialize:', err);
    return () => {};
  }
}
