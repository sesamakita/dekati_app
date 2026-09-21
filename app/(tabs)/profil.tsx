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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Citizen } from '@/store/mockData';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const ROLE_OPTIONS = ['Istri', 'Anak', 'Orang Tua', 'Mertua', 'Famili Lain'];
const JOB_OPTIONS = [
  'Pelajar/Mahasiswa',
  'Mengurus Rumah Tangga',
  'Belum Bekerja',
  'Wiraswasta',
  'Karyawan Swasta',
  'Petani/Pekebun',
];

export default function ProfilScreen() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState<Citizen | null>(authUser);
  const [familyMembers, setFamilyMembers] = useState<Citizen[]>([]);
  const [showNik, setShowNik] = useState(false);

  // State Modal Tambah Anggota Keluarga
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNik, setNewNik] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [newRole, setNewRole] = useState('Anak');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newJob, setNewJob] = useState('Pelajar/Mahasiswa');
  const [savingMember, setSavingMember] = useState(false);

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
    const text = encodeURIComponent(
      `Halo Petugas Pelayanan ${Config.villageName}, saya warga atas nama ${user?.nama_lengkap} (NIK: ${user?.nik}) ingin menanyakan perihal layanan desa.`
    );
    Linking.openURL(`https://wa.me/6281234567890?text=${text}`);
  };

  const handleAddFamilyMember = async () => {
    if (!newNik.trim() || newNik.trim().length !== 16 || !/^\d+$/.test(newNik.trim())) {
      Alert.alert('Perhatian', 'NIK harus terdiri dari tepat 16 digit angka sesuai KTP/KIA/Akta.');
      return;
    }
    if (!newNama.trim()) {
      Alert.alert('Perhatian', 'Nama lengkap wajib diisi sesuai KTP/Akta.');
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
      });

      if (res.success) {
        Alert.alert(
          'Anggota Keluarga Ditambahkan',
          `${newNama.trim()} (${newRole}) berhasil didaftarkan ke dalam Kartu Keluarga Anda. Anda dapat langsung mengurus surat atas nama beliau.`
        );
        const updated = await api.getFamilyMembers();
        setFamilyMembers(updated);
        setNewNik('');
        setNewNama('');
        setNewGender('L');
        setNewRole('Anak');
        setNewBirthDate('');
        setNewJob('Pelajar/Mahasiswa');
        setShowAddModal(false);
      } else {
        Alert.alert('Gagal Menambahkan', res.message || 'Terjadi gangguan saat menyimpan data.');
      }
    } catch (err: any) {
      Alert.alert('Kesalahan', err?.message || 'Gagal menyimpan anggota keluarga.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteFamilyMember = (member: Citizen) => {
    if (member.nik === user?.nik || member.status_keluarga === 'Kepala Keluarga') {
      Alert.alert('Tidak Dapat Dihapus', 'Data Kepala Keluarga merupakan akun utama pemegang profil.');
      return;
    }

    Alert.alert(
      'Hapus Anggota Keluarga',
      `Apakah Anda yakin ingin menghapus ${member.nama_lengkap} (${member.status_keluarga}) dari daftar Kartu Keluarga ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await api.deleteFamilyMember(member.id);
            const updated = await api.getFamilyMembers();
            setFamilyMembers(updated);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Kependudukan</Text>
        <Text style={styles.headerSubtitle}>
          Buku Induk Kependudukan Warga {Config.villageName}
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
                {user ? user.nama_lengkap.slice(0, 2).toUpperCase() : 'AS'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.name}>{user?.nama_lengkap}</Text>
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
              <Text style={styles.kkText}>No. KK: {user?.no_kk}</Text>
            </View>
          </View>

          <View style={styles.verifyRow}>
            <View style={styles.verifyBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
              <Text style={styles.verifyText}>Data Terverifikasi Sesuai KTP Fisik</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Wilayah</Text>
              <Text style={styles.infoVal}>RT {user?.rt} / RW {user?.rw}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dusun</Text>
              <Text style={styles.infoVal}>{user?.dusun}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Peran Keluarga</Text>
              <Text style={styles.infoVal}>{user?.status_keluarga}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pekerjaan</Text>
              <Text style={styles.infoVal}>{user?.pekerjaan}</Text>
            </View>
          </View>
        </View>

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
              <Text style={styles.addFamilyBtnText}>+ Tambah</Text>
            </TouchableOpacity>
          </View>

          {familyMembers.map((member) => {
            const isSelf = member.nik === user?.nik || member.status_keluarga === 'Kepala Keluarga';
            return (
              <View key={member.id} style={styles.familyCard}>
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
                    {member.status_keluarga} • {member.pekerjaan}
                  </Text>
                  <Text style={styles.familyNik}>NIK: {member.nik}</Text>
                </View>

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
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  </TouchableOpacity>
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
              Alert.alert(
                'Perlindungan Data Pribadi (UU PDP)',
                'Aplikasi Dekati melindungi data identitas kependudukan (NIK & KK) Anda sesuai standar keamanan enkripsi. Data hanya digunakan untuk keperluan pelayanan administrasi resmi desa.'
              )
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
                Alert.alert(
                  'Keluar Akun Warga',
                  'Apakah Anda yakin ingin keluar dari akun warga saat ini?',
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Keluar',
                      style: 'destructive',
                      onPress: async () => {
                        await logout();
                        await api.logoutCitizen();
                        router.replace('/(auth)/login');
                      }
                    }
                  ]
                );
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
                  No. KK: {user?.no_kk || '3201010000000001'} (RT {user?.rt}/RW {user?.rw})
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
});
