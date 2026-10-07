// app/(auth)/register.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ShieldCheck, 
  UserPlus, 
  MessageCircle, 
  CheckCircle2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { Header } from '@/components/common/Header';
import { CustomAlertModal, AlertType } from '@/components/common/CustomAlertModal';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, villageName } = useAuth();

  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [noKk, setNoKk] = useState('');
  const [phone, setPhone] = useState('');
  const [dusun, setDusun] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [alamat, setAlamat] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleRegister = async () => {
    const cleanNik = nik.trim();
    const cleanNama = nama.trim();

    if (!cleanNik || cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
      setAlertConfig({
        visible: true,
        title: 'NIK Tidak Valid',
        message: 'Mohon masukkan 16 digit NIK sesuai dengan KTP elektronik Anda.',
        type: 'danger'
      });
      return;
    }

    if (!cleanNama) {
      setAlertConfig({
        visible: true,
        title: 'Nama Wajib Diisi',
        message: 'Mohon masukkan nama lengkap Anda sesuai dengan data KTP/KK.',
        type: 'danger'
      });
      return;
    }

    if (!password || password.length < 6) {
      setAlertConfig({
        visible: true,
        title: 'Kata Sandi Minimal 6 Karakter',
        message: 'Mohon buat kata sandi akun minimal 6 karakter demi keamanan akun Anda.',
        type: 'danger'
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlertConfig({
        visible: true,
        title: 'Konfirmasi Sandi Berbeda',
        message: 'Kata sandi dan konfirmasi kata sandi harus persis sama.',
        type: 'danger'
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        nik: cleanNik,
        nama: cleanNama,
        phone: phone.trim(),
        no_kk: noKk.trim() || undefined,
        password: password.trim(),
        alamat: alamat.trim() || undefined,
        dusun: dusun.trim() || undefined,
        rt: rt.trim() || undefined,
        rw: rw.trim() || undefined,
      });

      setAlertConfig({
        visible: true,
        title: 'Permohonan Terkirim',
        message: 'Data permohonan aktivasi akun Anda berhasil diajukan ke operator desa. Tim pelayanan akan memvalidasi data Anda sesuai Buku Induk Kependudukan.',
        type: 'success',
        onConfirm: () => {
          router.replace('/(tabs)');
        }
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Pendaftaran Gagal',
        message: err.message || 'Terjadi kesalahan saat memproses permohonan aktivasi akun.',
        type: 'danger'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactWhatsApp = () => {
    const message = encodeURIComponent(
      `Halo Operator Pelayanan ${villageName || 'Desa'},\n\nSaya ingin mengajukan aktivasi akun warga di aplikasi Dekati:\nNama: ${nama || '[Nama Lengkap]'}\nNIK: ${nik || '[16 Digit NIK]'}\nNo. HP: ${phone || '[Nomor WA]'}\n\nMohon bantuannya untuk verifikasi identitas. Terima kasih.`
    );
    Linking.openURL(`https://wa.me/?text=${message}`).catch(() => {
      setAlertConfig({
        visible: true,
        title: 'Gagal Membuka WhatsApp',
        message: 'Pastikan aplikasi WhatsApp sudah terpasang pada perangkat Anda.',
        type: 'danger'
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Aktivasi Akun Warga" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={styles.bannerCard}>
            <View style={styles.iconCircle}>
              <ShieldCheck size={28} color={Colors.primary} />
            </View>
            <Text style={styles.bannerTitle}>Pendaftaran Akun Warga Terverifikasi</Text>
            <Text style={styles.bannerSubtitle}>
              Demi keamanan data kependudukan dan perlindungan hak warga, akun diverifikasi oleh Operator Pelayanan {villageName || 'Pemerintah Desa'}.
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Form Data Permohonan</Text>

            {/* NIK */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                NIK (Nomor Induk Kependudukan) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={nik}
                onChangeText={setNik}
                placeholder="16 digit angka sesuai KTP"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="numeric"
                maxLength={16}
              />
            </View>

            {/* Nama Lengkap */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nama Lengkap Sesuai KTP <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={nama}
                onChangeText={setNama}
                placeholder="Contoh: Ahmad Fauzi"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="words"
              />
            </View>

            {/* Nomor KK */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor Kartu Keluarga (KK)</Text>
              <TextInput
                style={styles.input}
                value={noKk}
                onChangeText={setNoKk}
                placeholder="16 digit angka (opsional)"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="numeric"
                maxLength={16}
              />
            </View>

            {/* WhatsApp Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor WhatsApp Aktif</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Contoh: 081234567890"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
              />
            </View>

            {/* Dusun, RT, RW */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>Dusun / Wilayah</Text>
                <TextInput
                  style={styles.input}
                  value={dusun}
                  onChangeText={setDusun}
                  placeholder="Nama Dusun"
                  placeholderTextColor={Colors.textSubtle}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>RT</Text>
                <TextInput
                  style={styles.input}
                  value={rt}
                  onChangeText={setRt}
                  placeholder="01"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>RW</Text>
                <TextInput
                  style={styles.input}
                  value={rw}
                  onChangeText={setRw}
                  placeholder="01"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Alamat Lengkap */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alamat Lengkap Domisili</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={alamat}
                onChangeText={setAlamat}
                placeholder="Jl. Merdeka No. 10..."
                placeholderTextColor={Colors.textSubtle}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Kata Sandi Akun */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Kata Sandi Akun <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimal 6 karakter..."
                  placeholderTextColor={Colors.textSubtle}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textMuted} />
                  ) : (
                    <Eye size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Konfirmasi Kata Sandi */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Ulangi Kata Sandi <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ketik ulang kata sandi di atas..."
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <UserPlus size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Ajukan Permohonan Akun</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Help / WhatsApp Contact */}
            <View style={styles.divider} />
            <Text style={styles.helpNote}>
              Butuh bantuan cepat atau ingin verifikasi langsung ke petugas desa?
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContactWhatsApp}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Hubungi WhatsApp Pelayanan Desa</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions Box */}
          <View style={styles.infoCard}>
            <View style={styles.infoTitleRow}>
              <CheckCircle2 size={16} color={Colors.primary} />
              <Text style={styles.infoTitle}>Langkah Setelah Pengajuan:</Text>
            </View>
            <Text style={styles.infoItem}>1. Operator desa memverifikasi kesesuaian NIK Anda.</Text>
            <Text style={styles.infoItem}>2. Anda dapat masuk dan mengunggah foto KTP/KK untuk verifikasi lanjutan.</Text>
            <Text style={styles.infoItem}>3. Setelah disetujui, Anda dapat menikmati seluruh layanan E-Surat resmi ber-TTE QR.</Text>
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backLinkRow}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.backLinkText}>Sudah memiliki akun? </Text>
            <Text style={styles.backLinkHighlight}>Masuk ke Akun</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          if (alertConfig.onConfirm) alertConfig.onConfirm();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.cardGap,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight || '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: Colors.urgent || '#DC2626',
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderTopRightRadius: Spacing.radiusMd,
    borderBottomRightRadius: Spacing.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radiusMd,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 16,
  },
  helpNote: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: Colors.primaryLight || '#E8F5E9',
    borderRadius: Spacing.radiusMd,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  secondaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 20,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  infoItem: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  backLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  backLinkHighlight: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
});