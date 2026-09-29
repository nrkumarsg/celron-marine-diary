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
