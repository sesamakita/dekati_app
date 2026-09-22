// app/letters/create.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Header } from '@/components/common/Header';
import { LetterType, Citizen } from '@/store/mockData';

export default function CreateLetterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as { typeId?: string };
  const [types, setTypes] = useState<LetterType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number>(Number(params.typeId) || 1);
  const [familyMembers, setFamilyMembers] = useState<Citizen[]>([]);
  const [selectedCitizenId, setSelectedCitizenId] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [uploadedDocsBase64, setUploadedDocsBase64] = useState<Record<string, string>>({});
  const [previewDocUri, setPreviewDocUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const allTypes = await api.getLetterTypes();
      const family = await api.getFamilyMembers();
      setTypes(allTypes);
      setFamilyMembers(family);
      if (family.length > 0) {
        setSelectedCitizenId(family[0].id);
        if (family[0].foto_kk_path) {
          setUploadedDocs((prev) => ({
            ...prev,
            'Foto Kartu Keluarga (KK)': family[0].foto_kk_path!,
            'Foto KK': family[0].foto_kk_path!,
          }));
        }
      }
    };
    init();
  }, []);

  const selectedType = types.find((t) => t.id === selectedTypeId) || types[0];

  const handleSelectCitizen = (member: Citizen) => {
    setSelectedCitizenId(member.id);
    if (member.foto_kk_path) {
      setUploadedDocs((prev) => ({
        ...prev,
        'Foto Kartu Keluarga (KK)': member.foto_kk_path!,
        'Foto KK': member.foto_kk_path!,
      }));
    }
  };

  const openDocPicker = async (docName: string, source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Izin Kamera Diperlukan',
            'Mohon berikan izin akses kamera pada pengaturan perangkat untuk memotret dokumen persyaratan.'
          );
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
        const asset = result.assets[0];
        setUploadedDocs((prev) => ({
          ...prev,
          [docName]: asset.uri,
        }));
        if (asset.base64) {
          setUploadedDocsBase64((prev) => ({
            ...prev,
            [docName]: asset.base64!,
          }));
        }
      }
    } catch (e) {
      Alert.alert('Gagal Mengambil Berkas', 'Terjadi kendala saat mengakses kamera atau penyimpanan perangkat.');
    }
  };

  const handlePickDocument = (docName: string, preferredSource?: 'camera' | 'gallery') => {
    if (preferredSource === 'camera' || preferredSource === 'gallery') {
      openDocPicker(docName, preferredSource);
      return;
    }

    Alert.alert(
      `Lampirkan ${docName}`,
      'Pilih sumber dokumen persyaratan surat:',
      [
        {
          text: 'Ambil Foto (Kamera)',
          onPress: () => openDocPicker(docName, 'camera'),
        },
        {
          text: 'Cari File / Galeri (Storage HP)',
          onPress: () => openDocPicker(docName, 'gallery'),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  const handleRemoveDocument = (docName: string) => {
    setUploadedDocs((prev) => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });
    setUploadedDocsBase64((prev) => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      Alert.alert('Perhatian', 'Mohon isi kolom keperluan pengajuan surat.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedAttachments = Object.entries(uploadedDocs)
        .filter(([_, url]) => Boolean(url))
        .map(([name, url]) => ({ 
          name, 
          url,
          base64: uploadedDocsBase64[name] || null,
        }));

      const res = await api.submitLetterRequest({
        letter_type_id: selectedTypeId,
        citizen_id: selectedCitizenId,
        purpose: purpose,
        attachments: formattedAttachments,
      });

      Alert.alert(
        'Permohonan Berhasil Dikirim',
        `Nomor pelacakan Anda: ${res.tracking_number}. Operator desa akan segera memproses dokumen Anda.`,
        [
          {
            text: 'Lacak Status Surat',
            onPress: () => router.replace(`/letters/${res.tracking_number}` as any),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengirim permohonan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title="Formulir Pengajuan Surat" showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PILIH JENIS SURAT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>1. Jenis Surat Yang Diajukan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {types.map((t) => {
              const isSelected = selectedTypeId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, isSelected && styles.typeChipActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTypeId(t.id)}
                >
                  <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedType && (
            <View style={styles.typeDescBox}>
              <View style={styles.typeDescIcon}>
                <Ionicons name="information-circle" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.typeDescText}>{selectedType.description}</Text>
            </View>
          )}
        </View>

        {/* PILIH SUBJEK / ANGGOTA KELUARGA */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>2. Subjek Surat (Pilih Warga / Anggota KK)</Text>
          <Text style={styles.sectionSub}>
            Surat dapat diajukan untuk diri sendiri atau atas nama anggota dalam 1 KK.
          </Text>

          <View style={styles.familyList}>
            {familyMembers.map((m) => {
              const isSelected = selectedCitizenId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectCitizen(m)}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.memberName, isSelected && styles.memberNameSelected]}>
                      {m.nama_lengkap}
                    </Text>
                    <Text style={styles.memberNik}>
                      NIK: {m.nik} • ({m.status_keluarga})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* KEPERLUAN SURAT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>3. Keperluan Pengajuan</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Contoh: Untuk persyaratan pendaftaran beasiswa anak di universitas..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={purpose}
            onChangeText={setPurpose}
          />
        </View>

        {/* KELENGKAPAN BERKAS SYARAT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>4. Dokumen Persyaratan</Text>
          <Text style={styles.sectionSub}>
            Lampirkan foto fisik atau file dari memori HP untuk mempercepat proses verifikasi:
          </Text>

          {selectedType?.required_docs.map((doc, idx) => {
            const docUri = uploadedDocs[doc];
            const isUploaded = !!docUri;

            if (isUploaded) {
              return (
                <View key={idx} style={[styles.docCard, styles.docCardAttached]}>
                  <View style={styles.docAttachedRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewDocUri(docUri)}
                      style={styles.docThumbnailWrapper}
                    >
                      <Image source={{ uri: docUri }} style={styles.docThumbnail} />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="scan" size={11} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.docName}>{doc}</Text>
                        <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      </View>
                      <Text style={styles.docAttachedSub}>Dokumen fisik siap dilampirkan</Text>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={styles.docActionMiniBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickDocument(doc)}
                        >
                          <Ionicons name="camera-reverse" size={12} color={Colors.primaryDark} />
                          <Text style={styles.docActionMiniText}>Ganti</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.docActionMiniBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                          activeOpacity={0.8}
                          onPress={() => handleRemoveDocument(doc)}
                        >
                          <Ionicons name="trash" size={12} color="#DC2626" />
                          <Text style={[styles.docActionMiniText, { color: '#DC2626' }]}>Hapus</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.docActionMiniBtn, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}
                          activeOpacity={0.8}
                          onPress={() => setPreviewDocUri(docUri)}
                        >
                          <Ionicons name="eye" size={12} color={Colors.textSecondary} />
                          <Text style={[styles.docActionMiniText, { color: Colors.textSecondary }]}>Lihat</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View key={idx} style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docCardIconCircle}>
                    <Ionicons name="document-text" size={17} color={Colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.docName}>{doc}</Text>
                    <Text style={styles.docStatusUnattached}>Belum dilampirkan</Text>
                  </View>
                  <View style={styles.docRequiredBadge}>
                    <Text style={styles.docRequiredBadgeText}>Wajib</Text>
                  </View>
                </View>

                <View style={styles.docActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.docActionBtnCamera}
                    activeOpacity={0.82}
                    onPress={() => handlePickDocument(doc, 'camera')}
                  >
                    <Ionicons name="camera" size={15} color="#16A34A" />
                    <Text style={styles.docActionBtnCameraText}>Ambil Kamera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.docActionBtnGallery}
                    activeOpacity={0.82}
                    onPress={() => handlePickDocument(doc, 'gallery')}
                  >
                    <Ionicons name="folder-open" size={15} color="#D97706" />
                    <Text style={styles.docActionBtnGalleryText}>File / Galeri HP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.submitButton}
          activeOpacity={0.88}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Mengirim Permohonan...' : 'Kirim Permohonan Surat'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL PREVIEW DOKUMEN */}
      <Modal
        visible={!!previewDocUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewDocUri(null)}
      >
        <View style={styles.previewOverlay}>
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.previewTopBar}>
              <View>
                <Text style={styles.previewTitle}>Pratinjau Dokumen Syarat</Text>
                <Text style={styles.previewSub}>Lampiran permohonan surat kependudukan</Text>
              </View>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setPreviewDocUri(null)}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewImageWrapper}>
              {previewDocUri && (
                <Image
                  source={{ uri: previewDocUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.previewBottomBar}>
              <TouchableOpacity
                style={styles.previewDoneBtn}
                onPress={() => setPreviewDocUri(null)}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  typeScroll: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 10,
  },
  typeChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Spacing.radiusFull,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: Colors.bento.hero.badge,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  typeDescBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    marginTop: 6,
    gap: 8,
  },
  typeDescIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeDescText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 18,
  },
  familyList: {
    gap: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  memberCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bento.hero.bg,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  memberName: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  memberNameSelected: {
    color: Colors.primaryDark,
  },
  memberNik: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    padding: 16,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 100,
    lineHeight: 20,
  },
  docCard: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    marginBottom: 12,
  },
  docCardAttached: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  docCardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bento.hero.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  docStatusUnattached: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  docRequiredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docRequiredBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#D97706',
  },
  docActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docActionBtnCamera: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 9,
    borderRadius: Spacing.radiusMd,
    gap: 6,
  },
  docActionBtnCameraText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#16A34A',
  },
  docActionBtnGallery: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 9,
    borderRadius: Spacing.radiusMd,
    gap: 6,
  },
  docActionBtnGalleryText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: '#D97706',
  },
  docAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docThumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: Spacing.radiusMd,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  docThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  docAttachedSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#16A34A',
    marginTop: 2,
  },
  docActionMiniBtn: {
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
  docActionMiniText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Spacing.radiusFull,
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButtonText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
