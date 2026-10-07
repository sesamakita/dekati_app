// app/(auth)/login.tsx
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
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, villageName } = useAuth();
  const { showAlert } = useAlert();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showAlert({
        title: 'Perhatian',
        message: 'Mohon masukkan NIK dan kata sandi.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password.trim());
      router.replace('/(tabs)');
    } catch (err: any) {
      showAlert({
        title: 'Gagal Masuk',
        message: err?.message || 'NIK atau Kata Sandi tidak sesuai.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO & BRANDING */}
          <View style={styles.brandContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={38} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>DEKATI</Text>
            <Text style={styles.appTagline}>Desa Kita Dekat di Hati</Text>
            <View style={styles.villageTag}>
              <Text style={styles.villageText}>Portal Warga {villageName || Config.villageName}</Text>
            </View>
          </View>

          {/* FORM LOGIN BENTO CARD */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Masuk Akun Warga</Text>
          <Text style={styles.formSub}>
              Gunakan NIK terdaftar dan kata sandi Anda
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIK (16 digit)</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={19} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan NIK 16 digit"
                  placeholderTextColor={Colors.textMuted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={19} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan kata sandi Anda"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              activeOpacity={0.88}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>{loading ? 'Memverifikasi...' : 'Masuk Sekarang'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

          </View>

          {/* REGISTER FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum memiliki akses? Hubungi administrator desa untuk verifikasi akun.</Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.screenPadding,
    backgroundColor: Colors.background,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  appName: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  appTagline: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  villageTag: {
    backgroundColor: Colors.bento.hero.badge,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
    marginTop: 8,
  },
  villageText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  formSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Spacing.radiusFull,
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  loginBtnText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bento.hero.bg,
    height: 44,
    borderRadius: Spacing.radiusFull,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
  },
  demoBtnText: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
    fontSize: 12,
    marginLeft: 6,
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    marginTop: 6,
  },
  guestBtnText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.primary,
  },
});
