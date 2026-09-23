// app/(tabs)/aduan.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Complaint, Citizen } from '@/store/mockData';

export default function AduanScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'saya'>('semua');
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<Citizen | null>(null);
  const [myTickets, setMyTickets] = useState<string[]>([]);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = useState<boolean>(true);

  // Muat data awal aduan, pengguna aktif, dan riwayat tiket lokal
  const loadData = async () => {
    try {
      const [userData, tickets, complaintsData] = await Promise.all([
        api.getCurrentUser(),
        api.getMyComplaintTickets(),
        api.getComplaints(),
      ]);
      setCurrentUser(userData);
      setMyTickets(tickets);
      setComplaints(complaintsData);
    } catch (e) {
      console.warn('[Aduan] Error loading initial complaints:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData();

    // Inisialisasi Supabase Realtime Channel
    const channel = supabase
      .channel('public:complaints:mobile-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'INSERT') {
            const d: any = payload.new;
            let parsedPhotos: string[] = [];
            if (d.photo_url) {
              const rawUrl = d.photo_url.trim();
              if (rawUrl.startsWith('[') && rawUrl.endsWith(']')) {
                try {
                  const arr = JSON.parse(rawUrl);
                  if (Array.isArray(arr)) parsedPhotos = arr;
                } catch {
                  parsedPhotos = [rawUrl];
                }
              } else if (rawUrl.includes(',')) {
                parsedPhotos = rawUrl.split(',').map((s: string) => s.trim()).filter(Boolean);
              } else {
                parsedPhotos = [rawUrl];
              }
            }

            const newComplaint: Complaint = {
              id: d.id,
              ticket_number: d.ticket_number,
              category: d.category,
              title: d.title,
              description: d.description,
              location: d.location_address || d.location || 'Desa Sukamaju',
              reporter_name: d.is_anonymous ? 'Warga Desa (Anonim)' : d.reporter_name,
              is_anonymous: !!d.is_anonymous,
              status: d.status,
              photo_url: parsedPhotos[0] || d.photo_url || undefined,
              photo_urls: parsedPhotos.length > 0 ? parsedPhotos : undefined,
              resolution_proof: d.resolution_proof,
              resolution_notes: d.resolution_notes,
              assigned_department: d.assigned_department,
              assigned_officer: d.assigned_officer,
              citizen_id: d.citizen_id,
              citizen_nik: d.citizen_nik,
              resolved_at: d.resolved_at,
              created_at: d.created_at
                ? new Date(d.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Hari ini',
            };

            setComplaints((prev) => {
              if (prev.some((c) => c.id === newComplaint.id || c.ticket_number === newComplaint.ticket_number)) {
                return prev;
              }
              return [newComplaint, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const d: any = payload.new;
            let parsedPhotos: string[] = [];
            if (d.photo_url) {
              const rawUrl = d.photo_url.trim();
              if (rawUrl.startsWith('[') && rawUrl.endsWith(']')) {
                try {
                  const arr = JSON.parse(rawUrl);
                  if (Array.isArray(arr)) parsedPhotos = arr;
                } catch {
                  parsedPhotos = [rawUrl];
                }
              } else if (rawUrl.includes(',')) {
                parsedPhotos = rawUrl.split(',').map((s: string) => s.trim()).filter(Boolean);
              } else {
                parsedPhotos = [rawUrl];
              }
            }

            setComplaints((prev) =>
              prev.map((c) => {
                if (c.id === d.id || c.ticket_number === d.ticket_number) {
                  return {
                    ...c,
                    status: d.status,
                    category: d.category || c.category,
                    title: d.title || c.title,
                    description: d.description || c.description,
                    resolution_proof: d.resolution_proof,
                    resolution_notes: d.resolution_notes,
                    assigned_department: d.assigned_department,
                    assigned_officer: d.assigned_officer,
                    resolved_at: d.resolved_at,
                    photo_url: parsedPhotos[0] || d.photo_url || c.photo_url,
                    photo_urls: parsedPhotos.length > 0 ? parsedPhotos : c.photo_urls,
                  };
                }
                return c;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const d: any = payload.old;
            setComplaints((prev) => prev.filter((c) => c.id !== d.id));
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          setRealtimeActive(status === 'SUBSCRIBED');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Fungsi pengecekan kepemilikan aduan oleh pengguna (mendukung hybrid: tiket lokal, citizen_id, NIK, nama pelapor)
  const isMyComplaint = (item: Complaint): boolean => {
    // 1. Cek dari daftar nomor tiket yang tersimpan di perangkat lokal
    if (myTickets.includes(item.ticket_number)) {
      return true;
    }

    // 2. Cek relasi akun pengguna yang sedang login
    if (currentUser) {
      if (item.citizen_id && item.citizen_id === currentUser.id) return true;
      if (item.citizen_nik && item.citizen_nik === currentUser.nik) return true;
      if (
        !item.is_anonymous &&
        item.reporter_name &&
        currentUser.nama_lengkap &&
        item.reporter_name.trim().toLowerCase() === currentUser.nama_lengkap.trim().toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  };

  // Daftar aduan milik saya
  const myComplaints = useMemo(() => {
    return complaints.filter(isMyComplaint);
  }, [complaints, myTickets, currentUser]);

  // Daftar aduan yang ditampilkan berdasarkan tab aktif
  const displayedComplaints = activeFilter === 'saya' ? myComplaints : complaints;

  // Ekstraksi list foto untuk ditampilkan pada kartu
  const getCardPhotos = (item: Complaint): string[] => {
    if (item.photo_urls && item.photo_urls.length > 0) {
      return item.photo_urls;
    }
    if (item.photo_url) {
      const raw = item.photo_url.trim();
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Lapor Masalah & Aspirasi</Text>
              {realtimeActive && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Realtime</Text>
                </View>
              )}
            </View>
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
              Laporan Saya ({myComplaints.length})
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
            Setiap aduan yang masuk dipantau langsung oleh Kepala Desa dan diteruskan otomatis ke pelaksana teknis terkait secara real-time.
          </Text>
        </View>

        {/* EMPTY STATE JIKA TAB KOSONG */}
        {displayedComplaints.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={activeFilter === 'saya' ? 'chatbubble-ellipses-outline' : 'document-text-outline'}
                size={40}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'saya' ? 'Belum Ada Laporan Anda' : 'Belum Ada Aduan Warga'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'saya'
                ? 'Semua laporan atau aspirasi yang Anda kirim (termasuk laporan anonim) akan dipantau secara realtime di sini.'
                : 'Belum ada aduan publik yang dilaporkan warga. Jadilah yang pertama melaporkan kondisi fasilitas desa.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/complaints/create' as any)}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Kirim Aduan Baru</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedComplaints.map((item) => {
            const isResolved = item.status === 'resolved';
            const isInProgress = item.status === 'in_progress';
            const isMine = isMyComplaint(item);
            const cardPhotos = getCardPhotos(item);

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
                      {isMine && (
                        <View style={styles.myBadge}>
                          <Text style={styles.myBadgeText}>Laporan Anda</Text>
                        </View>
                      )}
                    </View>
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

                {/* GALERI FOTO BUKTI LAPANGAN */}
                {cardPhotos.length > 0 && (
                  <View style={styles.photosWrapper}>
                    <View style={styles.photosHeader}>
                      <Ionicons name="camera-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.photosLabel}>Foto Bukti di Lapangan ({cardPhotos.length}):</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {cardPhotos.map((uri, idx) => (
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

                {/* Lokasi Kejadian */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={15} color={Colors.urgent} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>

                {/* TINDAK LANJUT APARATUR DESA */}
                {(isResolved || item.resolution_proof || item.resolution_notes) && (
                  <View style={styles.proofContainer}>
                    <View style={styles.proofHeader}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      <Text style={styles.proofTitle}>Tindak Lanjut Aparatur Desa:</Text>
                    </View>
                    {item.resolution_notes && (
                      <Text style={styles.proofText}>{item.resolution_notes}</Text>
                    )}
                    {item.resolution_proof && !item.resolution_notes && (
                      <Text style={styles.proofText}>{item.resolution_proof}</Text>
                    )}
                    {item.assigned_department && (
                      <Text style={styles.assignedText}>
                        Pelaksana: {item.assigned_department} {item.assigned_officer ? `(${item.assigned_officer})` : ''}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.reporterText}>
                    Pelapor:{' '}
                    {item.is_anonymous
                      ? isMine
                        ? 'Anda (Dilaporkan secara Anonim)'
                        : 'Warga Desa (Anonim)'
                      : isMine
                      ? `Anda (${item.reporter_name})`
                      : item.reporter_name}
                  </Text>
                  <Text style={styles.dateText}>{item.created_at}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FULLSCREEN IMAGE MODAL PREVIEW */}
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#15803D',
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
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radiusXl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: Spacing.radiusFull,
    gap: 8,
  },
  emptyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
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
  myBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  myBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#92400E',
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
  photosWrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  photosLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  photoThumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 10,
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
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    padding: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
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
  assignedText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 4,
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
    flex: 1,
    marginRight: 6,
  },
  dateText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
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
