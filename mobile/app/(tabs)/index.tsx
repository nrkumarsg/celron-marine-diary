import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  Share2,
  ScanLine,
  Users,
  ExternalLink,
  ChevronRight,
  Sparkles,
  QrCode,
  Radio,
  FileText,
  BarChart3,
} from 'lucide-react-native';

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
  const tapLink = profile ? `${baseUrl}/t/${profile.staff_slug}` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TOP GREETING HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companySub}>CEL-RON ENTERPRISES</Text>
            <Text style={styles.greetingName}>
              {profile ? profile.full_name : 'Staff Member'}
            </Text>
            <Text style={styles.jobTitle}>
              {profile?.job_title || 'Marine Technical Specialist'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'C'}</Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>

        {/* PRIMARY ACTION BUTTONS GRID */}
        <View style={styles.actionGrid}>
          {/* 1. Share Card & Documents */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardShare]}
            onPress={() => router.push('/share')}
            activeOpacity={0.85}
          >
            <View style={styles.actionIconContainer}>
              <QrCode color="#FFFFFF" size={24} />
            </View>
            <View style={styles.actionCardBody}>
              <Text style={styles.actionTitle}>Share Pack</Text>
              <Text style={styles.actionDesc}>Show QR & Catalogues</Text>
            </View>
            <ChevronRight color="#93C5FD" size={18} />
          </TouchableOpacity>

          {/* 2. Scan Other People's Cards */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardScan]}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#B45309' }]}>
              <ScanLine color="#FFFFFF" size={24} />
            </View>
            <View style={styles.actionCardBody}>
              <Text style={styles.actionTitle}>Scan Card</Text>
              <Text style={styles.actionDesc}>AI Card Extraction</Text>
            </View>
            <ChevronRight color="#FDE68A" size={18} />
          </TouchableOpacity>

          {/* 3. Reception Visitor Diary */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardVisitors]}
            onPress={() => router.push('/(tabs)/visitors')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#047857' }]}>
              <Users color="#FFFFFF" size={24} />
            </View>
            <View style={styles.actionCardBody}>
              <View style={styles.visitorTitleRow}>
                <Text style={styles.actionTitle}>Visitors</Text>
                <View style={styles.visitorBadge}>
                  <Text style={styles.visitorBadgeText}>2 Today</Text>
                </View>
              </View>
              <Text style={styles.actionDesc}>Live Reception Log</Text>
            </View>
            <ChevronRight color="#A7F3D0" size={18} />
          </TouchableOpacity>

          {/* 4. Leads & Stats Analytics */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#06281D', borderColor: '#059669' }]}
            onPress={() => router.push('/leads-stats')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#064E3B' }]}>
              <BarChart3 color="#34D399" size={24} />
            </View>
            <View style={styles.actionCardBody}>
              <Text style={styles.actionTitle}>Leads & Stats</Text>
              <Text style={styles.actionDesc}>PDPA & Analytics</Text>
            </View>
            <ChevronRight color="#6EE7B7" size={18} />
          </TouchableOpacity>
        </View>

        {/* MY DIGITAL CARD PREVIEW */}
        <View style={styles.cardPreviewSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MY DIGITAL CARD PREVIEW</Text>
            <TouchableOpacity
              style={styles.nfcLinkBadge}
              onPress={() => router.push('/nfc-card')}
            >
              <Radio color="#38BDF8" size={12} />
              <Text style={styles.nfcLinkText}>NFC Tap Linked</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.previewBox}
            onPress={() => router.push('/share')}
            activeOpacity={0.9}
          >
            <View style={styles.previewTop}>
              <View>
                <Text style={styles.previewSlug}>/t/{profile?.staff_slug}</Text>
                <Text style={styles.previewPack}>
                  Active Pack: <Text style={{ color: '#38BDF8', fontWeight: '700' }}>Standard Marine Parts Pack</Text>
                </Text>
              </View>
              <View style={styles.activeTag}>
                <Sparkles color="#10B981" size={14} />
                <Text style={styles.activeTagText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.previewDivider} />

            <View style={styles.previewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>18</Text>
                <Text style={styles.statLabel}>QR Scans</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>42</Text>
                <Text style={styles.statLabel}>NFC Taps</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>6</Text>
                <Text style={styles.statLabel}>Leads</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* RECENT ACTIVITY & SHARES */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>RECENT SHARES & SCANS</Text>

          <View style={styles.historyCard}>
            <View style={styles.historyIcon}>
              <FileText color="#38BDF8" size={18} />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>Standard Marine Parts Pack</Text>
              <Text style={styles.historyTime}>QR scanned 2 hours ago • Keppel Shipyard</Text>
            </View>
          </View>

          <View style={styles.historyCard}>
            <View style={[styles.historyIcon, { backgroundColor: '#1E1B4B' }]}>
              <Radio color="#818CF8" size={18} />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>Physical NFC Tap (/t/{profile?.staff_slug})</Text>
              <Text style={styles.historyTime}>Tapped yesterday • PSA Marine</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06101E',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#162842',
  },
  headerLeft: {
    flex: 1,
  },
  companySub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 1.5,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  jobTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 1,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0284C7',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0F2744',
    borderWidth: 2,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#06101E',
  },
  actionGrid: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardShare: {
    backgroundColor: '#0C2340',
    borderColor: '#1D4ED8',
  },
  actionCardScan: {
    backgroundColor: '#261807',
    borderColor: '#92400E',
  },
  actionCardVisitors: {
    backgroundColor: '#07241A',
    borderColor: '#065F46',
  },
  actionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCardBody: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  visitorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitorBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  visitorBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardPreviewSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  nfcLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A2540',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  nfcLinkText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: '#0B182B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A3358',
    padding: 18,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  previewSlug: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewPack: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#162842',
    marginVertical: 14,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentSection: {
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091526',
    borderWidth: 1,
    borderColor: '#14253E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0C2340',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  historyTime: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
});
