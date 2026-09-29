import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Share,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  fetchScannedContacts,
  exportToPhoneContacts,
  ScannedContactRecord,
} from '../src/lib/cardScanner';
import {
  ArrowLeft,
  Search,
  Download,
  Phone,
  MessageCircle,
  Mail,
  UserPlus,
  Building2,
  Calendar,
  Tag,
  ExternalLink,
} from 'lucide-react-native';

export default function ContactsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<ScannedContactRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    fetchScannedContacts(profile?.company_id).then(setContacts);
  }, [profile?.company_id]);

  // Extract unique tags
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => c.tags || []))
  );

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.company_name.toLowerCase().includes(q) ||
      (c.job_title && c.job_title.toLowerCase().includes(q)) ||
      (c.met_at_event && c.met_at_event.toLowerCase().includes(q));

    const matchesTag = selectedTag === 'all' || (c.tags && c.tags.includes(selectedTag));

    return matchesQuery && matchesTag;
  });

  const handleExportCsv = async () => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'There are no contacts to export.');
      return;
    }

    // Generate CSV
    const headers = ['Full Name', 'Job Title', 'Company', 'Mobile Phone', 'Office Phone', 'Email', 'Website', 'Event', 'Tags', 'Notes', 'Created At'];
    const rows = contacts.map((c) => {
      const mob = c.phones?.find((p) => p.label === 'mobile')?.number || c.phones?.[0]?.number || '';
      const off = c.phones?.find((p) => p.label === 'office')?.number || '';
      const email = c.emails?.[0] || '';
      const tags = (c.tags || []).join(';');
      return [
        `"${c.full_name}"`,
        `"${c.job_title || ''}"`,
        `"${c.company_name || ''}"`,
        `"${mob}"`,
        `"${off}"`,
        `"${email}"`,
        `"${c.website || ''}"`,
        `"${c.met_at_event || ''}"`,
        `"${tags}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${c.created_at}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    try {
      await Share.share({
        message: csvContent,
        title: 'Cel-Ron Scanned Contacts Export.csv',
      });
    } catch (err) {
      console.warn('CSV share error:', err);
    }
  };

  const handleCall = (number: string) => {
    const clean = number.replace(/[^\+0-9]/g, '');
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (number: string, name: string) => {
    const clean = number.replace(/[^\+0-9]/g, '');
    const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
    const link = profile ? `${baseUrl}/t/${profile.staff_slug}` : 'https://celron.com.sg';
    const text = encodeURIComponent(
      `Hi ${name}, following up from Cel-Ron Enterprises Pte Ltd. My digital card and catalogues: ${link}`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${text}`);
  };

  const handleExportToPhone = async (contact: ScannedContactRecord) => {
    const ok = await exportToPhoneContacts(contact);
    if (ok) {
      Alert.alert('Exported', `${contact.full_name} added to your phone contacts.`);
    } else {
      Alert.alert('Permission Denied', 'Please grant Contacts permission in device settings.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Scanned Contacts</Text>
          <Text style={styles.headerSub}>{contacts.length} cards in directory</Text>
        </View>

        {/* CSV Export Button */}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportCsv}
          activeOpacity={0.8}
        >
          <Download color="#FFFFFF" size={16} />
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH INPUT */}
      <View style={styles.searchWrapper}>
        <Search color="#64748B" size={18} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, company, event, or keyword..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* TAG FILTER CHIPS */}
      {allTags.length > 0 && (
        <View style={styles.tagScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
            <TouchableOpacity
              style={[styles.tagChip, selectedTag === 'all' && styles.tagChipActive]}
              onPress={() => setSelectedTag('all')}
            >
              <Text style={[styles.tagChipText, selectedTag === 'all' && styles.tagChipTextActive]}>
                All ({contacts.length})
              </Text>
            </TouchableOpacity>

            {allTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
                onPress={() => setSelectedTag(tag)}
              >
                <Text style={[styles.tagChipText, selectedTag === tag && styles.tagChipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CONTACTS LIST */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredContacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No matching contacts</Text>
            <Text style={styles.emptySub}>Scan cards at trade shows or meetings to build your directory.</Text>
          </View>
        ) : (
          filteredContacts.map((contact) => {
            const mob = contact.phones?.find((p) => p.label === 'mobile')?.number || contact.phones?.[0]?.number;
            const email = contact.emails?.[0];

            return (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.cardTopRow}>
                  {contact.front_image_url ? (
                    <Image source={{ uri: contact.front_image_url }} style={styles.cardThumb} />
                  ) : (
                    <View style={styles.cardThumbFallback}>
                      <Text style={styles.cardThumbLetter}>{contact.full_name.charAt(0)}</Text>
                    </View>
                  )}

                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.contactName}>{contact.full_name}</Text>
                    <Text style={styles.contactJob}>{contact.job_title || 'Commercial Partner'}</Text>
                    <Text style={styles.contactCompany}>{contact.company_name}</Text>
                  </View>
                </View>

                {/* Event & Tags badges */}
                <View style={styles.badgeRow}>
                  {contact.met_at_event ? (
                    <View style={styles.eventBadge}>
                      <Calendar color="#38BDF8" size={12} />
                      <Text style={styles.eventBadgeText}>{contact.met_at_event}</Text>
                    </View>
                  ) : null}

                  {(contact.tags || []).map((t, idx) => (
                    <View key={idx} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>#{t}</Text>
                    </View>
                  ))}
                </View>

                {/* Notes if any */}
                {contact.notes ? (
                  <Text style={styles.contactNotes} numberOfLines={2}>
                    {contact.notes}
                  </Text>
                ) : null}

                {/* QUICK ACTION BUTTONS */}
                <View style={styles.actionRow}>
                  {mob ? (
                    <TouchableOpacity
                      style={styles.actionCircleBtn}
                      onPress={() => handleCall(mob)}
                    >
                      <Phone color="#38BDF8" size={16} />
                    </TouchableOpacity>
                  ) : null}

                  {mob ? (
                    <TouchableOpacity
                      style={[styles.actionCircleBtn, { backgroundColor: '#07241A', borderColor: '#059669' }]}
                      onPress={() => handleWhatsApp(mob, contact.full_name)}
                    >
                      <MessageCircle color="#10B981" size={16} />
                    </TouchableOpacity>
                  ) : null}

                  {email ? (
                    <TouchableOpacity
                      style={styles.actionCircleBtn}
                      onPress={() => Linking.openURL(`mailto:${email}`)}
                    >
                      <Mail color="#818CF8" size={16} />
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.savePhoneBtn}
                    onPress={() => handleExportToPhone(contact)}
                  >
                    <UserPlus color="#38BDF8" size={14} />
                    <Text style={styles.savePhoneBtnText}>Add to Phone</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  backBtn: {
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09182C',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#183050',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 13,
  },
  tagScrollWrapper: {
    paddingVertical: 10,
  },
  tagRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#081729',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172E4E',
  },
  tagChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tagChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  contactCard: {
    backgroundColor: '#0A182C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A63',
  },
  cardThumbFallback: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#0F294A',
    borderWidth: 1,
    borderColor: '#1E3A63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbLetter: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '800',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactJob: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 1,
  },
  contactCompany: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#071F36',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  tagBadge: {
    backgroundColor: '#0D2138',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  contactNotes: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#12253E',
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F2744',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePhoneBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#081E35',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  savePhoneBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
});
