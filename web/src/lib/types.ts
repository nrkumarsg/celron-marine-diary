export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  website: string | null;
  brand_color: string;
}

export interface Profile {
  id: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string;
  photo_url: string | null;
  staff_slug: string;
}

export interface ShareLink {
  id?: string;
  short_code: string;
  label: string;
  expires_at?: string | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'name_card' | 'brochure' | 'catalogue' | 'certificate' | 'other';
  file_url: string;
  file_type: string;
  thumbnail_url: string | null;
  sort_order: number;
}

export interface CardData {
  status: 'ok' | 'not_found' | 'expired' | 'deactivated';
  message?: string;
  company?: Company;
  profile?: Profile;
  share_link?: ShareLink;
  documents?: DocumentItem[];
}
