// app/(tabs)/profil.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Citizen } from '@/store/mockData';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { PhotoPreviewModal } from '@/components/profile/PhotoPreviewModal';
import { VerifyDocsModal } from '@/components/profile/VerifyDocsModal';
import { AddFamilyMemberModal } from '@/components/profile/AddFamilyMemberModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export default function ProfilScreen() {
  const router = useRouter();
  const { user: authUser, logout, villageName, refreshUser } = useAuth();
  const { showAlert, showConfirm, showPhotoPicker } = useAlert();
  const [user, setUser] = useState<Citizen | null>(authUser);
  const [familyMembers, setFamilyMembers] = useState<Citizen[]>([]);
  const [showNik, setShowNik] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Visibility States
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<Citizen | null>(null);

  const [showVerifyUploadModal, setShowVerifyUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [previewPhotos, setPreviewPhotos] = useState<{ label: string; uri: string }[]>([]);
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      await refreshUser();
      const u = await api.getCurrentUser(true);
      const fam = await api.getFamilyMembers();
      setUser(u);
      setFamilyMembers(fam);
    } catch (e) {
      console.warn('[ProfilScreen] Refresh error:', e);
    }
  };

  const onPullRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Otomatis sinkron data terbaru dari Supabase setiap kali layar profil dibuka
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [])
  );

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  // Realtime subscription agar status keluarga dan berkas langsung ter-update live tanpa manual refresh
  useEffect(() => {
    if (!user?.nik && !user?.no_kk) return;

    let subChannel: any = null;
    try {
      const userNoKk = (user.no_kk || '').trim();
      subChannel = supabase
        .channel(`profil-realtime-family-${user.nik || user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'citizens' },
          async (payload) => {
            const row = payload.new as any;
            if (!row) return;
            const isSelf = row.nik === user.nik || row.id === user.id;
            const isFamily = Boolean(userNoKk && row.no_kk && row.no_kk.trim() === userNoKk);

            if (isSelf || isFamily) {
              console.log('[ProfilScreen] Realtime update diterima untuk anggota:', row.nama_lengkap, row.is_verified);
              await refreshData();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ProfilScreen] Realtime error:', err);
    }

    return () => {
      if (subChannel) supabase.removeChannel(subChannel);
    };
  }, [user?.nik, user?.no_kk, user?.id]);

  const maskedNik = (nik?: string) => {
    if (!nik) return '----------------';
    if (showNik) return nik;
    return nik.slice(0, 6) + '******' + nik.slice(12);
  };

  const openWhatsAppHelp = () => {
    const activeVillage = user?.village_name || villageName || Config.villageName;
    const villagePhone = (Config as any).villagePhone || '6281234567890';
    const text = encodeURIComponent(
      `Halo Petugas Pelayanan ${activeVillage}, saya warga atas nama ${user?.nama_lengkap} (NIK: ${user?.nik}) ingin menanyakan perihal layanan desa.`
    );
    Linking.openURL(`https://wa.me/${villagePhone.replace(/[^0-9]/g, '')}?text=${text}`);
  };

  const openEditModal = (member?: Citizen | null) => {
    setSelectedEditMember(member || user);
    setShowEditModal(true);
  };

  const openVerifyModal = () => {
    setShowVerifyUploadModal(true);
  };

  const handlePreviewDocs = (member: Citizen) => {
    const photos: { label: string; uri: string }[] = [];
    if (member.foto_ktp_path) {
      photos.push({ label: 'Foto Fisik e-KTP', uri: member.foto_ktp_path });
    }
    if (member.foto_selfie_ktp_path) {
      photos.push({ label: 'Swafoto Pegang e-KTP', uri: member.foto_selfie_ktp_path });
    }
    if (member.foto_kk_path && member.foto_kk_path !== member.foto_ktp_path) {
      photos.push({ label: member.document_type || 'Dokumen Fisik / KK', uri: member.foto_kk_path });
    }

    if (photos.length > 0) {
      setPreviewPhotos(photos);
    } else if (member.foto_kk_path) {
      setPreviewPhotoUri(member.foto_kk_path);
    } else {
      showAlert({
        title: 'Informasi',
        message: 'Belum ada berkas fisik yang dilampirkan.',
        type: 'info',
      });
    }
  };

  const performUploadRevision = async (member: Citizen, source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert({
            title: 'Izin Kamera Diperlukan',
            message: 'Mohon berikan izin akses kamera pada pengaturan perangkat untuk memotret berkas perbaikan.',
            type: 'warning',
          });
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const newUri = result.assets[0].uri;
        await api.updateFamilyMemberDocument(member.id, newUri, result.assets[0].base64 || undefined);
        const updated = await api.getFamilyMembers();
        setFamilyMembers(updated);
        showAlert({
          title: 'Berkas Revisi Terkirim',
          message: `Dokumen bukti fisik untuk ${member.nama_lengkap} telah diperbarui dan dikirim kembali ke antrean verifikasi operator desa.`,
          type: 'success',
        });
      }
    } catch (e) {
      showAlert({
        title: 'Gagal',
        message: 'Terjadi kendala saat mengambil berkas revisi.',
        type: 'danger',
      });
    }
  };

  const handleUploadRevision = (member: Citizen) => {
    showPhotoPicker({
      title: 'Unggah Ulang Berkas Revisi',
      description: `Pilih sumber dokumen fisik perbaikan untuk ${member.nama_lengkap}:`,
      onSelectCamera: () => performUploadRevision(member, 'camera'),
      onSelectGallery: () => performUploadRevision(member, 'gallery'),
    });
  };

  const handleDeleteFamilyMember = (member: Citizen) => {
    if (member.nik === user?.nik || member.status_keluarga === 'Kepala Keluarga') {
      showAlert({
        title: 'Tidak Dapat Dihapus',
        message: 'Data Kepala Keluarga merupakan akun utama pemegang profil.',
        type: 'warning',
      });
      return;
    }

    showConfirm({
      title: 'Hapus Anggota Keluarga',
      message: `Apakah Anda yakin ingin menghapus ${member.nama_lengkap} (${member.status_keluarga}) dari daftar Kartu Keluarga ini?`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        await api.deleteFamilyMember(member.id);
        const updated = await api.getFamilyMembers();
        setFamilyMembers(updated);
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Kependudukan</Text>
        <Text style={styles.headerSubtitle}>
          Buku Induk Kependudukan Warga {user?.village_name || villageName || Config.villageName}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* IDENTITAS WARGA BENTO CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nama_lengkap ? user.nama_lengkap.slice(0, 2).toUpperCase() : 'WD'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.name, { flex: 1 }]}>{user?.nama_lengkap || 'Belum diisi'}</Text>
                <TouchableOpacity
                  style={styles.cardEditPencilBtn}
                  onPress={() => openEditModal(user)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={13} color={Colors.primaryDark} />
                  <Text style={styles.cardEditPencilText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.nikRow}>
                <Text style={styles.nikText}>NIK: {maskedNik(user?.nik)}</Text>
                <TouchableOpacity
                  onPress={() => setShowNik(!showNik)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNik ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.kkText}>
                No. KK: {user?.no_kk ? user.no_kk : 'Belum diisi'}
              </Text>
            </View>
          </View>

          <View style={styles.verifyRow}>
            {user?.is_verified ? (
              <View style={styles.verifyBadgeSuccess}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.verifyTextSuccess}>Data Terverifikasi Sesuai KTP Fisik</Text>
              </View>
            ) : (user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:')) ? (
              <TouchableOpacity
                style={styles.verifyBadgeRevision}
                activeOpacity={0.8}
                onPress={openVerifyModal}
              >
                <Ionicons name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.verifyTextRevision}>Perlu Revisi Dokumen KTP</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.verifyBadgePending}
                activeOpacity={0.8}
                onPress={openVerifyModal}
              >
                <Ionicons name="time" size={14} color="#D97706" />
                <Text style={styles.verifyTextPending}>Menunggu Validasi Operator Desa</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Wilayah</Text>
              <Text style={styles.infoVal}>
                {(user?.rt && user?.rw)
                  ? `RT ${user.rt} / RW ${user.rw}`
                  : user?.rt
                  ? `RT ${user.rt}`
                  : user?.rw
                  ? `RW ${user.rw}`
                  : '-'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dusun</Text>
              <Text style={styles.infoVal}>{user?.dusun || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Peran Keluarga</Text>
              <Text style={styles.infoVal}>{user?.status_keluarga || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pekerjaan</Text>
              <Text style={styles.infoVal}>{user?.pekerjaan || '-'}</Text>
            </View>
          </View>
        </View>

        {/* BANNER CALLOUT: STATUS VERIFIKASI AKUN */}
        {!user?.is_verified && (
          <View
            style={[
              styles.calloutCard,
              (user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:'))
                ? styles.calloutCardRevision
                : styles.calloutCardPending,
            ]}
          >
            <View style={styles.calloutHeaderRow}>
              <View
                style={[
                  styles.calloutIconBox,
                  (user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:'))
                    ? styles.calloutIconBoxRevision
                    : styles.calloutIconBoxPending,
                ]}
              >
                <Ionicons
                  name={
                    user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:')
                      ? 'alert-circle'
                      : 'shield-outline'
                  }
                  size={22}
                  color={
                    user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:')
                      ? '#DC2626'
                      : '#D97706'
                  }
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    styles.calloutTitle,
                    (user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:'))
                      ? styles.calloutTitleRevision
                      : styles.calloutTitlePending,
                  ]}
                >
                  {user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:')
                    ? 'Perlu Revisi Dokumen KTP'
                    : 'Validasi Akun Diperlukan'}
                </Text>
                <Text style={styles.calloutMessage}>
                  {user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:')
                    ? user.rejection_reason || 'Catatan Operator: Foto KTP/KK belum sesuai atau buram. Silakan unggah ulang foto yang jelas.'
                    : 'Akun Anda belum divalidasi. Silakan unggah foto fisik KTP/KK untuk verifikasi.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.calloutActionBtn,
                (user?.verification_status === 'needs_revision' || user?.verified_by?.startsWith('revisi:'))
                  ? styles.calloutActionBtnRevision
                  : styles.calloutActionBtnPending,
              ]}
              activeOpacity={0.85}
              onPress={openVerifyModal}
            >
              <Ionicons name="cloud-upload" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.calloutActionBtnText}>
                {user?.foto_ktp_path && user?.foto_selfie_ktp_path
                  ? 'Perbarui / Unggah Ulang Berkas KTP'
                  : 'Lampirkan Foto KTP/KK Sekarang'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ANGGOTA KELUARGA (KK) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Anggota Keluarga (Satu KK)</Text>
              <Text style={styles.sectionSub}>
                Mewakili pengurusan surat untuk anggota keluarga di bawah:
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addFamilyBtn}
              activeOpacity={0.85}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="person-add" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.addFamilyBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          {familyMembers.map((member) => {
            const isSelf = member.nik === user?.nik || member.status_keluarga === 'Kepala Keluarga';
            const status = member.verification_status || (member.is_verified ? 'verified' : 'pending');
            const isVerified = status === 'verified';
            const isPending = status === 'pending';
            const isRevision = status === 'needs_revision';

            return (
              <View key={member.id} style={[styles.familyCard, isRevision && styles.familyCardRevision]}>
                <View style={styles.familyCardTop}>
                  <View style={[styles.familyIconBox, isSelf && styles.familyIconBoxSelf]}>
                    <Ionicons
                      name={isSelf ? 'shield-checkmark' : member.jenis_kelamin === 'L' ? 'man' : 'woman'}
                      size={20}
                      color={isSelf ? Colors.primaryDark : member.jenis_kelamin === 'L' ? Colors.secondary : Colors.urgent}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.familyName}>{member.nama_lengkap}</Text>
                      {isSelf && (
                        <View style={styles.selfBadge}>
                          <Text style={styles.selfBadgeText}>Anda</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.familyRole}>
                      {[member.status_keluarga, member.pekerjaan].filter(Boolean).join(' • ') || '-'}
                    </Text>
                    <Text style={styles.familyNik}>NIK: {member.nik}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* TOMBOL EDIT ANGGOTA (ICON PENA) */}
                      <TouchableOpacity
                        style={styles.editMemberBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => openEditModal(member)}
                      >
                        <Ionicons name="pencil" size={13} color={Colors.primaryDark} />
                      </TouchableOpacity>

                      {isSelf ? (
                        <View style={styles.familyBadge}>
                          <Text style={styles.familyBadgeText}>Kepala KK</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.deleteMemberBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleDeleteFamilyMember(member)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* STATUS VERIFIKASI BADGE */}
                    {isVerified ? (
                      <View style={styles.statusBadgeVerified}>
                        <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                        <Text style={styles.statusBadgeVerifiedText}>Terverifikasi</Text>
                      </View>
                    ) : isPending ? (
                      <View style={styles.statusBadgePending}>
                        <Ionicons name="time-outline" size={12} color="#D97706" />
                        <Text style={styles.statusBadgePendingText}>Menunggu</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeRevision}>
                        <Ionicons name="alert-circle" size={12} color="#DC2626" />
                        <Text style={styles.statusBadgeRevisionText}>Revisi</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* BERKAS & CATATAN BARIS BAWAH */}
                <View style={styles.familyCardBottom}>
                  {isSelf ? (
                    (member.foto_ktp_path || member.foto_kk_path) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.viewDocChip}
                          activeOpacity={0.8}
                          onPress={() => handlePreviewDocs(member)}
                        >
                          <Ionicons name="document-attach" size={13} color={Colors.primaryDark} />
                          <Text style={styles.viewDocChipText}>Lihat Bukti Berkas</Text>
                        </TouchableOpacity>

                        {!isVerified && (
                          <TouchableOpacity
                            style={styles.reuploadSmallChip}
                            activeOpacity={0.8}
                            onPress={openVerifyModal}
                          >
                            <Ionicons name="pencil" size={11} color="#B45309" />
                            <Text style={styles.reuploadSmallChipText}>Ganti</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.attachDocsActionBtn}
                        activeOpacity={0.85}
                        onPress={openVerifyModal}
                      >
                        <Ionicons name="add-circle" size={15} color="#B45309" style={{ marginRight: 4 }} />
                        <Text style={styles.attachDocsActionBtnText}>Lampirkan Foto KTP/KK</Text>
                      </TouchableOpacity>
                    )
                  ) : member.foto_kk_path ? (
                    <TouchableOpacity
                      style={styles.viewDocChip}
                      activeOpacity={0.8}
                      onPress={() => handlePreviewDocs(member)}
                    >
                      <Ionicons name="document-attach" size={13} color={Colors.primaryDark} />
                      <Text style={styles.viewDocChipText}>Lihat Bukti Berkas</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.noDocChip}>
                      <Ionicons name="document-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.noDocChipText}>Berkas Belum Dilampirkan</Text>
                    </View>
                  )}

                  {isVerified && member.verified_by && (
                    <Text style={styles.verifiedByNote}>
                      Oleh: {member.verified_by}
                    </Text>
                  )}
                </View>

                {/* BANNER CATATAN REVISI DARI OPERATOR DESA */}
                {isRevision && (
                  <View style={styles.revisionBanner}>
                    <View style={styles.revisionBannerHeader}>
                      <Ionicons name="alert-circle" size={16} color="#DC2626" />
                      <Text style={styles.revisionBannerTitle}>Catatan Perbaikan dari Operator Desa:</Text>
                    </View>
                    <Text style={styles.revisionBannerText}>
                      "{member.rejection_reason || 'Foto dokumen KK buram atau NIK tidak sesuai fisik. Mohon unggah ulang foto yang jelas.'}"
                    </Text>
                    <TouchableOpacity
                      style={styles.reuploadActionBtn}
                      activeOpacity={0.85}
                      onPress={() => handleUploadRevision(member)}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.reuploadActionBtnText}>Unggah Ulang Foto Dokumen</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* PENGATURAN & BANTUAN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bantuan & Privasi</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={openWhatsAppHelp}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuTitle}>Bantuan Petugas Desa (WhatsApp)</Text>
              <Text style={styles.menuSub}>Konsultasi langsung dengan operator pelayanan</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() =>
              showAlert({
                title: 'Perlindungan Data Pribadi (UU PDP)',
                message: 'Aplikasi Dekati melindungi data identitas kependudukan (NIK & KK) Anda sesuai standar keamanan enkripsi. Data hanya digunakan untuk keperluan pelayanan administrasi resmi desa.',
                type: 'info',
              })
            }
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="lock-closed" size={20} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuTitle}>Keamanan & Privasi Data (UU PDP)</Text>
              <Text style={styles.menuSub}>Kebijakan kerahasiaan identitas warga</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {authUser ? (
            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 12, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
              activeOpacity={0.8}
              onPress={() => {
                showConfirm({
                  title: 'Keluar Akun Warga',
                  message: 'Apakah Anda yakin ingin keluar dari akun warga saat ini?',
                  type: 'danger',
                  confirmText: 'Keluar Akun',
                  cancelText: 'Batal',
                  onConfirm: async () => {
                    await logout();
                    await api.logoutCitizen();
                    router.replace('/(auth)/login');
                  },
                });
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Keluar dari Akun</Text>
                <Text style={styles.menuSub}>Ganti akun atau kembali ke halaman masuk</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#DC2626" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 12, borderColor: Colors.surfaceBorder, backgroundColor: Colors.bento.hero.bg }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(auth)/login')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="log-in-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.menuTitle, { color: '#92400E' }]}>Masuk / Daftar Akun</Text>
                <Text style={styles.menuSub}>Akses penuh data dan permohonan surat kependudukan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D97706" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* MODAL TAMBAH ANGGOTA KELUARGA */}
      <AddFamilyMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        user={user}
        onSuccess={refreshData}
      />

      {/* MODAL EDIT PROFIL WARGA / ANGGOTA KELUARGA */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        targetMember={selectedEditMember}
        currentUser={user}
        onSuccess={refreshData}
      />

      {/* MODAL UNGGAH 2 BERKAS VERIFIKASI (KTP & SWAFOTO) */}
      <VerifyDocsModal
        visible={showVerifyUploadModal}
        onClose={() => setShowVerifyUploadModal(false)}
        user={user}
        onSuccess={(updatedUser) => {
          setUser(updatedUser);
          refreshData();
        }}
      />

      {/* MODAL LIHAT BUKTI BERKAS (MULTI & SINGLE) */}
      <PhotoPreviewModal
        visible={previewPhotos.length > 0 || !!previewPhotoUri}
        photos={previewPhotos}
        singleUri={previewPhotoUri}
        onClose={() => {
          setPreviewPhotos([]);
          setPreviewPhotoUri(null);
        }}
      />
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
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 36,
  },
  profileCard: {
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
    marginBottom: Spacing.cardGap,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.primaryDark,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  nikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  nikText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 2,
  },
  kkText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifyRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.badge,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
    gap: 5,
  },
  verifyText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.bento.hero.text,
  },
  verifyBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
    gap: 5,
  },
  verifyTextSuccess: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#15803D',
  },
  verifyBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
    gap: 5,
  },
  verifyTextPending: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#B45309',
  },
  verifyBadgeRevision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
    gap: 5,
  },
  verifyTextRevision: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#B91C1C',
  },
  // CALLOUT BANNER
  calloutCard: {
    borderRadius: Spacing.radiusXl,
    padding: 16,
    marginBottom: Spacing.cardGap,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  calloutCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  calloutCardRevision: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  calloutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  calloutIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutIconBoxPending: {
    backgroundColor: '#FEF3C7',
  },
  calloutIconBoxRevision: {
    backgroundColor: '#FEE2E2',
  },
  calloutTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 14,
  },
  calloutTitlePending: {
    color: '#92400E',
  },
  calloutTitleRevision: {
    color: '#991B1B',
  },
  calloutMessage: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
  },
  calloutActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Spacing.radiusFull,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  calloutActionBtnPending: {
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
  },
  calloutActionBtnRevision: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  calloutActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusMd,
    padding: 10,
  },
  infoItem: {
    width: '50%',
    padding: 8,
  },
  infoLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoVal: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  familyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  familyCardRevision: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  familyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  statusBadgeVerifiedText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#16A34A',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  statusBadgePendingText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#D97706',
  },
  statusBadgeRevision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  statusBadgeRevisionText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#DC2626',
  },
  viewDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  viewDocChipText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  noDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noDocChipText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  attachDocsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Spacing.radiusFull,
  },
  attachDocsActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#92400E',
  },
  reuploadSmallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.radiusFull,
    gap: 3,
  },
  reuploadSmallChipText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: '#B45309',
  },
  verifiedByNote: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  revisionBanner: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Spacing.radiusMd,
    padding: 10,
  },
  revisionBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  revisionBannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#DC2626',
  },
  revisionBannerText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 16,
    marginBottom: 8,
  },
  reuploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Spacing.radiusFull,
    alignSelf: 'flex-start',
  },
  reuploadActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  familyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  familyRole: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  familyNik: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  familyBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
  },
  familyBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.primaryDark,
  },
  menuItem: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  menuSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addFamilyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radiusFull,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addFamilyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  familyIconBoxSelf: {
    backgroundColor: Colors.bento.hero.bg,
    borderColor: Colors.bento.hero.border,
  },
  selfBadge: {
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  selfBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 9.5,
    color: Colors.primaryDark,
  },
  deleteMemberBtn: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editMemberBtn: {
    padding: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEditPencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
  },
  cardEditPencilText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
});
