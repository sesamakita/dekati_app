// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts, Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Citizen, LetterRequest, Announcement, EmergencyContact, VillageEvent } from '@/store/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

// Key penyimpanan status pengumuman yang telah dibaca
const STORAGE_KEY_READ_ANNOUNCEMENTS = '@dekatip_read_announcements';

// Menyimpan ID pengumuman penting yang sudah pernah ditampilkan popup modalnya dalam sesi ini
const seenUrgentAnnouncementIds = new Set<string>();

export default function HomeScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<Citizen | null>(authUser);
  const [latestLetter, setLatestLetter] = useState<LetterRequest | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [apbdesData, setApbdesData] = useState<any>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [villageEvents, setVillageEvents] = useState<VillageEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VillageEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [isUrgentExpanded, setIsUrgentExpanded] = useState(false);
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());

  // Muat status pengumuman yang telah dibaca dari AsyncStorage
  useEffect(() => {
    const loadReadStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_READ_ANNOUNCEMENTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadAnnouncementIds(new Set(parsed));
          }
        }
      } catch (e) {
        console.warn('Failed to load read announcements', e);
      }
    };
    loadReadStatus();
  }, []);

  const markAsRead = (id: string) => {
    if (!id) return;
    setReadAnnouncementIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(
        STORAGE_KEY_READ_ANNOUNCEMENTS,
        JSON.stringify(Array.from(next))
      ).catch((err) => console.warn('Failed to save read announcement', err));
      return next;
    });
  };

  const handleCloseUrgentModal = () => {
    setShowUrgentModal(false);
    setIsUrgentExpanded(false);
    setSelectedNews(null);
  };

  const loadData = async () => {
    try {
      const [userData, letters, news, apbdes, emg, evts] = await Promise.all([
        authUser || api.getCurrentUser(),
        api.getLetterRequests(),
        api.getAnnouncements(),
        api.getApbdes(),
        api.getEmergencyContacts(),
        api.getVillageEvents(),
      ]);

      setUser(userData);
      setLatestLetter(letters.length > 0 ? letters[0] : null);
      setAnnouncements(news);
      setApbdesData(apbdes);
      setEmergencyContacts(emg);
      setVillageEvents(evts);

      // Tampilkan popup/modal pertama kali hanya jika ada 'Pengumuman Penting' (is_urgent)
      const urgent = news.find((a) => a.is_urgent);
      if (urgent && !seenUrgentAnnouncementIds.has(urgent.id)) {
        seenUrgentAnnouncementIds.add(urgent.id);
        setSelectedNews(urgent);
        setIsUrgentExpanded(false);
        setShowUrgentModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    loadData();

    // Realtime Supabase updates: pengumuman, surat, kontak darurat, dan agenda baru langsung tampil di mobile
    let channel: any = null;
    try {
      const chName = `mobile-home-live-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      channel = supabase
        .channel(chName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          () => loadData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'letter_requests' },
          () => loadData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_contacts' },
          () => loadData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'village_events' },
          () => loadData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'apbdes_items' },
          () => loadData()
        )
        .subscribe();
    } catch (err) {
      console.warn('[Home] Channel setup error:', err);
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

  const urgentNews = announcements.find((a) => a.is_urgent);
  const activeModalNews = selectedNews || urgentNews;
  const isUrgentRead = urgentNews ? readAnnouncementIds.has(urgentNews.id) : false;
  const hasUnreadAnnouncements = announcements.some(
    (a) => !readAnnouncementIds.has(a.id)
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* STATIC FIXED APPBAR (UKURAN IDENTIK PROFIL KEPENDUDUKAN) */}
      <View style={styles.staticAppBar}>
        <TouchableOpacity
          style={styles.appBarUser}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/profil')}
        >
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user ? user.nama_lengkap.slice(0, 2).toUpperCase() : 'AS'}
              </Text>
            </View>
            {user?.is_verified && <View style={styles.onlineBadge} />}
          </View>

          <View style={styles.appBarTextContainer}>
            <Text style={styles.appBarTitle} numberOfLines={1}>
              Halo, {user ? user.nama_lengkap.split(' ')[0] : 'Warga'} 👋
            </Text>
            <Text style={styles.appBarSubtitle} numberOfLines={1}>
              {Config.villageName} • RT {user?.rt || '02'}/RW {user?.rw || '01'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.appBarActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/profil')}
          >
            <Ionicons name="qr-code-outline" size={19} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={19} color={Colors.textPrimary} />
            {hasUnreadAnnouncements && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE DASHBOARD CONTENT */}
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

        {/* URGENT NOTICE (IF ANY) */}
        {urgentNews && (
          <TouchableOpacity
            style={styles.urgentBento}
            activeOpacity={0.88}
            onPress={() => {
              setSelectedNews(urgentNews);
              setIsUrgentExpanded(false);
              setShowUrgentModal(true);
            }}
          >
            <View style={styles.urgentHeaderRow}>
              <View style={styles.urgentBadge}>
                <Ionicons name="warning" size={13} color={Colors.urgent} />
                <Text style={styles.urgentBadgeText}>PENGUMUMAN PENTING</Text>
              </View>
              <View style={styles.urgentHeaderRight}>
                <Text style={styles.urgentDate}>{urgentNews.date}</Text>
                <View
                  style={
                    isUrgentRead ? styles.readStatusBadge : styles.unreadStatusBadge
                  }
                >
                  <Ionicons
                    name={isUrgentRead ? 'checkmark-done' : 'mail-unread'}
                    size={11}
                    color={isUrgentRead ? '#16A34A' : Colors.urgent}
                  />
                  <Text
                    style={
                      isUrgentRead ? styles.readStatusText : styles.unreadStatusText
                    }
                  >
                    {isUrgentRead ? 'Dibaca' : 'Belum Dibaca'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.urgentTitle}>{urgentNews.title}</Text>
            <Text style={styles.urgentDesc} numberOfLines={2}>
              {urgentNews.summary}
            </Text>
            <View style={styles.urgentActionRow}>
              <Text style={styles.urgentActionText}>Ketuk untuk lihat detail & instruksi lengkap</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.urgent} />
            </View>
          </TouchableOpacity>
        )}

        {/* SECTION: KABAR & INFORMASI DESA (HORIZONTAL SLIDER / BISA USAP) */}
        {announcements.length > 0 && (
          <View style={styles.newsSection}>
            <View style={styles.newsSectionHeader}>
              <View>
                <Text style={styles.sectionHeadingNoMargin}>Kabar Desa Terkini</Text>
                <Text style={styles.sectionSub}>Informasi & agenda resmi dari pemerintah desa</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Semua</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsHorizontalScroll}
              decelerationRate="fast"
              snapToInterval={292}
              snapToAlignment="start"
            >
              {announcements.map((news) => (
                <TouchableOpacity
                  key={news.id}
                  style={styles.newsBentoCardHorizontal}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedNews(news);
                    markAsRead(news.id);
                    setIsUrgentExpanded(true);
                    setShowUrgentModal(true);
                  }}
                >
                  <View>
                    <View style={styles.newsTopRow}>
                      <View
                        style={[
                          styles.newsCategoryChip,
                          news.is_urgent && {
                            backgroundColor: Colors.urgentLight,
                            borderColor: '#FECDD3',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.newsCategoryText,
                            news.is_urgent && { color: Colors.urgent },
                          ]}
                        >
                          {news.category}
                        </Text>
                      </View>
                      <View style={styles.newsTopRightRow}>
                        <View style={styles.newsDateRow}>
                          <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                          <Text style={styles.newsDateText}>{news.date}</Text>
                        </View>
                        <View
                          style={
                            readAnnouncementIds.has(news.id)
                              ? styles.readStatusBadge
                              : styles.unreadStatusBadge
                          }
                        >
                          <Ionicons
                            name={
                              readAnnouncementIds.has(news.id)
                                ? 'checkmark-done'
                                : 'mail-unread'
                            }
                            size={11}
                            color={
                              readAnnouncementIds.has(news.id)
                                ? '#16A34A'
                                : Colors.urgent
                            }
                          />
                          <Text
                            style={
                              readAnnouncementIds.has(news.id)
                                ? styles.readStatusText
                                : styles.unreadStatusText
                            }
                          >
                            {readAnnouncementIds.has(news.id) ? 'Dibaca' : 'Baru'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.newsTitle} numberOfLines={2}>
                      {news.title}
                    </Text>
                    <Text style={styles.newsSummary} numberOfLines={2}>
                      {news.summary}
                    </Text>
                  </View>
                  <View style={styles.newsFooterRow}>
                    <Text style={styles.newsAuthor} numberOfLines={1}>
                      Oleh: {news.author}
                    </Text>
                    <View style={styles.readMoreRow}>
                      <Text style={styles.readMoreText}>Baca Info</Text>
                      <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BENTO GRID CONTAINER */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionHeading}>Layanan & Akses Desa</Text>

          {/* BENTO ITEM 1: HERO CARD (URUS SURAT MANDIRI) */}
          <TouchableOpacity
            style={styles.bentoHero}
            activeOpacity={0.88}
            onPress={() => router.push('/(tabs)/surat')}
          >
            <View style={styles.bentoHeroTop}>
              <View style={styles.heroBadge}>
                <Ionicons name="flash" size={12} color={Colors.primary} />
                <Text style={styles.heroBadgeText}>Layanan Favorit Warga</Text>
              </View>
              <View style={styles.heroIconCircle}>
                <Ionicons name="document-text" size={24} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.heroTitle}>Buat Surat Keterangan</Text>
            <Text style={styles.heroDesc}>
              Pengajuan mandiri dari HP, bebas antre, tanda tangan digital TTE & QR Code resmi.
            </Text>

            {/* Quick Letter Chips */}
            <View style={styles.heroChipsContainer}>
              <View style={styles.heroChip}>
                <Ionicons name="home-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.heroChipText}>Domisili</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="briefcase-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.heroChipText}>Usaha (SKU)</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="heart-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.heroChipText}>SKTM</Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroActionText}>Mulai Pengajuan</Text>
              <View style={styles.heroActionArrow}>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* BENTO ROW: 2 ASYMMETRIC / EQUAL CARDS */}
          <View style={styles.bentoRow}>
            {/* BENTO CARD 2: LAPOR ADUAN */}
            <TouchableOpacity
              style={[styles.bentoCol, styles.bentoBlue]}
              activeOpacity={0.88}
              onPress={() => router.push('/(tabs)/aduan')}
            >
              <View style={styles.bentoIconBoxBlue}>
                <Ionicons name="megaphone" size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.bentoCardTitle}>Lapor Aduan</Text>
              <Text style={styles.bentoCardSubtitle}>
                Foto & tag lokasi GPS, keluhan langsung ditindak perangkat desa.
              </Text>
              <View style={styles.bentoTagBlue}>
                <Ionicons name="camera-outline" size={12} color={Colors.secondary} />
                <Text style={styles.bentoTagBlueText}>Kamera & GPS</Text>
              </View>
            </TouchableOpacity>

            {/* BENTO CARD 3: TRANSPARANSI APBDES */}
            <TouchableOpacity
              style={[styles.bentoCol, styles.bentoAmber]}
              activeOpacity={0.88}
              onPress={() => router.push('/apbdes' as any)}
            >
              <View style={styles.bentoIconBoxAmber}>
                <Ionicons name="pie-chart" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.bentoCardTitle}>APBDes {apbdesData?.fiscal_year || 2026}</Text>
              <Text style={styles.apbdesAmount}>
                {apbdesData
                  ? 'Rp ' +
                    (apbdesData.belanja?.total >= 1000000000
                      ? (apbdesData.belanja.total / 1000000000).toFixed(2).replace('.', ',') + ' M'
                      : (apbdesData.belanja?.total / 1000000).toFixed(0) + ' Jt')
                  : 'Rp 1,48 M'}
              </Text>
              <View style={styles.apbdesProgressBg}>
                <View
                  style={[
                    styles.apbdesProgressFill,
                    { width: `${Math.min(apbdesData?.realisasi_persen || 74.5, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.apbdesProgressLabel}>
                {apbdesData?.realisasi_persen || 74.5}% Realisasi Anggaran
              </Text>
            </TouchableOpacity>
          </View>

          {/* BENTO ITEM 4: LIVE STATUS SURAT TRACKING (IF AVAILABLE) */}
          {latestLetter && (
            <TouchableOpacity
              style={styles.bentoTrackCard}
              activeOpacity={0.88}
              onPress={() => router.push(`/letters/${latestLetter.tracking_number}` as any)}
            >
              <View style={styles.trackCardHeader}>
                <View>
                  <View style={styles.trackLabelRow}>
                    <Text style={styles.trackLabel}>Lacak Pengajuan Aktif</Text>
                    <View style={styles.pulsingDot} />
                  </View>
                  <Text style={styles.trackNumber}>{latestLetter.tracking_number}</Text>
                </View>
                <StatusBadge statusKey={latestLetter.status} />
              </View>

              <Text style={styles.trackLetterName}>{latestLetter.letter_name}</Text>
              <Text style={styles.trackCitizen}>Atas Nama: {latestLetter.citizen_name}</Text>

              {/* Minimalist Progress Track */}
              <View style={styles.trackProgressContainer}>
                <View style={styles.trackStep}>
                  <View style={[styles.stepCircle, styles.stepActive]}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.stepText}>Diajukan</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    latestLetter.status !== 'submitted' && styles.stepLineActive,
                  ]}
                />
                <View style={styles.trackStep}>
                  <View
                    style={[
                      styles.stepCircle,
                      latestLetter.status !== 'submitted' ? styles.stepActive : styles.stepInactive,
                    ]}
                  >
                    <Ionicons
                      name={latestLetter.status === 'needs_revision' ? 'alert' : 'checkmark'}
                      size={10}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.stepText}>Verifikasi</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    (latestLetter.status === 'signed' || latestLetter.status === 'completed') &&
                      styles.stepLineActive,
                  ]}
                />
                <View style={styles.trackStep}>
                  <View
                    style={[
                      styles.stepCircle,
                      latestLetter.status === 'signed' || latestLetter.status === 'completed'
                        ? styles.stepActive
                        : styles.stepInactive,
                    ]}
                  >
                    <Ionicons name="qr-code" size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.stepText}>Selesai TTE</Text>
                </View>
              </View>

              <View style={styles.trackFooter}>
                <Text style={styles.trackDate}>Diajukan: {latestLetter.created_at}</Text>
                <View style={styles.trackDetailLink}>
                  <Text style={styles.trackDetailText}>Lihat Berkas & QR</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* BENTO ROW: 2 MINI ACTION CARDS */}
          <View style={styles.bentoRow}>
            {/* MINI 1: AGENDA POSYANDU & DESA (DINAMIS DARI DB) */}
            <TouchableOpacity
              style={[styles.bentoMiniCol, styles.bentoPurple]}
              activeOpacity={0.85}
              onPress={() => {
                const targetEvent = villageEvents[0] || null;
                setSelectedEvent(targetEvent);
                setShowEventModal(true);
              }}
            >
              <View style={styles.miniIconBoxPurple}>
                <Ionicons name="calendar" size={18} color={Colors.purple} />
              </View>
              <Text style={styles.miniCardTitle}>Agenda Desa</Text>
              <Text style={styles.miniCardInfo} numberOfLines={1}>
                {villageEvents[0]?.title || 'Posyandu Balita & Lansia'}
              </Text>
              <Text style={styles.miniCardDate} numberOfLines={1}>
                {villageEvents[0]?.event_date || 'Rabu, 24 Sep 2026'}
              </Text>
            </TouchableOpacity>

            {/* MINI 2: KONTAK DARURAT 24 JAM (DINAMIS DARI DB) */}
            <TouchableOpacity
              style={[styles.bentoMiniCol, styles.bentoRose]}
              activeOpacity={0.85}
              onPress={() => setShowEmergencyModal(true)}
            >
              <View style={styles.miniIconBoxRose}>
                <Ionicons name="call" size={18} color={Colors.urgent} />
              </View>
              <Text style={styles.miniCardTitle}>Kontak Siaga</Text>
              <Text style={styles.miniCardInfo}>Puskesmas & Bhabin</Text>
              <View style={styles.emergencyCallPill}>
                <Text style={styles.emergencyCallText}>Panggil Darurat</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* EMERGENCY CONTACTS MODAL */}
      <Modal visible={showEmergencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="alert-circle" size={20} color={Colors.urgent} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Kontak Siaga 24 Jam</Text>
                  <Text style={styles.modalSubtitle}>{Config.villageName}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowEmergencyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={26} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              Klik kontak di bawah untuk segera terhubung dalam situasi genting atau medis:
            </Text>

            {(emergencyContacts.length > 0 ? emergencyContacts : Config.emergencyContacts).map((contact: any, i: number) => (
              <TouchableOpacity
                key={contact.id || i}
                style={styles.contactItem}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(`tel:${contact.phone.replace(/[^0-9]/g, '')}`)}
              >
                <View style={styles.contactIconCircle}>
                  <Ionicons name={(contact.icon as any) || 'call'} size={16} color={Colors.urgent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{contact.title}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.callPill}>
                  <Text style={styles.callPillText}>Hubungi</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* VILLAGE EVENT DETAIL MODAL */}
      <Modal
        visible={showEventModal && !!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconBox, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
                  <Ionicons name="calendar" size={20} color={Colors.purple} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>Agenda Resmi Desa</Text>
                  <Text style={styles.modalSubtitle}>{selectedEvent?.category || 'Kegiatan Warga'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 16, color: Colors.textPrimary, marginBottom: 12 }}>
                  {selectedEvent.title}
                </Text>

                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 12.5, color: Colors.textPrimary }}>
                      {selectedEvent.event_date} • {selectedEvent.event_time}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="location-outline" size={16} color={Colors.urgent} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 12.5, color: Colors.textPrimary, flex: 1 }}>
                      {selectedEvent.location}
                    </Text>
                  </View>
                  {selectedEvent.organizer && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="people-outline" size={16} color={Colors.secondary} />
                      <Text style={{ fontFamily: Fonts.medium, fontSize: 12.5, color: Colors.textSecondary }}>
                        Penyelenggara: {selectedEvent.organizer}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedEvent.description ? (
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>
                    {selectedEvent.description}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: Colors.purple }]}
                  onPress={() => setShowEventModal(false)}
                >
                  <Text style={styles.modalCloseText}>Tutup Informasi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ANNOUNCEMENT POPUP / MODAL (UNTUK PENGUMUMAN PENTING & DETAIL KABAR DESA) */}
      <Modal
        visible={showUrgentModal && !!activeModalNews}
        transparent
        animationType="fade"
        onRequestClose={handleCloseUrgentModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.urgentModalContent,
              isUrgentExpanded && styles.urgentModalContentExpanded,
            ]}
          >
            {/* Header Modal (Badge & Tombol (x) Close) */}
            <View style={styles.urgentModalHeader}>
              <View
                style={[
                  styles.urgentModalBadge,
                  !activeModalNews?.is_urgent && {
                    backgroundColor: Colors.bento.hero.badge,
                    borderColor: Colors.bento.hero.border,
                  },
                ]}
              >
                <Ionicons
                  name={activeModalNews?.is_urgent ? 'warning' : 'newspaper-outline'}
                  size={14}
                  color={activeModalNews?.is_urgent ? Colors.urgent : Colors.primary}
                />
                <Text
                  style={[
                    styles.urgentModalBadgeText,
                    !activeModalNews?.is_urgent && { color: Colors.primary },
                  ]}
                >
                  {activeModalNews?.is_urgent ? 'PENGUMUMAN PENTING' : 'KABAR DESA'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseUrgentModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.urgentModalCloseBtn}
              >
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!isUrgentExpanded ? (
              // TAMPILAN 1: POPUP AWAL (Hanya tombol (x) close dan 'Baca')
              <View>
                <View style={styles.urgentMetaRow}>
                  <View
                    style={[
                      styles.urgentCategoryPill,
                      !activeModalNews?.is_urgent && {
                        backgroundColor: Colors.bento.hero.badge,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgentCategoryPillText,
                        !activeModalNews?.is_urgent && { color: Colors.primary },
                      ]}
                    >
                      {activeModalNews?.category || 'Penting'}
                    </Text>
                  </View>
                  <Text style={styles.urgentMetaText}>
                    {activeModalNews?.date} • {activeModalNews?.author}
                  </Text>
                  <View
                    style={
                      activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                        ? styles.readStatusBadge
                        : styles.unreadStatusBadge
                    }
                  >
                    <Ionicons
                      name={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? 'checkmark-done'
                          : 'mail-unread'
                      }
                      size={11}
                      color={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? '#16A34A'
                          : Colors.urgent
                      }
                    />
                    <Text
                      style={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? styles.readStatusText
                          : styles.unreadStatusText
                      }
                    >
                      {activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                        ? 'Sudah Dibaca'
                        : 'Belum Dibaca'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.urgentModalTitle}>{activeModalNews?.title}</Text>

                <View style={styles.urgentBodyBox}>
                  <Text style={styles.urgentModalDesc} numberOfLines={3}>
                    {activeModalNews?.summary}
                  </Text>
                </View>

                {/* Tombol Aksi: HANYA 'Baca' */}
                <TouchableOpacity
                  style={[
                    styles.urgentReadButton,
                    !activeModalNews?.is_urgent && {
                      backgroundColor: Colors.primary,
                      shadowColor: Colors.primary,
                    },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (activeModalNews) {
                      markAsRead(activeModalNews.id);
                    }
                    setIsUrgentExpanded(true);
                  }}
                >
                  <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.urgentReadButtonText}>Baca</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // TAMPILAN 2: BACA LENGKAP (Kontainer memenuhi layar dengan batas atas & bawah, isi scrollable)
              <ScrollView
                style={styles.urgentExpandedScroll}
                contentContainerStyle={styles.urgentExpandedScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.urgentMetaRow}>
                  <View
                    style={[
                      styles.urgentCategoryPill,
                      !activeModalNews?.is_urgent && {
                        backgroundColor: Colors.bento.hero.badge,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgentCategoryPillText,
                        !activeModalNews?.is_urgent && { color: Colors.primary },
                      ]}
                    >
                      {activeModalNews?.category || 'Informasi'}
                    </Text>
                  </View>
                  <Text style={styles.urgentMetaText}>
                    {activeModalNews?.date} • {activeModalNews?.author}
                  </Text>
                  <View
                    style={
                      activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                        ? styles.readStatusBadge
                        : styles.unreadStatusBadge
                    }
                  >
                    <Ionicons
                      name={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? 'checkmark-done'
                          : 'mail-unread'
                      }
                      size={11}
                      color={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? '#16A34A'
                          : Colors.urgent
                      }
                    />
                    <Text
                      style={
                        activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                          ? styles.readStatusText
                          : styles.unreadStatusText
                      }
                    >
                      {activeModalNews && readAnnouncementIds.has(activeModalNews.id)
                        ? 'Sudah Dibaca'
                        : 'Belum Dibaca'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.urgentModalTitleExpanded}>{activeModalNews?.title}</Text>

                <View style={styles.urgentFullContentBox}>
                  <Text style={styles.urgentFullContentText}>
                    {activeModalNews?.content || activeModalNews?.summary}
                  </Text>
                </View>

                <View style={styles.urgentNoticeBox}>
                  <Ionicons name="information-circle" size={16} color="#B45309" />
                  <Text style={styles.urgentNoticeText}>
                    Informasi resmi dari pemerintah desa. Harap perhatikan waktu & ketentuan yang berlaku.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
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
  // STATIC FIXED APPBAR (SIZE SAMA DENGAN PROFIL KEPENDUDUKAN - WARNA KUNING SOFT)
  staticAppBar: {
    backgroundColor: Colors.appBarYellow,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.appBarYellowBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  appBarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.appBarYellowBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.primaryDark,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  appBarTextContainer: {
    flex: 1,
  },
  appBarTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: '#713F12',
    marginTop: 3,
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.appBarYellowBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.urgent,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  // URGENT NOTICE BENTO
  urgentBento: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: Spacing.radiusLg,
    padding: Spacing.cardPadding,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.urgentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  urgentBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.urgent,
    letterSpacing: 0.2,
  },
  urgentDate: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  urgentTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  urgentDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  urgentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
  },
  urgentActionText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.urgent,
  },

  // BENTO SECTION
  bentoSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginTop: 0,
  },
  sectionHeading: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  // HERO BENTO CARD
  bentoHero: {
    backgroundColor: Colors.bento.hero.bg,
    borderRadius: Spacing.radiusXl,
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.badge,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  heroBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.bento.hero.text,
  },
  heroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
  },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 19,
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.radiusSm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 5,
  },
  heroChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  heroActionText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
  heroActionArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BENTO 2-COLUMN ROW
  bentoRow: {
    flexDirection: 'row',
    gap: Spacing.cardGap,
    marginBottom: Spacing.cardGap,
  },
  bentoCol: {
    flex: 1,
    borderRadius: Spacing.radiusXl,
    borderWidth: 1.5,
    padding: Spacing.cardPadding,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoBlue: {
    backgroundColor: Colors.bento.blue.bg,
    borderColor: Colors.bento.blue.border,
  },
  bentoAmber: {
    backgroundColor: Colors.bento.amber.bg,
    borderColor: Colors.bento.amber.border,
  },
  bentoIconBoxBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bento.blue.border,
    marginBottom: 10,
  },
  bentoIconBoxAmber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bento.amber.border,
    marginBottom: 10,
  },
  bentoCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bentoCardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  bentoTagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.blue.badge,
    borderWidth: 1,
    borderColor: Colors.bento.blue.border,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.radiusSm,
    gap: 4,
  },
  bentoTagBlueText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.bento.blue.text,
  },
  apbdesAmount: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.bento.amber.text,
    marginBottom: 6,
  },
  apbdesProgressBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  apbdesProgressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  apbdesProgressLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
  },

  // BENTO LIVE TRACKING CARD
  bentoTrackCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  trackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  trackLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  trackLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  trackNumber: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  trackLetterName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  trackCitizen: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  trackProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  trackStep: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepActive: {
    backgroundColor: Colors.primary,
  },
  stepInactive: {
    backgroundColor: '#94A3B8',
  },
  stepText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  trackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackDate: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  trackDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trackDetailText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primaryDark,
  },

  // BENTO MINI COLS
  bentoMiniCol: {
    flex: 1,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoPurple: {
    backgroundColor: Colors.bento.purple.bg,
    borderColor: Colors.bento.purple.border,
  },
  bentoRose: {
    backgroundColor: Colors.bento.rose.bg,
    borderColor: Colors.bento.rose.border,
  },
  miniIconBoxPurple: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bento.purple.border,
    marginBottom: 8,
  },
  miniIconBoxRose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.urgentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.bento.rose.border,
    marginBottom: 8,
  },
  miniCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  miniCardInfo: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  miniCardDate: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.bento.purple.text,
  },
  emergencyCallPill: {
    backgroundColor: Colors.urgent,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  emergencyCallText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },

  // NEWS SECTION: HORIZONTAL SLIDER / SWIPE
  newsSection: {
    marginTop: 2,
    marginBottom: 22,
  },
  newsSectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionHeadingNoMargin: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  newsHorizontalScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
    paddingBottom: 6,
  },
  newsBentoCardHorizontal: {
    width: 280,
    minHeight: 165,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.cardPadding,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  newsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsCategoryChip: {
    backgroundColor: Colors.bento.hero.badge,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newsCategoryText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.bento.hero.text,
  },
  newsDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsDateText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  newsTopRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 9.5,
    color: '#16A34A',
    letterSpacing: 0.1,
  },
  unreadStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 9.5,
    color: Colors.urgent,
    letterSpacing: 0.1,
  },
  newsTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  newsSummary: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  newsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  newsAuthor: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readMoreText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 36,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radiusXl,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.urgentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalInstruction: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.urgentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  callPill: {
    backgroundColor: Colors.urgent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Spacing.radiusFull,
  },
  callPillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  modalCloseButton: {
    marginTop: 18,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalCloseText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // URGENT ANNOUNCEMENT MODAL STYLES
  urgentModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radiusXl,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    maxHeight: '100%',
  },
  urgentModalContentExpanded: {
    maxHeight: '100%',
    paddingBottom: 16,
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgentModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.urgentLight,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  urgentModalBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.urgent,
    letterSpacing: 0.3,
  },
  urgentModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  urgentCategoryPill: {
    backgroundColor: Colors.urgentLight,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  urgentCategoryPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.urgent,
  },
  urgentMetaText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  urgentModalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 12,
  },
  urgentBodyBox: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 14,
  },
  urgentModalDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  urgentReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.urgent,
    borderRadius: Spacing.radiusMd,
    paddingVertical: 12,
    marginTop: 4,
    shadowColor: Colors.urgent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  urgentReadButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  urgentExpandedScroll: {
    flexShrink: 1,
    width: '100%',
    marginTop: 6,
  },
  urgentExpandedScrollContent: {
    flexGrow: 0,
    paddingBottom: 24,
  },
  urgentModalTitleExpanded: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 25,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  urgentFullContentBox: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 14,
  },
  urgentFullContentText: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  urgentNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Spacing.radiusMd,
    padding: 10,
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  urgentNoticeText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
});
