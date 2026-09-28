// app/(tabs)/profil.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Citizen } from '@/store/mockData';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

const ROLE_OPTIONS = ['Istri', 'Anak', 'Orang Tua', 'Mertua', 'Famili Lain'];
const ALL_ROLE_OPTIONS = ['Kepala Keluarga', 'Istri', 'Anak', 'Orang Tua', 'Mertua', 'Famili Lain'];
const JOB_OPTIONS = [
  'Pelajar/Mahasiswa',
  'Mengurus Rumah Tangga',
  'Belum Bekerja',
  'Wiraswasta',
  'Karyawan Swasta',
  'Petani/Pekebun',
  'PNS/TNI/Polri',
  'Buruh Harian Lepas',
];
const DOCUMENT_TYPES = [
  'Foto Kartu Keluarga (KK)',
  'Foto Akta Kelahiran / KIA',
  'Surat Pindah Datang (SKPWNI)',
];

export default function ProfilScreen() {
  const router = useRouter();
  const { user: authUser, logout, villageName, refreshUser } = useAuth();
  const { showAlert, showConfirm, showPhotoPicker } = useAlert();
  const [user, setUser] = useState<Citizen | null>(authUser);
  const [familyMembers, setFamilyMembers] = useState<Citizen[]>([]);
  const [showNik, setShowNik] = useState(false);

  // State Modal Edit Profil (Warga / Anggota Keluarga)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMemberId, setEditMemberId] = useState('');
  const [editIsSelf, setEditIsSelf] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editGender, setEditGender] = useState<'L' | 'P'>('L');
  const [editRole, setEditRole] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editJob, setEditJob] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // State Modal Verifikasi Akun (2 Berkas: Foto Fisik KTP & Swafoto Pegang KTP)
  const [showVerifyUploadModal, setShowVerifyUploadModal] = useState(false);
  const [ktpPhotoUri, setKtpPhotoUri] = useState<string | null>(null);
  const [ktpPhotoBase64, setKtpPhotoBase64] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null);
  const [selfiePhotoBase64, setSelfiePhotoBase64] = useState<string | null>(null);
  const [savingVerifyDocs, setSavingVerifyDocs] = useState(false);

  // State Preview Multi Berkas Fisik
  const [previewPhotos, setPreviewPhotos] = useState<{ label: string; uri: string }[]>([]);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);

  // State Modal Tambah Anggota Keluarga
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNik, setNewNik] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [newRole, setNewRole] = useState('Anak');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newJob, setNewJob] = useState('Pelajar/Mahasiswa');
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0]);
  const [docPhotoUri, setDocPhotoUri] = useState<string | null>(null);
  const [docPhotoBase64, setDocPhotoBase64] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  // State Preview Foto Dokumen Tunggal (Legacy)
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const u = authUser || (await api.getCurrentUser());
      const fam = await api.getFamilyMembers();
      setUser(u);
      setFamilyMembers(fam);
    };
    fetchProfile();
  }, [authUser]);

  const maskedNik = (nik?: string) => {
    if (!nik) return '----------------';
    if (showNik) return nik;
    return nik.slice(0, 6) + '******' + nik.slice(12);
  };

  const openWhatsAppHelp = () => {
    const activeVillage = user?.village_name || villageName || Config.villageName;
    const text = encodeURIComponent(
      `Halo Petugas Pelayanan ${activeVillage}, saya warga atas nama ${user?.nama_lengkap} (NIK: ${user?.nik}) ingin menanyakan perihal layanan desa.`
    );
    Linking.openURL(`https://wa.me/6281234567890?text=${text}`);
  };

  const openEditModal = (member?: Citizen | null) => {
    const target = member || user;
    if (!target) return;
    const isTargetSelf = target.nik === user?.nik || target.id === user?.id;
    setEditMemberId(target.id);
    setEditIsSelf(isTargetSelf);
    setEditNama(target.nama_lengkap || '');
    setEditNik(target.nik || '');
    setEditNoKk(target.no_kk || user?.no_kk || '');
    setEditGender((target.jenis_kelamin as 'L' | 'P') || 'L');
    setEditRole(target.status_keluarga || (isTargetSelf ? 'Kepala Keluarga' : 'Anak'));
    setEditBirthDate(target.tanggal_lahir || '');
    setEditJob(target.pekerjaan || '');
    setEditRt(target.rt || user?.rt || '');
    setEditRw(target.rw || user?.rw || '');
    setEditDusun(target.dusun || user?.dusun || '');
    setEditAlamat(target.alamat_lengkap || user?.alamat_lengkap || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editNama.trim()) {
      showAlert({
        title: 'Perhatian',
        message: 'Nama lengkap wajib diisi sesuai KTP/KK.',
        type: 'warning',
      });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.updateCitizenProfile({
        id: editMemberId,
        nama_lengkap: editNama.trim(),
        no_kk: editNoKk.trim(),
        status_keluarga: editRole.trim(),
        jenis_kelamin: editGender,
        tanggal_lahir: editBirthDate.trim(),
        pekerjaan: editJob.trim(),
        rt: editRt.trim(),
        rw: editRw.trim(),
        dusun: editDusun.trim(),
        alamat_lengkap: editAlamat.trim(),
      });

      if (res.success) {
        showAlert({
          title: 'Profil Berhasil Diperbarui',
          message: `Data kependudukan untuk ${editNama.trim()} telah berhasil disimpan dan disinkronkan ke server desa.`,
          type: 'success',
        });
        setShowEditModal(false);
        const u = await api.getCurrentUser();
        const fam = await api.getFamilyMembers();
        setUser(u);
        setFamilyMembers(fam);
        await refreshUser();
      } else {
        showAlert({
          title: 'Gagal Menyimpan',
          message: res.message || 'Terjadi kendala saat memperbarui profil.',
          type: 'danger',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Kesalahan',
        message: err?.message || 'Gagal menyimpan perubahan profil.',
        type: 'danger',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const openDocPicker = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert({
            title: 'Izin Kamera Diperlukan',
            message: 'Mohon berikan izin akses kamera pada pengaturan perangkat untuk memotret dokumen fisik.',
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
        setDocPhotoUri(result.assets[0].uri);
        setDocPhotoBase64(result.assets[0].base64 || null);
      }
    } catch (e) {
      showAlert({
        title: 'Gagal Mengambil Berkas',
        message: 'Terjadi kendala saat mengakses kamera atau penyimpanan perangkat.',
        type: 'danger',
      });
    }
  };

  const handlePickDocPhoto = (preferredSource?: 'camera' | 'gallery') => {
    if (preferredSource === 'camera' || preferredSource === 'gallery') {
      openDocPicker(preferredSource);
      return;
    }

    showPhotoPicker({
      title: 'Pilih Sumber Dokumen',
      description: 'Pilih metode pengunggahan dokumen bukti fisik:',
      onSelectCamera: () => openDocPicker('camera'),
      onSelectGallery: () => openDocPicker('gallery'),
    });
  };

  // ==========================================
  // Handlers Verifikasi Akun (KTP + Swafoto)
  // ==========================================
  const openVerifyModal = () => {
    setKtpPhotoUri(user?.foto_ktp_path || null);
    setKtpPhotoBase64(null);
    setSelfiePhotoUri(user?.foto_selfie_ktp_path || null);
    setSelfiePhotoBase64(null);
    setShowVerifyUploadModal(true);
  };

  const pickVerifyImage = async (
    target: 'ktp' | 'selfie',
    source: 'camera' | 'gallery'
  ) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert({
            title: 'Izin Kamera Diperlukan',
            message: 'Mohon berikan izin akses kamera pada pengaturan perangkat untuk memotret dokumen fisik.',
            type: 'warning',
          });
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: target === 'ktp' ? [16, 10] : [3, 4],
          quality: 0.8,
          base64: true,
        });
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: target === 'ktp' ? [16, 10] : [3, 4],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        if (target === 'ktp') {
          setKtpPhotoUri(result.assets[0].uri);
          setKtpPhotoBase64(result.assets[0].base64 || null);
        } else {
          setSelfiePhotoUri(result.assets[0].uri);
          setSelfiePhotoBase64(result.assets[0].base64 || null);
        }
      }
    } catch (e) {
      showAlert({
        title: 'Gagal Mengambil Gambar',
        message: 'Terjadi kendala saat mengakses kamera atau galeri perangkat.',
        type: 'danger',
      });
    }
  };

  const handleSaveVerifyDocs = async () => {
    if (!ktpPhotoUri) {
      showAlert({
        title: 'Berkas Belum Lengkap',
        message: 'Mohon lampirkan Foto Fisik e-KTP terlebih dahulu.',
        type: 'warning',
      });
      return;
    }
    if (!selfiePhotoUri) {
      showAlert({
        title: 'Berkas Belum Lengkap',
        message: 'Mohon lampirkan Foto Anda sedang memegang e-KTP (Swafoto).',
        type: 'warning',
      });
      return;
    }
    if (!user) {
      showAlert({
        title: 'Perhatian',
        message: 'Sesi warga tidak aktif. Silakan masuk kembali.',
        type: 'warning',
      });
      return;
    }

    setSavingVerifyDocs(true);
    try {
      const res = await api.uploadCitizenVerificationDocs({
        citizenId: user.id,
        fotoKtpUri: ktpPhotoUri,
        fotoKtpBase64: ktpPhotoBase64,
        fotoSelfieUri: selfiePhotoUri,
        fotoSelfieBase64: selfiePhotoBase64,
      });

      if (res.success && res.data) {
        setUser(res.data);
        const fam = await api.getFamilyMembers();
        setFamilyMembers(fam);
        await refreshUser();
        setShowVerifyUploadModal(false);
        showAlert({
          title: 'Berkas Berhasil Terkirim',
          message: 'Foto fisik e-KTP dan Swafoto Anda telah berhasil dikirimkan ke antrean validasi Operator Desa. Mohon tunggu proses verifikasi data.',
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Gagal Mengunggah',
          message: res.message || 'Terjadi kendala saat menyimpan berkas verifikasi.',
          type: 'danger',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Kesalahan',
        message: err?.message || 'Gagal mengunggah berkas verifikasi.',
        type: 'danger',
      });
    } finally {
      setSavingVerifyDocs(false);
    }
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
      setPreviewActiveIndex(0);
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

  const handleAddFamilyMember = async () => {
    if (!newNik.trim() || newNik.trim().length !== 16 || !/^\d+$/.test(newNik.trim())) {
      showAlert({
        title: 'Perhatian',
        message: 'NIK harus terdiri dari tepat 16 digit angka sesuai KTP/KIA/Akta.',
        type: 'warning',
      });
      return;
    }
    if (!newNama.trim()) {
      showAlert({
        title: 'Perhatian',
        message: 'Nama lengkap wajib diisi sesuai KTP/Akta.',
        type: 'warning',
      });
      return;
    }

    setSavingMember(true);
    try {
      const res = await api.addFamilyMember({
        nik: newNik.trim(),
        nama_lengkap: newNama.trim(),
        jenis_kelamin: newGender,
        status_keluarga: newRole,
        tanggal_lahir: newBirthDate.trim() || '2005-01-01',
        pekerjaan: newJob.trim() || 'Pelajar/Belum Bekerja',
        foto_kk_path: docPhotoUri || undefined,
        document_type: selectedDocType,
        base64: docPhotoBase64 || undefined,
      } as any);

      if (res.success) {
        showAlert({
          title: 'Anggota Keluarga Ditambahkan',
          message: `${newNama.trim()} (${newRole}) berhasil didaftarkan ke Kartu Keluarga Anda dengan status Menunggu Verifikasi Operator Desa.`,
          type: 'success',
        });
        const updated = await api.getFamilyMembers();
        setFamilyMembers(updated);
        setNewNik('');
        setNewNama('');
        setNewGender('L');
        setNewRole('Anak');
        setNewBirthDate('');
        setNewJob('Pelajar/Mahasiswa');
        setDocPhotoUri(null);
        setDocPhotoBase64(null);
        setSelectedDocType(DOCUMENT_TYPES[0]);
        setShowAddModal(false);
      } else {
        showAlert({
          title: 'Gagal Menambahkan',
          message: res.message || 'Terjadi gangguan saat menyimpan data.',
          type: 'danger',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Kesalahan',
        message: err?.message || 'Gagal menyimpan anggota keluarga.',
        type: 'danger',
      });
    } finally {
      setSavingMember(false);
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
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Tambah Anggota Keluarga</Text>
                <Text style={styles.modalSub}>
                  {user?.no_kk ? `No. KK: ${user.no_kk}` : 'No. KK: Belum diisi'}
                  {(user?.rt || user?.rw) ? ` (RT ${user?.rt || '-'}/RW ${user?.rw || '-'})` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* NIK */}
              <View style={styles.modalInputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.modalInputLabel}>Nomor Induk Kependudukan (NIK)</Text>
                  <Text style={[styles.charCount, newNik.length === 16 && { color: Colors.primaryDark, fontWeight: '700' }]}>
                    {newNik.length}/16 digit
                  </Text>
                </View>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="16 digit angka sesuai KTP / KIA / Akta"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={16}
                  value={newNik}
                  onChangeText={setNewNik}
                />
              </View>

              {/* NAMA LENGKAP */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Nama Lengkap (Sesuai KTP / Akta)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: Siti Rahmawati / Doni Subarjo"
                  placeholderTextColor={Colors.textMuted}
                  value={newNama}
                  onChangeText={setNewNama}
                />
              </View>

              {/* HUBUNGAN KELUARGA */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Hubungan dalam Keluarga</Text>
                <View style={styles.chipsRow}>
                  {ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.chipPill, newRole === role && styles.chipPillActive]}
                      onPress={() => setNewRole(role)}
                    >
                      <Text style={[styles.chipText, newRole === role && styles.chipTextActive]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* JENIS KELAMIN */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Jenis Kelamin</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, newGender === 'L' && styles.genderBtnActive]}
                    onPress={() => setNewGender('L')}
                  >
                    <Ionicons
                      name="man"
                      size={18}
                      color={newGender === 'L' ? Colors.primaryDark : Colors.textSecondary}
                    />
                    <Text style={[styles.genderText, newGender === 'L' && styles.genderTextActive]}>
                      Laki-laki (L)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, newGender === 'P' && styles.genderBtnActive]}
                    onPress={() => setNewGender('P')}
                  >
                    <Ionicons
                      name="woman"
                      size={18}
                      color={newGender === 'P' ? Colors.primaryDark : Colors.textSecondary}
                    />
                    <Text style={[styles.genderText, newGender === 'P' && styles.genderTextActive]}>
                      Perempuan (P)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TANGGAL LAHIR */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Tanggal Lahir (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: 2010-08-17"
                  placeholderTextColor={Colors.textMuted}
                  value={newBirthDate}
                  onChangeText={setNewBirthDate}
                />
              </View>

              {/* PEKERJAAN */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Pekerjaan / Aktivitas</Text>
                <View style={styles.chipsRow}>
                  {JOB_OPTIONS.map((job) => (
                    <TouchableOpacity
                      key={job}
                      style={[styles.chipPill, newJob === job && styles.chipPillActive]}
                      onPress={() => setNewJob(job)}
                    >
                      <Text style={[styles.chipText, newJob === job && styles.chipTextActive]}>
                        {job}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* UPLOAD DOKUMEN BUKTI FISIK */}
              <View style={styles.modalInputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.modalInputLabel}>Dokumen Bukti Fisik</Text>
                  <Text style={styles.reqBadge}>Disarankan</Text>
                </View>
                <Text style={styles.inputHint}>
                  Pilih jenis dokumen pendukung yang dilampirkan:
                </Text>
                <View style={[styles.chipsRow, { marginBottom: 10 }]}>
                  {DOCUMENT_TYPES.map((dtype) => (
                    <TouchableOpacity
                      key={dtype}
                      style={[styles.chipPill, selectedDocType === dtype && styles.chipPillActive]}
                      onPress={() => setSelectedDocType(dtype)}
                    >
                      <Text style={[styles.chipText, selectedDocType === dtype && styles.chipTextActive]}>
                        {dtype}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {docPhotoUri ? (
                  <View style={styles.docPreviewCard}>
                    <Image source={{ uri: docPhotoUri }} style={styles.docThumbnail} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.docAttachedTitle} numberOfLines={1}>
                        {selectedDocType}
                      </Text>
                      <Text style={styles.docAttachedSub}>Foto siap dikirim ke operator desa</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                        <TouchableOpacity
                          style={styles.changePhotoBtn}
                          onPress={() => handlePickDocPhoto()}
                        >
                          <Ionicons name="camera-reverse" size={13} color={Colors.primaryDark} />
                          <Text style={styles.changePhotoBtnText}>Ganti</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => setDocPhotoUri(null)}
                        >
                          <Ionicons name="trash" size={13} color="#DC2626" />
                          <Text style={styles.removePhotoBtnText}>Hapus</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadOptionsRow}>
                    <TouchableOpacity
                      style={styles.uploadOptionCard}
                      activeOpacity={0.82}
                      onPress={() => handlePickDocPhoto('camera')}
                    >
                      <View style={[styles.uploadOptionIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="camera" size={22} color="#16A34A" />
                      </View>
                      <Text style={styles.uploadOptionTitle}>Ambil Kamera</Text>
                      <Text style={styles.uploadOptionSub}>Foto fisik langsung</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadOptionCard}
                      activeOpacity={0.82}
                      onPress={() => handlePickDocPhoto('gallery')}
                    >
                      <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="folder-open" size={22} color="#D97706" />
                      </View>
                      <Text style={styles.uploadOptionTitle}>File / Galeri HP</Text>
                      <Text style={styles.uploadOptionSub}>Cari file di memori</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* MODAL FOOTER ACTIONS */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
                disabled={savingMember}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingMember && { opacity: 0.7 }]}
                onPress={handleAddFamilyMember}
                disabled={savingMember}
              >
                {savingMember ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Simpan Anggota</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EDIT PROFIL WARGA / ANGGOTA KELUARGA */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!savingEdit) setShowEditModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editIsSelf ? 'Edit Profil Warga' : 'Edit Data Anggota Keluarga'}
                </Text>
                <Text style={styles.modalSub}>
                  Sinkronisasi langsung dengan buku induk kependudukan desa
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={savingEdit}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* NIK INFORMASI (TERKUNCI) */}
              <View style={styles.modalInputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.modalInputLabel}>Nomor Induk Kependudukan (NIK)</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={10} color="#64748B" />
                    <Text style={styles.lockedBadgeText}>Terkunci (Identitas Pokok)</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.modalTextInput, styles.readOnlyInput]}
                  value={editNik}
                  editable={false}
                />
              </View>

              {/* NAMA LENGKAP */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Nama Lengkap (Sesuai KTP / KK)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={Colors.textMuted}
                  value={editNama}
                  onChangeText={setEditNama}
                />
              </View>

              {/* NOMOR KARTU KELUARGA (NO KK) */}
              <View style={styles.modalInputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.modalInputLabel}>Nomor Kartu Keluarga (No. KK)</Text>
                  <Text style={[styles.charCount, editNoKk.length === 16 && { color: Colors.primaryDark, fontWeight: '700' }]}>
                    {editNoKk.length}/16 digit
                  </Text>
                </View>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="16 digit angka No. KK"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={16}
                  value={editNoKk}
                  onChangeText={setEditNoKk}
                />
              </View>

              {/* HUBUNGAN / PERAN DALAM KELUARGA */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Hubungan dalam Keluarga</Text>
                <View style={styles.chipsRow}>
                  {ALL_ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.chipPill, editRole === role && styles.chipPillActive]}
                      onPress={() => setEditRole(role)}
                    >
                      <Text style={[styles.chipText, editRole === role && styles.chipTextActive]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* JENIS KELAMIN */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Jenis Kelamin</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, editGender === 'L' && styles.genderBtnActive]}
                    onPress={() => setEditGender('L')}
                  >
                    <Ionicons
                      name="man"
                      size={18}
                      color={editGender === 'L' ? Colors.primaryDark : Colors.textSecondary}
                    />
                    <Text style={[styles.genderText, editGender === 'L' && styles.genderTextActive]}>
                      Laki-laki (L)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, editGender === 'P' && styles.genderBtnActive]}
                    onPress={() => setEditGender('P')}
                  >
                    <Ionicons
                      name="woman"
                      size={18}
                      color={editGender === 'P' ? Colors.primaryDark : Colors.textSecondary}
                    />
                    <Text style={[styles.genderText, editGender === 'P' && styles.genderTextActive]}>
                      Perempuan (P)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TANGGAL LAHIR */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Tanggal Lahir (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: 1990-05-20"
                  placeholderTextColor={Colors.textMuted}
                  value={editBirthDate}
                  onChangeText={setEditBirthDate}
                />
              </View>

              {/* PEKERJAAN */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Pekerjaan</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: Wiraswasta / Karyawan / Petani"
                  placeholderTextColor={Colors.textMuted}
                  value={editJob}
                  onChangeText={setEditJob}
                />
                <View style={[styles.chipsRow, { marginTop: 8 }]}>
                  {JOB_OPTIONS.slice(0, 6).map((job) => (
                    <TouchableOpacity
                      key={job}
                      style={[styles.chipPillSmall, editJob === job && styles.chipPillActive]}
                      onPress={() => setEditJob(job)}
                    >
                      <Text style={[styles.chipTextSmall, editJob === job && styles.chipTextActive]}>
                        {job}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* WILAYAH RT / RW */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Wilayah Rukun Tetangga (RT) & RW</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="RT (contoh: 01)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      value={editRt}
                      onChangeText={setEditRt}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="RW (contoh: 02)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      value={editRw}
                      onChangeText={setEditRw}
                    />
                  </View>
                </View>
              </View>

              {/* DUSUN */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Dusun / Lingkungan</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: Dusun Krajan / Dusun 01"
                  placeholderTextColor={Colors.textMuted}
                  value={editDusun}
                  onChangeText={setEditDusun}
                />
              </View>

              {/* ALAMAT LENGKAP */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Alamat Lengkap Domisili</Text>
                <TextInput
                  style={[styles.modalTextInput, { minHeight: 64, textAlignVertical: 'top' }]}
                  placeholder="Contoh: Jl. Merdeka No. 12"
                  placeholderTextColor={Colors.textMuted}
                  multiline={true}
                  numberOfLines={2}
                  value={editAlamat}
                  onChangeText={setEditAlamat}
                />
              </View>
            </ScrollView>

            {/* MODAL FOOTER ACTIONS */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={savingEdit}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Simpan ke Server</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL UNGGAH 2 BERKAS VERIFIKASI (KTP & SWAFOTO) */}
      <Modal
        visible={showVerifyUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!savingVerifyDocs) setShowVerifyUploadModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Lampirkan Foto KTP & Swafoto</Text>
                <Text style={styles.modalSub}>
                  Wajib 2 berkas fisik untuk validasi akun oleh Operator Desa
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowVerifyUploadModal(false)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={savingVerifyDocs}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* SLOT 1: FOTO FISIK KTP */}
              <View style={styles.verifySlotCard}>
                <View style={styles.verifySlotHeader}>
                  <View style={[styles.verifySlotNumber, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.verifySlotNumberText, { color: '#2563EB' }]}>1</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.verifySlotTitle}>Foto Fisik e-KTP Asli</Text>
                    <Text style={styles.verifySlotSub}>
                      Posisikan KTP secara horizontal. Pastikan teks NIK, nama, dan foto terlihat jelas tanpa pantulan kilap.
                    </Text>
                  </View>
                </View>

                {ktpPhotoUri ? (
                  <View style={styles.verifyDocPreview}>
                    <Image source={{ uri: ktpPhotoUri }} style={styles.verifyDocThumbnail} resizeMode="cover" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.docStatusRow}>
                        <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                        <Text style={styles.docStatusSuccess}>Foto e-KTP Terlampir</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={styles.slotActionBtn}
                          onPress={() => pickVerifyImage('ktp', 'camera')}
                        >
                          <Ionicons name="camera" size={13} color={Colors.primaryDark} />
                          <Text style={styles.slotActionBtnText}>Kamera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.slotActionBtn}
                          onPress={() => pickVerifyImage('ktp', 'gallery')}
                        >
                          <Ionicons name="folder-open" size={13} color={Colors.primaryDark} />
                          <Text style={styles.slotActionBtnText}>Galeri</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.slotDeleteBtn}
                          onPress={() => {
                            setKtpPhotoUri(null);
                            setKtpPhotoBase64(null);
                          }}
                        >
                          <Ionicons name="trash" size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.slotPickerRow}>
                    <TouchableOpacity
                      style={styles.slotPickerBtn}
                      activeOpacity={0.82}
                      onPress={() => pickVerifyImage('ktp', 'camera')}
                    >
                      <Ionicons name="camera" size={18} color="#16A34A" />
                      <Text style={styles.slotPickerBtnText}>Ambil Foto (Kamera)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.slotPickerBtn}
                      activeOpacity={0.82}
                      onPress={() => pickVerifyImage('ktp', 'gallery')}
                    >
                      <Ionicons name="folder-open" size={18} color="#D97706" />
                      <Text style={styles.slotPickerBtnText}>File / Galeri HP</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* SLOT 2: SWAFOTO MEMEGANG KTP */}
              <View style={[styles.verifySlotCard, { marginTop: 12 }]}>
                <View style={styles.verifySlotHeader}>
                  <View style={[styles.verifySlotNumber, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.verifySlotNumberText, { color: '#D97706' }]}>2</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.verifySlotTitle}>Swafoto Pemilik Memegang e-KTP</Text>
                    <Text style={styles.verifySlotSub}>
                      Pegang e-KTP Anda di samping dada/wajah. Pastikan wajah Anda dan kartu e-KTP keduanya fokus dan terang.
                    </Text>
                  </View>
                </View>

                {selfiePhotoUri ? (
                  <View style={styles.verifyDocPreview}>
                    <Image source={{ uri: selfiePhotoUri }} style={styles.verifyDocThumbnail} resizeMode="cover" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.docStatusRow}>
                        <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                        <Text style={styles.docStatusSuccess}>Swafoto Terlampir</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={styles.slotActionBtn}
                          onPress={() => pickVerifyImage('selfie', 'camera')}
                        >
                          <Ionicons name="camera" size={13} color={Colors.primaryDark} />
                          <Text style={styles.slotActionBtnText}>Kamera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.slotActionBtn}
                          onPress={() => pickVerifyImage('selfie', 'gallery')}
                        >
                          <Ionicons name="folder-open" size={13} color={Colors.primaryDark} />
                          <Text style={styles.slotActionBtnText}>Galeri</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.slotDeleteBtn}
                          onPress={() => {
                            setSelfiePhotoUri(null);
                            setSelfiePhotoBase64(null);
                          }}
                        >
                          <Ionicons name="trash" size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.slotPickerRow}>
                    <TouchableOpacity
                      style={styles.slotPickerBtn}
                      activeOpacity={0.82}
                      onPress={() => pickVerifyImage('selfie', 'camera')}
                    >
                      <Ionicons name="camera" size={18} color="#16A34A" />
                      <Text style={styles.slotPickerBtnText}>Ambil Foto (Kamera)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.slotPickerBtn}
                      activeOpacity={0.82}
                      onPress={() => pickVerifyImage('selfie', 'gallery')}
                    >
                      <Ionicons name="folder-open" size={18} color="#D97706" />
                      <Text style={styles.slotPickerBtnText}>File / Galeri HP</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* MODAL FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowVerifyUploadModal(false)}
                disabled={savingVerifyDocs}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!ktpPhotoUri || !selfiePhotoUri || savingVerifyDocs) && { opacity: 0.6 },
                ]}
                onPress={handleSaveVerifyDocs}
                disabled={savingVerifyDocs || !ktpPhotoUri || !selfiePhotoUri}
              >
                {savingVerifyDocs ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Kirim Berkas Verifikasi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL LIHAT BUKTI BERKAS (MULTI & SINGLE) */}
      <Modal
        visible={previewPhotos.length > 0 || !!previewPhotoUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPreviewPhotos([]);
          setPreviewPhotoUri(null);
        }}
      >
        <View style={styles.previewOverlay}>
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.previewTopBar}>
              <View>
                <Text style={styles.previewTitle}>Bukti Dokumen Fisik</Text>
                <Text style={styles.previewSub}>
                  {previewPhotos.length > 0
                    ? `Berkas ${previewActiveIndex + 1} dari ${previewPhotos.length}: ${previewPhotos[previewActiveIndex]?.label}`
                    : 'Lampiran verifikasi data kependudukan'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => {
                  setPreviewPhotos([]);
                  setPreviewPhotoUri(null);
                }}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* TABS SELECTOR JIKA BERKAS LEBIH DARI 1 */}
            {previewPhotos.length > 1 && (
              <View style={styles.previewTabsRow}>
                {previewPhotos.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.previewTabItem,
                      previewActiveIndex === idx && styles.previewTabItemActive,
                    ]}
                    onPress={() => setPreviewActiveIndex(idx)}
                  >
                    <Text
                      style={[
                        styles.previewTabText,
                        previewActiveIndex === idx && styles.previewTabTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.previewImageWrapper}>
              {previewPhotos.length > 0 ? (
                <Image
                  source={{ uri: previewPhotos[previewActiveIndex]?.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : previewPhotoUri ? (
                <Image
                  source={{ uri: previewPhotoUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <View style={styles.previewBottomBar}>
              <TouchableOpacity
                style={styles.previewDoneBtn}
                onPress={() => {
                  setPreviewPhotos([]);
                  setPreviewPhotoUri(null);
                }}
              >
                <Text style={styles.previewDoneBtnText}>Tutup Tampilan</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#64748B',
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
    borderColor: '#E2E8F0',
  },
  chipPillSmall: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipTextSmall: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Spacing.radiusXl * 1.3,
    borderTopRightRadius: Spacing.radiusXl * 1.3,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalInputLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  charCount: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  modalTextInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    paddingHorizontal: 14,
    height: 46,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radiusFull,
  },
  chipPillActive: {
    backgroundColor: Colors.bento.hero.bg,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
  },
  genderBtnActive: {
    backgroundColor: Colors.bento.hero.bg,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  genderText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  genderTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusFull,
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radiusFull,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  reqBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontFamily: Fonts.bold,
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  inputHint: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadOptionCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: Spacing.radiusLg,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadOptionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  uploadOptionSub: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  uploadDocDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: Spacing.radiusLg,
    padding: 14,
  },
  uploadDocIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bento.hero.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDocTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  uploadDocSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Spacing.radiusLg,
    padding: 10,
  },
  docThumbnail: {
    width: 68,
    height: 68,
    borderRadius: Spacing.radiusMd,
    backgroundColor: '#E2E8F0',
  },
  docAttachedTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  docAttachedSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#16A34A',
    marginTop: 2,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  changePhotoBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  removePhotoBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#DC2626',
  },
  // FULLSCREEN PREVIEW MODAL
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  previewContainer: {
    flex: 1,
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  previewSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  previewCloseBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  previewImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    alignItems: 'center',
  },
  previewDoneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Spacing.radiusFull,
  },
  previewDoneBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  // VERIFY UPLOAD MODAL SLOTS
  verifySlotCard: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    padding: 14,
  },
  verifySlotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verifySlotNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifySlotNumberText: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
  },
  verifySlotTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  verifySlotSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  verifyDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: Spacing.radiusMd,
    padding: 10,
  },
  verifyDocThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docStatusSuccess: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#16A34A',
  },
  slotActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  slotActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  slotDeleteBtn: {
    padding: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
    borderRadius: Spacing.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  slotPickerBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  // PREVIEW TABS
  previewTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTabItemActive: {
    backgroundColor: Colors.primary,
  },
  previewTabText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewTabTextActive: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
});
