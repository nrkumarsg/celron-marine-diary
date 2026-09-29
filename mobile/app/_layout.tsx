import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

function RootNavigation() {
  const { profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!profile && !inAuthGroup) {
      // User is not signed in and not on login screen -> redirect to login
      router.replace('/(auth)/login');
    } else if (profile && inAuthGroup) {
      // User is signed in but on login screen -> redirect to tabs home
      router.replace('/(tabs)');
    }
  }, [profile, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06101E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#06101E' } }}>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="nfc-card" options={{ presentation: 'modal', headerShown: true, title: 'My NFC Card', headerTintColor: '#fff', headerStyle: { backgroundColor: '#0A2540' } }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
