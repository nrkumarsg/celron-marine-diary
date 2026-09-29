-- ==============================================================================
-- Migration: 20260929000003_rpc_functions.sql
-- Description: Stored procedures & public API functions for Cards and Visitor Diary
-- ==============================================================================

-- 1. GET PUBLIC CARD (For QR code / shared links: /c/[code])
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
    -- Find share link
    SELECT * INTO v_link
    FROM public.share_links
    WHERE short_code = TRIM(p_short_code);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Card or link not found');
    END IF;

    -- Check expiration
    IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
        RETURN jsonb_build_object('status', 'expired', 'message', 'This link has expired');
    END IF;

    -- Get profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_link.profile_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'deactivated', 'message', 'Staff profile is inactive');
    END IF;

    -- Get company
    SELECT * INTO v_company
    FROM public.companies
    WHERE id = v_profile.company_id;

    -- Retrieve documents in the share link (or fallback to active name card)
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
        -- Fallback to active name_card
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


-- 2. GET TAP CARD (For NFC taps & permanent links: /t/[slug])
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
    -- Find profile by lowercase slug
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE staff_slug = LOWER(TRIM(p_staff_slug));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found', 'message', 'Staff member not found');
    END IF;

    -- Get company
    SELECT * INTO v_company
    FROM public.companies
    WHERE id = v_profile.company_id;

    -- Check if staff has an active share link set
    IF v_profile.active_share_link_id IS NOT NULL THEN
        SELECT * INTO v_link
        FROM public.share_links
        WHERE id = v_profile.active_share_link_id;

        -- Check link validity & expiration
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

    -- Fallback to default name card if no active link or no documents in link
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


-- 3. CHECK IN VISITOR (For web fallback form: /visit)
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
    -- Clean and format phone number
    v_clean_phone := REGEXP_REPLACE(TRIM(p_phone), '[^\+0-9]', '', 'g');
    IF v_clean_phone NOT LIKE '+%' THEN
        -- Default to Singapore +65 if 8 digits starting with 8 or 9 or 6
        IF LENGTH(v_clean_phone) = 8 THEN
            v_clean_phone := '+65' || v_clean_phone;
        ELSE
            v_clean_phone := '+' || v_clean_phone;
        END IF;
    END IF;

    -- Get Cel-Ron company ID
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Company record not initialized';
    END IF;

    -- Check if visitor already exists
    SELECT * INTO v_visitor
    FROM public.visitors
    WHERE company_id = v_company_id AND phone = v_clean_phone;

    IF FOUND THEN
        v_is_returning := TRUE;

        -- Update existing visitor
        UPDATE public.visitors
        SET 
            full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
            visitor_company = COALESCE(NULLIF(TRIM(p_visitor_company), ''), visitor_company),
            last_visit_at = NOW(),
            visit_count = visit_count + 1
        WHERE id = v_visitor.id
        RETURNING * INTO v_visitor;

        -- Check 30-minute duplicate window: update existing recent visit if any
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
        -- Match against scanned_contacts if previously scanned
        SELECT id INTO v_scanned_contact_id
        FROM public.scanned_contacts sc
        WHERE sc.company_id = v_company_id
          AND sc.phones::text LIKE '%' || RIGHT(v_clean_phone, 8) || '%'
        LIMIT 1;

        -- Insert new visitor
        INSERT INTO public.visitors (
            company_id,
            phone,
            full_name,
            visitor_company,
            first_visit_at,
            last_visit_at,
            visit_count,
            scanned_contact_id
        ) VALUES (
            v_company_id,
            v_clean_phone,
            TRIM(p_full_name),
            TRIM(p_visitor_company),
            NOW(),
            NOW(),
            1,
            v_scanned_contact_id
        )
        RETURNING * INTO v_visitor;
    END IF;

    -- Generate random 8-character uppercase visit code
    v_visit_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));

    -- Create visit record
    INSERT INTO public.visits (
        visit_code,
        visitor_id,
        purpose,
        host_profile_id,
        party_size,
        location,
        checked_in_at,
        details_completed,
        consent_given,
        source
    ) VALUES (
        v_visit_code,
        v_visitor.id,
        COALESCE(NULLIF(p_purpose, ''), 'Spare parts enquiry'),
        p_host_profile_id,
        GREATEST(COALESCE(p_party_size, 1), 1),
        'Cel-Ron Office',
        NOW(),
        TRUE,
        p_consent_given,
        p_source
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


-- 4. GET VISIT BY CODE (For /visit/[visit_code] details completion)
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

    -- Check if visit was created within last 24 hours
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


-- 5. UPDATE VISIT DETAILS (Visitor updates their company / host / consent)
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

    -- Update visitor record if company provided
    IF p_visitor_company IS NOT NULL AND TRIM(p_visitor_company) <> '' THEN
        UPDATE public.visitors
        SET visitor_company = TRIM(p_visitor_company)
        WHERE id = v_visit.visitor_id;
    END IF;

    -- Update visit record
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


-- 6. GET ACTIVE STAFF LIST (For visitor form "Person to meet" dropdown)
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
