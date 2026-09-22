import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LetterRequest } from '@/store/mockData';

export default function LetterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<LetterRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (id) {
      const data = await api.getLetterRequestByTracking(id);
      setRequest(data);
    }
  }, [id]);

  // Muat ulang data terbaru setiap kali layar Lacak Surat aktif / fokus
  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  useEffect(() => {
    fetchDetail();

    // Berlangganan Supabase Realtime untuk memperbarui alur proses secara instan saat operator desa memproses berkas
    const channel = supabase
      .channel(`detail-letter-realtime-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'letter_requests' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row || row.tracking_number === id || row.id === id) {
            fetchDetail();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  if (!request) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header title="Lacak Surat" showBack />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Memuat data surat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = request.status === 'signed' || request.status === 'completed';

  const handleDownload = () => {
    Alert.alert(
      'Unduh Surat PDF',
      `Surat resmi "${request.letter_name}" dengan Nomor ${request.official_number || 'Registrasi'} berhasil diunduh ke penyimpanan ponsel Anda.`
    );
  };

  const handleShareWa = () => {
    const text = encodeURIComponent(
      `Surat resmi ${request.letter_name} atas nama ${request.citizen_name} (No: ${request.tracking_number}) telah terbit dengan verifikasi QR TTE resmi Pemerintah ${Config.villageName}.`
    );
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title={`Lacak: ${request.tracking_number}`} showBack />

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
        {/* CARD RINGKASAN SURAT */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.trackingText}>{request.tracking_number}</Text>
              <Text style={styles.letterName}>{request.letter_name}</Text>
            </View>
            <StatusBadge statusKey={request.status} />
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nama Pemohon / Subjek</Text>
            <Text style={styles.detailValue}>{request.citizen_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NIK Subjek</Text>
            <Text style={styles.detailValueMono}>{request.citizen_nik}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Keperluan</Text>
            <Text style={styles.detailValue}>{request.purpose}</Text>
          </View>
          {request.official_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>No. Surat Resmi Desa</Text>
              <Text style={styles.detailValueBold}>{request.official_number}</Text>
            </View>
          )}
        </View>

        {/* NOTIFIKASI PENOLAKAN JIKA DITOLAK */}
        {request.status === 'rejected' && (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.rejectionTitle}>Permohonan Tidak Disetujui</Text>
            </View>
            <Text style={styles.rejectionReason}>
              Catatan Petugas: {request.rejection_reason || 'Persyaratan dokumen belum memenuhi ketentuan resmi desa.'}
            </Text>
          </View>
        )}

        {/* TIMELINE PROSES VERIFIKASI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riwayat Proses Verifikasi</Text>
          <View style={styles.timelineContainer}>
            {(Array.isArray(request.timeline) && request.timeline.length > 0 ? request.timeline : [
              { title: 'Permohonan Dikirim Warga', time: request.created_at || 'Baru saja', done: true, actor: 'Warga Pemohon' },
              { title: 'Pemeriksaan Berkas Operator', time: '-', done: false, actor: 'Operator Pelayanan' },
              { title: 'Penerbitan Nomor Resmi Desa', time: '-', done: false, actor: 'Sekretariat Desa' },
              { title: 'Tanda Tangan Elektronik QR Kades', time: '-', done: false, actor: 'Kepala Desa' },
            ]).map((step: { title: string; time: string; done: boolean; actor?: string }, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineIndicator}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.done && styles.timelineDotDone,
                      ]}
                    >
                      {step.done ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={styles.timelineDotPending} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          step.done && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        step.done && styles.timelineTitleDone,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.timelineTime}>{step.time}</Text>
                      {step.actor && (
                        <Text style={styles.timelineActor}>• Oleh: {step.actor}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* PRATINJAU QR CODE TTE & KEABSAHAN SURAT */}
        {isCompleted && (
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <View style={styles.qrHeader}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.qrTitle}>TANDA TANGAN ELEKTRONIK (TTE)</Text>
                  <Text style={styles.qrSubtitle}>Sah & Dikeluarkan oleh Kepala {Config.villageName}</Text>
                </View>
              </View>

              {/* QR Mockup Visual */}
              <View style={styles.qrContainer}>
                <View style={styles.qrVisualBox}>
                  <Ionicons name="qr-code-outline" size={120} color={Colors.primaryDark} />
                  <Text style={styles.qrCodeToken}>TOKEN: {request.qr_token || 'VALID-DEKATI-2026'}</Text>
                </View>
                <Text style={styles.qrNotice}>
                  Pindai QR Code ini untuk mengecek keaslian surat langsung di basis data resmi desa:
                </Text>
                <Text style={styles.qrUrl}>https://desa-sukamaju.desa.id/v/s/{request.qr_token}</Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85} onPress={handleDownload}>
                <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>Unduh Surat Resmi (PDF)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={handleShareWa}>
                <Ionicons name="logo-whatsapp" size={18} color="#15803D" />
                <Text style={styles.shareBtnText}>Bagikan Berkas ke WhatsApp</Text>
              </TouchableOpacity>
            </View>
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryCard: {
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
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackingText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  letterName: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 14,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 19,
  },
  detailValueMono: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailValueBold: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  timelineContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: Colors.primary,
  },
  timelineDotPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: Colors.primary,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timelineTitleDone: {
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 3,
  },
  timelineTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  timelineActor: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  qrSection: {
    marginBottom: Spacing.sectionGap,
  },
  qrBox: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 12,
  },
  qrTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  qrSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  qrVisualBox: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  qrCodeToken: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
  },
  qrNotice: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  qrUrl: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Spacing.radiusFull,
    marginTop: 10,
    gap: 6,
  },
  downloadBtnText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bento.hero.badge,
    paddingVertical: 14,
    borderRadius: Spacing.radiusFull,
    marginTop: 8,
    gap: 6,
  },
  shareBtnText: {
    fontFamily: Fonts.bold,
    color: '#15803D',
    fontSize: 13,
  },
  rejectionCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rejectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#DC2626',
  },
  rejectionReason: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
});
