// app/(auth)/register.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Header } from '@/components/common/Header';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [noKk, setNoKk] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nik.trim() || !nama.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Mohon lengkapi seluruh kolom pendaftaran.');
      return;
    }

    if (nik.trim().length !== 16 || !/^\d+$/.test(nik.trim())) {
      Alert.alert('Perhatian', 'NIK harus terdiri dari tepat 16 digit angka sesuai KTP.');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('Perhatian', 'Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      await register({
        nik: nik.trim(),
        nama: nama.trim(),
        phone: phone.trim(),
        password: password.trim(),
        no_kk: noKk.trim() || undefined,
      });

      Alert.alert(
        'Pendaftaran Berhasil',
        `Akun warga atas nama ${nama} berhasil didaftarkan ke sistem database desa. Anda dapat langsung menggunakan layanan permohonan surat dan pengaduan.`,
        [
          {
            text: 'Buka Dashboard Warga',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Pendaftaran Gagal', err?.message || 'Terjadi gangguan saat memproses pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <Header title="Daftar Akun Warga Baru" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBanner}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.infoBannerText}>
              Pendaftaran dikhususkan bagi warga sah {Config.villageName}. NIK Anda akan diverifikasi langsung dengan Buku Induk Kependudukan desa.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Induk Kependudukan (NIK 16 Digit)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 3201012345670001"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={16}
                value={nik}
                onChangeText={setNik}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap (Sesuai KTP)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Ahmad Subarjo"
                placeholderTextColor={Colors.textMuted}
                value={nama}
                onChangeText={setNama}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor WhatsApp Aktif</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 081234567890"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Kartu Keluarga (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nomor KK 16 Digit"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={16}
                value={noKk}
                onChangeText={setNoKk}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi Baru</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.agreementBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.agreementText}>
                Dengan mendaftar, Anda menyetujui pemrosesan data kependudukan secara terenkripsi sesuai UU Perlindungan Data Pribadi (UU PDP).
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, loading && { opacity: 0.7 }]}
              activeOpacity={0.88}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerBtnText}>
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Sekarang'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.hero.bg,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    padding: 14,
    borderRadius: Spacing.radiusLg,
    marginBottom: Spacing.cardGap,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.primaryDark,
    lineHeight: 18,
    flex: 1,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  agreementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    borderRadius: Spacing.radiusMd,
    marginBottom: 16,
    gap: 8,
  },
  agreementText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Spacing.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  registerBtnText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
