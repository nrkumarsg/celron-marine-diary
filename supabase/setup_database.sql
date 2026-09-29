-- ==============================================================================
-- CEL-RON ENTERPRISES PTE LTD - COMPLETE DATABASE SETUP
-- ==============================================================================
-- Run this entire script in your Supabase Dashboard:
-- 1. Log in to https://supabase.com
-- 2. Open your project (owned by celron.simlim0305@gmail.com)
-- 3. Click "SQL Editor" on the left navigation bar
-- 4. Click "New Query", paste this entire script, and click "Run" (bottom right)
--
-- This script safely sets up:
-- - All 11 tables with relations and indexes
-- - Storage buckets ('documents' and 'scanned-cards') with security policies
-- - Card and Visitor Stored Procedures (get_public_card, get_tap_card, check_in_visitor)
-- - Row Level Security (RLS) policies
-- - Initial seed data: Cel-Ron company, Admin account, sample staff, sample documents,
--   preset pack, and sample visitor check-ins.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: CORE TABLES & RELATIONS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    website TEXT,
    brand_color TEXT DEFAULT '#0A2540',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

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
    active_share_link_id UUID,
    expo_push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

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

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('name_card', 'brochure', 'catalogue', 'certificate', 'other')),
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    thumbnail_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

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

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS fk_profiles_active_share_link;

ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_active_share_link
    FOREIGN KEY (active_share_link_id)
    REFERENCES public.share_links(id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.nfc_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_uid TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Physical NFC Card',
    written_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id UUID REFERENCES public.share_links(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('qr', 'nfc', 'link')),
    scanned_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    user_agent TEXT,
    country TEXT
);

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

CREATE TABLE IF NOT EXISTS public.scanned_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,
    phones JSONB NOT NULL DEFAULT '[]'::jsonb,
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

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_message_id TEXT NOT NULL UNIQUE,
    from_phone TEXT NOT NULL,
    text TEXT,
    received_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL
);

-- Indexes
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

-- ------------------------------------------------------------------------------
-- PART 2: STORAGE BUCKETS & STORAGE POLICIES
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'documents', 
        'documents', 
        TRUE, 
        26214400, -- 25 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
    ),
    (
        'scanned-cards', 
        'scanned-cards', 
        FALSE, 
        15728640, -- 15 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
CREATE POLICY "Public can view documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated staff can upload documents" ON storage.objects;
CREATE POLICY "Authenticated staff can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can update documents" ON storage.objects;
CREATE POLICY "Authenticated staff can update documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can delete documents" ON storage.objects;
CREATE POLICY "Authenticated staff can delete documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can read scanned cards" ON storage.objects;
CREATE POLICY "Staff can read scanned cards"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'scanned-cards' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can upload scanned cards" ON storage.objects;
CREATE POLICY "Staff can upload scanned cards"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'scanned-cards' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can update scanned cards" ON storage.objects;
CREATE POLICY "Staff can update scanned cards"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'scanned-cards' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can delete scanned cards" ON storage.objects;
CREATE POLICY "Staff can delete scanned cards"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'scanned-cards' AND auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- PART 3: STORED PROCEDURES & PUBLIC APIS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_card(p_short_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_link RECORD;
    v_profile RECORD;
    v_company RECORD;
    v_docs JSONB;
BEGIN
    SELECT * INTO v_link
    FROM public.share_links
    WHERE short_code = TRIM(p_short_code);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Card or link not found');
    END IF;

    IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
        RETURN jsonb_build_object('status', 'expired', 'message', 'This link has expired');
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_link.profile_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'deactivated', 'message', 'Staff profile is inactive');
    END IF;

    SELECT * INTO v_company
    FROM public.companies
    WHERE id = v_profile.company_id;

    IF array_length(v_link.document_ids, 1) > 0 THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', d.id,
                    'title', d.title,
                    'category', d.category,
                    'file_url', d.file_url,
                    'file_type', d.file_type,
                    'thumbnail_url', d.thumbnail_url,
                    'sort_order', d.sort_order
                ) ORDER BY d.sort_order ASC, d.created_at ASC
            ), '[]'::jsonb
        ) INTO v_docs
        FROM public.documents d
        WHERE d.id = ANY(v_link.document_ids) AND d.is_active = TRUE;
    ELSE
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', d.id,
                    'title', d.title,
                    'category', d.category,
                    'file_url', d.file_url,
                    'file_type', d.file_type,
                    'thumbnail_url', d.thumbnail_url,
                    'sort_order', d.sort_order
                ) ORDER BY d.sort_order ASC
            ), '[]'::jsonb
        ) INTO v_docs
        FROM public.documents d
        WHERE d.company_id = v_profile.company_id AND d.category = 'name_card' AND d.is_active = TRUE;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'company', jsonb_build_object(
            'id', v_company.id,
            'name', v_company.name,
            'logo_url', v_company.logo_url,
            'address', v_company.address,
            'website', v_company.website,
            'brand_color', COALESCE(v_company.brand_color, '#0A2540')
        ),
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'full_name', v_profile.full_name,
            'job_title', v_profile.job_title,
            'phone', v_profile.phone,
            'whatsapp', v_profile.whatsapp,
            'email', v_profile.email,
            'photo_url', v_profile.photo_url,
            'staff_slug', v_profile.staff_slug
        ),
        'share_link', jsonb_build_object(
            'id', v_link.id,
            'short_code', v_link.short_code,
            'label', v_link.label,
            'expires_at', v_link.expires_at
        ),
        'documents', COALESCE(v_docs, '[]'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tap_card(p_staff_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile RECORD;
    v_company RECORD;
    v_link RECORD;
    v_docs JSONB;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE staff_slug = LOWER(TRIM(p_staff_slug));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Staff member not found');
    END IF;

    SELECT * INTO v_company
    FROM public.companies
    WHERE id = v_profile.company_id;

    IF v_profile.active_share_link_id IS NOT NULL THEN
        SELECT * INTO v_link
        FROM public.share_links
        WHERE id = v_profile.active_share_link_id;

        IF FOUND AND (v_link.expires_at IS NULL OR v_link.expires_at > NOW()) THEN
            IF array_length(v_link.document_ids, 1) > 0 THEN
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'title', d.title,
                            'category', d.category,
                            'file_url', d.file_url,
                            'file_type', d.file_type,
                            'thumbnail_url', d.thumbnail_url,
                            'sort_order', d.sort_order
                        ) ORDER BY d.sort_order ASC, d.created_at ASC
                    ), '[]'::jsonb
                ) INTO v_docs
                FROM public.documents d
                WHERE d.id = ANY(v_link.document_ids) AND d.is_active = TRUE;
            END IF;
        END IF;
    END IF;

    IF v_docs IS NULL OR jsonb_array_length(v_docs) = 0 THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', d.id,
                    'title', d.title,
                    'category', d.category,
                    'file_url', d.file_url,
                    'file_type', d.file_type,
                    'thumbnail_url', d.thumbnail_url,
                    'sort_order', d.sort_order
                ) ORDER BY d.sort_order ASC
            ), '[]'::jsonb
        ) INTO v_docs
        FROM public.documents d
        WHERE d.company_id = v_profile.company_id AND d.category = 'name_card' AND d.is_active = TRUE;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'company', jsonb_build_object(
            'id', v_company.id,
            'name', v_company.name,
            'logo_url', v_company.logo_url,
            'address', v_company.address,
            'website', v_company.website,
            'brand_color', COALESCE(v_company.brand_color, '#0A2540')
        ),
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'full_name', v_profile.full_name,
            'job_title', v_profile.job_title,
            'phone', v_profile.phone,
            'whatsapp', v_profile.whatsapp,
            'email', v_profile.email,
            'photo_url', v_profile.photo_url,
            'staff_slug', v_profile.staff_slug
        ),
        'share_link', CASE 
            WHEN v_link.id IS NOT NULL THEN jsonb_build_object(
                'id', v_link.id,
                'short_code', v_link.short_code,
                'label', v_link.label
            )
            ELSE jsonb_build_object(
                'short_code', v_profile.staff_slug,
                'label', 'Default NFC Tap Pack'
            )
        END,
        'documents', COALESCE(v_docs, '[]'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_visitor(
    p_phone TEXT,
    p_full_name TEXT,
    p_visitor_company TEXT DEFAULT NULL,
    p_purpose TEXT DEFAULT 'Spare parts enquiry',
    p_host_profile_id UUID DEFAULT NULL,
    p_party_size INT DEFAULT 1,
    p_consent_given BOOLEAN DEFAULT TRUE,
    p_source TEXT DEFAULT 'qr_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_company_id UUID;
    v_visitor RECORD;
    v_existing_visit RECORD;
    v_scanned_contact_id UUID;
    v_visit_code TEXT;
    v_visit_id UUID;
    v_is_returning BOOLEAN := FALSE;
BEGIN
    v_clean_phone := REGEXP_REPLACE(TRIM(p_phone), '[^\+0-9]', '', 'g');
    IF v_clean_phone NOT LIKE '+%' THEN
        IF LENGTH(v_clean_phone) = 8 THEN
            v_clean_phone := '+65' || v_clean_phone;
        ELSE
            v_clean_phone := '+' || v_clean_phone;
        END IF;
    END IF;

    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Company record not initialized';
    END IF;

    SELECT * INTO v_visitor
    FROM public.visitors
    WHERE company_id = v_company_id AND phone = v_clean_phone;

    IF FOUND THEN
        v_is_returning := TRUE;

        UPDATE public.visitors
        SET 
            full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
            visitor_company = COALESCE(NULLIF(TRIM(p_visitor_company), ''), visitor_company),
            last_visit_at = NOW(),
            visit_count = visit_count + 1
        WHERE id = v_visitor.id
        RETURNING * INTO v_visitor;

        SELECT * INTO v_existing_visit
        FROM public.visits
        WHERE visitor_id = v_visitor.id
          AND checked_in_at > (NOW() - INTERVAL '30 minutes')
        ORDER BY checked_in_at DESC
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.visits
            SET 
                purpose = COALESCE(NULLIF(p_purpose, ''), purpose),
                host_profile_id = COALESCE(p_host_profile_id, host_profile_id),
                party_size = COALESCE(p_party_size, party_size),
                details_completed = TRUE,
                consent_given = p_consent_given
            WHERE id = v_existing_visit.id;

            RETURN jsonb_build_object(
                'status', 'ok',
                'visit_code', v_existing_visit.visit_code,
                'visitor_id', v_visitor.id,
                'full_name', v_visitor.full_name,
                'phone', v_visitor.phone,
                'company', v_visitor.visitor_company,
                'is_returning', TRUE,
                'message', 'Existing check-in updated'
            );
        END IF;
    ELSE
        SELECT id INTO v_scanned_contact_id
        FROM public.scanned_contacts sc
        WHERE sc.company_id = v_company_id
          AND sc.phones::text LIKE '%' || RIGHT(v_clean_phone, 8) || '%'
        LIMIT 1;

        INSERT INTO public.visitors (
            company_id, phone, full_name, visitor_company,
            first_visit_at, last_visit_at, visit_count, scanned_contact_id
        ) VALUES (
            v_company_id, v_clean_phone, TRIM(p_full_name), TRIM(p_visitor_company),
            NOW(), NOW(), 1, v_scanned_contact_id
        )
        RETURNING * INTO v_visitor;
    END IF;

    v_visit_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));

    INSERT INTO public.visits (
        visit_code, visitor_id, purpose, host_profile_id,
        party_size, location, checked_in_at, details_completed, consent_given, source
    ) VALUES (
        v_visit_code, v_visitor.id,
        COALESCE(NULLIF(p_purpose, ''), 'Spare parts enquiry'),
        p_host_profile_id, GREATEST(COALESCE(p_party_size, 1), 1),
        'Cel-Ron Office', NOW(), TRUE, p_consent_given, p_source
    )
    RETURNING id INTO v_visit_id;

    RETURN jsonb_build_object(
        'status', 'ok',
        'visit_code', v_visit_code,
        'visitor_id', v_visitor.id,
        'full_name', v_visitor.full_name,
        'phone', v_visitor.phone,
        'company', v_visitor.visitor_company,
        'is_returning', v_is_returning,
        'message', 'Check-in successful'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_visit_by_code(p_visit_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_visit RECORD;
    v_visitor RECORD;
    v_host RECORD;
BEGIN
    SELECT * INTO v_visit
    FROM public.visits
    WHERE visit_code = UPPER(TRIM(p_visit_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Visit not found');
    END IF;

    IF v_visit.checked_in_at < (NOW() - INTERVAL '24 hours') THEN
        RETURN jsonb_build_object('status', 'expired', 'message', 'This check-in link has expired');
    END IF;

    SELECT * INTO v_visitor
    FROM public.visitors
    WHERE id = v_visit.visitor_id;

    IF v_visit.host_profile_id IS NOT NULL THEN
        SELECT id, full_name, job_title INTO v_host
        FROM public.profiles
        WHERE id = v_visit.host_profile_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'visit', jsonb_build_object(
            'id', v_visit.id,
            'visit_code', v_visit.visit_code,
            'purpose', v_visit.purpose,
            'party_size', v_visit.party_size,
            'location', v_visit.location,
            'checked_in_at', v_visit.checked_in_at,
            'details_completed', v_visit.details_completed,
            'consent_given', v_visit.consent_given,
            'source', v_visit.source
        ),
        'visitor', jsonb_build_object(
            'id', v_visitor.id,
            'phone', v_visitor.phone,
            'whatsapp_name', v_visitor.whatsapp_name,
            'full_name', v_visitor.full_name,
            'visitor_company', v_visitor.visitor_company
        ),
        'host', CASE 
            WHEN v_host.id IS NOT NULL THEN jsonb_build_object('id', v_host.id, 'full_name', v_host.full_name, 'job_title', v_host.job_title)
            ELSE NULL
        END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_visit_details(
    p_visit_code TEXT,
    p_visitor_company TEXT DEFAULT NULL,
    p_purpose TEXT DEFAULT NULL,
    p_host_profile_id UUID DEFAULT NULL,
    p_party_size INT DEFAULT NULL,
    p_consent_given BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_visit RECORD;
BEGIN
    SELECT * INTO v_visit
    FROM public.visits
    WHERE visit_code = UPPER(TRIM(p_visit_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Visit not found');
    END IF;

    IF v_visit.checked_in_at < (NOW() - INTERVAL '24 hours') THEN
        RETURN jsonb_build_object('status', 'expired', 'message', 'This link has expired');
    END IF;

    IF p_visitor_company IS NOT NULL AND TRIM(p_visitor_company) <> '' THEN
        UPDATE public.visitors
        SET visitor_company = TRIM(p_visitor_company)
        WHERE id = v_visit.visitor_id;
    END IF;

    UPDATE public.visits
    SET 
        purpose = COALESCE(NULLIF(p_purpose, ''), purpose),
        host_profile_id = COALESCE(p_host_profile_id, host_profile_id),
        party_size = COALESCE(p_party_size, party_size),
        details_completed = TRUE,
        consent_given = p_consent_given
    WHERE id = v_visit.id;

    RETURN jsonb_build_object('status', 'ok', 'message', 'Visit details updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_staff_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'job_title', p.job_title
            ) ORDER BY p.full_name ASC
        ), '[]'::jsonb
    ) INTO v_result
    FROM public.profiles p;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (role = 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their company" ON public.companies;
CREATE POLICY "Staff can view their company" ON public.companies FOR SELECT
USING (id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;
CREATE POLICY "Admins can update their company" ON public.companies FOR UPDATE
USING (id = public.get_auth_company_id() AND public.is_company_admin());

DROP POLICY IF EXISTS "Staff can view company colleagues" ON public.profiles;
CREATE POLICY "Staff can view company colleagues" ON public.profiles FOR SELECT
USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can update own profile" ON public.profiles;
CREATE POLICY "Staff can update own profile" ON public.profiles FOR UPDATE
USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
CREATE POLICY "Admins can manage company profiles" ON public.profiles FOR ALL
USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

DROP POLICY IF EXISTS "Staff can view active documents" ON public.documents;
CREATE POLICY "Staff can view active documents" ON public.documents FOR SELECT
USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents" ON public.documents FOR ALL
USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

DROP POLICY IF EXISTS "Staff can view company share links" ON public.share_links;
CREATE POLICY "Staff can view company share links" ON public.share_links FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

DROP POLICY IF EXISTS "Staff can create and manage their own share links" ON public.share_links;
CREATE POLICY "Staff can create and manage their own share links" ON public.share_links FOR ALL
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all company share links" ON public.share_links;
CREATE POLICY "Admins can manage all company share links" ON public.share_links FOR ALL
USING (public.is_company_admin() AND profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

DROP POLICY IF EXISTS "Staff can view and manage their NFC tags" ON public.nfc_tags;
CREATE POLICY "Staff can view and manage their NFC tags" ON public.nfc_tags FOR ALL
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view and manage all company NFC tags" ON public.nfc_tags;
CREATE POLICY "Admins can view and manage all company NFC tags" ON public.nfc_tags FOR ALL
USING (public.is_company_admin() AND profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

DROP POLICY IF EXISTS "Anyone can insert scans" ON public.scans;
CREATE POLICY "Anyone can insert scans" ON public.scans FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff can view scans of their cards or company" ON public.scans;
CREATE POLICY "Staff can view scans of their cards or company" ON public.scans FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff can view leads for their company" ON public.leads;
CREATE POLICY "Staff can view leads for their company" ON public.leads FOR SELECT
USING (
    share_link_id IN (
        SELECT sl.id FROM public.share_links sl
        JOIN public.profiles p ON sl.profile_id = p.id
        WHERE p.company_id = public.get_auth_company_id()
    )
);

DROP POLICY IF EXISTS "Staff can view and manage company scanned contacts" ON public.scanned_contacts;
CREATE POLICY "Staff can view and manage company scanned contacts" ON public.scanned_contacts FOR ALL
USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can view visitors" ON public.visitors;
CREATE POLICY "Staff can view visitors" ON public.visitors FOR SELECT
USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can update visitors" ON public.visitors;
CREATE POLICY "Staff can update visitors" ON public.visitors FOR UPDATE
USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can view visits" ON public.visits;
CREATE POLICY "Staff can view visits" ON public.visits FOR SELECT
USING (
    visitor_id IN (
        SELECT id FROM public.visitors WHERE company_id = public.get_auth_company_id()
    )
);

DROP POLICY IF EXISTS "Staff can insert and update visits" ON public.visits;
CREATE POLICY "Staff can insert and update visits" ON public.visits FOR ALL
USING (
    visitor_id IN (
        SELECT id FROM public.visitors WHERE company_id = public.get_auth_company_id()
    )
);

DROP POLICY IF EXISTS "Staff can view whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Staff can view whatsapp messages" ON public.whatsapp_messages FOR SELECT
USING (
    visit_id IS NULL OR visit_id IN (
        SELECT v.id FROM public.visits v
        JOIN public.visitors vis ON v.visitor_id = vis.id
        WHERE vis.company_id = public.get_auth_company_id()
    )
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tap_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_visitor(TEXT, TEXT, TEXT, TEXT, UUID, INT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visit_by_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_visit_details(TEXT, TEXT, TEXT, UUID, INT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_staff_list() TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- PART 5: SEED DATA
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    v_company_id UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_staff1_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_staff2_id UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;

    v_doc1_id UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
    v_doc2_id UUID := 'd0000000-0000-0000-0000-000000000002'::uuid;
    v_doc3_id UUID := 'd0000000-0000-0000-0000-000000000003'::uuid;

    v_preset_link_id UUID := 's0000000-0000-0000-0000-000000000001'::uuid;

    v_visitor1_id UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
    v_visitor2_id UUID := 'b0000000-0000-0000-0000-000000000002'::uuid;
BEGIN
    INSERT INTO public.companies (id, name, logo_url, address, website, brand_color)
    VALUES (
        v_company_id,
        'Cel-Ron Enterprises Pte Ltd',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&auto=format&fit=crop&q=80',
        '1 Rochor Canal Road, #03-05 Sim Lim Square, Singapore 188504',
        'https://celron.com.sg',
        '#0A2540'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        website = EXCLUDED.website,
        brand_color = EXCLUDED.brand_color;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'celron.simlim0305@gmail.com') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'celron.simlim0305@gmail.com',
            '',
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Cel-Ron Administrator"}'::jsonb,
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
    ELSE
        SELECT id INTO v_admin_id FROM auth.users WHERE email = 'celron.simlim0305@gmail.com';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ronald.tan@celron.com.sg') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_staff1_id,
            '00000000-0000-0000-0000-000000000000',
            'ronald.tan@celron.com.sg',
            '',
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Ronald Tan"}'::jsonb,
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
    ELSE
        SELECT id INTO v_staff1_id FROM auth.users WHERE email = 'ronald.tan@celron.com.sg';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'celine.lim@celron.com.sg') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_staff2_id,
            '00000000-0000-0000-0000-000000000000',
            'celine.lim@celron.com.sg',
            '',
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Celine Lim"}'::jsonb,
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
    ELSE
        SELECT id INTO v_staff2_id FROM auth.users WHERE email = 'celine.lim@celron.com.sg';
    END IF;

    INSERT INTO public.profiles (
        id, company_id, full_name, job_title, phone, whatsapp, email,
        photo_url, role, staff_slug
    ) VALUES (
        v_admin_id,
        v_company_id,
        'Cel-Ron Operations Admin',
        'Head of Operations',
        '+65 8196 2270',
        '+65 8196 2270',
        'celron.simlim0305@gmail.com',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        'admin',
        'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        role = 'admin',
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp;

    INSERT INTO public.profiles (
        id, company_id, full_name, job_title, phone, whatsapp, email,
        photo_url, role, staff_slug
    ) VALUES (
        v_staff1_id,
        v_company_id,
        'Ronald Tan',
        'Marine Sales Director',
        '+65 9123 4567',
        '+65 9123 4567',
        'ronald.tan@celron.com.sg',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        'staff',
        'ronald-tan'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        staff_slug = EXCLUDED.staff_slug;

    INSERT INTO public.profiles (
        id, company_id, full_name, job_title, phone, whatsapp, email,
        photo_url, role, staff_slug
    ) VALUES (
        v_staff2_id,
        v_company_id,
        'Celine Lim',
        'Marine Technical Specialist',
        '+65 8234 5678',
        '+65 8234 5678',
        'celine.lim@celron.com.sg',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
        'staff',
        'celine-lim'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        staff_slug = EXCLUDED.staff_slug;

    INSERT INTO public.documents (
        id, company_id, title, category, file_url, file_type, thumbnail_url, is_active, sort_order
    ) VALUES (
        v_doc1_id,
        v_company_id,
        'Cel-Ron Corporate Profile & Marine Services',
        'name_card',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'application/pdf',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=80',
        TRUE,
        1
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.documents (
        id, company_id, title, category, file_url, file_type, thumbnail_url, is_active, sort_order
    ) VALUES (
        v_doc2_id,
        v_company_id,
        'Marine Engine, Pump & Auxiliary Spare Parts Catalogue 2026',
        'catalogue',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'application/pdf',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
        TRUE,
        2
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.documents (
        id, company_id, title, category, file_url, file_type, thumbnail_url, is_active, sort_order
    ) VALUES (
        v_doc3_id,
        v_company_id,
        'ISO 9001:2015 & ClassNK Marine Supply Certification',
        'certificate',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'application/pdf',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&auto=format&fit=crop&q=80',
        TRUE,
        3
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.share_links (
        id, short_code, profile_id, document_ids, label, is_preset
    ) VALUES (
        v_preset_link_id,
        'CRON-GEN',
        v_staff1_id,
        ARRAY[v_doc1_id, v_doc2_id],
        'Generator & Pump Parts Pack',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.profiles
    SET active_share_link_id = v_preset_link_id
    WHERE id = v_staff1_id;

    INSERT INTO public.visitors (
        id, company_id, phone, whatsapp_name, full_name, visitor_company,
        first_visit_at, last_visit_at, visit_count
    ) VALUES (
        v_visitor1_id,
        v_company_id,
        '+6598765432',
        'Johnathan Goh',
        'Johnathan Goh',
        'Keppel Offshore & Marine Ltd',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days',
        1
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.visits (
        visit_code, visitor_id, purpose, host_profile_id, party_size,
        location, checked_in_at, details_completed, consent_given, source
    ) VALUES (
        'KEPPEL01',
        v_visitor1_id,
        'Spare parts enquiry - Marine Pumps',
        v_staff1_id,
        2,
        'Cel-Ron Sim Lim Office',
        NOW() - INTERVAL '3 days',
        TRUE,
        TRUE,
        'qr_form'
    )
    ON CONFLICT (visit_code) DO NOTHING;

    INSERT INTO public.visitors (
        id, company_id, phone, whatsapp_name, full_name, visitor_company,
        first_visit_at, last_visit_at, visit_count
    ) VALUES (
        v_visitor2_id,
        v_company_id,
        '+6587654321',
        'Capt. Alex Hansen',
        'Capt. Alex Hansen',
        'Maersk Line Singapore Pte Ltd',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '1 hour',
        3
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.visits (
        visit_code, visitor_id, purpose, host_profile_id, party_size,
        location, checked_in_at, details_completed, consent_given, source
    ) VALUES (
        'MAERSK01',
        v_visitor2_id,
        'Meeting',
        v_staff1_id,
        1,
        'Cel-Ron Sim Lim Office',
        NOW() - INTERVAL '1 hour',
        TRUE,
        TRUE,
        'whatsapp'
    )
    ON CONFLICT (visit_code) DO NOTHING;

END $$;
