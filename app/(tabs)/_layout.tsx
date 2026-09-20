// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navItemActiveText,
        tabBarInactiveTintColor: Colors.navItemInactiveText,
        tabBarStyle: styles.tabBar,
        tabBarLabel: ({ focused, children, color }) => {
          if (focused) {
            // Sesuai permintaan: Menu aktif HANYA icon saja yang tampil tanpa text/nama menu
            return null;
          }
          return (
            <Text style={[styles.tabBarLabel, { color }]} numberOfLines={1}>
              {children}
            </Text>
          );
        },
        tabBarButton: (props) => {
          const { ref, style, children, ...rest } = props;
          return (
            <Pressable
              ref={ref as any}
              {...rest}
              android_ripple={{
                color: Colors.navItemActiveBg,
                borderless: true,
                radius: 28,
              }}
              style={({ pressed }) => [
                style,
                styles.tabButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              {children}
            </Pressable>
          );
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconActivePill]}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={focused ? 24 : 20}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="surat"
        options={{
          title: 'Surat Warga',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconActivePill]}>
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={focused ? 24 : 20}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="aduan"
        options={{
          title: 'Lapor Aduan',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconActivePill]}>
              <Ionicons
                name={focused ? 'megaphone' : 'megaphone-outline'}
                size={focused ? 24 : 20}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil Warga',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconActivePill]}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={focused ? 24 : 20}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navBarGreenSoft,
    borderTopColor: Colors.navBarGreenBorder,
    borderTopWidth: 1.5,
    height: Platform.OS === 'ios' ? 88 : 66,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabBarLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    marginTop: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  iconActivePill: {
    height: 38,
    minWidth: 56,
    paddingHorizontal: 16,
    backgroundColor: Colors.navItemActiveBg,
    borderWidth: 1.2,
    borderColor: Colors.navItemActiveBorder,
    borderRadius: 19,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
});

