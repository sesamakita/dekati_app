// components/profile/AddFamilyMemberModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Citizen } from '@/store/mockData';
import { api } from '@/services/api';
import { useAlert } from '@/context/AlertContext';

const ROLE_OPTIONS = ['Istri', 'Anak', 'Orang Tua', 'Mertua', 'Famili Lain'];
const JOB_OPTIONS = [
  'Pelajar/Mahasiswa',
  'Karyawan Swasta',
  'PNS/TNI/Polri',
  'Wiraswasta/Pedagang',
  'Petani/Peternak',
  'Buruh Harian Lepas',
  'Mengurus Rumah Tangga',
  'Belum/Tidak Bekerja',
];
const DOCUMENT_TYPES = [
  'KTP-el',
  'Akta Kelahiran',
  'Kartu Identitas Anak (KIA)',
  'Kartu Keluarga (KK)',
  'Ijazah',
  'Surat Nikah',
  'Lainnya',
];

export interface AddFamilyMemberModalProps {
  visible: boolean;
  onClose: () => void;
  user: Citizen | null;
  onSuccess: () => Promise<void> | void;
}

export const AddFamilyMemberModal: React.FC<AddFamilyMemberModalProps> = ({
  visible,
  onClose,
  user,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [newNik, setNewNik] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPeran, setNewPeran] = useState('Anak');
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newJob, setNewJob] = useState('Pelajar/Mahasiswa');
  const [selectedDocType, setSelectedDocType] = useState('Akta Kelahiran');
  const [docPhotoUri, setDocPhotoUri] = useState<string | null>(null);
  const [docPhotoBase64, setDocPhotoBase64] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const resetForm = () => {
    setNewNik('');
    setNewNama('');
    setNewPeran('Anak');
    setNewGender('L');
    setNewBirthDate('');
    setNewJob('Pelajar/Mahasiswa');
    setSelectedDocType('Akta Kelahiran');
    setDocPhotoUri(null);
    setDocPhotoBase64(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
    } catch {
      showAlert({
        title: 'Gagal Mengambil Berkas',
        message: 'Terjadi kendala saat mengakses kamera atau penyimpanan perangkat.',
        type: 'danger',
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
        status_keluarga: newPeran,
        tanggal_lahir: newBirthDate.trim() || '2005-01-01',
        pekerjaan: newJob.trim() || 'Pelajar/Belum Bekerja',
        foto_kk_path: docPhotoUri || undefined,
        document_type: selectedDocType,
        base64: docPhotoBase64 || undefined,
      } as any);

      if (res.success) {
        showAlert({
          title: 'Anggota Keluarga Ditambahkan',
          message: `${newNama.trim()} (${newPeran}) berhasil didaftarkan ke dalam basis data keluarga Anda.`,
          type: 'success',
        });
        resetForm();
        onClose();
        await onSuccess();
      } else {
        showAlert({
          title: 'Gagal Menambahkan',
          message: res.message || 'Terjadi kesalahan saat mendaftarkan anggota keluarga.',
          type: 'danger',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Kesalahan',
        message: err?.message || 'Gagal menyimpan data anggota keluarga.',
        type: 'danger',
      });
    } finally {
      setSavingMember(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
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
                {user?.rt || user?.rw ? ` (RT ${user?.rt || '-'}/RW ${user?.rw || '-'})` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
                <Text
                  style={[
                    styles.charCount,
                    newNik.length === 16 && { color: Colors.primaryDark, fontWeight: '700' },
                  ]}
                >
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
                    style={[styles.chipPill, newPeran === role && styles.chipPillActive]}
                    onPress={() => setNewPeran(role)}
                  >
                    <Text style={[styles.chipText, newPeran === role && styles.chipTextActive]}>
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
                        onPress={() => openDocPicker('gallery')}
                      >
                        <Ionicons name="camera-reverse" size={13} color={Colors.primaryDark} />
                        <Text style={styles.changePhotoBtnText}>Ganti</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => {
                          setDocPhotoUri(null);
                          setDocPhotoBase64(null);
                        }}
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
                    onPress={() => openDocPicker('camera')}
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
                    onPress={() => openDocPicker('gallery')}
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
              onPress={handleClose}
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
  );
};

const styles = StyleSheet.create({
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
  modalTextInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  charCount: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radiusFull,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  chipPillActive: {
    backgroundColor: Colors.bento.hero.bg,
    borderColor: Colors.primaryDark,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
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
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusMd,
    paddingVertical: 11,
    gap: 6,
  },
  genderBtnActive: {
    backgroundColor: Colors.bento.hero.bg,
    borderColor: Colors.primaryDark,
  },
  genderText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  genderTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  reqBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontFamily: Fonts.bold,
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inputHint: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Spacing.radiusMd,
    padding: 10,
  },
  docThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  docAttachedTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  docAttachedSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 4,
  },
  removePhotoBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#DC2626',
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadOptionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
    borderRadius: Spacing.radiusMd,
  },
  uploadOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadOptionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  uploadOptionSub: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: Colors.textSecondary,
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

export default AddFamilyMemberModal;
