import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { ShieldCheck, Anchor, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react-native';

export default function LoginScreen() {
  const { login, useDemoStaff, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter your company email address');
      return;
    }

    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleQuickDemo = async (slug: string) => {
    setErrorMsg('');
    setIsSubmitting(true);
    await useDemoStaff(slug);
    setIsSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* BRANDING HEADER */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Anchor color="#38BDF8" size={36} strokeWidth={2.5} />
          </View>
          <Text style={styles.companyName}>Cel-Ron Enterprises</Text>
          <Text style={styles.companySub}>Marine Spare Parts • Singapore</Text>
          <Text style={styles.portalTag}>STAFF & OPERATIONS PORTAL</Text>
        </View>

        {/* LOGIN FORM CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Access your digital cards, scanner & visitor diary
          </Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Email</Text>
            <View style={styles.inputWrapper}>
              <Mail color="#94A3B8" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="staff@celron.com.sg"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock color="#94A3B8" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, (isSubmitting || isLoading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting || isLoading}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <ArrowRight color="#FFFFFF" size={18} />
              </>
            )}
          </TouchableOpacity>

          {/* QUICK DEMO LOGIN BUTTONS */}
          <View style={styles.quickAccessSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>QUICK PREVIEW ACCOUNTS</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleQuickDemo('ronald-tan')}
              activeOpacity={0.7}
            >
              <UserCheck color="#38BDF8" size={18} />
              <Text style={styles.demoButtonText}>Ronald Tan (Sales Director)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleQuickDemo('celine-lim')}
              activeOpacity={0.7}
            >
              <UserCheck color="#818CF8" size={18} />
              <Text style={styles.demoButtonText}>Celine Lim (Tech Specialist)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.demoAdminButton]}
              onPress={() => handleQuickDemo('admin')}
              activeOpacity={0.7}
            >
              <ShieldCheck color="#34D399" size={18} />
              <Text style={styles.demoButtonText}>Cel-Ron Operations Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <ShieldCheck color="#10B981" size={14} />
          <Text style={styles.footerText}>Singapore PDPA Compliant & Encrypted</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06101E',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0F2744',
    borderWidth: 1.5,
    borderColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  companySub: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '500',
  },
  portalTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  card: {
    backgroundColor: '#0F1A2C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E2E48',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    marginBottom: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091322',
    borderWidth: 1,
    borderColor: '#1E2E48',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  quickAccessSection: {
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2E48',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B1626',
    borderWidth: 1,
    borderColor: '#1E2E48',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  demoAdminButton: {
    borderColor: '#065F46',
    backgroundColor: '#06201A',
  },
  demoButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
  },
});
