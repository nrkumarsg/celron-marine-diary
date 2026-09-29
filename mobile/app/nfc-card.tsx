import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Radio, ArrowLeft } from 'lucide-react-native';

export default function NfcCardModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBox}>
        <View style={styles.iconCircle}>
          <Radio color="#38BDF8" size={40} />
        </View>
        <Text style={styles.title}>Physical NFC Card</Text>
        <Text style={styles.subtitle}>
          Write your permanent tap link onto NTAG213/215 cards & Android HCE tap emulations (Enabled in Step 6).
        </Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Return to Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06101E', justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerBox: { alignItems: 'center', maxWidth: 320 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#07243B', borderWidth: 1, borderColor: '#0284C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  closeBtn: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0F2744', borderRadius: 14, borderWidth: 1, borderColor: '#1E40AF' },
  closeBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
});
