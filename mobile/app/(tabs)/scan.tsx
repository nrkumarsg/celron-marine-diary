import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { ScanLine } from 'lucide-react-native';

export default function ScanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBox}>
        <View style={styles.iconCircle}>
          <ScanLine color="#F59E0B" size={40} />
        </View>
        <Text style={styles.title}>AI Card Scanner</Text>
        <Text style={styles.subtitle}>
          Front and back business card capture with Gemini Flash AI extraction (Enabled in Step 7).
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06101E', justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerBox: { alignItems: 'center', maxWidth: 320 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#2B1A04', borderWidth: 1, borderColor: '#B45309', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
