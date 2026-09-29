import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  Share,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  getVisits,
  checkOutVisit,
  createManualCheckIn,
  getActiveStaff,
  subscribeToVisitsRealtime,
  ActiveStaff,
} from '../../src/lib/visitors';
import { Visit } from '../../src/types';
import {
  Users,
  UserPlus,
  Phone,
  MessageCircle,
  Share2,
  Camera,
  LogOut,
  Search,
  X,
  Clock,
  Building2,
  Calendar,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Globe,
  Radio,
} from 'lucide-react-native';

const PURPOSES = [
  'Spare parts enquiry',
  'Technical Discussion',
  'Meeting',
  'Delivery / Collection',
  'Vendor / Supplier',
  'Interview',
  'Other',
];

export default function VisitorsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'today' | 'active' | 'week' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Walk-in modal state
  const [showModal, setShowModal] = useState(false);
  const [staffList, setStaffList] = useState<ActiveStaff[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formHostId, setFormHostId] = useState('');
  const [formPurpose, setFormPurpose] = useState('Spare parts enquiry');
  const [formPartySize, setFormPartySize] = useState('1');
  const [formNotes, setFormNotes] = useState('');

  // Load visits
  const loadData = useCallback(async () => {
    try {
      const data = await getVisits(filter);
      setVisits(data);
    } catch (err) {
      console.warn('Failed to load visits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Load staff list for dropdown
  useEffect(() => {
    getActiveStaff().then((list) => {
      setStaffList(list);
      if (list.length > 0 && !formHostId) {
        // Default host to current staff profile if matched, else first in list
        const myProfile = list.find((s) => s.id === profile?.id);
        setFormHostId(myProfile ? myProfile.id : list[0].id);
      }
    });
  }, [profile?.id]);

  // Subscribe to realtime visits
  useEffect(() => {
    const unsubscribe = subscribeToVisitsRealtime(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Actions
  const handleCheckOut = (visit: Visit) => {
    const name = visit.visitor?.full_name || visit.visitor?.whatsapp_name || 'Visitor';
    Alert.alert(
      'Check Out Visitor',
      `Record check-out for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Check-Out',
          style: 'destructive',
          onPress: async () => {
            const success = await checkOutVisit(visit.id);
            if (success) {
              loadData();
            } else {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call');
    });
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${name || ''}, thank you for visiting Cel-Ron Enterprises today. How may we assist you further with your marine spare parts needs?`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${text}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed');
    });
  };

  const handleSendCard = async (visit: Visit) => {
    const cardUrl = `https://celron.com.sg/c/${profile?.staff_slug || 'admin'}`;
    try {
      await Share.share({
        message: `Hello ${visit.visitor?.full_name || ''}, here is my Cel-Ron digital business card and marine catalogue: ${cardUrl}`,
        url: cardUrl,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleScanCard = () => {
    router.push('/(tabs)/scan');
  };

  const handleOpenWalkIn = () => {
    setFormName('');
    setFormPhone('');
    setFormCompany('');
    setFormPurpose('Spare parts enquiry');
    setFormPartySize('1');
    setFormNotes('');
    setShowModal(true);
  };

  const handleSaveWalkIn = async () => {
    if (!formName.trim()) {
      Alert.alert('Missing Name', 'Please enter the visitor\'s full name.');
      return;
    }
    if (!formPhone.trim()) {
      Alert.alert('Missing Phone', 'Please enter the visitor\'s contact number.');
      return;
    }

    setSubmitting(true);
    const res = await createManualCheckIn({
      fullName: formName,
      phone: formPhone,
      company: formCompany,
      hostProfileId: formHostId,
      purpose: formPurpose,
      partySize: parseInt(formPartySize, 10) || 1,
      notes: formNotes,
    });
    setSubmitting(false);

    if (res.success) {
      setShowModal(false);
      loadData();
      Alert.alert('Checked In', `${formName} has been logged in the visitor diary.`);
    } else {
      Alert.alert('Error', res.error || 'Failed to check in walk-in visitor');
    }
  };

  // Filter visits by search query
  const filteredVisits = visits.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (v.visitor?.full_name || v.visitor?.whatsapp_name || '').toLowerCase();
    const comp = (v.visitor?.visitor_company || '').toLowerCase();
    const phone = (v.visitor?.phone || '').toLowerCase();
    const host = (v.host?.full_name || '').toLowerCase();
    const purpose = (v.purpose || '').toLowerCase();
    return (
      name.includes(q) ||
      comp.includes(q) ||
      phone.includes(q) ||
      host.includes(q) ||
      purpose.includes(q)
    );
  });

  const activeCount = visits.filter((v) => !v.checked_out_at).length;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'whatsapp') {
      return (
        <View style={[styles.badge, styles.badgeWhatsApp]}>
          <MessageCircle size={11} color="#10B981" />
          <Text style={styles.badgeTextWhatsApp}>WhatsApp QR</Text>
        </View>
      );
    }
    if (source === 'qr_form') {
      return (
        <View style={[styles.badge, styles.badgeWeb]}>
          <Globe size={11} color="#0EA5E9" />
          <Text style={styles.badgeTextWeb}>Web Form</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeManual]}>
        <UserPlus size={11} color="#F59E0B" />
        <Text style={styles.badgeTextManual}>Walk-in</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Visitor Diary</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Cel-Ron Office • {activeCount} currently on premises
          </Text>
        </View>
        <TouchableOpacity
          style={styles.walkInBtn}
          onPress={handleOpenWalkIn}
          activeOpacity={0.8}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={styles.walkInBtnText}>+ Walk-In</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitor, company, host, or phone..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'today' && styles.filterChipActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
          onPress={() => setFilter('active')}
        >
          <View style={styles.filterActiveChipContent}>
            <View style={styles.miniGreenDot} />
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active Now ({activeCount})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'week' && styles.filterChipActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>
            Past 7 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visitors List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Syncing visitor check-ins...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
        >
          {filteredVisits.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Users size={32} color="#475569" />
              </View>
              <Text style={styles.emptyTitle}>No Visitors Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No check-ins match your search criteria.'
                  : 'No visitors recorded for this time range. Check-ins via reception WhatsApp QR, web fallback, or manual walk-in will appear here in real time.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={handleOpenWalkIn}
              >
                <UserPlus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Log Manual Walk-In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredVisits.map((item) => {
              const visitor = item.visitor;
              const isCheckedOut = Boolean(item.checked_out_at);
              const displayName = visitor?.full_name || visitor?.whatsapp_name || 'Guest';
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <View key={item.id} style={styles.card}>
                  {/* Card Top Row: Visitor Info & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>

                    <View style={styles.visitorMeta}>
                      <View style={styles.nameRow}>
                        <Text style={styles.visitorName}>{displayName}</Text>
                        {visitor?.visit_count && visitor.visit_count > 1 ? (
                          <View style={styles.repeatBadge}>
                            <Text style={styles.repeatBadgeText}>
                              Visit #{visitor.visit_count}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {visitor?.visitor_company ? (
                        <View style={styles.companyRow}>
                          <Building2 size={13} color="#94A3B8" />
                          <Text style={styles.companyText}>
                            {visitor.visitor_company}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Status Pill */}
                    {isCheckedOut ? (
                      <View style={styles.statusDeparted}>
                        <Clock size={11} color="#94A3B8" />
                        <Text style={styles.statusDepartedText}>Departed</Text>
                      </View>
                    ) : (
                      <View style={styles.statusActive}>
                        <View style={styles.activePulsingDot} />
                        <Text style={styles.statusActiveText}>In Office</Text>
                      </View>
                    )}
                  </View>

                  {/* Metadata Row: Purpose, Source, Party Size */}
                  <View style={styles.tagsRow}>
                    {getSourceBadge(item.source)}

                    {item.purpose ? (
                      <View style={styles.purposeBadge}>
                        <Text style={styles.purposeText} numberOfLines={1}>
                          {item.purpose}
                        </Text>
                      </View>
                    ) : null}

                    {item.party_size > 1 ? (
                      <View style={styles.partyBadge}>
                        <Text style={styles.partyBadgeText}>
                          👥 {item.party_size} pax
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Host & Timestamps Details Box */}
                  <View style={styles.detailsBox}>
                    <View style={styles.detailLine}>
                      <Text style={styles.detailLabel}>Host:</Text>
                      <Text style={styles.detailValue}>
                        {item.host?.full_name || 'Cel-Ron Team'}
                        {item.host?.job_title ? ` (${item.host.job_title})` : ''}
                      </Text>
                    </View>

                    <View style={styles.detailLine}>
                      <Text style={styles.detailLabel}>Time In:</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(item.checked_in_at)} • {formatDate(item.checked_in_at)}
                      </Text>
                    </View>

                    {isCheckedOut ? (
                      <View style={styles.detailLine}>
                        <Text style={styles.detailLabel}>Time Out:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(item.checked_out_at)}
                        </Text>
                      </View>
                    ) : null}

                    {item.notes ? (
                      <View style={[styles.detailLine, { marginTop: 4 }]}>
                        <Text style={styles.detailLabel}>Notes:</Text>
                        <Text style={[styles.detailValue, { fontStyle: 'italic', color: '#CBD5E1' }]}>
                          "{item.notes}"
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Action Bar */}
                  <View style={styles.actionBar}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCall(visitor?.phone)}
                    >
                      <Phone size={14} color="#38BDF8" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleWhatsApp(visitor?.phone, displayName)}
                    >
                      <MessageCircle size={14} color="#34D399" />
                      <Text style={[styles.actionBtnText, { color: '#34D399' }]}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleSendCard(item)}
                    >
                      <Share2 size={14} color="#A78BFA" />
                      <Text style={[styles.actionBtnText, { color: '#A78BFA' }]}>Send Card</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleScanCard}
                    >
                      <Camera size={14} color="#FBBF24" />
                      <Text style={[styles.actionBtnText, { color: '#FBBF24' }]}>Scan Card</Text>
                    </TouchableOpacity>

                    {!isCheckedOut ? (
                      <TouchableOpacity
                        style={styles.checkOutBtn}
                        onPress={() => handleCheckOut(item)}
                      >
                        <LogOut size={14} color="#EF4444" />
                        <Text style={styles.checkOutBtnText}>Check Out</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Manual Walk-in Check-In Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <UserPlus size={20} color="#059669" />
                <Text style={styles.modalTitle}>Manual Walk-in Check-In</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <Text style={styles.inputLabel}>Visitor Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Capt. James Tan"
                placeholderTextColor="#64748B"
                value={formName}
                onChangeText={setFormName}
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Mobile / Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +65 9123 4567"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={formPhone}
                onChangeText={setFormPhone}
              />

              {/* Company */}
              <Text style={styles.inputLabel}>Company / Vessel Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pacific Marine Shipping"
                placeholderTextColor="#64748B"
                value={formCompany}
                onChangeText={setFormCompany}
              />

              {/* Host Staff Dropdown */}
              <Text style={styles.inputLabel}>Host Staff to Meet</Text>
              <View style={styles.hostSelectRow}>
                {staffList.map((staff) => {
                  const isSelected = formHostId === staff.id;
                  return (
                    <TouchableOpacity
                      key={staff.id}
                      style={[styles.hostChip, isSelected && styles.hostChipSelected]}
                      onPress={() => setFormHostId(staff.id)}
                    >
                      <Text
                        style={[
                          styles.hostChipText,
                          isSelected && styles.hostChipTextSelected,
                        ]}
                      >
                        {staff.full_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Purpose Selector */}
              <Text style={styles.inputLabel}>Purpose of Visit</Text>
              <View style={styles.purposePillsWrap}>
                {PURPOSES.map((p) => {
                  const isSelected = formPurpose === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.purposePill, isSelected && styles.purposePillSelected]}
                      onPress={() => setFormPurpose(p)}
                    >
                      <Text
                        style={[
                          styles.purposePillText,
                          isSelected && styles.purposePillTextSelected,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Party Size */}
              <Text style={styles.inputLabel}>Party Size (Pax)</Text>
              <View style={styles.partySizeRow}>
                {['1', '2', '3', '4+'].map((num) => {
                  const isSelected = formPartySize === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.partyNumBtn, isSelected && styles.partyNumBtnSelected]}
                      onPress={() => setFormPartySize(num)}
                    >
                      <Text
                        style={[
                          styles.partyNumText,
                          isSelected && styles.partyNumTextSelected,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes / Inquired Items</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Inquired about valve seals, urgent quote required"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                value={formNotes}
                onChangeText={setFormNotes}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveWalkIn}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Complete Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06101E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06281D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  walkInBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1E36',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0B1E36',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: '#0A2540',
    borderColor: '#38BDF8',
  },
  filterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  filterActiveChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#0B1E36',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F2744',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#0A2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06281D',
    borderWidth: 1.5,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  visitorMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  repeatBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repeatBadgeText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  companyText: {
    fontSize: 13,
    color: '#FCD34D',
    fontWeight: '600',
  },
  statusActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06281D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
    gap: 5,
  },
  activePulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  statusDeparted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  statusDepartedText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeWhatsApp: {
    backgroundColor: '#06281D',
    borderWidth: 1,
    borderColor: '#059669',
  },
  badgeTextWhatsApp: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  badgeWeb: {
    backgroundColor: '#082F49',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  badgeTextWeb: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
  badgeManual: {
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  badgeTextManual: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '700',
  },
  purposeBadge: {
    backgroundColor: '#0F2744',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  purposeText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  partyBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partyBadgeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailsBox: {
    backgroundColor: '#06172A',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#0F2744',
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 68,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1E36',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    gap: 5,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  checkOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1215',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    gap: 4,
    marginLeft: 'auto',
  },
  checkOutBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0A2540',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBody: {
    maxHeight: 460,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  hostSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hostChip: {
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hostChipSelected: {
    backgroundColor: '#06281D',
    borderColor: '#059669',
  },
  hostChipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  hostChipTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  purposePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  purposePill: {
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  purposePillSelected: {
    backgroundColor: '#0F2744',
    borderColor: '#38BDF8',
  },
  purposePillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  purposePillTextSelected: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  partySizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  partyNumBtn: {
    flex: 1,
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  partyNumBtnSelected: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  partyNumText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  partyNumTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#06172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
