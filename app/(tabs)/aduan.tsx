// app/(tabs)/aduan.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Complaint } from '@/store/mockData';

export default function AduanScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'saya'>('semua');
  const [refreshing, setRefreshing] = useState(false);

  const loadComplaints = async () => {
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComplaints();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.headerTitle}>Lapor Masalah & Aspirasi</Text>
            <Text style={styles.headerSubtitle}>
              Saluran resmi partisipasi & pengawasan fasilitas warga desa
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/complaints/create' as any)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Buat Laporan</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeFilter === 'semua' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter('semua')}
          >
            <Text style={[styles.tabText, activeFilter === 'semua' && styles.tabTextActive]}>
              Aduan Publik ({complaints.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeFilter === 'saya' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter('saya')}
          >
            <Text style={[styles.tabText, activeFilter === 'saya' && styles.tabTextActive]}>
              Laporan Saya
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Info Box Minimalis */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Ionicons name="information-circle" size={18} color={Colors.secondary} />
          </View>
          <Text style={styles.infoBoxText}>
            Setiap aduan yang masuk dipantau langsung oleh Kepala Desa dan diteruskan otomatis ke pelaksana teknis terkait.
          </Text>
        </View>

        {complaints.map((item) => {
          const isResolved = item.status === 'resolved';
          const isInProgress = item.status === 'in_progress';

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isResolved && styles.statusResolved,
                    isInProgress && styles.statusInProgress,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isResolved && styles.statusTextResolved,
                      isInProgress && styles.statusTextInProgress,
                    ]}
                  >
                    {isResolved ? 'Selesai Ditangani' : isInProgress ? 'Sedang Dikerjakan' : 'Laporan Masuk'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>

              {/* Location pill */}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={15} color={Colors.urgent} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>

              {/* Resolution proof */}
              {isResolved && item.resolution_proof && (
                <View style={styles.proofContainer}>
                  <View style={styles.proofHeader}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
                    <Text style={styles.proofTitle}>Tindak Lanjut Aparatur Desa:</Text>
                  </View>
                  <Text style={styles.proofText}>{item.resolution_proof}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.reporterText}>
                  Pelapor: {item.is_anonymous ? 'Warga Desa (Anonim)' : item.reporter_name}
                </Text>
                <Text style={styles.dateText}>{item.created_at}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.appBarYellow,
  },
  header: {
    backgroundColor: Colors.appBarYellow,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.appBarYellowBorder,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: '#713F12',
    marginTop: 3,
    lineHeight: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.urgent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radiusMd,
    padding: 3,
    borderWidth: 1.5,
    borderColor: Colors.appBarYellowBorder,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Spacing.radiusSm,
  },
  tabButtonActive: {
    backgroundColor: Colors.tabActiveYellow,
    borderWidth: 1,
    borderColor: Colors.tabActiveYellowBorder,
    shadowColor: Colors.tabActiveYellowText,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  tabTextActive: {
    fontFamily: Fonts.extraBold,
    color: Colors.tabActiveYellowText,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 36,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.bento.blue.border,
    padding: 14,
    borderRadius: Spacing.radiusLg,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.bento.blue.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBoxText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  ticketNumber: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusInProgress: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#92400E',
  },
  statusTextInProgress: {
    color: '#0369A1',
  },
  statusTextResolved: {
    color: '#14532D',
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 6,
    lineHeight: 22,
  },
  cardDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 10,
    borderRadius: Spacing.radiusMd,
    gap: 6,
  },
  locationText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.textPrimary,
    flex: 1,
  },
  proofContainer: {
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    marginTop: 12,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 5,
  },
  proofTitle: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.primaryDark,
  },
  proofText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  reporterText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  dateText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
