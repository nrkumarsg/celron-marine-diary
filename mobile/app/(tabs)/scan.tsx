import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import {
  compressCardImage,
  uploadCardImage,
  extractCardWithAI,
  checkDuplicateContact,
  saveScannedContact,
  exportToPhoneContacts,
  getLastEventName,
  CardExtractedData,
  ScannedContactRecord,
} from '../../src/lib/cardScanner';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertTriangle,
  UserPlus,
  MessageCircle,
  Mail,
  RotateCcw,
  Tag,
  Calendar,
  Building2,
  Phone,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react-native';

type ScanStep = 'front' | 'back' | 'processing' | 'review' | 'success';

export default function ScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [step, setStep] = useState<ScanStep>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchCount, setBatchCount] = useState<number>(0);

  // Editable Form fields
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [products, setProducts] = useState('');
  const [otherLang, setOtherLang] = useState('');
  const [eventName, setEventName] = useState('');
  const [tagsText, setTagsText] = useState('Marine Spares');
  const [notes, setNotes] = useState('');

  // Confidence flags
  const [confidences, setConfidences] = useState<Record<string, number>>({});

  // Duplicate detection state
  const [duplicateContact, setDuplicateContact] = useState<ScannedContactRecord | null>(null);
  const [savedContact, setSavedContact] = useState<ScannedContactRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getLastEventName().then(setEventName);
  }, []);

  const handleCapturePhoto = async (side: 'front' | 'back', source: 'camera' | 'library') => {
    try {
      let res;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Please allow camera access to scan business cards.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          quality: 0.9,
          allowsEditing: false,
        });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          quality: 0.9,
          allowsEditing: false,
        });
      }

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        if (side === 'front') {
          setFrontUri(uri);
          setStep('back');
        } else {
          setBackUri(uri);
          processScannedImages(frontUri!, uri);
        }
      }
    } catch (err) {
      console.warn('Image capture error:', err);
    }
  };

  const handleSkipBack = () => {
    if (frontUri) {
      setBackUri(null);
      processScannedImages(frontUri, null);
    }
  };

  const processScannedImages = async (front: string, back: string | null) => {
    setStep('processing');

    try {
      // 1. Compress images to ~1600px JPEG
      const compressedFront = await compressCardImage(front);
      const compressedBack = back ? await compressCardImage(back) : null;

      // 2. Upload to private scanned-cards bucket
      const companyId = profile?.company_id || 'c0000000-0000-0000-0000-000000000001';
      const frontPath = await uploadCardImage(compressedFront, companyId, 'front');
      const backPath = compressedBack ? await uploadCardImage(compressedBack, companyId, 'back') : null;

      // 3. Extract with Gemini AI
      const aiData: CardExtractedData = await extractCardWithAI({ frontPath, backPath });

      // Populate review form
      setFullName(aiData.full_name || '');
      setJobTitle(aiData.job_title || '');
      setCompanyName(aiData.company_name || '');

      const mob = aiData.phones?.find((p) => p.label === 'mobile')?.number || aiData.phones?.[0]?.number || '';
      const off = aiData.phones?.find((p) => p.label === 'office')?.number || '';
      setMobilePhone(mob);
      setOfficePhone(off);

      setEmail(aiData.emails?.[0] || '');
      setWebsite(aiData.website || '');
      setAddress(aiData.address || '');
      setProducts(aiData.products_or_services || '');
      setOtherLang(aiData.other_languages_text || '');
      setConfidences(aiData.confidence || {});

      // 4. Duplicate Check
      const dup = await checkDuplicateContact({
        phone: mob || off,
        email: aiData.emails?.[0],
        companyId,
      });
      setDuplicateContact(dup);

      setStep('review');
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert('Processing Error', error.message || 'Could not process card image.');
      setStep('front');
    }
  };

  const handleSaveContact = async (overrideId?: string) => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the contact.');
      return;
    }

    setIsSaving(true);
    const companyId = profile?.company_id || 'c0000000-0000-0000-0000-000000000001';
    const profileId = profile?.id || 'a0000000-0000-0000-0000-000000000002';

    const phones: { label: string; number: string }[] = [];
    if (mobilePhone.trim()) phones.push({ label: 'mobile', number: mobilePhone.trim() });
    if (officePhone.trim()) phones.push({ label: 'office', number: officePhone.trim() });

    const emails = email.trim() ? [email.trim()] : [];
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);

    const saved = await saveScannedContact({
      id: overrideId,
      company_id: companyId,
      scanned_by: profileId,
      full_name: fullName.trim(),
      job_title: jobTitle.trim(),
      company_name: companyName.trim(),
      phones,
      emails,
      website: website.trim(),
      address: address.trim(),
      country: 'Singapore',
      other_languages_text: otherLang.trim(),
      products_or_services: products.trim(),
      notes: notes.trim(),
      tags,
      met_at_event: eventName.trim(),
      front_image_url: frontUri || '',
      back_image_url: backUri || undefined,
    });

    setIsSaving(false);
    setSavedContact(saved);

    if (isBatchMode) {
      setBatchCount((c) => c + 1);
      resetScanner();
    } else {
      setStep('success');
    }
  };

  const resetScanner = () => {
    setFrontUri(null);
    setBackUri(null);
    setDuplicateContact(null);
    setSavedContact(null);
    setFullName('');
    setJobTitle('');
    setCompanyName('');
    setMobilePhone('');
    setOfficePhone('');
    setEmail('');
    setNotes('');
    setStep('front');
  };

  const handleExportToPhone = async () => {
    if (!savedContact) return;
    const ok = await exportToPhoneContacts(savedContact);
    if (ok) {
      Alert.alert('Saved to Phone', `${savedContact.full_name} was saved to your device contacts.`);
    } else {
      Alert.alert('Contacts Permission', 'Please enable Contacts permission in device settings.');
    }
  };

  const handleSendCardWhatsApp = () => {
    if (!profile || !mobilePhone) return;
    const cleanNumber = mobilePhone.replace(/[^\+0-9]/g, '');
    const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3000';
    const myCardLink = `${baseUrl}/t/${profile.staff_slug}`;

    const text = encodeURIComponent(
      `Hi ${fullName}, pleasure meeting you at ${eventName || 'today'}. Here is my digital business card and marine catalogue for Cel-Ron Enterprises Pte Ltd:\n${myCardLink}`
    );
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${text}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>AI Business Card Scanner</Text>
          <Text style={styles.headerSub}>Gemini Flash OCR & Contact Auto-Sync</Text>
        </View>

        <TouchableOpacity
          style={styles.contactsListBtn}
          onPress={() => router.push('/contacts')}
          activeOpacity={0.8}
        >
          <BookOpen color="#38BDF8" size={16} />
          <Text style={styles.contactsListBtnText}>Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* STEP 1: FRONT CAPTURE */}
      {step === 'front' && (
        <ScrollView contentContainerStyle={styles.centerPaddedContent}>
          <View style={styles.captureHeroBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1 OF 2</Text>
            </View>
            <Text style={styles.captureHeading}>Capture Front of Card</Text>
            <Text style={styles.captureSubtitle}>
              Position the front of the business card within good lighting.
            </Text>

            <View style={styles.cardFrameGraphic}>
              <Camera color="#38BDF8" size={44} />
              <Text style={styles.cardFrameText}>FRONT SIDE</Text>
            </View>

            <View style={styles.captureActionsRow}>
              <TouchableOpacity
                style={styles.primaryCaptureBtn}
                onPress={() => handleCapturePhoto('front', 'camera')}
                activeOpacity={0.85}
              >
                <Camera color="#FFFFFF" size={20} />
                <Text style={styles.primaryCaptureBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCaptureBtn}
                onPress={() => handleCapturePhoto('front', 'library')}
                activeOpacity={0.85}
              >
                <ImageIcon color="#38BDF8" size={20} />
                <Text style={styles.secondaryCaptureBtnText}>Photos</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BATCH MODE TOGGLE FOR EXHIBITIONS */}
          <View style={styles.batchToggleCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers color="#F59E0B" size={16} />
                <Text style={styles.batchToggleTitle}>Exhibition Batch Mode</Text>
              </View>
              <Text style={styles.batchToggleSub}>
                Quick scan multiple cards in rapid succession during trade shows.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.batchPill, isBatchMode && styles.batchPillActive]}
              onPress={() => setIsBatchMode(!isBatchMode)}
            >
              <Text style={[styles.batchPillText, isBatchMode && styles.batchPillTextActive]}>
                {isBatchMode ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 2: BACK CAPTURE */}
      {step === 'back' && (
        <ScrollView contentContainerStyle={styles.centerPaddedContent}>
          <View style={styles.captureHeroBox}>
            <View style={[styles.stepBadge, { backgroundColor: '#1E1B4B', borderColor: '#4338CA' }]}>
              <Text style={[styles.stepBadgeText, { color: '#A5B4FC' }]}>STEP 2 OF 2</Text>
            </View>
            <Text style={styles.captureHeading}>Capture Back Side (Optional)</Text>
            <Text style={styles.captureSubtitle}>
              Great for cards with Chinese characters, secondary addresses, or product lists.
            </Text>

            <View style={[styles.cardFrameGraphic, { borderColor: '#818CF8' }]}>
              <Camera color="#818CF8" size={44} />
              <Text style={[styles.cardFrameText, { color: '#818CF8' }]}>BACK SIDE</Text>
            </View>

            <View style={styles.captureActionsRow}>
              <TouchableOpacity
                style={[styles.primaryCaptureBtn, { backgroundColor: '#4F46E5' }]}
                onPress={() => handleCapturePhoto('back', 'camera')}
                activeOpacity={0.85}
              >
                <Camera color="#FFFFFF" size={20} />
                <Text style={styles.primaryCaptureBtnText}>Take Back Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkipBack}
                activeOpacity={0.8}
              >
                <Text style={styles.skipBtnText}>Skip Back Side</Text>
                <ArrowRight color="#94A3B8" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* STEP 3: PROCESSING WITH AI */}
      {step === 'processing' && (
        <View style={styles.processingContainer}>
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginBottom: 16 }} />
            <Text style={styles.processingTitle}>Reading Card with Gemini Flash AI...</Text>
            <Text style={styles.processingSub}>
              Extracting contact names, marine companies, phone numbers, and addresses.
            </Text>
          </View>
        </View>
      )}

      {/* STEP 4: REVIEW & EDIT */}
      {step === 'review' && (
        <ScrollView contentContainerStyle={styles.reviewScrollContent}>
          {/* Card Thumbnails preview */}
          <View style={styles.thumbnailsRow}>
            {frontUri ? (
              <View style={styles.thumbWrapper}>
                <Image source={{ uri: frontUri }} style={styles.thumbnailImg} />
                <Text style={styles.thumbLabel}>Front</Text>
              </View>
            ) : null}
            {backUri ? (
              <View style={styles.thumbWrapper}>
                <Image source={{ uri: backUri }} style={styles.thumbnailImg} />
                <Text style={styles.thumbLabel}>Back</Text>
              </View>
            ) : null}
          </View>

          {/* Duplicate Detection Warning */}
          {duplicateContact && (
            <View style={styles.duplicateWarning}>
              <AlertTriangle color="#F59E0B" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={styles.duplicateTitle}>Existing Contact Detected</Text>
                <Text style={styles.duplicateSub}>
                  Matched with <strong style={{ color: '#FFFFFF' }}>{duplicateContact.full_name}</strong> ({duplicateContact.company_name}).
                </Text>
                <TouchableOpacity
                  style={styles.updateExistingBtn}
                  onPress={() => handleSaveContact(duplicateContact.id)}
                >
                  <Text style={styles.updateExistingBtnText}>Update Existing Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>EXTRACTED CONTACT DETAILS</Text>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, (confidences.full_name ?? 1) < 0.7 && styles.lowConfidenceInput]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Job Title & Company */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Job Title</Text>
              <TextInput
                style={[styles.textInput, (confidences.job_title ?? 1) < 0.7 && styles.lowConfidenceInput]}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="e.g. Fleet Superintendent / General Manager"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Company Name</Text>
              <TextInput
                style={[styles.textInput, (confidences.company_name ?? 1) < 0.7 && styles.lowConfidenceInput]}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Eastern Shipping Pte Ltd"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Phones */}
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Mobile Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  placeholder="+65 9123 4567"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Office Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={officePhone}
                  onChangeText={setOfficePhone}
                  placeholder="+65 6234 5678"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email & Website */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="contact@company.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Website</Text>
              <TextInput
                style={styles.textInput}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://company.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
            </View>

            {/* Office Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address / Port Location</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street address, building, postal code"
                placeholderTextColor="#64748B"
                multiline
              />
            </View>

            {/* Other Languages (Chinese/Japanese text) */}
            {otherLang ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Other Languages Text</Text>
                <TextInput
                  style={styles.textInput}
                  value={otherLang}
                  onChangeText={setOtherLang}
                />
              </View>
            ) : null}

            {/* Event Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Met at Event / Location</Text>
              <TextInput
                style={styles.textInput}
                value={eventName}
                onChangeText={setEventName}
                placeholder="e.g. Asia Pacific Maritime (APM) 2026"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Tags */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
              <TextInput
                style={styles.textInput}
                value={tagsText}
                onChangeText={setTagsText}
                placeholder="Superintendent, Tankers, Urgent"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes / Discussion Points</Text>
              <TextInput
                style={[styles.textInput, { height: 64 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Enquired about Sulzer engine cylinder liners..."
                placeholderTextColor="#64748B"
                multiline
              />
            </View>
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={() => handleSaveContact()}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Check color="#FFFFFF" size={18} />
                <Text style={styles.saveBtnText}>Save Scanned Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 5: SUCCESS & POST-SCAN ACTIONS */}
      {step === 'success' && (
        <ScrollView contentContainerStyle={styles.centerPaddedContent}>
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Check color="#10B981" size={36} />
            </View>
            <Text style={styles.successTitle}>Contact Saved!</Text>
            <Text style={styles.successSub}>
              <strong style={{ color: '#FFFFFF' }}>{savedContact?.full_name}</strong> ({savedContact?.company_name}) has been saved to your Cel-Ron contacts database.
            </Text>

            {/* ACTION 1: ADD TO PHONE CONTACTS */}
            <TouchableOpacity
              style={styles.successActionBtn}
              onPress={handleExportToPhone}
              activeOpacity={0.85}
            >
              <UserPlus color="#38BDF8" size={20} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.successActionTitle}>Add to Phone Contacts</Text>
                <Text style={styles.successActionSub}>Export directly into Apple or Google Contacts</Text>
              </View>
            </TouchableOpacity>

            {/* ACTION 2: SEND THEM MY CARD VIA WHATSAPP */}
            {mobilePhone ? (
              <TouchableOpacity
                style={[styles.successActionBtn, { borderColor: '#059669' }]}
                onPress={handleSendCardWhatsApp}
                activeOpacity={0.85}
              >
                <MessageCircle color="#10B981" size={20} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.successActionTitle}>Send Them My Card on WhatsApp</Text>
                  <Text style={styles.successActionSub}>Pre-filled message with your /t/{profile?.staff_slug} link</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* SCAN ANOTHER CARD */}
            <TouchableOpacity
              style={styles.scanAnotherBtn}
              onPress={resetScanner}
              activeOpacity={0.85}
            >
              <Camera color="#FFFFFF" size={18} />
              <Text style={styles.scanAnotherBtnText}>Scan Another Card</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
  headerTitles: {
    flex: 1,
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
  contactsListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F2744',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  contactsListBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  centerPaddedContent: {
    padding: 20,
    justifyContent: 'center',
  },
  captureHeroBox: {
    backgroundColor: '#0A182C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    backgroundColor: '#082542',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 12,
  },
  stepBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  captureHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  captureSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  cardFrameGraphic: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    backgroundColor: '#071526',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  cardFrameText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  captureActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  primaryCaptureBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCaptureBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryCaptureBtn: {
    backgroundColor: '#0F2744',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryCaptureBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  skipBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  batchToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A1728',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#183050',
    padding: 16,
  },
  batchToggleTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  batchToggleSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  batchPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  batchPillActive: {
    backgroundColor: '#D97706',
  },
  batchPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  batchPillTextActive: {
    color: '#FFFFFF',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingBox: {
    backgroundColor: '#0A182C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
  },
  processingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  processingSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbWrapper: {
    flex: 1,
    backgroundColor: '#091524',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#142845',
    padding: 6,
    alignItems: 'center',
  },
  thumbnailImg: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  thumbLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  duplicateTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  duplicateSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  updateExistingBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateExistingBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#0A182C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 16,
    gap: 12,
  },
  formSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
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
  lowConfidenceInput: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#0A182C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#172D4D',
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  successSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  successActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#081729',
    borderWidth: 1,
    borderColor: '#19355E',
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  successActionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successActionSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  scanAnotherBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  scanAnotherBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
