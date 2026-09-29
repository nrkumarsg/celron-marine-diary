import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Share,
  Platform,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';

// Component type cast for cross-version JSX compatibility
const QRCodeComponent = QRCode as unknown as React.ComponentType<{
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}>;
import { useAuth } from '../src/context/AuthContext';
import { fetchDocuments, CompanyDocument } from '../src/lib/documents';
import {
  createShareLink,
  loadPresets,
  setActiveTapPack,
  SharePreset,
} from '../src/lib/shareLinks';
import { generateOfflineVCard } from '../src/lib/vcard';
import {
  ArrowLeft,
  QrCode,
  Share2,
  Copy,
  Radio,
  CheckSquare,
  Square,
  Sparkles,
  WifiOff,
  Sun,
  ShieldCheck,
  Check,
  Smartphone,
} from 'lucide-react-native';

export default function ShareScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Mode: 'live' (Web QR with documents) | 'offline' (Embedded vCard QR)
  const [activeTab, setActiveTab] = useState<'live' | 'offline'>('live');

  // Documents and selection
  const [availableDocs, setAvailableDocs] = useState<CompanyDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [presets, setPresets] = useState<SharePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // QR & Link state
  const [shortCode, setShortCode] = useState<string>('CRON-GEN');
  const [shareLinkId, setShareLinkId] = useState<string | null>('e0000000-0000-0000-0000-000000000001');
  const [isNfcActivePack, setIsNfcActivePack] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCreatingLink, setIsCreatingLink] = useState<boolean>(false);

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
  const fullCardUrl = `${baseUrl}/c/${shortCode}`;

  // Max brightness handling
  useEffect(() => {
    let initialBrightness = 0.5;

    async function maximizeBrightness() {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          initialBrightness = await Brightness.getBrightnessAsync();
          await Brightness.setBrightnessAsync(1.0);
        }
      } catch (err) {
        // Brightness adjustments may not be supported on simulators
      }
    }

    maximizeBrightness();

    return () => {
      Brightness.setBrightnessAsync(initialBrightness).catch(() => {});
    };
  }, []);

  // Load documents and presets
  useEffect(() => {
    async function initData() {
      const docs = await fetchDocuments(profile?.company_id);
      const activeDocs = docs.filter((d) => d.is_active);
      setAvailableDocs(activeDocs);

      // Pre-select Name Card by default
      const nameCardDoc = activeDocs.find((d) => d.category === 'name_card');
      const catalogueDoc = activeDocs.find((d) => d.category === 'catalogue');
      const initialIds = [nameCardDoc?.id, catalogueDoc?.id].filter(Boolean) as string[];
      setSelectedDocIds(initialIds);

      // Load presets
      const loadedPresets = await loadPresets(profile?.id);
      setPresets(loadedPresets);
      if (loadedPresets.length > 0) {
        setSelectedPresetId(loadedPresets[0].id);
        setShortCode(loadedPresets[0].short_code);
      }
    }

    initData();
  }, [profile?.company_id, profile?.id]);

  const handleToggleDoc = (docId: string) => {
    let nextIds: string[];
    if (selectedDocIds.includes(docId)) {
      // Don't allow unchecking everything; keep at least one
      if (selectedDocIds.length === 1) {
        Alert.alert('Keep One Document', 'A share pack must contain at least one document.');
        return;
      }
      nextIds = selectedDocIds.filter((id) => id !== docId);
    } else {
      nextIds = [...selectedDocIds, docId];
    }

    setSelectedDocIds(nextIds);
    setSelectedPresetId(null);
    updateLinkForSelection(nextIds);
  };

  const handleSelectPreset = (preset: SharePreset) => {
    setSelectedPresetId(preset.id);
    setSelectedDocIds(preset.document_ids);
    setShortCode(preset.short_code);
  };

  const updateLinkForSelection = async (docIds: string[]) => {
    if (!profile) return;
    setIsCreatingLink(true);

    const res = await createShareLink({
      profileId: profile.id,
      documentIds: docIds,
      label: `Pack (${docIds.length} docs)`,
    });

    setIsCreatingLink(false);
    if (res.success) {
      setShortCode(res.shortCode);
      if (res.linkId) {
        setShareLinkId(res.linkId);
        if (isNfcActivePack) {
          setActiveTapPack(profile.id, res.linkId);
        }
      }
    }
  };

  const handleToggleNfcPack = async (enabled: boolean) => {
    setIsNfcActivePack(enabled);
    if (profile) {
      await setActiveTapPack(profile.id, enabled ? shareLinkId : null);
      Alert.alert(
        enabled ? 'NFC Pack Activated' : 'NFC Pack Reset',
        enabled
          ? `Your physical NFC card (/t/${profile.staff_slug}) will now show this document pack automatically.`
          : 'Your NFC card will now show your default corporate profile.'
      );
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `${profile?.full_name || 'Cel-Ron Marine'} shared a digital business card and technical documents with you:\n${fullCardUrl}`,
        url: fullCardUrl,
        title: 'Cel-Ron Enterprises Digital Card',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(fullCardUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const offlineVCardData = profile ? generateOfflineVCard(profile) : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Share Digital Card</Text>
          <Text style={styles.headerSub}>Show QR code or send link</Text>
        </View>
        <View style={styles.brightnessPill}>
          <Sun color="#F59E0B" size={14} />
          <Text style={styles.brightnessText}>Max Bright</Text>
        </View>
      </View>

      {/* TABS: LIVE WEB QR vs OFFLINE VCARD QR */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'live' && styles.tabBtnActive]}
          onPress={() => setActiveTab('live')}
          activeOpacity={0.8}
        >
          <QrCode color={activeTab === 'live' ? '#FFFFFF' : '#94A3B8'} size={16} />
          <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>
            Live Pack QR (Web & Docs)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'offline' && styles.tabBtnActive]}
          onPress={() => setActiveTab('offline')}
          activeOpacity={0.8}
        >
          <WifiOff color={activeTab === 'offline' ? '#FFFFFF' : '#94A3B8'} size={16} />
          <Text style={[styles.tabText, activeTab === 'offline' && styles.tabTextActive]}>
            Offline vCard QR
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'live' ? (
          <>
            {/* SAVED PRESET CHIPS */}
            <View style={styles.presetSection}>
              <Text style={styles.sectionHeader}>SAVED DOCUMENT PACKS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {presets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => handleSelectPreset(preset)}
                      activeOpacity={0.8}
                    >
                      <Sparkles color={isSelected ? '#FFFFFF' : '#38BDF8'} size={14} />
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* FULL BRIGHTNESS QR CODE DISPLAY */}
            <View style={styles.qrCard}>
              <View style={styles.qrFrame}>
                {isCreatingLink ? (
                  <View style={styles.qrLoadingBox}>
                    <ActivityIndicator size="large" color="#0284C7" />
                    <Text style={styles.qrLoadingText}>Updating pack...</Text>
                  </View>
                ) : (
                  <QRCodeComponent
                    value={fullCardUrl}
                    size={220}
                    color="#06101E"
                    backgroundColor="#FFFFFF"
                  />
                )}
              </View>

              <Text style={styles.qrInstructions}>
                Customer scans with standard phone camera
              </Text>
              <Text style={styles.qrSubInstructions}>
                No app needed • Opens digital card & documents instantly
              </Text>

              {/* ACTION BUTTONS: SHARE SHEET & COPY */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.shareActionBtn}
                  onPress={handleShareLink}
                  activeOpacity={0.85}
                >
                  <Share2 color="#FFFFFF" size={18} />
                  <Text style={styles.shareActionBtnText}>Share Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.copyActionBtn}
                  onPress={handleCopyLink}
                  activeOpacity={0.85}
                >
                  {isCopied ? <Check color="#10B981" size={18} /> : <Copy color="#38BDF8" size={18} />}
                  <Text style={[styles.copyActionBtnText, isCopied && { color: '#10B981' }]}>
                    {isCopied ? 'Copied!' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SET AS ACTIVE NFC TAP PACK TOGGLE */}
            <View style={styles.nfcToggleCard}>
              <View style={styles.nfcToggleLeft}>
                <Radio color="#38BDF8" size={22} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.nfcToggleTitle}>Set as my NFC / Tap Pack</Text>
                  <Text style={styles.nfcToggleSub}>
                    Physical NFC card (/t/{profile?.staff_slug}) will show this pack
                  </Text>
                </View>
              </View>
              <Switch
                value={isNfcActivePack}
                onValueChange={handleToggleNfcPack}
                trackColor={{ false: '#334155', true: '#0284C7' }}
                thumbColor={isNfcActivePack ? '#38BDF8' : '#94A3B8'}
              />
            </View>

            {/* DOCUMENT CHECKLIST */}
            <View style={styles.checklistSection}>
              <Text style={styles.sectionHeader}>CUSTOMIZE DOCUMENTS IN THIS PACK</Text>
              <View style={styles.checklistBox}>
                {availableDocs.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.checklistItem}
                      onPress={() => handleToggleDoc(doc.id)}
                      activeOpacity={0.7}
                    >
                      {isChecked ? (
                        <CheckSquare color="#38BDF8" size={22} />
                      ) : (
                        <Square color="#64748B" size={22} />
                      )}
                      <View style={styles.checklistInfo}>
                        <Text style={[styles.checklistTitle, isChecked && styles.checklistTitleActive]}>
                          {doc.title}
                        </Text>
                        <Text style={styles.checklistCategory}>
                          {doc.category.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          /* TAB 2: OFFLINE VCARD QR */
          <View style={styles.offlineContainer}>
            <View style={styles.offlineBanner}>
              <WifiOff color="#F59E0B" size={20} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.offlineBannerTitle}>Offline vCard Mode Active</Text>
                <Text style={styles.offlineBannerSub}>
                  Works at sea, inside ship engine rooms, or anywhere without cell reception.
                </Text>
              </View>
            </View>

            <View style={styles.qrCard}>
              <View style={styles.qrFrame}>
                <QRCodeComponent
                  value={offlineVCardData}
                  size={230}
                  color="#06101E"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.qrInstructions}>
                Embedded vCard 3.0 Contact Code
              </Text>
              <Text style={styles.qrSubInstructions}>
                Customer camera imports {profile?.full_name} directly into phone contacts with zero internet.
              </Text>
            </View>
          </View>
        )}

        {/* ANDROID vs IOS PHONE TAP MODE NOTE */}
        <View style={styles.deviceNoteBox}>
          <Smartphone color="#94A3B8" size={18} />
          <Text style={styles.deviceNoteText}>
            {Platform.OS === 'android'
              ? 'Android Phone Tap: Broadcasts /t/' + (profile?.staff_slug || '') + ' via NFC while this screen is open.'
              : 'iPhone notice: iOS does not support HCE phone tap emulation. Tap using your physical NFC card.'}
          </Text>
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
  brightnessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  brightnessText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#071526',
    borderBottomWidth: 1,
    borderBottomColor: '#10223A',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0B1C33',
    borderWidth: 1,
    borderColor: '#172E4E',
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  presetSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  presetRow: {
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#091A30',
    borderWidth: 1,
    borderColor: '#193963',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qrCard: {
    backgroundColor: '#0A182C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  qrFrame: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  qrLoadingBox: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  qrInstructions: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrSubInstructions: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    height: 46,
    borderRadius: 12,
  },
  shareActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  copyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F2744',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    height: 46,
    borderRadius: 12,
  },
  copyActionBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  nfcToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#071F36',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  nfcToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  nfcToggleTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nfcToggleSub: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 2,
  },
  checklistSection: {
    marginBottom: 16,
  },
  checklistBox: {
    backgroundColor: '#091526',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#14253E',
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#122036',
    gap: 12,
  },
  checklistInfo: {
    flex: 1,
  },
  checklistTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  checklistTitleActive: {
    color: '#FFFFFF',
  },
  checklistCategory: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  offlineContainer: {
    gap: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 14,
  },
  offlineBannerTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  offlineBannerSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  deviceNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#081424',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#12233C',
    padding: 12,
    marginTop: 8,
  },
  deviceNoteText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
