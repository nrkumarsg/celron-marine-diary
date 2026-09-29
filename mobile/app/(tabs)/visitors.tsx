import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Users } from 'lucide-react-native';

export default function VisitorsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBox}>
        <View style={styles.iconCircle}>
          <Users color="#10B981" size={40} />
        </View>
        <Text style={styles.title}>Reception Visitor Diary</Text>
        <Text style={styles.subtitle}>
          Realtime office check-ins via WhatsApp QR and web fallback form (Enabled in Step 8 & 9).
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06101E', justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerBox: { alignItems: 'center', maxWidth: 320 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#06281D', borderWidth: 1, borderColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
