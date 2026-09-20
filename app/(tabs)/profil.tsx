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

export default function ProfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<Citizen | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Citizen[]>([]);
  const [showNik, setShowNik] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const u = await api.getCurrentUser();
      const fam = await api.getFamilyMembers();
      setUser(u);
      setFamilyMembers(fam);
    };
    fetchProfile();
  }, []);

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anggota Keluarga (Satu KK)</Text>
            <Text style={styles.sectionSub}>
              Anda dapat mewakili pengurusan surat untuk anggota keluarga di bawah:
            </Text>
          </View>

          {familyMembers.map((member) => (
            <View key={member.id} style={styles.familyCard}>
              <View style={styles.familyIconBox}>
                <Ionicons
                  name={member.jenis_kelamin === 'L' ? 'man' : 'woman'}
                  size={20}
                  color={member.jenis_kelamin === 'L' ? Colors.secondary : Colors.urgent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.familyName}>{member.nama_lengkap}</Text>
                <Text style={styles.familyRole}>
                  {member.status_keluarga} • {member.pekerjaan}
                </Text>
                <Text style={styles.familyNik}>NIK: {member.nik}</Text>
              </View>
              <View style={styles.familyBadge}>
                <Text style={styles.familyBadgeText}>Anggota KK</Text>
              </View>
            </View>
          ))}
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
                    onPress: () => {
                      api.logoutCitizen();
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
        </View>
      </ScrollView>
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
});
