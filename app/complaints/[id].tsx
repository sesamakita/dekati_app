// app/complaints/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Header } from '@/components/common/Header';
import { api } from '@/services/api';
import { Complaint } from '@/store/mockData';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const [complaint, setComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    const fetchComplaint = async () => {
      const all = await api.getComplaints();
      const found = all.find((c) => c.ticket_number === id || c.id === id) || all[0];
      setComplaint(found);
    };
    fetchComplaint();
  }, [id]);

  if (!complaint) return null;

  const isResolved = complaint.status === 'resolved';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title={`Aduan: ${complaint.ticket_number}`} showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{complaint.category}</Text>
          </View>

          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.desc}>{complaint.description}</Text>

          <View style={styles.locationBox}>
            <Ionicons name="location" size={16} color={Colors.urgent} />
            <Text style={styles.locationText}>{complaint.location}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Pelapor: {complaint.is_anonymous ? 'Warga (Anonim)' : complaint.reporter_name}
            </Text>
            <Text style={styles.metaText}>{complaint.created_at}</Text>
          </View>
        </View>

        {isResolved && complaint.resolution_proof && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              <Text style={styles.proofTitle}>Bukti Tindak Lanjut Petugas:</Text>
            </View>
            <Text style={styles.proofText}>{complaint.resolution_proof}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.appBarYellow,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: Spacing.cardGap,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    marginBottom: 14,
    gap: 6,
  },
  locationText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 12,
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  proofCard: {
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusXl,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  proofTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
  proofText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
