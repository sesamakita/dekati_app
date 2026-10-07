// components/profile/VerifyDocsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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

export interface VerifyDocsModalProps {
  visible: boolean;
  onClose: () => void;
  user: Citizen | null;
  onSuccess: (updatedUser: Citizen) => void;
}

export const VerifyDocsModal: React.FC<VerifyDocsModalProps> = ({
  visible,
  onClose,
  user,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [ktpPhotoUri, setKtpPhotoUri] = useState<string | null>(null);
  const [ktpPhotoBase64, setKtpPhotoBase64] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null);
  const [selfiePhotoBase64, setSelfiePhotoBase64] = useState<string | null>(null);
  const [savingVerifyDocs, setSavingVerifyDocs] = useState(false);

  useEffect(() => {
    if (visible) {
      setKtpPhotoUri(user?.foto_ktp_path || null);
      setKtpPhotoBase64(null);
      setSelfiePhotoUri(user?.foto_selfie_ktp_path || null);
      setSelfiePhotoBase64(null);
    }
  }, [visible, user]);

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
    } catch {
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
        onSuccess(res.data);
        onClose();
        showAlert({
          title: 'Berkas Berhasil Terkirim',
          message:
            'Foto fisik e-KTP dan Swafoto Anda telah berhasil dikirimkan ke antrean validasi Operator Desa. Mohon tunggu proses verifikasi data.',
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!savingVerifyDocs) onClose();
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
              onPress={onClose}
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
              onPress={onClose}
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
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.saveBtnText}>Kirim Berkas Verifikasi</Text>
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

export default VerifyDocsModal;
