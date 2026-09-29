-- ==============================================================================
-- Migration: 20260929000005_pdpa_cleanup.sql
-- Description: Singapore PDPA 12-Month Visitor Retention & Data Purge Policy
-- ==============================================================================

-- 1. PURGE EXPIRED VISITOR DATA (RPC FUNCTION)
-- Deletes visitor logs older than specified retention period (default 12 months)
-- in accordance with Singapore Personal Data Protection Act (PDPA) security guidelines.
CREATE OR REPLACE FUNCTION public.purge_expired_visitor_data(p_retention_months INT DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_visits_deleted INT := 0;
    v_visitors_deleted INT := 0;
    v_messages_deleted INT := 0;
BEGIN
    -- Guard against invalid retention period
    IF p_retention_months < 1 THEN
        p_retention_months := 12;
    END IF;

    v_cutoff_date := NOW() - (p_retention_months || ' months')::INTERVAL;

    -- 1. Delete visits past retention date
    WITH deleted_visits AS (
        DELETE FROM public.visits
        WHERE checked_in_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_visits_deleted FROM deleted_visits;

    -- 2. Delete whatsapp webhook audit records past retention date
    WITH deleted_msgs AS (
        DELETE FROM public.whatsapp_messages
        WHERE received_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_messages_deleted FROM deleted_msgs;

    -- 3. Delete visitor profiles that have no active visits and no business card linked
    WITH deleted_visitors AS (
        DELETE FROM public.visitors v
        WHERE v.scanned_contact_id IS NULL
          AND v.last_visit_at < v_cutoff_date
          AND NOT EXISTS (
              SELECT 1 FROM public.visits vs WHERE vs.visitor_id = v.id
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_visitors_deleted FROM deleted_visitors;

    RETURN jsonb_build_object(
        'status', 'ok',
        'retention_months', p_retention_months,
        'cutoff_date', v_cutoff_date,
        'visits_purged', v_visits_deleted,
        'visitors_purged', v_visitors_deleted,
        'messages_purged', v_messages_deleted,
        'purged_at', NOW()
    );
END;
$$;

-- 2. GET RETENTION AUDIT STATS (Inspect count of records approaching or past retention)
CREATE OR REPLACE FUNCTION public.get_pdpa_retention_stats(p_retention_months INT DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_total_visits INT := 0;
    v_expired_visits INT := 0;
    v_oldest_visit TIMESTAMPTZ;
    v_newest_visit TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_months || ' months')::INTERVAL;

    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE checked_in_at < v_cutoff_date),
        MIN(checked_in_at),
        MAX(checked_in_at)
    INTO 
        v_total_visits,
        v_expired_visits,
        v_oldest_visit,
        v_newest_visit
    FROM public.visits;

    RETURN jsonb_build_object(
        'status', 'ok',
        'retention_months', p_retention_months,
        'cutoff_date', v_cutoff_date,
        'total_visits', v_total_visits,
        'expired_visits', v_expired_visits,
        'compliant', (v_expired_visits = 0),
        'oldest_visit', v_oldest_visit,
        'newest_visit', v_newest_visit
    );
END;
$$;
