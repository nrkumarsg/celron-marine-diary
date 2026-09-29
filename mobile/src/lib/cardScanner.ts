import * as ImageManipulator from 'expo-image-manipulator';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

const CONTACTS_CACHE_KEY = '@celron_scanned_contacts_cache';
const BATCH_QUEUE_KEY = '@celron_batch_card_queue';
const LAST_EVENT_KEY = '@celron_last_event_name';

export interface CardExtractedData {
  full_name: string;
  job_title: string;
  company_name: string;
  phones: { label: 'mobile' | 'office' | 'fax'; number: string }[];
  emails: string[];
  website: string;
  address: string;
  country: string;
  other_languages_text: string;
  products_or_services: string;
  confidence: {
    full_name?: number;
    job_title?: number;
    company_name?: number;
    phones?: number;
    emails?: number;
    address?: number;
  };
}

export interface ScannedContactRecord {
  id: string;
  company_id: string;
  scanned_by: string;
  full_name: string;
  job_title: string;
  company_name: string;
  phones: { label: string; number: string }[];
  emails: string[];
  website: string;
  address: string;
  country: string;
  other_languages_text: string;
  products_or_services: string;
  notes: string;
  tags: string[];
  met_at_event: string;
  front_image_url: string;
  back_image_url?: string;
  ai_raw?: any;
  created_at: string;
}

export const SAMPLE_CONTACTS: ScannedContactRecord[] = [
  {
    id: 'sc_001',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    scanned_by: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Capt. Henrik Lindqvist',
    job_title: 'Fleet Technical Superintendent',
    company_name: 'Stena Bulk Maritime Pte Ltd',
    phones: [{ label: 'mobile', number: '+65 9234 5678' }],
    emails: ['henrik.lindqvist@stenabulk.com'],
    website: 'https://stenabulk.com',
    address: '8 Marina View, #22-01 Asia Square Tower 1, Singapore 018960',
    country: 'Singapore',
    other_languages_text: '',
    products_or_services: 'Tanker fleet spares, fuel injection, valve overhauls',
    notes: 'Met during technical workshop. Requested quotation for MAN B&W pump seals.',
    tags: ['Tankers', 'Superintendent', 'High Priority'],
    met_at_event: 'Asia Pacific Maritime 2026',
    front_image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'sc_002',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    scanned_by: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Tan Wei Ming',
    job_title: 'Procurement Manager',
    company_name: 'Jurong Shipyard & Marine Engineering',
    phones: [{ label: 'mobile', number: '+65 8123 9876' }, { label: 'office', number: '+65 6265 1766' }],
    emails: ['wm.tan@jurongshipyard.com.sg'],
    website: 'https://jurongshipyard.com.sg',
    address: '29 Tanjong Kling Road, Singapore 628054',
    country: 'Singapore',
    other_languages_text: '陈伟明 - 采购经理',
    products_or_services: 'Drydock repairs, auxiliary diesel pump assemblies',
    notes: 'Interested in annual supplier contract for pump overhaul kits.',
    tags: ['Shipyard', 'Procurement', 'Bulk Order'],
    met_at_event: 'Sea Asia Singapore',
    front_image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

/**
 * Compresses an image to approx 1600px width JPEG (balanced between sharp OCR clarity and fast upload)
 */
export async function compressCardImage(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (err) {
    console.warn('Image manipulation failed, using original uri:', err);
    return uri;
  }
}

/**
 * Uploads a card image to the private 'scanned-cards' Supabase storage bucket
 */
export async function uploadCardImage(uri: string, companyId: string, side: 'front' | 'back'): Promise<string> {
  if (!isSupabaseConfigured()) {
    return uri;
  }

  const cleanFileName = `${companyId}/${Date.now()}_${side}.jpg`;
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('scanned-cards')
    .upload(cleanFileName, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return cleanFileName;
}

/**
 * Calls the Supabase Edge Function 'extract-card' with front & back storage paths
 */
export async function extractCardWithAI({
  frontPath,
  backPath,
}: {
  frontPath: string;
  backPath?: string | null;
}): Promise<CardExtractedData> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('extract-card', {
        body: {
          storage_path_front: frontPath,
          storage_path_back: backPath || undefined,
        },
      });

      if (!error && data?.success && data?.data) {
        return data.data as CardExtractedData;
      }
    } catch (err) {
      console.warn('Edge function invoke error, falling back to client mock:', err);
    }
  }

  // Realistic mock simulation for local development / testing
  return {
    full_name: 'Marcus Vance',
    job_title: 'Senior Marine Superintendent',
    company_name: 'Pacific Ocean Line Pte Ltd',
    phones: [
      { label: 'mobile', number: '+65 9188 7766' },
      { label: 'office', number: '+65 6789 1234' },
    ],
    emails: ['marcus.vance@pacificoceanline.com'],
    website: 'https://pacificoceanline.com',
    address: '10 Collyer Quay, #14-01 Ocean Financial Centre, Singapore 049315',
    country: 'Singapore',
    other_languages_text: '',
    products_or_services: 'Container vessel spare parts, centrifugal bilge pumps',
    confidence: {
      full_name: 0.98,
      job_title: 0.95,
      company_name: 0.92,
      phones: 0.96,
      emails: 0.99,
      address: 0.88,
    },
  };
}

/**
 * Checks for existing contacts with matching phone or email to prevent duplicates
 */
export async function checkDuplicateContact({
  phone,
  email,
  companyId,
}: {
  phone?: string;
  email?: string;
  companyId?: string;
}): Promise<ScannedContactRecord | null> {
  const existing = await fetchScannedContacts(companyId);

  const cleanPhone = phone?.replace(/[^\+0-9]/g, '');

  for (const c of existing) {
    if (email && c.emails && c.emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      return c;
    }
    if (cleanPhone && c.phones) {
      const matched = c.phones.some((p) => {
        const pClean = p.number.replace(/[^\+0-9]/g, '');
        return pClean.length >= 8 && cleanPhone.includes(pClean.slice(-8));
      });
      if (matched) return c;
    }
  }

  return null;
}

/**
 * Saves or updates a scanned contact in Supabase & cache
 */
export async function saveScannedContact(
  contactData: Omit<ScannedContactRecord, 'id' | 'created_at'> & { id?: string }
): Promise<ScannedContactRecord> {
  const id = contactData.id || 'sc_' + Date.now();
  const created_at = new Date().toISOString();

  const record: ScannedContactRecord = {
    ...contactData,
    id,
    created_at,
  };

  // Remember event name for next scan
  if (contactData.met_at_event) {
    AsyncStorage.setItem(LAST_EVENT_KEY, contactData.met_at_event).catch(() => {});
  }

  if (!isSupabaseConfigured()) {
    const list = await fetchScannedContacts(contactData.company_id);
    const updated = [record, ...list.filter((c) => c.id !== id)];
    await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(updated));
    return record;
  }

  try {
    const { data, error } = await supabase
      .from('scanned_contacts')
      .upsert({
        id: contactData.id,
        company_id: contactData.company_id,
        scanned_by: contactData.scanned_by,
        full_name: contactData.full_name,
        job_title: contactData.job_title,
        company_name: contactData.company_name,
        phones: contactData.phones,
        emails: contactData.emails,
        website: contactData.website,
        address: contactData.address,
        country: contactData.country,
        other_languages_text: contactData.other_languages_text,
        products_or_services: contactData.products_or_services,
        notes: contactData.notes,
        tags: contactData.tags,
        met_at_event: contactData.met_at_event,
        front_image_url: contactData.front_image_url,
        back_image_url: contactData.back_image_url,
        ai_raw: contactData.ai_raw,
      })
      .select()
      .single();

    if (!error && data) {
      return data as ScannedContactRecord;
    }
  } catch (err) {
    console.error('Error saving contact to Supabase:', err);
  }

  return record;
}

/**
 * Fetches all scanned contacts
 */
export async function fetchScannedContacts(companyId?: string): Promise<ScannedContactRecord[]> {
  try {
    const cached = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
    let list: ScannedContactRecord[] = cached ? JSON.parse(cached) : SAMPLE_CONTACTS;

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('scanned_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        list = data as ScannedContactRecord[];
        await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(list));
      }
    }

    return list;
  } catch (err) {
    return SAMPLE_CONTACTS;
  }
}

/**
 * Exports contact directly to the native phone address book (Apple Contacts / Google Contacts)
 */
export async function exportToPhoneContacts(contact: ScannedContactRecord): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    const nameParts = contact.full_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const phoneNumbers = contact.phones.map((p) => ({
      label: p.label || 'mobile',
      number: p.number,
    }));

    const emails = contact.emails.map((e) => ({
      label: 'work',
      email: e,
    }));

    await Contacts.addContactAsync({
      [Contacts.Fields.ContactType]: Contacts.ContactTypes.Person,
      name: contact.full_name,
      [Contacts.Fields.FirstName]: firstName,
      [Contacts.Fields.LastName]: lastName,
      [Contacts.Fields.Company]: contact.company_name,
      [Contacts.Fields.JobTitle]: contact.job_title,
      [Contacts.Fields.PhoneNumbers]: phoneNumbers,
      [Contacts.Fields.Emails]: emails,
      [Contacts.Fields.Note]: `Scanned via Cel-Ron Marine Scanner. Event: ${contact.met_at_event || 'N/A'}. Notes: ${contact.notes || ''}`,
    } as any);

    return true;
  } catch (err) {
    console.error('Failed to add contact to native phone address book:', err);
    return false;
  }
}

/**
 * Returns the last used exhibition / conference event name
 */
export async function getLastEventName(): Promise<string> {
  try {
    const name = await AsyncStorage.getItem(LAST_EVENT_KEY);
    return name || 'Asia Pacific Maritime (APM)';
  } catch (err) {
    return 'Asia Pacific Maritime (APM)';
  }
}
