// app/complaints/[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
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
import { supabase } from '@/services/supabase';
import { Complaint } from '@/store/mockData';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    try {
      const all = await api.getComplaints();
      const found = all.find((c) => c.ticket_number === id || c.id === id) || all[0];
      setComplaint(found || null);
    } catch (e) {
      console.warn('[ComplaintDetail] Gagal memuat data:', e);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();

    // Supabase Realtime Listener
    let channel: any = null;
    try {
      const channelName = `complaint-detail-${id || 'live'}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'complaints' },
          (payload) => {
            const raw = (payload.new || payload.old) as any;
            if (!raw || raw.ticket_number === id || raw.id === id) {
              fetchComplaint();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ComplaintDetail] Realtime channel setup error:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id, fetchComplaint]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaint();
    setRefreshing(false);
  };

  if (!complaint) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header title="Detail Aduan" showBack />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Memuat data aduan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isResolved = complaint.status === 'resolved';
  const isInProgress = complaint.status === 'in_progress';

  // Ekstraksi list foto bukti lapangan
  const getPhotos = (): string[] => {
    if (complaint.photo_urls && complaint.photo_urls.length > 0) {
      return complaint.photo_urls;
    }
    if (complaint.photo_url) {
      const raw = complaint.photo_url.trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return [raw];
        }
      }
      return [raw];
    }
    return [];
  };

  const photos = getPhotos();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title={`Aduan: ${complaint.ticket_number}`} showBack />

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
        {/* CARD UTAMA ADUAN */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{complaint.category}</Text>
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

          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.desc}>{complaint.description}</Text>

          {/* GALERI FOTO BUKTI LAPANGAN */}
          {photos.length > 0 && (
            <View style={styles.photosWrapper}>
              <View style={styles.photosHeader}>
                <Ionicons name="camera-outline" size={15} color={Colors.textSecondary} />
                <Text style={styles.photosLabel}>Foto Bukti Kondisi Lapangan ({photos.length}):</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {photos.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.85}
                    onPress={() => setPreviewImageUri(uri)}
                    style={styles.photoThumbWrapper}
                  >
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <View style={styles.zoomBadge}>
                      <Ionicons name="expand-outline" size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Lokasi Patokan */}
          <View style={styles.locationBox}>
            <Ionicons name="location" size={16} color={Colors.urgent} />
            <Text style={styles.locationText}>{complaint.location}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Pelapor: {complaint.is_anonymous ? 'Warga Desa (Anonim)' : complaint.reporter_name}
            </Text>
            <Text style={styles.metaText}>{complaint.created_at}</Text>
          </View>
        </View>

        {/* BUKTI & CATATAN TINDAK LANJUT PETUGAS */}
        {(isResolved || complaint.resolution_proof || complaint.resolution_notes) && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              <Text style={styles.proofTitle}>Tindak Lanjut Aparatur Desa:</Text>
            </View>

            {complaint.resolution_notes && (
              <Text style={styles.proofText}>{complaint.resolution_notes}</Text>
            )}

            {complaint.resolution_proof && !complaint.resolution_notes && (
              <Text style={styles.proofText}>{complaint.resolution_proof}</Text>
            )}

            {/* Jika resolution_proof adalah link foto perbaikan fisik */}
            {complaint.resolution_proof &&
              (complaint.resolution_proof.startsWith('http') || complaint.resolution_proof.startsWith('data:')) && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPreviewImageUri(complaint.resolution_proof || null)}
                  style={styles.proofImageWrapper}
                >
                  <Image source={{ uri: complaint.resolution_proof }} style={styles.proofImage} />
                  <View style={styles.zoomBadgeLarge}>
                    <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.zoomText}>Lihat Bukti Foto Selesai</Text>
                  </View>
                </TouchableOpacity>
              )}

            {complaint.assigned_department && (
              <View style={styles.assignedBox}>
                <Ionicons name="person-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.assignedText}>
                  Pelaksana: {complaint.assigned_department}
                  {complaint.assigned_officer ? ` (${complaint.assigned_officer})` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL PRATINJAU FOTO LAYAR PENUH */}
      <Modal
        visible={!!previewImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setPreviewImageUri(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
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
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 25,
    marginBottom: 8,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  photosWrapper: {
    marginBottom: 14,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  photosLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  photoThumbWrapper: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    gap: 8,
    marginBottom: 14,
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
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  proofCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
    padding: 16,
    borderRadius: Spacing.radiusXl,
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  proofTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.primaryDark,
  },
  proofText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  proofImageWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: 8,
    marginBottom: 8,
    position: 'relative',
  },
  proofImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  zoomBadgeLarge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  assignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  assignedText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 99,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
});
