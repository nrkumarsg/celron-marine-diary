-- ==============================================================================
-- Migration: 20260929000001_initial_schema.sql
-- Description: Core database tables, relations, and indexes for Cel-Ron Enterprises
-- ==============================================================================

-- 1. COMPANIES TABLE
-- Stores company branding, contact details, and theme configurations
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    website TEXT,
    brand_color TEXT DEFAULT '#0A2540',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. PROFILES TABLE
-- Staff and admin users linked directly to Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    job_title TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT NOT NULL,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    staff_slug TEXT NOT NULL UNIQUE,
    active_share_link_id UUID, -- Foreign key constraint added below after share_links exists
    expo_push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure staff_slug is always stored in lowercase
CREATE OR REPLACE FUNCTION public.clean_staff_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.staff_slug := LOWER(TRIM(NEW.staff_slug));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_clean_staff_slug ON public.profiles;
CREATE TRIGGER tr_clean_staff_slug
    BEFORE INSERT OR UPDATE OF staff_slug ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.clean_staff_slug();

-- 3. DOCUMENTS TABLE
-- Digital files (brochures, catalogues, certificates, name cards)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('name_card', 'brochure', 'catalogue', 'certificate', 'other')),
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- e.g. 'pdf', 'image/jpeg', 'image/png'
    thumbnail_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. SHARE LINKS TABLE
-- QR codes and digital packs shared by staff with customers
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code TEXT NOT NULL UNIQUE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_ids UUID[] NOT NULL DEFAULT '{}',
    label TEXT NOT NULL,
    is_preset BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Circular foreign key on profiles -> share_links
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS fk_profiles_active_share_link;

ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_active_share_link
    FOREIGN KEY (active_share_link_id)
    REFERENCES public.share_links(id)
    ON DELETE SET NULL;

-- 5. NFC TAGS TABLE
-- Physical NFC cards or stickers written with /t/[slug]
CREATE TABLE IF NOT EXISTS public.nfc_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_uid TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Physical NFC Card',
    written_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. SCANS TABLE
-- Telemetry logging every scan of a QR, NFC tap, or web link
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id UUID REFERENCES public.share_links(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('qr', 'nfc', 'link')),
    scanned_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    user_agent TEXT,
    country TEXT
);

-- 7. LEADS TABLE
-- Contact info submitted by prospective clients on the public card page
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id UUID NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 8. SCANNED CONTACTS TABLE
-- Business cards scanned by staff via AI camera scanner
CREATE TABLE IF NOT EXISTS public.scanned_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,
    phones JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"label": "mobile", "number": "+65 9123 4567"}]
    emails TEXT[] NOT NULL DEFAULT '{}',
    website TEXT,
    address TEXT,
    country TEXT,
    other_languages_text TEXT,
    products_or_services TEXT,
    notes TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    met_at_event TEXT,
    front_image_url TEXT,
    back_image_url TEXT,
    ai_raw JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 9. VISITORS TABLE
-- Master visitor records, deduplicated by phone number per company
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    whatsapp_name TEXT,
    full_name TEXT,
    visitor_company TEXT,
    first_visit_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    last_visit_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    visit_count INT NOT NULL DEFAULT 1,
    scanned_contact_id UUID REFERENCES public.scanned_contacts(id) ON DELETE SET NULL,
    CONSTRAINT uq_company_phone UNIQUE (company_id, phone)
);

-- 10. VISITS TABLE
-- Individual visit logs with visit_code token for check-in completion
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_code TEXT NOT NULL UNIQUE,
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    purpose TEXT,
    host_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    party_size INT NOT NULL DEFAULT 1,
    location TEXT DEFAULT 'Cel-Ron Office',
    checked_in_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    checked_out_at TIMESTAMPTZ,
    details_completed BOOLEAN NOT NULL DEFAULT FALSE,
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL CHECK (source IN ('whatsapp', 'qr_form', 'manual')),
    notes TEXT
);

-- 11. WHATSAPP MESSAGES TABLE
-- Audit log and deduplication of webhook incoming messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_message_id TEXT NOT NULL UNIQUE,
    from_phone TEXT NOT NULL,
    text TEXT,
    received_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_staff_slug ON public.profiles(staff_slug);
CREATE INDEX IF NOT EXISTS idx_share_links_short_code ON public.share_links(short_code);
CREATE INDEX IF NOT EXISTS idx_share_links_profile_id ON public.share_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_scans_profile_id ON public.scans(profile_id);
CREATE INDEX IF NOT EXISTS idx_scans_share_link_id ON public.scans(share_link_id);
CREATE INDEX IF NOT EXISTS idx_visitors_company_phone ON public.visitors(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_visits_visit_code ON public.visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_visits_checked_in_at ON public.visits(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON public.visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_scanned_contacts_company_id ON public.scanned_contacts(company_id);
