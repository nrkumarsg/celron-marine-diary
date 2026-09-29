export interface StaffProfile {
  id: string;
  company_id: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string;
  photo_url: string | null;
  role: 'admin' | 'staff';
  staff_slug: string;
  active_share_link_id: string | null;
  expo_push_token: string | null;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  website: string | null;
  brand_color: string;
}

export interface ShareLinkItem {
  id: string;
  short_code: string;
  label: string;
  document_ids: string[];
  is_preset: boolean;
  created_at: string;
}

export interface Visitor {
  id: string;
  company_id: string;
  phone: string;
  whatsapp_name?: string | null;
  full_name?: string | null;
  visitor_company?: string | null;
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  scanned_contact_id?: string | null;
}

export interface Visit {
  id: string;
  visit_code: string;
  visitor_id: string;
  purpose?: string | null;
  host_profile_id?: string | null;
  party_size: number;
  location: string;
  checked_in_at: string;
  checked_out_at?: string | null;
  details_completed: boolean;
  consent_given: boolean;
  source: 'whatsapp' | 'qr_form' | 'manual';
  notes?: string | null;
  visitor?: Visitor;
  host?: {
    id: string;
    full_name: string;
    job_title?: string | null;
    phone?: string | null;
  } | null;
}

