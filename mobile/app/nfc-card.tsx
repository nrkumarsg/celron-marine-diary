import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  initNfc,
  writeNfcCard,
  readNfcCard,
  saveNfcTagRecord,
  fetchMyNfcTags,
  deactivateNfcTag,
  NfcTagRecord,
} from '../src/lib/nfc';
import {
  Radio,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Smartphone,
  CreditCard,
  Trash2,
  RotateCw,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';

export default function NfcCardScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
  const tapUrl = profile ? `${baseUrl}/t/${profile.staff_slug}` : '';

  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [lockReadOnly, setLockReadOnly] = useState(false);
  const [cardLabel, setCardLabel] = useState('Primary Cel-Ron NFC Card');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Tags list
  const [tags, setTags] = useState<NfcTagRecord[]>([]);
  const [readResult, setReadResult] = useState<{ url: string; uid: string } | null>(null);

  // Android HCE Phone Tap Emulation State
  const [isPhoneTapActive, setIsPhoneTapActive] = useState(Platform.OS === 'android');

  useEffect(() => {
    initNfc();
    loadTags();
  }, [profile?.id]);

  const loadTags = async () => {
    const list = await fetchMyNfcTags(profile?.id);
    setTags(list);
  };

  const handleWriteCard = async () => {
    if (!profile) return;
    setStatusMessage(null);
    setReadResult(null);

    if (lockReadOnly) {
      Alert.alert(
        'Permanent Action Warning',
        'Locking the NFC tag as Read-Only cannot be undone! The card link cannot be edited or erased later. Do you wish to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Lock Card',
            style: 'destructive',
            onPress: () => performWrite(true),
          },
        ]
      );
      return;
    }

    performWrite(false);
  };

  const performWrite = async (readOnly: boolean) => {
    if (!profile) return;
    setIsWriting(true);
    setStatusMessage({
      type: 'info',
      text: 'Hold your NFC card/sticker near the NFC antenna of your phone...',
    });

    const res = await writeNfcCard(tapUrl, readOnly);
    setIsWriting(false);

    if (res.success && res.tagUid) {
      setStatusMessage({
        type: 'success',
        text: `Success! Tag UID [${res.tagUid}] programmed with ${tapUrl}${readOnly ? ' (Locked as Read-Only)' : ''}.`,
      });

      // Save tag record
      const saved = await saveNfcTagRecord({
        profileId: profile.id,
        tagUid: res.tagUid,
        label: cardLabel || 'Cel-Ron NFC Card',
      });
      setTags((prev) => [saved, ...prev.filter((t) => t.tag_uid !== res.tagUid)]);
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'NFC writing was cancelled or the tag moved too quickly.',
      });
    }
  };

  const handleTestCard = async () => {
    setStatusMessage(null);
    setReadResult(null);
    setIsReading(true);

    const res = await readNfcCard();
    setIsReading(false);

    if (res.success && res.url) {
      setReadResult({ url: res.url, uid: res.tagUid || 'N/A' });
      setStatusMessage({
        type: 'success',
        text: 'NFC Card verified! See decoded link details below.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'NFC read cancelled or tag moved.',
      });
    }
  };

  const handleDeactivateTag = (tag: NfcTagRecord) => {
    Alert.alert(
      'Deactivate Lost Card',
      `Deactivate "${tag.label}" (${tag.tag_uid})? This card will be marked as inactive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await deactivateNfcTag(tag.id);
            setTags((prev) =>
              prev.map((t) => (t.id === tag.id ? { ...t, is_active: false } : t))
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Physical NFC Card</Text>
          <Text style={styles.headerSub}>Program cards & phone tap mode</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HOW NFC WORKS BANNER */}
        <View style={styles.howItWorksCard}>
          <View style={styles.howItWorksTop}>
            <Sparkles color="#38BDF8" size={20} />
            <Text style={styles.howItWorksTitle}>Smart Tap Architecture</Text>
          </View>
          <Text style={styles.howItWorksBody}>
            Write your permanent link <Text style={styles.codeText}>{tapUrl}</Text> onto an NTAG213/215/216 card once.
            Whenever you change your active document pack in the app, the card updates automatically — no need to ever rewrite the physical card!
          </Text>
        </View>

        {/* FEEDBACK STATUS BANNER */}
        {statusMessage ? (
          <View
            style={[
              styles.statusBanner,
              statusMessage.type === 'success' && styles.statusBannerSuccess,
              statusMessage.type === 'error' && styles.statusBannerError,
              statusMessage.type === 'info' && styles.statusBannerInfo,
            ]}
          >
            {statusMessage.type === 'success' && <CheckCircle2 color="#10B981" size={20} />}
            {statusMessage.type === 'error' && <AlertCircle color="#EF4444" size={20} />}
            {statusMessage.type === 'info' && <Radio color="#38BDF8" size={20} />}
            <Text style={styles.statusBannerText}>{statusMessage.text}</Text>
          </View>
        ) : null}

        {/* WRITE CARD SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>WRITE NFC CARD / STICKER</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card / Sticker Label</Text>
            <TextInput
              style={styles.textInput}
              value={cardLabel}
              onChangeText={setCardLabel}
              placeholder="e.g. Primary NTAG215 Card"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.readOnlyToggleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.readOnlyTitleRow}>
                <Lock color="#94A3B8" size={14} />
                <Text style={styles.readOnlyTitle}>Lock as Read-Only</Text>
              </View>
              <Text style={styles.readOnlySub}>
                Prevents accidental overwrites. Warning: Permanent hardware lock.
              </Text>
            </View>
            <Switch
              value={lockReadOnly}
              onValueChange={setLockReadOnly}
              trackColor={{ false: '#334155', true: '#DC2626' }}
              thumbColor={lockReadOnly ? '#EF4444' : '#94A3B8'}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryActionBtn, isWriting && styles.buttonDisabled]}
            disabled={isWriting}
            onPress={handleWriteCard}
            activeOpacity={0.85}
          >
            {isWriting ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryActionBtnText}>Waiting for Card Touch...</Text>
              </>
            ) : (
              <>
                <Radio color="#FFFFFF" size={18} />
                <Text style={styles.primaryActionBtnText}>Write My NFC Card</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* TEST / VERIFY CARD SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TEST & VERIFY EXISTING CARD</Text>
          <Text style={styles.sectionDesc}>
            Touch an existing NFC card to read and verify its programmed URL.
          </Text>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, isReading && styles.buttonDisabled]}
            disabled={isReading}
            onPress={handleTestCard}
            activeOpacity={0.85}
          >
            {isReading ? (
              <>
                <ActivityIndicator color="#38BDF8" size="small" />
                <Text style={styles.secondaryActionBtnText}>Hold card near phone...</Text>
              </>
            ) : (
              <>
                <RotateCw color="#38BDF8" size={18} />
                <Text style={styles.secondaryActionBtnText}>Test My Card</Text>
              </>
            )}
          </TouchableOpacity>

          {readResult ? (
            <View style={styles.verifyBox}>
              <View style={styles.verifyRow}>
                <Text style={styles.verifyLabel}>Decoded URL:</Text>
                <Text style={styles.verifyValue}>{readResult.url}</Text>
              </View>
              <View style={styles.verifyRow}>
                <Text style={styles.verifyLabel}>Tag UID:</Text>
                <Text style={styles.verifyValue}>{readResult.uid}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ANDROID PHONE TAP EMULATION / IOS NOTICE */}
        {Platform.OS === 'android' ? (
          <View style={styles.hceCard}>
            <View style={styles.hceHeader}>
              <Smartphone color="#38BDF8" size={24} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hceTitle}>Android Phone Tap Mode (HCE)</Text>
                <Text style={styles.hceSub}>
                  Broadcasts your /t/{profile?.staff_slug} link from your phone when tapped by another device.
                </Text>
              </View>
            </View>
            <View style={styles.hceControlRow}>
              <Text style={styles.hceStatusText}>
                {isPhoneTapActive ? 'Broadcasting NFC Active' : 'Tap Mode Standby'}
              </Text>
              <Switch
                value={isPhoneTapActive}
                onValueChange={setIsPhoneTapActive}
                trackColor={{ false: '#334155', true: '#0284C7' }}
                thumbColor={isPhoneTapActive ? '#38BDF8' : '#94A3B8'}
              />
            </View>
          </View>
        ) : (
          <View style={styles.iosNoticeCard}>
            <Smartphone color="#94A3B8" size={22} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.iosNoticeTitle}>iPhone Tap Mode Notice</Text>
              <Text style={styles.iosNoticeSub}>
                iOS does not support Host Card Emulation (HCE) to act as a tag. Use your physical Cel-Ron NFC card or sticker.
              </Text>
            </View>
          </View>
        )}

        {/* MY REGISTERED NFC TAGS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>MY PROGRAMMED NFC CARDS ({tags.length})</Text>

          {tags.length === 0 ? (
            <Text style={styles.noTagsText}>No NFC cards programmed yet.</Text>
          ) : (
            tags.map((tag) => (
              <View key={tag.id} style={styles.tagItem}>
                <View style={styles.tagLeft}>
                  <CreditCard color={tag.is_active ? '#38BDF8' : '#64748B'} size={20} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.tagLabel, !tag.is_active && { color: '#64748B' }]}>
                      {tag.label}
                    </Text>
                    <Text style={styles.tagUid}>UID: {tag.tag_uid}</Text>
                    <Text style={styles.tagDate}>
                      Written on {new Date(tag.written_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {tag.is_active ? (
                  <TouchableOpacity
                    style={styles.deactivateBtn}
                    onPress={() => handleDeactivateTag(tag)}
                  >
                    <Text style={styles.deactivateBtnText}>Deactivate</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inactiveTag}>
                    <Text style={styles.inactiveTagText}>Deactivated</Text>
                  </View>
                )}
              </View>
            ))
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  howItWorksCard: {
    backgroundColor: '#091D33',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0284C7',
    padding: 16,
  },
  howItWorksTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  howItWorksTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  howItWorksBody: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  codeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: '#06101E',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusBannerInfo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#0A182C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#071220',
    borderWidth: 1,
    borderColor: '#193356',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#FFFFFF',
    fontSize: 13,
  },
  readOnlyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#071526',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#12253E',
  },
  readOnlyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readOnlyTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  readOnlySub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  primaryActionBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#0F2744',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyBox: {
    backgroundColor: '#071424',
    borderWidth: 1,
    borderColor: '#16335C',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    width: 85,
  },
  verifyValue: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  hceCard: {
    backgroundColor: '#07243B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0284C7',
    padding: 16,
  },
  hceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hceTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hceSub: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  hceControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#0F375E',
  },
  hceStatusText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  iosNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#081526',
    borderWidth: 1,
    borderColor: '#14253E',
    borderRadius: 18,
    padding: 14,
  },
  iosNoticeTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  iosNoticeSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#081526',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#12253E',
    padding: 12,
    marginBottom: 8,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tagUid: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  tagDate: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  deactivateBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deactivateBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveTag: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inactiveTagText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  noTagsText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
