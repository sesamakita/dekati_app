// app/index.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { auth } from '@/services/auth';
import { Colors } from '@/constants/Colors';

export default function Index() {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await auth.getStoredSession();
        if (session && session.citizen) {
          setDestination('/(tabs)');
        } else {
          setDestination('/(auth)/login');
        }
      } catch {
        setDestination('/(auth)/login');
      }
    };
    checkSession();
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}
