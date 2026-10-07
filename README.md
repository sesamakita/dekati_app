# 📱 DEKATI APP (Aplikasi Mobile Warga Desa)

> **DEKATI** (*Desa Kita Dekat di Hati*) — Aplikasi mobile warga berbasis Android/iOS untuk permohonan e-surat desa resmi, pelaporan aduan masyarakat dengan GPS & foto kamera, transparansi APBDes, serta kontak darurat siaga 24 jam.

---

## 📌 Ringkasan Teknologi

* **Framework:** Expo SDK ~57.0 + React Native 0.86 + React 19.2 + TypeScript ~6.0
* **Routing:** Expo Router ~57.0 (File-based routing)
* **Design System:** Bento Grid Cards + Lucide Icons + Nunito Google Fonts
* **Native Sensors & APIs:** `expo-camera`, `expo-location` (GPS), `expo-image-picker`, `expo-print`, `expo-sharing`
* **Penyimpanan & Backend:** Supabase (PostgreSQL + Realtime WebSockets) + `AsyncStorage`
* **Unit Testing:** Vitest 5.0

---

## 🚀 Panduan Memulai Cepat

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi berikut:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_VILLAGE_NAME=Desa Sukamaju
EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true
```

### 3. Menjalankan Aplikasi di Mode Pengembangan
```bash
# Menjalankan bundler Metro
npx expo start

# Menjalankan langsung di emulator/perangkat Android
npx expo run:android

# Menjalankan di iOS Simulator (macOS)
npx expo run:ios

# Menjalankan di browser Web
npx expo start --web
```

### 4. Menjalankan Pengujian & Pengecekan Tipe Data
```bash
# Typecheck TypeScript (Wajib 0 Error)
npx tsc --noEmit

# Menjalankan Unit Tests
npm test
```

---

## 🛡️ Fitur Utama Aplikasi Warga

1. **Autentikasi & Aktivasi Akun Aman:**
   * Pendaftaran akun warga berbasis 16 digit NIK & Nomor KK.
   * Pembuatan kata sandi akun mandiri (dienkripsi dengan bcrypt pgcrypto di database desa).
   * **Persistensi Sesi:** Sesi login tersimpan secara aman di perangkat lokal, pengguna tidak perlu login berulang saat membuka aplikasi.
2. **Layanan E-Surat Terpadu:**
   * Katalog lengkap jenis surat desa (SKTM, SKU, SKCK, Surat Domisili, dll).
   * Pilihan pengajuan surat untuk diri sendiri atau anggota keluarga dalam satu Kartu Keluarga (KK).
   * Unggah dokumen persyaratan langsung dari kamera atau galeri foto.
   * Lacak status permohonan surat secara *realtime* (Diverifikasi → Terbit Nomor → Disahkan TTE QR).
3. **Aduan & Aspirasi Geospasial:**
   * Pelaporan infrastruktur rusak, sampah liar, atau ketertiban umum.
   * Pengambilan koordinat GPS otomatis dari sensor perangkat.
   * Unggah foto bukti kerusakan di lokasi kejadian.
   * Pilihan pelaporan secara anonim untuk perlindungan pelapor.
4. **Profil Kependudukan & Dokumen Keluarga:**
   * Manajemen data anggota keluarga dalam satu KK.
   * Unggah dokumen verifikasi akun (Foto KTP fisik & Swafoto memegang KTP).
   * Penyamaran (*masking*) NIK pada antarmuka demi privasi data warga.
5. **Transparansi APBDes & Siaran Informasi:**
   * Pemantauan realisasi anggaran pendapatan dan belanja desa tahun berjalan.
   * Warta dan pengumuman darurat (*urgent broadcasts*).
   * Kontak siaga 24 jam dengan integrasi panggilan langsung satu klik (Ambulans, Linmas, Bhabinkamtibmas, Babinsa).

---

## 📁 Struktur Direktori Proyek

```
dekatip_app/
├── app/                  # Routing layar aplikasi (Expo Router)
│   ├── (auth)/          # Layar login & registrasi warga
│   ├── (tabs)/          # Navigasi tab utama (Beranda, Surat, Aduan, Profil)
│   ├── letters/         # Layar buat & lacak detail surat
│   ├── complaints/      # Layar buat & detail aduan GPS
│   └── apbdes.tsx       # Layar transparansi anggaran desa
├── components/           # Komponen UI bersama & modal dialog
├── constants/            # Desain token (Colors, Typography, Spacing)
├── context/              # React Context (AuthContext, AlertContext)
├── database/             # Skema SQL Supabase & migrasi aman
├── docs/                 # Dokumentasi perancangan (OpenAPI, ERD, Wireframe)
└── services/             # Layer adapter API per-domain modular
    ├── api/             # citizenService, letterService, complaintService, dll.
    ├── auth.ts          # Layanan sesi autentikasi warga
    └── storage.ts       # Layanan unggah berkas & dokumen ke cloud
```

---

## 📄 Lisensi & Kepatuhan
Aplikasi ini dikembangkan untuk memberikan akses pelayanan publik desa yang inklusif, transparan, dan patuh terhadap **UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)**.
