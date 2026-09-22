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

const CATEGORIES = [
  'Jalan Rusak / Berlubang',
  'Penerangan Jalan (PJU)',
  'Sampah Liar Menumpuk',
  'Saluran Air & Banjir',
  'Fasilitas Balai Desa',
  'Pelayanan Aparatur Desa',
];

export default function CreateComplaintScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Dusun Mekar, RT 03 / RW 01');
  const [useGps, setUseGps] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openImagePicker = async (source: 'camera' | 'gallery') => {
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
          quality: 0.7,
        });
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Gagal Mengambil Foto', 'Terjadi kendala saat mengakses kamera atau galeri.');
    }
  };

  const handlePickImage = (preferredSource?: 'camera' | 'gallery') => {
    if (preferredSource) {
      openImagePicker(preferredSource);
      return;
    }

    Alert.alert(
      'Pilih Sumber Foto Aduan',
      'Pilih cara mengambil foto kondisi fasilitas yang dilaporkan:',
      [
        {
          text: 'Ambil Foto (Kamera)',
          onPress: () => openImagePicker('camera'),
        },
        {
          text: 'Cari File / Galeri (Storage HP)',
          onPress: () => openImagePicker('gallery'),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Perhatian', 'Mohon isi judul dan rincian keterangan aduan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitComplaint({
        category: selectedCategory,
        title: title,
        description: description,
        location: location + (useGps ? ' (GPS: -6.2088, 106.8456)' : ''),
        is_anonymous: isAnonymous,
        photo_url: photoUri || undefined,
      });

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

        {/* FOTO BUKTI / LAMPIRAN */}
        <View style={styles.section}>
          <Text style={styles.label}>2. Foto Bukti di Lapangan</Text>
          <Text style={styles.helper}>
            Sertakan foto kondisi nyata fasilitas agar petugas dapat langsung menilai:
          </Text>

          {photoUri ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                activeOpacity={0.8}
                onPress={() => setPhotoUri(null)}
              >
                <Ionicons name="trash" size={14} color="#FFFFFF" />
                <Text style={styles.removePhotoText}>Ganti Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.8}
              onPress={() => handlePickImage()}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons name="camera" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Ambil Foto atau Pilih dari Galeri</Text>
              <Text style={styles.uploadSub}>Format JPG, PNG (Maksimal 10 MB)</Text>
            </TouchableOpacity>
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
            <Ionicons name="navigate-circle" size={22} color={Colors.secondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.gpsTitle}>Sematkan Koordinat GPS Otomatis</Text>
              <Text style={styles.gpsSub}>Presisi lokasi akurat membantu petugas menemukan titik</Text>
            </View>
            <Switch
              value={useGps}
              onValueChange={setUseGps}
              trackColor={{ false: '#E2E8F0', true: Colors.secondaryLight }}
              thumbColor={useGps ? Colors.secondary : '#94A3B8'}
            />
          </View>
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
  uploadBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.bento.hero.border,
    borderRadius: Spacing.radiusXl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  uploadSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 3,
  },
  previewBox: {
    borderRadius: Spacing.radiusXl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 190,
  },
  removePhotoBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radiusSm,
    gap: 4,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 11,
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
});
