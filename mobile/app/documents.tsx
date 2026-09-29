import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../src/context/AuthContext';
import {
  fetchDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  CompanyDocument,
  DocumentCategory,
} from '../src/lib/documents';
import {
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FolderOpen,
  ArrowLeft,
  Filter,
} from 'lucide-react-native';

const CATEGORIES: { label: string; value: DocumentCategory }[] = [
  { label: 'Name Card', value: 'name_card' },
  { label: 'Catalogue', value: 'catalogue' },
  { label: 'Brochure', value: 'brochure' },
  { label: 'Certificate', value: 'certificate' },
  { label: 'Other', value: 'other' },
];

export default function DocumentAdminScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('catalogue');
  const [isUploading, setIsUploading] = useState(false);

  // Edit modal state
  const [editingDoc, setEditingDoc] = useState<CompanyDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('catalogue');

  const loadDocs = async () => {
    setIsLoading(true);
    const docs = await fetchDocuments(profile?.company_id);
    setDocuments(docs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [profile?.company_id]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedFile(file);
        if (!docTitle) {
          // Default title from file name without extension
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setDocTitle(nameWithoutExt);
        }
      }
    } catch (err) {
      console.warn('Document picker cancelled or failed:', err);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('File Required', 'Please select a document or image to upload.');
      return;
    }

    if (!docTitle.trim()) {
      Alert.alert('Title Required', 'Please provide a descriptive title for this document.');
      return;
    }

    setIsUploading(true);

    const result = await uploadDocument({
      fileUri: selectedFile.uri,
      fileName: selectedFile.name,
      mimeType: selectedFile.mimeType || 'application/pdf',
      companyId: profile?.company_id || 'c0000000-0000-0000-0000-000000000001',
      title: docTitle.trim(),
      category: docCategory,
    });

    setIsUploading(false);

    if (result.success && result.document) {
      setDocuments((prev) => [...prev, result.document!]);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
      setDocCategory('catalogue');
      Alert.alert('Uploaded', 'Document successfully uploaded and ready for customer sharing.');
    } else {
      Alert.alert('Upload Error', result.error || 'Failed to upload document.');
    }
  };

  const handleToggleActive = async (doc: CompanyDocument) => {
    const updatedStatus = !doc.is_active;
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_active: updatedStatus } : d))
    );
    await updateDocument(doc.id, { is_active: updatedStatus });
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= documents.length) return;

    const newDocs = [...documents];
    const temp = newDocs[index];
    newDocs[index] = newDocs[targetIndex];
    newDocs[targetIndex] = temp;

    // Update sort_order numbers
    newDocs.forEach((d, idx) => {
      d.sort_order = idx + 1;
      updateDocument(d.id, { sort_order: idx + 1 });
    });

    setDocuments(newDocs);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    if (!editTitle.trim()) {
      Alert.alert('Title Required', 'Title cannot be blank.');
      return;
    }

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === editingDoc.id ? { ...d, title: editTitle.trim(), category: editCategory } : d
      )
    );

    await updateDocument(editingDoc.id, {
      title: editTitle.trim(),
      category: editCategory,
    });

    setEditingDoc(null);
  };

  const handleDelete = (doc: CompanyDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to remove "${doc.title}"? This will also remove it from customer share packs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            await deleteDocument(doc.id);
          },
        },
      ]
    );
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === 'all') return true;
    return doc.category === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Company Documents</Text>
          <Text style={styles.headerSub}>Manage catalogues, brochures & certs</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadTopBtn}
          onPress={() => setIsUploadModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus color="#FFFFFF" size={18} />
          <Text style={styles.uploadTopBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* CATEGORY FILTER CHIPS */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              All ({documents.length})
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat.value).length;
            const isActive = filter === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(cat.value)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* DOCUMENT LIST */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading company documents...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredDocs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FolderOpen color="#475569" size={48} />
              <Text style={styles.emptyTitle}>No Documents Found</Text>
              <Text style={styles.emptySub}>
                Upload marine spare parts brochures, catalogues, or certificates to share with clients.
              </Text>
              <TouchableOpacity
                style={styles.emptyUploadBtn}
                onPress={() => setIsUploadModalOpen(true)}
              >
                <Plus color="#FFFFFF" size={16} />
                <Text style={styles.emptyUploadBtnText}>Upload First Document</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDocs.map((doc, index) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docCardMain}>
                  {/* Icon */}
                  <View style={styles.docIconBox}>
                    <FileText color="#38BDF8" size={24} />
                  </View>

                  {/* Info */}
                  <View style={styles.docInfo}>
                    <View style={styles.categoryBadgeRow}>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{doc.category.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                      <Text style={styles.sortOrderText}>#{doc.sort_order}</Text>
                    </View>
                    <Text style={styles.docTitle} numberOfLines={2}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docMeta}>
                      {doc.file_type.includes('pdf') ? 'PDF Document' : 'Image File'}
                    </Text>
                  </View>
                </View>

                {/* Card Controls */}
                <View style={styles.docControls}>
                  {/* Active Toggle */}
                  <View style={styles.activeToggleRow}>
                    <Text style={styles.activeLabel}>
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </Text>
                    <Switch
                      value={doc.is_active}
                      onValueChange={() => handleToggleActive(doc)}
                      trackColor={{ false: '#334155', true: '#0284C7' }}
                      thumbColor={doc.is_active ? '#38BDF8' : '#94A3B8'}
                    />
                  </View>

                  {/* Actions: Reorder, Edit, Delete */}
                  <View style={styles.actionButtonsRow}>
                    {/* Reorder Up */}
                    <TouchableOpacity
                      style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]}
                      disabled={index === 0}
                      onPress={() => handleMove(index, 'up')}
                    >
                      <ArrowUp color={index === 0 ? '#475569' : '#94A3B8'} size={16} />
                    </TouchableOpacity>

                    {/* Reorder Down */}
                    <TouchableOpacity
                      style={[styles.iconBtn, index === documents.length - 1 && styles.iconBtnDisabled]}
                      disabled={index === documents.length - 1}
                      onPress={() => handleMove(index, 'down')}
                    >
                      <ArrowDown color={index === documents.length - 1 ? '#475569' : '#94A3B8'} size={16} />
                    </TouchableOpacity>

                    {/* Edit */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setEditingDoc(doc);
                        setEditTitle(doc.title);
                        setEditCategory(doc.category);
                      }}
                    >
                      <Edit2 color="#38BDF8" size={16} />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.iconBtnDelete]}
                      onPress={() => handleDelete(doc)}
                    >
                      <Trash2 color="#EF4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* UPLOAD MODAL */}
      <Modal visible={isUploadModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Document</Text>
              <TouchableOpacity onPress={() => setIsUploadModalOpen(false)}>
                <X color="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Pick File Section */}
              <TouchableOpacity
                style={styles.filePickerBox}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <UploadCloud color="#38BDF8" size={32} />
                <Text style={styles.filePickerTitle}>
                  {selectedFile ? selectedFile.name : 'Tap to select PDF or Image file'}
                </Text>
                <Text style={styles.filePickerSub}>
                  {selectedFile
                    ? `${((selectedFile.size || 0) / 1024 / 1024).toFixed(2)} MB`
                    : 'PDF, JPG, PNG up to 25MB'}
                </Text>
              </TouchableOpacity>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Auxiliary Engine Spares 2026"
                  placeholderTextColor="#64748B"
                  value={docTitle}
                  onChangeText={setDocTitle}
                />
              </View>

              {/* Category Select */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Category</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = docCategory === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.catOption, isSelected && styles.catOptionSelected]}
                        onPress={() => setDocCategory(cat.value)}
                      >
                        <Text
                          style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit Upload */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isUploading && styles.buttonDisabled]}
                disabled={isUploading}
                onPress={handleUploadSubmit}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <UploadCloud color="#FFFFFF" size={18} />
                    <Text style={styles.modalSubmitText}>Save to Document Library</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editingDoc !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Document</Text>
              <TouchableOpacity onPress={() => setEditingDoc(null)}>
                <X color="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = editCategory === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.catOption, isSelected && styles.catOptionSelected]}
                        onPress={() => setEditCategory(cat.value)}
                      >
                        <Text
                          style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveEdit}>
                <Check color="#FFFFFF" size={18} />
                <Text style={styles.modalSubmitText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06101E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162842',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F2744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  uploadTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  uploadTopBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterScrollWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0F1E33',
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#09182C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#183050',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  docCard: {
    backgroundColor: '#0A182C',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 14,
  },
  docCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F294A',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catBadge: {
    backgroundColor: '#07243B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  catBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  sortOrderText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  docMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  docControls: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#12253E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0F2542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  iconBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0A172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#1E3A63',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#132845',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  filePickerBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    borderRadius: 18,
    backgroundColor: '#071A2E',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  filePickerSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#071220',
    borderWidth: 1,
    borderColor: '#193356',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    color: '#FFFFFF',
    fontSize: 14,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    backgroundColor: '#081729',
    borderWidth: 1,
    borderColor: '#183050',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catOptionSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  catOptionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  catOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
