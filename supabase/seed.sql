-- ==============================================================================
-- Cel-Ron Enterprises Pte Ltd - Seed Data
-- ==============================================================================
-- This script creates the initial company, admin account, sample staff,
-- sample documents, preset share pack, and sample visitor records.
--
-- IMPORTANT FOR AUTH / PASSWORDS:
-- No hardcoded password is used. To log in as admin or staff:
-- Go to Supabase Dashboard -> Authentication -> Users -> Click the user ->
-- Click "Reset Password" or "Send Magic Link", or set your password in the dashboard.
-- ==============================================================================

DO $$
DECLARE
    v_company_id UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_staff1_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_staff2_id UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;

    v_doc1_id UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
    v_doc2_id UUID := 'd0000000-0000-0000-0000-000000000002'::uuid;
    v_doc3_id UUID := 'd0000000-0000-0000-0000-000000000003'::uuid;

    v_preset_link_id UUID := 'e0000000-0000-0000-0000-000000000001'::uuid;

    v_visitor1_id UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
    v_visitor2_id UUID := 'b0000000-0000-0000-0000-000000000002'::uuid;
BEGIN
    -- 1. INSERT COMPANY: Cel-Ron Enterprises Pte Ltd
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

    -- 2. CREATE AUTH USERS (IF NOT ALREADY EXISTING)
    -- Admin: celron.simlim0305@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'celron.simlim0305@gmail.com') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'celron.simlim0305@gmail.com',
            '', -- No hardcoded password; use dashboard to set password/invite
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

    -- Sample Staff 1: ronald.tan@celron.com.sg
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

    -- Sample Staff 2: celine.lim@celron.com.sg
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

    -- 3. INSERT PROFILES
    -- Admin Profile
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

    -- Staff 1: Ronald Tan
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

    -- Staff 2: Celine Lim
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

    -- 4. INSERT 3 SAMPLE DOCUMENTS
    -- Document 1: Name Card / Company Profile
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

    -- Document 2: Marine Parts Catalogue
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

    -- Document 3: Quality Certification
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

    -- 5. INSERT 1 PRESET SHARE LINK FOR RONALD TAN
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

    -- Set Ronald Tan's active NFC tap pack to this preset link
    UPDATE public.profiles
    SET active_share_link_id = v_preset_link_id
    WHERE id = v_staff1_id;

    -- 6. INSERT 2 SAMPLE VISITORS & VISITS
    -- Visitor 1: Keppel Offshore & Marine
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

    -- Visitor 2: Maersk Line Singapore
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
