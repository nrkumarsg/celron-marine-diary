-- ==============================================================================
-- Migration: 20260929000004_rls_policies.sql
-- Description: Row Level Security (RLS) policies for Cel-Ron multi-tenant & role access
-- ==============================================================================

-- 1. Helper Security Functions
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

-- 2. Enable RLS on all tables
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

-- 3. COMPANIES POLICIES
DROP POLICY IF EXISTS "Staff can view their company" ON public.companies;
CREATE POLICY "Staff can view their company"
    ON public.companies FOR SELECT
    USING (id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;
CREATE POLICY "Admins can update their company"
    ON public.companies FOR UPDATE
    USING (id = public.get_auth_company_id() AND public.is_company_admin());

-- 4. PROFILES POLICIES
DROP POLICY IF EXISTS "Staff can view company colleagues" ON public.profiles;
CREATE POLICY "Staff can view company colleagues"
    ON public.profiles FOR SELECT
    USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can update own profile" ON public.profiles;
CREATE POLICY "Staff can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
CREATE POLICY "Admins can manage company profiles"
    ON public.profiles FOR ALL
    USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- 5. DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Staff can view active documents" ON public.documents;
CREATE POLICY "Staff can view active documents"
    ON public.documents FOR SELECT
    USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents"
    ON public.documents FOR ALL
    USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- 6. SHARE LINKS POLICIES
DROP POLICY IF EXISTS "Staff can view company share links" ON public.share_links;
CREATE POLICY "Staff can view company share links"
    ON public.share_links FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

DROP POLICY IF EXISTS "Staff can create and manage their own share links" ON public.share_links;
CREATE POLICY "Staff can create and manage their own share links"
    ON public.share_links FOR ALL
    USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all company share links" ON public.share_links;
CREATE POLICY "Admins can manage all company share links"
    ON public.share_links FOR ALL
    USING (public.is_company_admin() AND profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

-- 7. NFC TAGS POLICIES
DROP POLICY IF EXISTS "Staff can view and manage their NFC tags" ON public.nfc_tags;
CREATE POLICY "Staff can view and manage their NFC tags"
    ON public.nfc_tags FOR ALL
    USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view and manage all company NFC tags" ON public.nfc_tags;
CREATE POLICY "Admins can view and manage all company NFC tags"
    ON public.nfc_tags FOR ALL
    USING (public.is_company_admin() AND profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

-- 8. SCANS POLICIES (Anonymous insert allowed)
DROP POLICY IF EXISTS "Anyone can insert scans" ON public.scans;
CREATE POLICY "Anyone can insert scans"
    ON public.scans FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff can view scans of their cards or company" ON public.scans;
CREATE POLICY "Staff can view scans of their cards or company"
    ON public.scans FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE company_id = public.get_auth_company_id()));

-- 9. LEADS POLICIES (Anonymous insert allowed)
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads"
    ON public.leads FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff can view leads for their company" ON public.leads;
CREATE POLICY "Staff can view leads for their company"
    ON public.leads FOR SELECT
    USING (
        share_link_id IN (
            SELECT sl.id FROM public.share_links sl
            JOIN public.profiles p ON sl.profile_id = p.id
            WHERE p.company_id = public.get_auth_company_id()
        )
    );

-- 10. SCANNED CONTACTS POLICIES (AI card scanner)
DROP POLICY IF EXISTS "Staff can view and manage company scanned contacts" ON public.scanned_contacts;
CREATE POLICY "Staff can view and manage company scanned contacts"
    ON public.scanned_contacts FOR ALL
    USING (company_id = public.get_auth_company_id());

-- 11. VISITORS POLICIES
DROP POLICY IF EXISTS "Staff can view visitors" ON public.visitors;
CREATE POLICY "Staff can view visitors"
    ON public.visitors FOR SELECT
    USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff can update visitors" ON public.visitors;
CREATE POLICY "Staff can update visitors"
    ON public.visitors FOR UPDATE
    USING (company_id = public.get_auth_company_id());

-- 12. VISITS POLICIES
DROP POLICY IF EXISTS "Staff can view visits" ON public.visits;
CREATE POLICY "Staff can view visits"
    ON public.visits FOR SELECT
    USING (
        visitor_id IN (
            SELECT id FROM public.visitors WHERE company_id = public.get_auth_company_id()
        )
    );

DROP POLICY IF EXISTS "Staff can insert and update visits" ON public.visits;
CREATE POLICY "Staff can insert and update visits"
    ON public.visits FOR ALL
    USING (
        visitor_id IN (
            SELECT id FROM public.visitors WHERE company_id = public.get_auth_company_id()
        )
    );

-- 13. WHATSAPP MESSAGES POLICIES
DROP POLICY IF EXISTS "Staff can view whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Staff can view whatsapp messages"
    ON public.whatsapp_messages FOR SELECT
    USING (
        visit_id IS NULL OR visit_id IN (
            SELECT v.id FROM public.visits v
            JOIN public.visitors vis ON v.visitor_id = vis.id
            WHERE vis.company_id = public.get_auth_company_id()
        )
    );

-- 14. GRANT EXECUTE ON RPC FUNCTIONS TO ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tap_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_visitor(TEXT, TEXT, TEXT, TEXT, UUID, INT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visit_by_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_visit_details(TEXT, TEXT, TEXT, UUID, INT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_staff_list() TO anon, authenticated;
