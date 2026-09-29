import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Share,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  fetchLeads,
  fetchStatsSummary,
  exportLeadsToCsv,
  exportVisitsToCsv,
  executePdpaPurge,
  LeadRecord,
  StatsSummary,
  MOCK_STATS,
} from '../src/lib/stats';
import { getVisits } from '../src/lib/visitors';
import { fetchScannedContacts, exportContactsToCsv } from '../src/lib/cardScanner';
import {
  ArrowLeft,
  BarChart3,
  Users,
  QrCode,
  Radio,
  Download,
  Mail,
  Phone,
  MessageCircle,
  Share2,
  ShieldCheck,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react-native';

export default function LeadsStatsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'stats' | 'leads' | 'pdpa'>('stats');
  const [stats, setStats] = useState<StatsSummary>(MOCK_STATS);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purging, setPurging] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sData, lData] = await Promise.all([
        fetchStatsSummary(profile?.company_id),
        fetchLeads(profile?.company_id),
      ]);
      setStats(sData);
      setLeads(lData);
    } catch (err) {
      console.warn('Error loading leads & stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // CSV Handlers
  const handleExportLeads = async () => {
    const ok = await exportLeadsToCsv(leads);
    if (!ok) Alert.alert('Export Notice', 'No leads currently available to export.');
  };

  const handleExportVisits = async () => {
    const visits = await getVisits('all');
    const ok = await exportVisitsToCsv(visits);
    if (!ok) Alert.alert('Export Notice', 'No visit records currently available to export.');
  };

  const handleExportContacts = async () => {
    const contacts = await fetchScannedContacts(profile?.company_id);
    if (!contacts || contacts.length === 0) {
      Alert.alert('Export Notice', 'No scanned cards available to export.');
      return;
    }
    await exportContactsToCsv(contacts);
  };

  // PDPA Purge Handler
  const handlePdpaPurge = () => {
    Alert.alert(
      'Singapore PDPA Data Purge',
      'This will permanently purge visitor check-in logs and WhatsApp audit records older than 12 months. Permanent contacts saved in your directory will not be affected.\n\nProceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Purge',
          style: 'destructive',
          onPress: async () => {
            setPurging(true);
            const res = await executePdpaPurge(12);
            setPurging(false);
            if (res.success) {
              Alert.alert(
                'Purge Completed',
                res.message ||
                  `PDPA Purge Successful:\n• Visits removed: ${res.visitsPurged}\n• Visitors purged: ${res.visitorsPurged}\n• Webhook messages cleaned: ${res.messagesPurged}`
              );
              loadData();
            } else {
              Alert.alert('Error', 'Failed to run PDPA purge');
            }
          },
        },
      ]
    );
  };

  // Lead contact actions
  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleWhatsApp = (phone?: string | null, name?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${name || ''}, thank you for contacting Cel-Ron Enterprises. I am following up on your recent inquiry.`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${text}`);
  };

  const handleEmail = (email?: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}?subject=Cel-Ron%20Enterprises%20Follow-up`);
  };

  const handleShareLead = async (lead: LeadRecord) => {
    const text = `Cel-Ron Client Lead:\nName: ${lead.name}\nCompany: ${lead.company || 'N/A'}\nPhone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nMessage: ${lead.message || 'N/A'}`;
    await Share.share({ message: text, title: `Lead - ${lead.name}` });
  };

  // Filter leads
  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      (l.company && l.company.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.phone && l.phone.toLowerCase().includes(q)) ||
      (l.message && l.message.toLowerCase().includes(q))
    );
  });

  const totalScans = stats.totalScans || 1;
  const qrPct = Math.round((stats.scansBySource.qr / totalScans) * 100) || 0;
  const nfcPct = Math.round((stats.scansBySource.nfc / totalScans) * 100) || 0;
  const linkPct = Math.max(0, 100 - qrPct - nfcPct);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Analytics & Leads</Text>
          <Text style={styles.headerSubtitle}>
            Cel-Ron Performance • PDPA Compliance
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerExportBtn}
          onPress={handleExportLeads}
          activeOpacity={0.8}
        >
          <FileSpreadsheet color="#38BDF8" size={18} />
        </TouchableOpacity>
      </View>

      {/* Navigation Segment Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
          onPress={() => setActiveTab('stats')}
        >
          <BarChart3
            size={15}
            color={activeTab === 'stats' ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'leads' && styles.tabItemActive]}
          onPress={() => setActiveTab('leads')}
        >
          <Users
            size={15}
            color={activeTab === 'leads' ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}
          >
            Leads ({leads.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pdpa' && styles.tabItemActive]}
          onPress={() => setActiveTab('pdpa')}
        >
          <ShieldCheck
            size={15}
            color={activeTab === 'pdpa' ? '#10B981' : '#64748B'}
          />
          <Text
            style={[styles.tabText, activeTab === 'pdpa' && styles.tabTextActiveGreen]}
          >
            PDPA
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading analytics & metrics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38BDF8"
            />
          }
        >
          {/* ===================== TAB 1: OVERVIEW & STATS ===================== */}
          {activeTab === 'stats' && (
            <View style={styles.tabContent}>
              {/* Primary Metrics Grid */}
              <View style={styles.metricsGrid}>
                {/* 1. Total Scans */}
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Total Scans & Taps</Text>
                    <TrendingUp size={16} color="#38BDF8" />
                  </View>
                  <Text style={styles.metricValue}>{stats.totalScans}</Text>
                  <Text style={styles.metricSub}>All digital cards</Text>
                </View>

                {/* 2. Client Leads */}
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Client Leads</Text>
                    <Users size={16} color="#34D399" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#34D399' }]}>
                    {stats.totalLeads}
                  </Text>
                  <Text style={styles.metricSub}>Forms submitted</Text>
                </View>

                {/* 3. Reception Visitors */}
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Visitors Logged</Text>
                    <Clock size={16} color="#FBBF24" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#FBBF24' }]}>
                    {stats.totalVisitors}
                  </Text>
                  <Text style={styles.metricSub}>
                    {stats.activeVisitorsToday} currently in office
                  </Text>
                </View>

                {/* 4. AI Scanned Cards */}
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Cards Scanned</Text>
                    <Sparkles size={16} color="#A78BFA" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#A78BFA' }]}>
                    {stats.totalContacts}
                  </Text>
                  <Text style={styles.metricSub}>In company directory</Text>
                </View>
              </View>

              {/* Channel Distribution Breakdown */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Card Engagement by Channel</Text>
                <Text style={styles.sectionDesc}>
                  Distribution of how prospective clients access your digital profiles
                </Text>

                {/* Progress Bar */}
                <View style={styles.multiBar}>
                  <View style={[styles.barSegment, { flex: Math.max(qrPct, 5), backgroundColor: '#0284C7' }]} />
                  <View style={[styles.barSegment, { flex: Math.max(nfcPct, 5), backgroundColor: '#10B981' }]} />
                  <View style={[styles.barSegment, { flex: Math.max(linkPct, 5), backgroundColor: '#8B5CF6' }]} />
                </View>

                {/* Legend items */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                    <View>
                      <Text style={styles.legendLabel}>QR Code Scans</Text>
                      <Text style={styles.legendVal}>
                        {stats.scansBySource.qr} ({qrPct}%)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <View>
                      <Text style={styles.legendLabel}>Physical NFC Taps</Text>
                      <Text style={styles.legendVal}>
                        {stats.scansBySource.nfc} ({nfcPct}%)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <View>
                      <Text style={styles.legendLabel}>Web / Chat Links</Text>
                      <Text style={styles.legendVal}>
                        {stats.scansBySource.link} ({linkPct}%)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 1-Tap CSV Exports Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>One-Tap Data Exports (CSV)</Text>
                <Text style={styles.sectionDesc}>
                  Export structured data directly to Excel, Google Sheets, or share via WhatsApp/Email.
                </Text>

                <View style={styles.exportsList}>
                  {/* Export Leads */}
                  <TouchableOpacity
                    style={styles.exportTile}
                    onPress={handleExportLeads}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.exportIconBox, { backgroundColor: '#06281D' }]}>
                      <Users size={20} color="#10B981" />
                    </View>
                    <View style={styles.exportMeta}>
                      <Text style={styles.exportTileTitle}>Export Client Leads CSV</Text>
                      <Text style={styles.exportTileSub}>
                        {leads.length} captured prospective contacts & inquiries
                      </Text>
                    </View>
                    <Download size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Export Visitors */}
                  <TouchableOpacity
                    style={styles.exportTile}
                    onPress={handleExportVisits}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.exportIconBox, { backgroundColor: '#082F49' }]}>
                      <Clock size={20} color="#38BDF8" />
                    </View>
                    <View style={styles.exportMeta}>
                      <Text style={styles.exportTileTitle}>Export Visitor Diary CSV</Text>
                      <Text style={styles.exportTileSub}>
                        {stats.totalVisitors} reception check-in and check-out logs
                      </Text>
                    </View>
                    <Download size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Export Contacts */}
                  <TouchableOpacity
                    style={styles.exportTile}
                    onPress={handleExportContacts}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.exportIconBox, { backgroundColor: '#2E1065' }]}>
                      <Sparkles size={20} color="#C084FC" />
                    </View>
                    <View style={styles.exportMeta}>
                      <Text style={styles.exportTileTitle}>Export Scanned Business Cards</Text>
                      <Text style={styles.exportTileSub}>
                        {stats.totalContacts} cards OCR extracted by AI camera
                      </Text>
                    </View>
                    <Download size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ===================== TAB 2: CAPTURED LEADS ===================== */}
          {activeTab === 'leads' && (
            <View style={styles.tabContent}>
              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search leads by name, company, or message..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {filteredLeads.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Users size={36} color="#475569" />
                  <Text style={styles.emptyTitle}>No Leads Found</Text>
                  <Text style={styles.emptyDesc}>
                    {searchQuery
                      ? 'No prospective leads match your search query.'
                      : 'When clients submit the inquiry form on your digital card page, their contact info and message will appear here.'}
                  </Text>
                </View>
              ) : (
                filteredLeads.map((lead) => (
                  <View key={lead.id} style={styles.leadCard}>
                    <View style={styles.leadHeader}>
                      <View>
                        <Text style={styles.leadName}>{lead.name}</Text>
                        <Text style={styles.leadCompany}>
                          {lead.company || 'Direct Inquiry'}
                        </Text>
                      </View>
                      <Text style={styles.leadDate}>
                        {new Date(lead.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    {lead.message ? (
                      <View style={styles.leadMessageBox}>
                        <Text style={styles.leadMessageText}>"{lead.message}"</Text>
                      </View>
                    ) : null}

                    {/* Metadata line */}
                    <View style={styles.leadMetaRow}>
                      {lead.staff_name ? (
                        <Text style={styles.leadSourceText}>
                          Via {lead.staff_name}'s card ({lead.card_code})
                        </Text>
                      ) : null}
                    </View>

                    {/* Quick action buttons */}
                    <View style={styles.leadActionsRow}>
                      {lead.phone ? (
                        <TouchableOpacity
                          style={styles.leadActionBtn}
                          onPress={() => handleCall(lead.phone)}
                        >
                          <Phone size={14} color="#38BDF8" />
                          <Text style={styles.leadActionBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}

                      {lead.phone ? (
                        <TouchableOpacity
                          style={styles.leadActionBtn}
                          onPress={() => handleWhatsApp(lead.phone, lead.name)}
                        >
                          <MessageCircle size={14} color="#34D399" />
                          <Text style={[styles.leadActionBtnText, { color: '#34D399' }]}>
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {lead.email ? (
                        <TouchableOpacity
                          style={styles.leadActionBtn}
                          onPress={() => handleEmail(lead.email)}
                        >
                          <Mail size={14} color="#FBBF24" />
                          <Text style={[styles.leadActionBtnText, { color: '#FBBF24' }]}>
                            Email
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.leadActionBtn, { marginLeft: 'auto' }]}
                        onPress={() => handleShareLead(lead)}
                      >
                        <Share2 size={14} color="#CBD5E1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ===================== TAB 3: SINGAPORE PDPA ===================== */}
          {activeTab === 'pdpa' && (
            <View style={styles.tabContent}>
              {/* Compliance Status Card */}
              <View style={styles.pdpaCard}>
                <View style={styles.pdpaIconBox}>
                  <ShieldCheck size={32} color="#10B981" />
                </View>
                <Text style={styles.pdpaStatusTitle}>Singapore PDPA Compliant</Text>
                <Text style={styles.pdpaStatusDesc}>
                  Cel-Ron Enterprises operates under the Personal Data Protection Act (PDPA 2012).
                  Visitor records and WhatsApp check-in audit logs are subject to a strict 12-month data retention policy.
                </Text>

                <View style={styles.pdpaBadgeRow}>
                  <View style={styles.pdpaActiveBadge}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <Text style={styles.pdpaActiveBadgeText}>12-Month Purge Policy Active</Text>
                  </View>
                </View>
              </View>

              {/* Policy Explanation */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Data Retention Standards</Text>

                <View style={styles.pdpaRuleItem}>
                  <View style={styles.pdpaRuleNumber}>
                    <Text style={styles.pdpaRuleNumberText}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pdpaRuleTitle}>Premises Security Logs</Text>
                    <Text style={styles.pdpaRuleBody}>
                      Check-in logs collected via reception QR or WhatsApp are retained for up to 12 months for premises security, building management, and safety records.
                    </Text>
                  </View>
                </View>

                <View style={styles.pdpaRuleItem}>
                  <View style={styles.pdpaRuleNumber}>
                    <Text style={styles.pdpaRuleNumberText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pdpaRuleTitle}>Business Contact Exemption</Text>
                    <Text style={styles.pdpaRuleBody}>
                      Business cards scanned into your company contacts directory are business contact information (BCI) voluntarily exchanged for ongoing commercial discussions and are preserved safely.
                    </Text>
                  </View>
                </View>

                <View style={styles.pdpaRuleItem}>
                  <View style={styles.pdpaRuleNumber}>
                    <Text style={styles.pdpaRuleNumberText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pdpaRuleTitle}>No NRIC / Identification Storage</Text>
                    <Text style={styles.pdpaRuleBody}>
                      In full compliance with Singapore Advisory Guidelines, Cel-Ron never records NRIC numbers, FIN numbers, or identity card copies for office check-ins.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Manual Purge Action Card */}
              <View style={[styles.sectionCard, { borderColor: '#7F1D1D' }]}>
                <Text style={[styles.sectionTitle, { color: '#FCA5A5' }]}>
                  Manual Data Retention Purge
                </Text>
                <Text style={styles.sectionDesc}>
                  Trigger an immediate cleanup scan to permanently purge any visitor records and WhatsApp webhook logs exceeding the 12-month retention window.
                </Text>

                <TouchableOpacity
                  style={styles.purgeBtn}
                  onPress={handlePdpaPurge}
                  disabled={purging}
                  activeOpacity={0.8}
                >
                  {purging ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.purgeBtnText}>Run PDPA 12-Month Purge</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  headerExportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B1E36',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#081426',
    borderBottomWidth: 1,
    borderBottomColor: '#162842',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#38BDF8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  tabTextActiveGreen: {
    color: '#10B981',
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0A2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  metricSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#0A2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 16,
  },
  multiBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#06172A',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  legendVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exportsList: {
    gap: 10,
  },
  exportTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  exportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportMeta: {
    flex: 1,
  },
  exportTileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exportTileSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2540',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  emptyBox: {
    backgroundColor: '#0A2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  leadCard: {
    backgroundColor: '#0A2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
    gap: 10,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leadCompany: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 1,
  },
  leadDate: {
    fontSize: 11,
    color: '#64748B',
  },
  leadMessageBox: {
    backgroundColor: '#06172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  leadMessageText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  leadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadSourceText: {
    fontSize: 11,
    color: '#64748B',
  },
  leadActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
    paddingTop: 8,
    marginTop: 2,
  },
  leadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06172A',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  leadActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  pdpaCard: {
    backgroundColor: '#06281D',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#059669',
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  pdpaIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pdpaStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  pdpaStatusDesc: {
    fontSize: 12,
    color: '#A7F3D0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  pdpaBadgeRow: {
    flexDirection: 'row',
  },
  pdpaActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#022C22',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  pdpaActiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  pdpaRuleItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  pdpaRuleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pdpaRuleNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  pdpaRuleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pdpaRuleBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  purgeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
