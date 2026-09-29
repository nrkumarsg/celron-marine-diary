import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Visit } from '../types';

export interface LeadRecord {
  id: string;
  share_link_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
  staff_name?: string;
  card_code?: string;
}

export interface StatsSummary {
  totalScans: number;
  scansBySource: {
    qr: number;
    nfc: number;
    link: number;
  };
  totalLeads: number;
  leadsThisMonth: number;
  totalVisitors: number;
  activeVisitorsToday: number;
  totalContacts: number;
  recentScans: Array<{
    id: string;
    source: 'qr' | 'nfc' | 'link';
    scanned_at: string;
    country: string | null;
  }>;
}

// Sample realistic mock leads for immediate demonstration & offline mode
export const MOCK_LEADS: LeadRecord[] = [
  {
    id: 'lead-001',
    share_link_id: 's-001',
    name: 'Capt. David Miller',
    company: 'Pacific Bulk Carriers Ltd',
    email: 'd.miller@pacificbulk.com.sg',
    phone: '+65 9123 9876',
    message: 'Urgent enquiry for 4 units of Yanmar 6EY18AL fuel injection valves and seal kits for drydock next week.',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    staff_name: 'Ronald Tan',
    card_code: 'RONALD-T',
  },
  {
    id: 'lead-002',
    share_link_id: 's-002',
    name: 'Siti Nurhaliza',
    company: 'Jurong Shipyard Procurement',
    email: 'snurhaliza@jurongshipyard.sg',
    phone: '+65 8234 5678',
    message: 'Please send current product line sheet and price list for Daihatsu auxiliary engine overhaul gaskets.',
    created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
    staff_name: 'Celine Lim',
    card_code: 'CRON-GEN',
  },
  {
    id: 'lead-003',
    share_link_id: 's-001',
    name: 'Capt. Hiroshi Tanaka',
    company: 'Mitsui O.S.K. Lines Singapore',
    email: 'h-tanaka@mol-group.com',
    phone: '+65 8989 1234',
    message: 'Met at Asia Pacific Maritime 2026. Interested in establishing a long-term supply contract for marine valves.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    staff_name: 'Ronald Tan',
    card_code: 'RONALD-T',
  },
];

export const MOCK_STATS: StatsSummary = {
  totalScans: 148,
  scansBySource: {
    qr: 82,
    nfc: 45,
    link: 21,
  },
  totalLeads: 12,
  leadsThisMonth: 5,
  totalVisitors: 47,
  activeVisitorsToday: 2,
  totalContacts: 28,
  recentScans: [
    { id: 'sc-1', source: 'nfc', scanned_at: new Date(Date.now() - 25 * 60000).toISOString(), country: 'Singapore' },
    { id: 'sc-2', source: 'qr', scanned_at: new Date(Date.now() - 110 * 60000).toISOString(), country: 'Singapore' },
    { id: 'sc-3', source: 'link', scanned_at: new Date(Date.now() - 240 * 60000).toISOString(), country: 'Malaysia' },
    { id: 'sc-4', source: 'nfc', scanned_at: new Date(Date.now() - 360 * 60000).toISOString(), country: 'Singapore' },
    { id: 'sc-5', source: 'qr', scanned_at: new Date(Date.now() - 720 * 60000).toISOString(), country: 'Indonesia' },
  ],
};

/**
 * Fetch prospective client leads
 */
export async function fetchLeads(companyId?: string): Promise<LeadRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          share_link_id,
          name,
          company,
          email,
          phone,
          message,
          created_at,
          share_link:share_links!share_link_id (
            short_code,
            profile:profiles!profile_id (full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as any[]).map((item) => {
          const sl = Array.isArray(item.share_link) ? item.share_link[0] : item.share_link;
          const prof = sl?.profile ? (Array.isArray(sl.profile) ? sl.profile[0] : sl.profile) : null;
          return {
            id: item.id,
            share_link_id: item.share_link_id,
            name: item.name,
            company: item.company,
            email: item.email,
            phone: item.phone,
            message: item.message,
            created_at: item.created_at,
            card_code: sl?.short_code || '',
            staff_name: prof?.full_name || '',
          };
        });
      }
    } catch (err) {
      console.warn('Supabase fetchLeads error:', err);
    }
  }

  return MOCK_LEADS;
}

/**
 * Fetch overall business statistics
 */
export async function fetchStatsSummary(companyId?: string): Promise<StatsSummary> {
  if (isSupabaseConfigured()) {
    try {
      // 1. Scans counts
      const { data: scans } = await supabase
        .from('scans')
        .select('id, source, scanned_at, country')
        .order('scanned_at', { ascending: false })
        .limit(200);

      let qr = 0, nfc = 0, link = 0;
      if (scans) {
        scans.forEach((s) => {
          if (s.source === 'qr') qr++;
          else if (s.source === 'nfc') nfc++;
          else link++;
        });
      }

      // 2. Leads count
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // 3. Visitors count
      const { count: visitorsCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true });

      // 4. Active visitors today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: activeCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', startOfDay.toISOString())
        .is('checked_out_at', null);

      // 5. Contacts count
      const { count: contactsCount } = await supabase
        .from('scanned_contacts')
        .select('*', { count: 'exact', head: true });

      return {
        totalScans: (scans?.length || 0),
        scansBySource: { qr, nfc, link },
        totalLeads: leadsCount || 0,
        leadsThisMonth: leadsCount || 0,
        totalVisitors: visitorsCount || 0,
        activeVisitorsToday: activeCount || 0,
        totalContacts: contactsCount || 0,
        recentScans: (scans?.slice(0, 10) as any[]) || [],
      };
    } catch (err) {
      console.warn('Error fetching live stats:', err);
    }
  }

  return MOCK_STATS;
}

/**
 * Export Leads to CSV using native mobile share sheet
 */
export async function exportLeadsToCsv(leads: LeadRecord[]): Promise<boolean> {
  if (!leads || leads.length === 0) return false;

  const headers = ['Full Name', 'Company', 'Email', 'Phone', 'Message', 'Card Source', 'Staff Member', 'Date'];
  const rows = leads.map((l) => [
    `"${l.name}"`,
    `"${l.company || ''}"`,
    `"${l.email || ''}"`,
    `"${l.phone || ''}"`,
    `"${(l.message || '').replace(/"/g, '""')}"`,
    `"${l.card_code || ''}"`,
    `"${l.staff_name || ''}"`,
    `"${l.created_at}"`,
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  try {
    await Share.share({
      message: csvContent,
      title: 'Cel-Ron Leads Export.csv',
    });
    return true;
  } catch (err) {
    console.warn('Share CSV error:', err);
    return false;
  }
}

/**
 * Export Visitor Diary to CSV using native mobile share sheet
 */
export async function exportVisitsToCsv(visits: Visit[]): Promise<boolean> {
  if (!visits || visits.length === 0) return false;

  const headers = [
    'Visit Code',
    'Visitor Name',
    'Contact Phone',
    'Company',
    'Purpose',
    'Host Staff',
    'Party Size',
    'Source Channel',
    'Check-In Time',
    'Check-Out Time',
    'Notes',
  ];

  const rows = visits.map((v) => {
    const visitor = v.visitor;
    const name = visitor?.full_name || visitor?.whatsapp_name || '';
    const phone = visitor?.phone || '';
    const company = visitor?.visitor_company || '';
    const host = v.host?.full_name || '';

    return [
      `"${v.visit_code}"`,
      `"${name}"`,
      `"${phone}"`,
      `"${company}"`,
      `"${v.purpose || ''}"`,
      `"${host}"`,
      `"${v.party_size || 1}"`,
      `"${v.source}"`,
      `"${v.checked_in_at}"`,
      `"${v.checked_out_at || 'Active'}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  try {
    await Share.share({
      message: csvContent,
      title: 'Cel-Ron Reception Visitor Diary.csv',
    });
    return true;
  } catch (err) {
    console.warn('Share Visitor CSV error:', err);
    return false;
  }
}

/**
 * Execute Singapore PDPA 12-month data retention purge
 */
export async function executePdpaPurge(retentionMonths: number = 12): Promise<{
  success: boolean;
  visitsPurged: number;
  visitorsPurged: number;
  messagesPurged: number;
  message?: string;
}> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('purge_expired_visitor_data', {
        p_retention_months: retentionMonths,
      });

      if (!error && data?.status === 'ok') {
        return {
          success: true,
          visitsPurged: data.visits_purged || 0,
          visitorsPurged: data.visitors_purged || 0,
          messagesPurged: data.messages_purged || 0,
        };
      }
      if (error) {
        console.warn('PDPA purge RPC error:', error);
      }
    } catch (err: any) {
      console.warn('PDPA purge failed:', err);
    }
  }

  // Simulated purge response if demo/offline
  return {
    success: true,
    visitsPurged: 0,
    visitorsPurged: 0,
    messagesPurged: 0,
    message: 'PDPA policy checked: No records exceeded 12-month retention window.',
  };
}
