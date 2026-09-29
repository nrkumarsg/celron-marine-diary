import { supabase, isSupabaseConfigured } from './supabase';
import { Platform } from 'react-native';

export type DocumentCategory = 'name_card' | 'brochure' | 'catalogue' | 'certificate' | 'other';

export interface CompanyDocument {
  id: string;
  company_id: string;
  title: string;
  category: DocumentCategory;
  file_url: string;
  file_type: string;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const SAMPLE_DOCUMENTS: CompanyDocument[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    title: 'Cel-Ron Corporate Profile & Marine Services',
    category: 'name_card',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    title: 'Marine Engine, Pump & Auxiliary Spare Parts Catalogue 2026',
    category: 'catalogue',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    title: 'ISO 9001:2015 & ClassNK Marine Supply Certification',
    category: 'certificate',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    company_id: 'c0000000-0000-0000-0000-000000000001',
    title: 'Marine Diesel Generator Spares & Valve Guide Brochure',
    category: 'brochure',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=400&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
];

/**
 * Fetches all documents for the company, ordered by sort_order
 */
export async function fetchDocuments(companyId?: string): Promise<CompanyDocument[]> {
  if (!isSupabaseConfigured()) {
    return SAMPLE_DOCUMENTS;
  }

  try {
    let query = supabase
      .from('documents')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching documents from Supabase:', error);
      return SAMPLE_DOCUMENTS;
    }

    return (data && data.length > 0) ? (data as CompanyDocument[]) : SAMPLE_DOCUMENTS;
  } catch (err) {
    console.error('Fetch documents error:', err);
    return SAMPLE_DOCUMENTS;
  }
}

/**
 * Uploads a document to Supabase storage 'documents' bucket
 * and inserts a row in the documents table.
 */
export async function uploadDocument({
  fileUri,
  fileName,
  mimeType,
  companyId,
  title,
  category,
}: {
  fileUri: string;
  fileName: string;
  mimeType: string;
  companyId: string;
  title: string;
  category: DocumentCategory;
}): Promise<{ success: boolean; document?: CompanyDocument; error?: string }> {
  if (!isSupabaseConfigured()) {
    // Mock upload for offline/preview
    const newDoc: CompanyDocument = {
      id: 'doc_' + Date.now(),
      company_id: companyId,
      title: title.trim() || fileName,
      category: category,
      file_url: fileUri,
      file_type: mimeType || 'application/pdf',
      thumbnail_url: null,
      is_active: true,
      sort_order: 10,
      created_at: new Date().toISOString(),
    };
    return { success: true, document: newDoc };
  }

  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${companyId}/${Date.now()}_${cleanFileName}`;

    // Read file as Blob or FormData
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // Upload to Supabase Storage bucket 'documents'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, blob, {
        contentType: mimeType || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Insert record in documents table
    const { data: docData, error: insertError } = await supabase
      .from('documents')
      .insert({
        company_id: companyId,
        title: title.trim() || fileName,
        category: category,
        file_url: publicUrl,
        file_type: mimeType || 'application/pdf',
        is_active: true,
        sort_order: 10,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return { success: true, document: docData as CompanyDocument };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Document upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Updates document fields (title, category, is_active, sort_order)
 */
export async function updateDocument(
  id: string,
  updates: Partial<Pick<CompanyDocument, 'title' | 'category' | 'is_active' | 'sort_order'>>
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating document:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Update document error:', err);
    return false;
  }
}

/**
 * Deletes a document record
 */
export async function deleteDocument(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Delete document error:', err);
    return false;
  }
}
