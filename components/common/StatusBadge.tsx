// components/common/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface StatusBadgeProps {
  statusKey: keyof typeof Colors.status | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ statusKey }) => {
  const statusInfo = (Colors.status as any)[statusKey] || {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1',
    label: statusKey
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusInfo.bg,
          borderColor: statusInfo.border || statusInfo.bg,
        },
      ]}
    >
      <Text style={[styles.text, { color: statusInfo.text }]}>
        {statusInfo.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

