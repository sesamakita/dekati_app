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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    'Foto KTP Pemohon': true,
    'Foto Kartu Keluarga (KK)': true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const allTypes = await api.getLetterTypes();
      const family = await api.getFamilyMembers();
      setTypes(allTypes);
      setFamilyMembers(family);
      if (family.length > 0) {
        setSelectedCitizenId(family[0].id);
      }
    };
    init();
  }, []);

  const selectedType = types.find((t) => t.id === selectedTypeId) || types[0];

  const handleToggleDoc = (docName: string) => {
    setUploadedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName],
    }));
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      Alert.alert('Perhatian', 'Mohon isi kolom keperluan pengajuan surat.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitLetterRequest({
        letter_type_id: selectedTypeId,
        citizen_id: selectedCitizenId,
        purpose: purpose,
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
                  onPress={() => setSelectedCitizenId(m.id)}
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
            Pastikan berkas terunggah jelas untuk mempercepat proses verifikasi:
          </Text>

          {selectedType?.required_docs.map((doc, idx) => {
            const isUploaded = !!uploadedDocs[doc];
            return (
              <TouchableOpacity
                key={idx}
                style={styles.docItem}
                activeOpacity={0.8}
                onPress={() => handleToggleDoc(doc)}
              >
                <View style={[styles.docIconCircle, isUploaded && styles.docIconCircleDone]}>
                  <Ionicons
                    name={isUploaded ? 'checkmark' : 'cloud-upload-outline'}
                    size={18}
                    color={isUploaded ? '#FFFFFF' : Colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.docName}>{doc}</Text>
                  <Text style={styles.docStatus}>
                    {isUploaded ? 'Berkas Kependudukan Siap' : 'Ketuk untuk melampirkan foto'}
                  </Text>
                </View>
                <Text style={[styles.docAction, isUploaded && styles.docActionDone]}>
                  {isUploaded ? 'Terlampir' : 'Unggah'}
                </Text>
              </TouchableOpacity>
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
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
  },
  docIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconCircleDone: {
    backgroundColor: Colors.primary,
  },
  docName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  docStatus: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  docAction: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  docActionDone: {
    color: Colors.primaryDark,
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
