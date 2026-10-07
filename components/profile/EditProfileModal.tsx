// components/profile/EditProfileModal.tsx
import React, { useState, useEffect } from 'react';
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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Citizen } from '@/store/mockData';
import { api } from '@/services/api';
import { useAlert } from '@/context/AlertContext';

const ALL_ROLE_OPTIONS = [
  'Kepala Keluarga',
  'Istri',
  'Anak',
  'Orang Tua',
  'Mertua',
  'Famili Lain',
];

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

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  targetMember: Citizen | null;
  currentUser: Citizen | null;
  onSuccess: () => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  targetMember,
  currentUser,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [editMemberId, setEditMemberId] = useState('');
  const [editIsSelf, setEditIsSelf] = useState(true);
  const [editNik, setEditNik] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editGender, setEditGender] = useState<'L' | 'P'>('L');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editJob, setEditJob] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (visible && targetMember) {
      const isSelf = targetMember.id === currentUser?.id || targetMember.nik === currentUser?.nik;
      setEditMemberId(targetMember.id);
      setEditIsSelf(isSelf);
      setEditNik(targetMember.nik || '');
      setEditNama(targetMember.nama_lengkap || '');
      setEditNoKk(targetMember.no_kk || currentUser?.no_kk || '');
      setEditRole(targetMember.status_keluarga || 'Kepala Keluarga');
      setEditGender((targetMember.jenis_kelamin as 'L' | 'P') || 'L');
      setEditBirthDate(targetMember.tanggal_lahir || '');
      setEditJob(targetMember.pekerjaan || '');
      setEditRt(targetMember.rt || currentUser?.rt || '');
      setEditRw(targetMember.rw || currentUser?.rw || '');
      setEditDusun(targetMember.dusun || currentUser?.dusun || '');
      setEditAlamat(targetMember.alamat_lengkap || currentUser?.alamat_lengkap || '');
    }
  }, [visible, targetMember, currentUser]);

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
        onClose();
        await onSuccess();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!savingEdit) onClose();
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
              onPress={onClose}
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
                <Text
                  style={[
                    styles.charCount,
                    editNoKk.length === 16 && { color: Colors.primaryDark, fontWeight: '700' },
                  ]}
                >
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
              onPress={onClose}
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
                  <Ionicons
                    name="cloud-upload-outline"
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.saveBtnText}>Simpan ke Server</Text>
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

export default EditProfileModal;
