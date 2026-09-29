import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  User,
  Mail,
  Phone,
  MessageCircle,
  Radio,
  Bell,
  LogOut,
  ShieldCheck,
  Building2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const router = useRouter();

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
  const tapUrl = profile ? `${baseUrl}/t/${profile.staff_slug}` : '';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TITLE */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>My Profile</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{profile?.role?.toUpperCase() || 'STAFF'}</Text>
          </View>
        </View>

        {/* PROFILE HERO CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{profile?.full_name?.charAt(0) || 'C'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{profile?.full_name}</Text>
          <Text style={styles.jobTitle}>{profile?.job_title || 'Marine Technical Specialist'}</Text>
          <Text style={styles.companyName}>Cel-Ron Enterprises Pte Ltd</Text>
        </View>

        {/* NFC CARD MANAGEMENT SHORTCUT */}
        <TouchableOpacity
          style={styles.nfcBanner}
          onPress={() => router.push('/nfc-card')}
          activeOpacity={0.85}
        >
          <View style={styles.nfcBannerIcon}>
            <Radio color="#38BDF8" size={24} />
          </View>
          <View style={styles.nfcBannerText}>
            <Text style={styles.nfcBannerTitle}>Physical NFC Card</Text>
            <Text style={styles.nfcBannerSub}>Program card with /t/{profile?.staff_slug}</Text>
          </View>
          <ChevronRight color="#38BDF8" size={20} />
        </TouchableOpacity>

        {/* CONTACT DETAILS LIST */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>CONTACT & IDENTIFICATION</Text>

          <View style={styles.infoRow}>
            <Mail color="#94A3B8" size={18} />
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Company Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Phone color="#94A3B8" size={18} />
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{profile?.phone || 'Not configured'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MessageCircle color="#10B981" size={18} />
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>WhatsApp</Text>
              <Text style={styles.infoValue}>{profile?.whatsapp || profile?.phone || 'Not configured'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <ExternalLink color="#38BDF8" size={18} />
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Permanent Tap Slug</Text>
              <Text style={styles.infoValue}>{tapUrl}</Text>
            </View>
          </View>
        </View>

        {/* SYSTEM & PUSH NOTIFICATIONS STATUS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SYSTEM STATUS</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Bell color="#10B981" size={18} />
              <View>
                <Text style={styles.statusTitle}>Push Notifications</Text>
                <Text style={styles.statusSub}>Alerts when visitors arrive at reception</Text>
              </View>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Active</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <ShieldCheck color="#38BDF8" size={18} />
              <View>
                <Text style={styles.statusTitle}>Offline Caching</Text>
                <Text style={styles.statusSub}>Profile & packs cached on device</Text>
              </View>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Ready</Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color="#EF4444" size={18} />
          <Text style={styles.logoutButtonText}>Sign Out of Cel-Ron App</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          Cel-Ron Marine Staff App • Version 1.0.0 (Dev Build)
        </Text>
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
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleTag: {
    backgroundColor: '#0C2340',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileCard: {
    backgroundColor: '#0B1728',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#182C48',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#0284C7',
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: '#0E2746',
    borderWidth: 2.5,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#38BDF8',
    fontSize: 32,
    fontWeight: '800',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  jobTitle: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  companyName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  nfcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07243B',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  nfcBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0A395E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  nfcBannerText: {
    flex: 1,
  },
  nfcBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nfcBannerSub: {
    fontSize: 11,
    color: '#93C5FD',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#091526',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#14253E',
    padding: 16,
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#122036',
  },
  infoBody: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#122036',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    height: 48,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#475569',
    marginTop: 20,
  },
});
