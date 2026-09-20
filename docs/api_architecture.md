# Arsitektur Backend & Spesifikasi RESTful API: Aplikasi "Dekati"
*(Desa Kita Dekat di Hati)*

Dokumen ini mendefinisikan arsitektur backend, standar komunikasi API, format payload, aturan keamanan, serta rincian endpoint RESTful untuk aplikasi **Dekati**.

---

## 1. Arsitektur & Prinsip Desain API

### A. Standar Protokol & Versi
* **Base URL:** `https://api.desa-contoh.desa.id/api/v1`
* **Format Data:** JSON (`Content-Type: application/json`) untuk request dan response (kecuali endpoint upload berkas yang menggunakan `multipart/form-data`).
* **Autentikasi:** Bearer Token (JWT / Laravel Sanctum / OAuth2) dengan header:
  `Authorization: Bearer <access_token>`

### B. Format Standar Respons (Standard Response Envelope)

#### 1. Respons Sukses (`HTTP 200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Permohonan surat berhasil diajukan",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 15,
    "total_records": 42,
    "total_pages": 3
  }
}
```

#### 2. Respons Gagal / Error (`HTTP 400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "success": false,
  "message": "Validasi formulir gagal",
  "errors": {
    "nik": ["NIK harus terdiri dari 16 digit angka."],
    "foto_ktp": ["Ukuran file maksimal 3MB."]
  }
}
```

---

## 2. Matriks Hak Akses (Role-Based Access Control / RBAC)

| Peran (Role) | Hak Akses Utama |
| :--- | :--- |
| **`warga`** | Pengajuan surat mandiri & keluarga, kirim aduan, baca pengumuman & APBDes, update profil. |
| **`ketua_rt_rw`** | Melihat daftar warga di lingkungannya, memverifikasi permohonan surat tahap awal (pengantar RT). |
| **`petugas_layanan`** | Verifikasi berkas surat, input nomor surat, cetak dokumen fisik, jawab aduan umum. |
| **`admin_desa`** | Manajemen master data, validasi akun warga, kirim broadcast pengumuman, assign tiket aduan. |
| **`kades`** | Tanda tangan digital/persetujuan akhir surat, pantau statistik kinerja dan transparansi APBDes. |
| **`superadmin`** | Konfigurasi sistem desa, backup basis data, kelola akun aparatur desa. |

---

## 3. Daftar Endpoint API (API Route Catalog)

### A. Modul Autentikasi (`/api/v1/auth`)
* `POST /auth/register` — Pendaftaran akun warga (NIK, No HP WhatsApp, Password, Nama Lengkap).
* `POST /auth/login` — Login menggunakan NIK / No HP & Password.
* `POST /auth/verify-otp` — Verifikasi kode OTP WhatsApp/SMS saat aktivasi akun atau lupa password.
* `POST /auth/resend-otp` — Kirim ulang kode OTP.
* `POST /auth/refresh-token` — Memperbarui masa aktif access token.
* `POST /auth/logout` — Mencabut access token aktif.
* `GET  /auth/me` — Mendapatkan data sesi user yang sedang login beserta role.

### B. Modul Profil Warga & Keluarga (`/api/v1/profile` & `/api/v1/citizens`)
* `GET  /profile` — Mendapatkan profil lengkap pengguna dan status verifikasi KTP.
* `PUT  /profile` — Memperbarui informasi kontak dan foto profil pengguna.
* `GET  /citizens/family-members` — Mengambil daftar anggota keluarga (berdasarkan Nomor KK yang sama) untuk opsi pengajuan surat diwakilkan.
* `POST /citizens/upload-identity` — Mengunggah foto KTP, Kartu Keluarga, dan foto selfie untuk verifikasi akun.

### C. Modul Layanan Surat Warga (`/api/v1/letters`)
* `GET  /letters/types` — Mengambil katalog jenis surat yang aktif (SKTM, SKDU, Domisili, dll) beserta formulir dinamis & syarat berkasnya.
* `POST /letters/requests` — Mengajukan permohonan surat baru (mendukung pengajuan untuk diri sendiri atau anggota keluarga).
* `GET  /letters/requests` — Daftar riwayat pengajuan surat milik pengguna (dengan filter status & pagination).
* `GET  /letters/requests/{tracking_number}` — Melacak status detail surat secara real-time dan melihat riwayat log proses.
* `POST /letters/requests/{id}/attachments` — Mengunggah berkas persyaratan tambahan jika diminta revisi.
* `GET  /letters/verify/{qr_token}` — **(Publik/Tanpa Auth)** Endpoint verifikasi keaslian surat melalui pemindaian QR Code resmi.
* `GET  /letters/requests/{id}/download` — Mengunduh file PDF surat resmi yang telah disahkan.

### D. Modul Pengaduan & Aspirasi (`/api/v1/complaints`)
* `GET  /complaints/categories` — Mendapatkan daftar kategori pengaduan (Jalan Rusak, Sampah, dll).
* `POST /complaints` — Mengirim aduan baru lengkap dengan koordinat GPS, foto bukti, dan opsi anonim/privat.
* `GET  /complaints/feed` — Feed publik aduan desa yang bersifat transparan (hanya menampilkan aduan dengan `is_public = true`).
* `GET  /complaints/my` — Riwayat pengaduan yang dibuat oleh pengguna saat ini.
* `GET  /complaints/{ticket_number}` — Melihat detail aduan, status, serta timeline pengerjaan dari petugas desa.

### E. Modul Informasi & Pengumuman Desa (`/api/v1/announcements`)
* `GET  /announcements` — Mengambil daftar siaran berita desa (terfilter otomatis sesuai target Dusun/RW/RT pengguna).
* `GET  /announcements/urgent` — Mengambil siaran darurat/penting terbaru untuk banner peringatan di aplikasi.
* `GET  /announcements/{slug}` — Mengambil isi lengkap artikel/pengumuman desa.

### F. Modul Transparansi Anggaran & Profil Desa (`/api/v1/village` & `/api/v1/apbdes`)
* `GET  /village/profile` — Profil umum desa, visi/misi, susunan aparatur desa, dan kontak darurat.
* `GET  /apbdes` — Ringkasan APBDes per tahun anggaran (Grafik Pendapatan, Belanja, dan Pembiayaan).

### G. Modul Notifikasi & Perangkat (`/api/v1/devices` & `/api/v1/notifications`)
* `POST /devices/register-fcm` — Mendaftarkan FCM Registration Token perangkat ponsel pengguna.
* `DELETE /devices/unregister-fcm` — Menghapus token perangkat saat pengguna logout.
* `GET  /notifications` — Mengambil riwayat notifikasi masuk (inbox).
* `PATCH /notifications/{id}/read` — Menandai notifikasi telah dibaca.
* `PATCH /notifications/read-all` — Menandai semua notifikasi telah dibaca.

---

## 4. Modul Khusus Dasbor Admin Desa (`/api/v1/admin`)

* **Manajemen Surat:**
  * `GET   /admin/letters` — Daftar seluruh permohonan surat masuk dengan filter status, kategori, dan rentang tanggal.
  * `PATCH /admin/letters/{id}/status` — Mengubah status surat (`in_verification`, `needs_revision`, `approved`, `rejected`).
  * `POST  /admin/letters/{id}/issue-number` — Memasukkan nomor registrasi surat resmi desa.
  * `POST  /admin/letters/{id}/sign` — Pengesahan surat oleh Kades / Sekdes (menghasilkan PDF & QR Code resmi).
* **Manajemen Pengaduan:**
  * `GET   /admin/complaints` — Daftar tiket aduan masyarakat.
  * `PATCH /admin/complaints/{id}/assign` — Meneruskan aduan ke staf/seksi terkait (misal: Kaur Pembangunan).
  * `POST  /admin/complaints/{id}/timeline` — Memperbarui progres penanganan dan mengunggah foto bukti penyelesaian.
* **Manajemen Warga:**
  * `GET   /admin/citizens/pending` — Daftar akun warga yang menunggu verifikasi KTP fisik.
  * `PATCH /admin/citizens/{id}/verify` — Menyetujui atau menolak akun warga.
* **Manajemen Siaran & Konten:**
  * `POST  /admin/announcements` — Menerbitkan pengumuman baru sekaligus memicu pengiriman push notification FCM.
  * `POST  /admin/apbdes` — Mengunggah data realisasi anggaran desa per tahun berjalan.
