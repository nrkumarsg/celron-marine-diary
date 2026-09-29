-- ==============================================================================
-- Migration: 20260929000002_storage_setup.sql
-- Description: Storage buckets and access policies for Cel-Ron
-- ==============================================================================

-- 1. Create storage buckets if they do not already exist
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

-- 2. Storage Policies for 'documents' bucket
-- Public can view/download documents (shared via cards/links)
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
CREATE POLICY "Public can view documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents');

-- Authenticated staff can upload documents
DROP POLICY IF EXISTS "Authenticated staff can upload documents" ON storage.objects;
CREATE POLICY "Authenticated staff can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
    );

-- Authenticated staff can update or delete documents
DROP POLICY IF EXISTS "Authenticated staff can update documents" ON storage.objects;
CREATE POLICY "Authenticated staff can update documents"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Authenticated staff can delete documents" ON storage.objects;
CREATE POLICY "Authenticated staff can delete documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
    );

-- 3. Storage Policies for 'scanned-cards' bucket
-- Private bucket: only authenticated staff can read scanned card photos
DROP POLICY IF EXISTS "Staff can read scanned cards" ON storage.objects;
CREATE POLICY "Staff can read scanned cards"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'scanned-cards'
        AND auth.role() = 'authenticated'
    );

-- Authenticated staff can upload scanned card photos
DROP POLICY IF EXISTS "Staff can upload scanned cards" ON storage.objects;
CREATE POLICY "Staff can upload scanned cards"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'scanned-cards'
        AND auth.role() = 'authenticated'
    );

-- Authenticated staff can update or delete their scanned card uploads
DROP POLICY IF EXISTS "Staff can update scanned cards" ON storage.objects;
CREATE POLICY "Staff can update scanned cards"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'scanned-cards'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Staff can delete scanned cards" ON storage.objects;
CREATE POLICY "Staff can delete scanned cards"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'scanned-cards'
        AND auth.role() = 'authenticated'
    );
