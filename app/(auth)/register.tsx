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
  Modal,
  FlatList,
  ActivityIndicator,
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
import { wilayahApi, Province, Regency, District, Village, toTitleCase } from '@/services/wilayah';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { supabase } from '@/services/supabase';
import { useAlert } from '@/context/AlertContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { showAlert } = useAlert();
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [noKk, setNoKk] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Wilayah Desa states
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedRegency, setSelectedRegency] = useState<Regency | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [villageName, setVillageName] = useState('');
  const [villageCode, setVillageCode] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [dusun, setDusun] = useState('');

  // Kode Desa & QR Scanner states
  const [inputVillageCode, setInputVillageCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Modal Picker states
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStep, setPickerStep] = useState<'province' | 'regency' | 'district' | 'village'>('province');
  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [regenciesList, setRegenciesList] = useState<Regency[]>([]);
  const [districtsList, setDistrictsList] = useState<District[]>([]);
  const [villagesList, setVillagesList] = useState<Village[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openWilayahPicker = async () => {
    setPickerVisible(true);
    setPickerStep('province');
    setSearchQuery('');
    if (provincesList.length === 0) {
      setPickerLoading(true);
      const data = await wilayahApi.getProvinces();
      setProvincesList(data);
      setPickerLoading(false);
    }
  };

  const handleSelectProvince = async (prov: Province) => {
    setSelectedProvince(prov);
    setSelectedRegency(null);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setSearchQuery('');
    setPickerStep('regency');
    setPickerLoading(true);
    const data = await wilayahApi.getRegencies(prov.id);
    setRegenciesList(data);
    setPickerLoading(false);
  };

  const handleSelectRegency = async (reg: Regency) => {
    setSelectedRegency(reg);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setSearchQuery('');
    setPickerStep('district');
    setPickerLoading(true);
    const data = await wilayahApi.getDistricts(reg.id);
    setDistrictsList(data);
    setPickerLoading(false);
  };

  const handleSelectDistrict = async (dist: District) => {
    setSelectedDistrict(dist);
    setSelectedVillage(null);
    setSearchQuery('');
    setPickerStep('village');
    setPickerLoading(true);
    const data = await wilayahApi.getVillages(dist.id);
    setVillagesList(data);
    setPickerLoading(false);
  };

  const handleSelectVillage = (vil: Village) => {
    setSelectedVillage(vil);
    setVillageName(toTitleCase(vil.name));
    setVillageCode(vil.id);
    setPickerVisible(false);
  };

  const handlePickerBack = () => {
    setSearchQuery('');
    if (pickerStep === 'village') {
      setPickerStep('district');
    } else if (pickerStep === 'district') {
      setPickerStep('regency');
    } else if (pickerStep === 'regency') {
      setPickerStep('province');
    }
  };

  const getCurrentList = () => {
    let list: { id: string; name: string }[] = [];
    if (pickerStep === 'province') list = provincesList;
    else if (pickerStep === 'regency') list = regenciesList;
    else if (pickerStep === 'district') list = districtsList;
    else if (pickerStep === 'village') list = villagesList;

    if (!searchQuery.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleVerifyVillageCode = async (rawCode?: string, fallbackPayload?: any) => {
    const targetCode = (rawCode !== undefined ? rawCode : inputVillageCode).trim();
    if (!targetCode) {
      showAlert({
        title: 'Perhatian',
        message: 'Silakan masukkan Kode Desa terlebih dahulu.',
        type: 'warning',
      });
      return;
    }

    const cleanCode = targetCode.replace(/^DKT-/i, '').trim();
    setCheckingCode(true);

    try {
      // 1. Cari berdasarkan kode desa resmi Kemendagri (kolom code)
      let { data, error } = await supabase
        .from('village_profiles')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (error) {
        console.warn('Supabase query code error:', error);
      }

      // 2. Jika belum ditemukan dan input adalah angka ID kecil (< 2 Milyar), cari by id
      if (!data && /^\d+$/.test(cleanCode) && Number(cleanCode) < 2147483647) {
        const { data: byId } = await supabase
          .from('village_profiles')
          .select('*')
          .eq('id', Number(cleanCode))
          .maybeSingle();
        if (byId) data = byId;
      }

      // 3. Jika input berupa nama teks, cari by ilike nama desa
      if (!data && isNaN(Number(cleanCode))) {
        const { data: byName } = await supabase
          .from('village_profiles')
          .select('*')
          .ilike('name', `%${cleanCode}%`)
          .maybeSingle();
        if (byName) data = byName;
      }

      // KASUS A: Ditemukan di database Supabase
      if (data) {
        const officialName = data.name || cleanCode;
        setSelectedVillage({
          id: data.code || String(data.id),
          name: officialName,
          district_id: '',
        });
        setVillageName(toTitleCase(officialName));
        setVillageCode(data.code || String(data.id));
        setSelectedDistrict(data.district ? { id: '', name: data.district, regency_id: '' } : null);
        setSelectedRegency(data.regency ? { id: '', name: data.regency, province_id: '' } : null);
        setSelectedProvince(data.province ? { id: '', name: data.province } : null);
        setInputVillageCode(data.code || String(data.id));

        showAlert({
          title: 'Desa Terverifikasi!',
          message: `Berhasil terhubung ke database resmi Pemerintah Desa/Kelurahan ${data.name}${data.district ? `, Kec. ${data.district}` : ''}.`,
          type: 'success',
        });
        return;
      }

      // KASUS B: Tidak ditemukan di DB, tetapi ada data valid dari QR Code brosur petugas
      if (fallbackPayload && fallbackPayload.name) {
        setSelectedVillage({
          id: fallbackPayload.code || cleanCode,
          name: fallbackPayload.name,
          district_id: '',
        });
        setVillageName(toTitleCase(fallbackPayload.name));
        setVillageCode(fallbackPayload.code || cleanCode);
        if (fallbackPayload.district) setSelectedDistrict({ id: '', name: fallbackPayload.district, regency_id: '' });
        if (fallbackPayload.regency) setSelectedRegency({ id: '', name: fallbackPayload.regency, province_id: '' });
        if (fallbackPayload.province) setSelectedProvince({ id: '', name: fallbackPayload.province });
        setInputVillageCode(fallbackPayload.code || cleanCode);

        showAlert({
          title: 'Desa Terhubung!',
          message: `Berhasil terhubung ke Pemerintah Desa/Kelurahan ${fallbackPayload.name} sesuai brosur petugas.`,
          type: 'success',
        });
        return;
      }

      // KASUS C: Benar-benar tidak ditemukan
      showAlert({
        title: 'Kode Desa Tidak Ditemukan',
        message: `Kode "${cleanCode}" belum terdaftar pada dashboard admin desa aktif. Pastikan kode yang dimasukkan sesuai dengan yang diberikan aparat desa, atau pilih wilayah secara manual.`,
        type: 'danger',
      });
    } catch (err: any) {
      showAlert({
        title: 'Gagal Memeriksa Kode',
        message: err?.message || 'Terjadi gangguan koneksi internet.',
        type: 'danger',
      });
    } finally {
      setCheckingCode(false);
    }
  };

  const handleOpenScanner = async () => {
    try {
      if (!permission) {
        const res = await requestPermission();
        if (!res?.granted) {
          showAlert({
            title: 'Izin Kamera Dibutuhkan',
            message: 'Aplikasi membutuhkan izin akses kamera untuk memindai QR Code pendaftaran dari brosur petugas desa.',
            type: 'warning',
          });
          return;
        }
      } else if (!permission.granted) {
        const res = await requestPermission();
        if (!res?.granted) {
          showAlert({
            title: 'Izin Kamera Belum Aktif',
            message: 'Silakan aktifkan izin kamera pada Pengaturan perangkat Anda untuk memindai QR Code.',
            type: 'warning',
          });
          return;
        }
      }

      setScanned(false);
      setShowScanner(true);
    } catch (err: any) {
      showAlert({
        title: 'Kamera Tidak Siap',
        message: err?.message || 'Gagal mengaktifkan kamera.',
        type: 'danger',
      });
    }
  };

  const handleBarcodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const rawData = (scanningResult.data || '').trim();
    setShowScanner(false);

    try {
      if (rawData.startsWith('{') && rawData.endsWith('}')) {
        const parsed = JSON.parse(rawData);
        if (parsed.code) {
          handleVerifyVillageCode(parsed.code, parsed);
          return;
        }
      }
    } catch (e) {
      // bukan format JSON, fallback ke plain text
    }

    handleVerifyVillageCode(rawData);
  };

  const handleResetVillage = () => {
    setSelectedVillage(null);
    setVillageName('');
    setVillageCode('');
    setSelectedDistrict(null);
    setSelectedRegency(null);
    setSelectedProvince(null);
    setInputVillageCode('');
  };

  const handleRegister = async () => {
    if (!nik.trim() || !nama.trim() || !phone.trim() || !password.trim()) {
      showAlert({
        title: 'Perhatian',
        message: 'Mohon lengkapi seluruh kolom pendaftaran.',
        type: 'warning',
      });
      return;
    }

    if (nik.trim().length !== 16 || !/^\d+$/.test(nik.trim())) {
      showAlert({
        title: 'Perhatian',
        message: 'NIK harus terdiri dari tepat 16 digit angka sesuai KTP.',
        type: 'warning',
      });
      return;
    }

    if (password.trim().length < 6) {
      showAlert({
        title: 'Perhatian',
        message: 'Kata sandi minimal terdiri dari 6 karakter.',
        type: 'warning',
      });
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
        village_name: villageName || undefined,
        village_code: villageCode || undefined,
        district: selectedDistrict ? toTitleCase(selectedDistrict.name) : undefined,
        regency: selectedRegency ? toTitleCase(selectedRegency.name) : undefined,
        province: selectedProvince ? toTitleCase(selectedProvince.name) : undefined,
        rt: rt.trim() || undefined,
        rw: rw.trim() || undefined,
        dusun: dusun.trim() || undefined,
      });

      showAlert({
        title: 'Pendaftaran Berhasil',
        message: `Akun warga atas nama ${nama} berhasil didaftarkan ke sistem database desa. Anda dapat langsung menggunakan layanan permohonan surat dan pengaduan.`,
        type: 'success',
        confirmText: 'Buka Dashboard Warga',
        onConfirm: () => router.replace('/(tabs)'),
      });
    } catch (err: any) {
      showAlert({
        title: 'Pendaftaran Gagal',
        message: err?.message || 'Terjadi gangguan saat memproses pendaftaran.',
        type: 'danger',
      });
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
              {villageName ? (
                <>
                  Pendaftaran akun warga untuk <Text style={{ fontFamily: Fonts.bold }}>{villageName.toLowerCase().startsWith('desa') || villageName.toLowerCase().startsWith('kelurahan') ? villageName : `Desa/Kelurahan ${villageName}`}</Text>. NIK Anda akan diverifikasi sesuai data administrasi kependudukan desa.
                </>
              ) : (
                <>
                  Pendaftaran akun warga baru. Silakan lengkapi data diri dan <Text style={{ fontFamily: Fonts.bold }}>pilih atau scan kode Desa/Kelurahan</Text> domisili Anda di bawah ini.
                </>
              )}
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

            {/* Pemilihan Wilayah Desa */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Wilayah Domisili Desa / Kelurahan</Text>

              {selectedVillage ? (
                /* Card Desa Terverifikasi */
                <View style={styles.verifiedVillageCard}>
                  <View style={styles.verifiedHeaderRow}>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                      <Text style={styles.verifiedBadgeText}>Terhubung ke Database Desa</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleResetVillage}
                      style={styles.resetVillageBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="refresh-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.resetVillageBtnText}>Ganti</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.verifiedVillageTitle}>
                    Pemerintah Desa/Kelurahan {villageName || toTitleCase(selectedVillage.name)}
                  </Text>
                  <Text style={styles.verifiedVillageSub}>
                    Kec. {selectedDistrict ? toTitleCase(selectedDistrict.name) : '-'}, {selectedRegency ? toTitleCase(selectedRegency.name) : '-'}, {selectedProvince ? toTitleCase(selectedProvince.name) : '-'}
                  </Text>

                  {villageCode ? (
                    <View style={styles.verifiedCodeTag}>
                      <Ionicons name="finger-print-outline" size={13} color={Colors.primaryDark} />
                      <Text style={styles.verifiedCodeText}>Kode Kemendagri: {villageCode}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* Card Pilihan Input Registrasi: QR Code & Kode Petugas Desa */
                <View style={styles.unverifiedVillageBox}>
                  {/* Tombol Utama: Scan QR Brosur Petugas */}
                  <TouchableOpacity
                    style={styles.scanQrBtn}
                    activeOpacity={0.85}
                    onPress={handleOpenScanner}
                  >
                    <View style={styles.scanQrIconCircle}>
                      <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanQrBtnTitle}>Pindai QR Brosur Petugas Desa</Text>
                      <Text style={styles.scanQrBtnSub}>
                        Kamera otomatis mengisi wilayah dari flyer door-to-door
                      </Text>
                    </View>
                    <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>

                  {/* Garis Pembatas */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>atau masukkan kode desa</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Input Kode Desa Manual */}
                  <View style={styles.codeRow}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="Contoh: 6471011003"
                      placeholderTextColor={Colors.textMuted}
                      value={inputVillageCode}
                      onChangeText={setInputVillageCode}
                      keyboardType="default"
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[
                        styles.verifyCodeBtn,
                        checkingCode && { opacity: 0.7 },
                      ]}
                      onPress={() => handleVerifyVillageCode()}
                      disabled={checkingCode}
                    >
                      {checkingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.verifyCodeBtnText}>Periksa</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Opsi Cadangan: Buka Picker Hierarki Kemendagri */}
                  <TouchableOpacity
                    style={styles.manualFallbackBtn}
                    onPress={openWilayahPicker}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.manualFallbackText}>
                      Tidak ada kode? Cari Wilayah Manual (Prov, Kab, Kec, Desa)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* RT, RW, Dusun Row */}
            {selectedVillage && (
              <View style={styles.addressRow}>
                <View style={[styles.inputGroup, { flex: 1.4 }]}>
                  <Text style={styles.inputLabel}>Dusun / Lingkungan</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: Dusun 01"
                    placeholderTextColor={Colors.textMuted}
                    value={dusun}
                    onChangeText={setDusun}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.8 }]}>
                  <Text style={styles.inputLabel}>RT</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="01"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                    value={rt}
                    onChangeText={setRt}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.8 }]}>
                  <Text style={styles.inputLabel}>RW</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="01"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                    value={rw}
                    onChangeText={setRw}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi Baru</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordTextInput}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
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

      {/* Modal Pemilih Wilayah Indonesia (Kemendagri) */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>
                  {pickerStep === 'province' && 'Pilih Provinsi'}
                  {pickerStep === 'regency' && `Pilih Kab/Kota (${selectedProvince ? toTitleCase(selectedProvince.name) : ''})`}
                  {pickerStep === 'district' && `Pilih Kecamatan (${selectedRegency ? toTitleCase(selectedRegency.name) : ''})`}
                  {pickerStep === 'village' && `Pilih Desa/Kelurahan (${selectedDistrict ? toTitleCase(selectedDistrict.name) : ''})`}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Data resmi wilayah Kemendagri RI
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Cari nama daerah..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Back Button if not in province step */}
            {pickerStep !== 'province' && (
              <TouchableOpacity
                onPress={handlePickerBack}
                style={styles.modalStepBackBtn}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                <Text style={styles.modalStepBackText}>Kembali ke pilihan sebelumnya</Text>
              </TouchableOpacity>
            )}

            {/* List */}
            {pickerLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Memuat data wilayah...</Text>
              </View>
            ) : (
              <FlatList
                data={getCurrentList()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      if (pickerStep === 'province') handleSelectProvince(item as Province);
                      else if (pickerStep === 'regency') handleSelectRegency(item as Regency);
                      else if (pickerStep === 'district') handleSelectDistrict(item as District);
                      else if (pickerStep === 'village') handleSelectVillage(item as Village);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{toTitleCase(item.name)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Pemindai QR Code Brosur Desa */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scannerTitle}>Pindai QR Brosur Desa</Text>
              <Text style={styles.scannerSubtitle}>
                Arahkan kamera ke QR Code brosur petugas desa
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              style={styles.scannerCloseBtn}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Frame / Reticle Bidik Scanner */}
            <View style={styles.scannerOverlay} pointerEvents="none">
              <View style={styles.scannerCropBox}>
                <View style={[styles.scannerCorner, styles.cornerTL]} />
                <View style={[styles.scannerCorner, styles.cornerTR]} />
                <View style={[styles.scannerCorner, styles.cornerBL]} />
                <View style={[styles.scannerCorner, styles.cornerBR]} />
              </View>
            </View>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerFooterText}>
              Pastikan QR Code brosur berada di dalam kotak bidik dengan pencahayaan cukup.
            </Text>
            <TouchableOpacity
              style={styles.scannerCancelBtn}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.scannerCancelText}>Tutup Kamera</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordTextInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
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
  regionPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    padding: 12,
    gap: 10,
  },
  regionPickerBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  regionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionIconCircleActive: {
    backgroundColor: '#DCFCE7',
  },
  regionSelectedTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  regionSelectedSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.primaryDark,
    marginTop: 1,
  },
  regionPlaceholderTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  regionPlaceholderSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalHeaderSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    marginVertical: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  modalStepBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 8,
  },
  modalStepBackText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  modalLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  pickerItemText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  // Verified Village Card
  verifiedVillageCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: Spacing.radiusLg,
    padding: 14,
  },
  verifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  resetVillageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resetVillageBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  verifiedVillageTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  verifiedVillageSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  verifiedCodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedCodeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  // Unverified Village Box
  unverifiedVillageBox: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusLg,
    padding: 12,
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Spacing.radiusMd,
    padding: 12,
    gap: 12,
  },
  scanQrIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanQrBtnTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
  scanQrBtnSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: 12,
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  verifyCodeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  verifyCodeBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
  },
  manualFallbackText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  // QR Scanner Modal
  scannerContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B0F19',
  },
  scannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  scannerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCropBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 10,
  },
  scannerFooter: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#0B0F19',
  },
  scannerFooterText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  scannerCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: Spacing.radiusFull,
    backgroundColor: '#1E293B',
  },
  scannerCancelText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
});
