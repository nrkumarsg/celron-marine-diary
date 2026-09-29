import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

// Configure notification behavior when app is open in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests push notification permissions and registers the Expo push token
 * with the staff member's profile in Supabase.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('visitor-alerts', {
      name: 'Visitor Check-in Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A2540',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;

      console.log('[Push Notification Token]:', token);

      // Save token to Supabase profiles table
      if (isSupabaseConfigured() && token) {
        const { error } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);

        if (error) {
          console.error('Error updating push token in profile:', error);
        } else {
          console.log('Push token successfully registered for user:', userId);
        }
      }
    } catch (err) {
      console.warn('Failed to obtain Expo push token:', err);
    }
  } else {
    console.log('Push notifications require a physical device');
    token = 'SIMULATOR_DEV_TOKEN_' + Date.now();
  }

  return token;
}
