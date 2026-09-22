// app/complaints/create.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Header } from '@/components/common/Header';
import { LocationPickerModal } from '@/components/common/LocationPickerModal';

const CATEGORIES = [
  'Jalan Rusak / Berlubang',
  'Penerangan Jalan (PJU)',
  'Sampah Liar Menumpuk',
  'Saluran Air & Banjir',
  'Fasilitas Balai Desa',
  'Pelayanan Aparatur Desa',
];

interface EvidencePhoto {
  uri: string;
  base64?: string | null;
}

export default function CreateComplaintScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Dusun Mekar, RT 03 / RW 01');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: -6.2088,
    longitude: 106.8456,
  });
  const [useGps, setUseGps] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [previewModalUri, setPreviewModalUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openImagePicker = async (source: 'camera' | 'gallery', targetIndex?: number | null) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Kamera Diperlukan', 'Mohon izinkan akses kamera untuk memotret bukti aduan.');
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
        const newPhoto: EvidencePhoto = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || null,
        };

        if (typeof targetIndex === 'number' && targetIndex >= 0) {
          setPhotos((prev) => {
            const next = [...prev];
            next[targetIndex] = newPhoto;
            return next;
          });
        } else {
          setPhotos((prev) => {
            if (prev.length >= 3) {
              Alert.alert('Batas Maksimal', 'Anda hanya dapat melampirkan maksimal 3 foto bukti.');
              return prev;
            }
            return [...prev, newPhoto];
          });
        }
      }
    } catch (e) {
      Alert.alert('Gagal Mengambil Foto', 'Terjadi kendala saat mengakses kamera atau galeri.');
    }
  };

  const handlePickImage = (preferredSource?: 'camera' | 'gallery', targetIndex?: number | null) => {
    if (preferredSource) {
      openImagePicker(preferredSource, targetIndex);
      return;
    }

    Alert.alert(
      typeof targetIndex === 'number' ? 'Ganti Foto Bukti' : 'Pilih Sumber Foto Aduan',
      'Pilih cara mengambil foto kondisi fasilitas yang dilaporkan:',
      [
        {
          text: 'Ambil Foto (Kamera)',
          onPress: () => openImagePicker('camera', targetIndex),
        },
        {
          text: 'Cari File / Galeri (Storage HP)',
          onPress: () => openImagePicker('gallery', targetIndex),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleGps = (value: boolean) => {
    setUseGps(value);
    if (value) {
      setShowMapModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Perhatian', 'Mohon isi judul dan rincian keterangan aduan.');
      return;
    }

    setSubmitting(true);
    try {
      const gpsLocationString = useGps
        ? `${location} (GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`
        : location;

      const res = await api.submitComplaint({
        category: selectedCategory,
        title: title,
        description: description,
        location: gpsLocationString,
        is_anonymous: isAnonymous,
        photos: photos,
        photo_url: photos[0]?.uri || undefined,
        latitude: useGps ? coords.latitude : undefined,
        longitude: useGps ? coords.longitude : undefined,
      } as any);

      Alert.alert(
        'Laporan Berhasil Terkirim',
        `Nomor Tiket Aduan Anda: ${res.ticket_number}. Laporan telah diteruskan ke aparatur terkait dan dipantau oleh Kepala ${Config.villageName}.`,
        [
          {
            text: 'Lihat di Feed Aduan',
            onPress: () => router.replace('/(tabs)/aduan'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengirim aduan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title="Lapor Aduan Warga" showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KATEGORI ADUAN */}
        <View style={styles.section}>
          <Text style={styles.label}>1. Kategori Masalah</Text>
          <Text style={styles.helper}>Pilih bidang permasalahan yang ingin Anda laporkan:</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat, i) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FOTO BUKTI / LAMPIRAN (MAKSIMAL 3 FOTO) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.label}>2. Foto Bukti di Lapangan</Text>
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>{photos.length}/3 Foto</Text>
            </View>
          </View>
          <Text style={styles.helper}>
            Sertakan hingga maksimal 3 foto kondisi nyata fasilitas agar petugas desa dapat langsung menilai:
          </Text>

          {/* LIST FOTO YANG SUDAH DILAMPIRKAN */}
          {photos.length > 0 && (
            <View style={{ gap: 10, marginBottom: photos.length < 3 ? 12 : 0 }}>
              {photos.map((item, index) => (
                <View key={index} style={styles.docCardAttached}>
                  <View style={styles.docAttachedRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewModalUri(item.uri)}
                      style={styles.docThumbnailWrapper}
                    >
                      <Image source={{ uri: item.uri }} style={styles.docThumbnail} />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="scan" size={11} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.docAttachedTitle}>Foto Bukti #{index + 1}</Text>
                        <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      </View>
                      <Text style={styles.docAttachedSub}>Foto bukti fisik siap dikirim ke petugas</Text>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={styles.docActionMiniBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickImage(undefined, index)}
                        >
                          <Ionicons name="camera-reverse" size={12} color={Colors.primaryDark} />
                          <Text style={styles.docActionMiniText}>Ganti</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.docActionMiniBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                          activeOpacity={0.8}
                          onPress={() => handleRemovePhoto(index)}
                        >
                          <Ionicons name="trash" size={12} color="#DC2626" />
                          <Text style={[styles.docActionMiniText, { color: '#DC2626' }]}>Hapus</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.docActionMiniBtn, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}
                          activeOpacity={0.8}
                          onPress={() => setPreviewModalUri(item.uri)}
                        >
                          <Ionicons name="eye" size={12} color={Colors.textSecondary} />
                          <Text style={[styles.docActionMiniText, { color: Colors.textSecondary }]}>Lihat</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* OPSI TAMBAH FOTO JIKA KURANG DARI 3 */}
          {photos.length < 3 && (
            <View style={styles.uploadOptionsRow}>
              <TouchableOpacity
                style={styles.uploadOptionCard}
                activeOpacity={0.82}
                onPress={() => handlePickImage('camera')}
              >
                <View style={[styles.uploadOptionIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="camera" size={22} color="#16A34A" />
                </View>
                <Text style={styles.uploadOptionTitle}>Ambil Kamera</Text>
                <Text style={styles.uploadOptionSub}>
                  {photos.length > 0 ? `Tambah Foto ke-${photos.length + 1}` : 'Foto fisik langsung'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOptionCard}
                activeOpacity={0.82}
                onPress={() => handlePickImage('gallery')}
              >
                <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="folder-open" size={22} color="#D97706" />
                </View>
                <Text style={styles.uploadOptionTitle}>File / Galeri HP</Text>
                <Text style={styles.uploadOptionSub}>
                  {photos.length > 0 ? `Pilih Foto ke-${photos.length + 1}` : 'Cari file di memori'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* JUDUL & DESKRIPSI */}
        <View style={styles.section}>
          <Text style={styles.label}>3. Uraian Laporan</Text>
          <TextInput
            style={styles.input}
            placeholder="Judul singkat laporan (misal: Lampu PJU Mati di RT 03)"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Jelaskan detail permasalahan, perkiraan lama kejadian, dan dampaknya bagi warga sekitar..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* LOKASI KEJADIAN */}
        <View style={styles.section}>
          <Text style={styles.label}>4. Lokasi Kejadian</Text>
          <View style={styles.gpsRow}>
            <Ionicons name="navigate-circle" size={24} color={Colors.secondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.gpsTitle}>Sematkan Titik Peta & GPS Otomatis</Text>
              <Text style={styles.gpsSub}>Tentukan titik koordinat akurat pada peta satelit / jalan</Text>
            </View>
            <Switch
              value={useGps}
              onValueChange={handleToggleGps}
              trackColor={{ false: '#E2E8F0', true: Colors.secondaryLight }}
              thumbColor={useGps ? Colors.secondary : '#94A3B8'}
            />
          </View>

          {useGps && (
            <TouchableOpacity
              style={styles.mapTriggerCard}
              activeOpacity={0.85}
              onPress={() => setShowMapModal(true)}
            >
              <View style={styles.mapTriggerIcon}>
                <Ionicons name="map" size={20} color={Colors.urgent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.mapTriggerTitle}>Titik Koordinat Peta</Text>
                <Text style={styles.mapTriggerCoord}>
                  GPS: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
                <Text style={styles.mapTriggerHint}>Ketuk untuk geser titik atau ubah mode satelit</Text>
              </View>
              <View style={styles.mapTriggerBadge}>
                <Ionicons name="create-outline" size={14} color={Colors.urgent} />
                <Text style={styles.mapTriggerBadgeText}>Atur Peta</Text>
              </View>
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Patokan alamat lengkap (Nama jalan / RT / RW)"
            placeholderTextColor={Colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* PRIVASI ANONIM */}
        <View style={styles.section}>
          <View style={styles.privacyCard}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.privacyTitle}>Kirim Sebagai Laporan Anonim</Text>
              <Text style={styles.privacyDesc}>
                Identitas Anda disamarkan dari publik warga, hanya terlihat oleh verifikator desa.
              </Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
              thumbColor={isAnonymous ? Colors.primary : '#94A3B8'}
            />
          </View>
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          activeOpacity={0.88}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan Aduan'}
          </Text>
          <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL PRATINJAU FOTO LAYAR PENUH */}
      <Modal
        visible={!!previewModalUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalUri(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setPreviewModalUri(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewModalUri && (
            <Image
              source={{ uri: previewModalUri }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.modalBottomCloseBtn}
            onPress={() => setPreviewModalUri(null)}
          >
            <Text style={styles.modalBottomCloseText}>Tutup Tampilan</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL PETA INTERAKTIF GPS & SATELIT */}
      <LocationPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLatitude={coords.latitude}
        initialLongitude={coords.longitude}
        initialAddress={location}
        onSelectLocation={(data) => {
          setCoords({ latitude: data.latitude, longitude: data.longitude });
          if (data.address) {
            setLocation(data.address);
          }
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
  label: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  helper: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Spacing.radiusFull,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.bento.rose.badge,
    borderColor: Colors.urgent,
  },
  categoryChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.urgent,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadOptionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: Spacing.radiusLg,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  docCardAttached: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: Spacing.radiusLg,
    padding: 12,
  },
  docAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docThumbnailWrapper: {
    position: 'relative',
  },
  docThumbnail: {
    width: 64,
    height: 64,
    borderRadius: Spacing.radiusMd,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 4,
    padding: 3,
  },
  docAttachedTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
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
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    padding: 14,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 90,
    lineHeight: 20,
  },
  counterBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.radiusFull,
  },
  counterBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.urgent,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  gpsTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  gpsSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mapTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: Spacing.radiusLg,
    padding: 12,
    marginTop: 10,
  },
  mapTriggerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTriggerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#9A3412',
  },
  mapTriggerCoord: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#EA580C',
    marginTop: 1,
  },
  mapTriggerHint: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mapTriggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  mapTriggerBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.urgent,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusLg,
  },
  privacyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
  privacyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.urgent,
    paddingVertical: 15,
    borderRadius: Spacing.radiusFull,
    shadowColor: Colors.urgent,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 10,
  },
  submitButtonText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFullImage: {
    width: '100%',
    height: '75%',
    borderRadius: 12,
  },
  modalBottomCloseBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Spacing.radiusFull,
  },
  modalBottomCloseText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
});
