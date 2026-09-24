import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LetterType, LetterRequest } from '@/store/mockData';

export default function SuratScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'katalog' | 'riwayat'>('katalog');
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);
  const [requests, setRequests] = useState<LetterRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const types = await api.getLetterTypes();
      const reqs = await api.getLetterRequests();
      setLetterTypes(types);
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    }
  };

  // Muat data setiap kali tab Surat dibuka / menjadi fokus aktif
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Berlangganan Realtime Supabase agar status permohonan langsung terupdate jika admin web memprosesnya
  useEffect(() => {
    loadData();

    let channel: any = null;
    try {
      const channelName = `mobile-surat-realtime-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'letter_requests' },
          () => {
            loadData();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[Surat] Realtime channel setup error:', e);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Layanan Administrasi Surat</Text>
        <Text style={styles.headerSubtitle}>
          Urus surat keterangan mandiri atau anggota keluarga tanpa antre
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'katalog' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('katalog')}
          >
            <Text style={[styles.tabText, activeTab === 'katalog' && styles.tabTextActive]}>
              Katalog Surat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'riwayat' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('riwayat')}
          >
            <Text style={[styles.tabText, activeTab === 'riwayat' && styles.tabTextActive]}>
              Riwayat Pengajuan ({requests.length})
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
        {activeTab === 'katalog' ? (
          <View>
            <View style={styles.infoBanner}>
              <View style={styles.infoIconBox}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.infoText}>
                Semua surat digital dilengkapi <Text style={{ fontFamily: Fonts.bold }}>QR Code Resmi TTE</Text> yang diakui instansi bank, kepolisian, dan dinas.
              </Text>
            </View>

            <Text style={styles.sectionHeading}>Daftar Surat Tersedia</Text>

            {letterTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.letterCard}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: '/letters/create',
                    params: { typeId: type.id },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.cardTitleBox}>
                    <Text style={styles.letterTitle}>{type.name}</Text>
                    <View style={styles.estimateTag}>
                      <Ionicons name="time-outline" size={12} color={Colors.primaryDark} />
                      <Text style={styles.estimateText}>Proses ~{type.estimated_days} Hari Kerja</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.letterDesc}>{type.description}</Text>

                <View style={styles.reqDocsContainer}>
                  <Text style={styles.reqDocsHeading}>Syarat Dokumen:</Text>
                  {type.required_docs.map((doc, idx) => (
                    <Text key={idx} style={styles.reqDocItem}>
                      • {doc}
                    </Text>
                  ))}
                </View>

                <View style={styles.actionRow}>
                  <View style={styles.ajukanBtn}>
                    <Text style={styles.ajukanBtnText}>Ajukan Sekarang</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View>
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="file-tray-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Pengajuan Surat</Text>
                <Text style={styles.emptyDesc}>
                  Pilih salah satu jenis surat di tab Katalog Surat untuk memulai pengajuan baru.
                </Text>
              </View>
            ) : (
              requests.map((req) => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.requestCard}
                  activeOpacity={0.88}
                  onPress={() => router.push(`/letters/${req.tracking_number}` as any)}
                >
                  <View style={styles.reqCardTop}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.reqTracking}>{req.tracking_number}</Text>
                      <Text style={styles.reqName}>{req.letter_name}</Text>
                      <Text style={styles.reqSubject}>Pemohon: {req.citizen_name}</Text>
                    </View>
                    <StatusBadge statusKey={req.status} />
                  </View>

                  <Text style={styles.reqPurpose} numberOfLines={2}>
                    Keperluan: {req.purpose}
                  </Text>

                  <View style={styles.reqCardBottom}>
                    <Text style={styles.reqDate}>{req.created_at}</Text>
                    <View style={styles.trackAction}>
                      <Text style={styles.trackActionText}>Lacak Dokumen</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
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
  header: {
    backgroundColor: Colors.appBarYellow,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.appBarYellowBorder,
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
    marginBottom: 16,
    lineHeight: 18,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
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
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  sectionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  letterCard: {
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
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Spacing.radiusMd,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  letterTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  estimateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  estimateText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  letterDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  reqDocsContainer: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  reqDocsHeading: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reqDocItem: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  ajukanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Spacing.radiusFull,
    gap: 6,
  },
  ajukanBtnText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  requestCard: {
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
  reqCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reqTracking: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.primary,
    marginBottom: 2,
  },
  reqName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  reqSubject: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reqPurpose: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  reqCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  reqDate: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  trackAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackActionText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
