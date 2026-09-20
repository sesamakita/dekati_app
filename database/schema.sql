-- ============================================================================
-- SKEMA BASIS DATA: DEKATI (Desa Kita Dekat di Hati)
-- Dialek: PostgreSQL (v14+)
-- Deskripsi: Basis data terpadu untuk Portal Layanan dan Komunikasi Warga Desa
-- ============================================================================

-- Ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMERASI / TIPE DATA KHUSUS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'superadmin',
    'kades',
    'admin_desa',
    'petugas_layanan',
    'ketua_rt_rw',
    'warga'
);

CREATE TYPE user_status AS ENUM (
    'pending_verification',
    'active',
    'rejected',
    'suspended'
);

CREATE TYPE gender_type AS ENUM (
    'L', -- Laki-laki
    'P'  -- Perempuan
);

CREATE TYPE letter_status AS ENUM (
    'submitted',       -- Diajukan oleh warga
    'in_verification', -- Sedang diperiksa berkas oleh operator
    'needs_revision',  -- Ada syarat yang kurang/salah
    'approved',        -- Disetujui (siap ditandatangani)
    'signed',          -- Telah ditandatangani digital/QR dibuat
    'ready_for_pickup',-- Siap diambil di kantor (jika stempel basah)
    'completed',       -- Selesai diambil/diunduh
    'rejected'         -- Ditolak
);

CREATE TYPE complaint_status AS ENUM (
    'submitted',   -- Laporan masuk
    'verified',    -- Diverifikasi oleh admin desa
    'in_progress', -- Sedang dalam penanganan di lapangan
    'resolved',    -- Selesai ditangani
    'rejected'     -- Tidak valid / bukan ranah desa
);

CREATE TYPE target_audience_type AS ENUM (
    'all',
    'dusun',
    'rw',
    'rt'
);

CREATE TYPE apbdes_type AS ENUM (
    'pendapatan',
    'belanja',
    'pembiayaan'
);

-- ============================================================================
-- 2. MODUL PENGGUNA & AUTENTIKASI (USERS & AUTH)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nik CHAR(16) UNIQUE,                       -- Wajib untuk akun warga
    phone_number VARCHAR(20) NOT NULL UNIQUE,   -- Nomor WhatsApp/HP aktif
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'warga',
    status user_status NOT NULL DEFAULT 'pending_verification',
    avatar_url VARCHAR(500),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    registered_via VARCHAR(50) DEFAULT 'mobile_app',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_nik ON users(nik);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 3. MODUL KEPENDUDUKAN (CITIZEN REGISTRY)
-- Menyimpan Buku Induk Kependudukan Desa & Profil Terverifikasi
-- ============================================================================

CREATE TABLE citizens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL, -- Tautan akun aplikasi (jika terdaftar)
    nik CHAR(16) NOT NULL UNIQUE,
    no_kk CHAR(16) NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    tempat_lahir VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin gender_type NOT NULL,
    agama VARCHAR(50) NOT NULL,
    pekerjaan VARCHAR(100),
    status_perkawinan VARCHAR(50),
    status_dalam_keluarga VARCHAR(50), -- Kepala Keluarga, Istri, Anak, dll
    kewarganegaraan VARCHAR(10) DEFAULT 'WNI',
    
    -- Wilayah administratif
    alamat_lengkap TEXT NOT NULL,
    rt VARCHAR(5) NOT NULL,
    rw VARCHAR(5) NOT NULL,
    dusun VARCHAR(100),
    
    -- Dokumen verifikasi identitas (S3 / Encrypted storage)
    foto_ktp_path VARCHAR(500),
    foto_kk_path VARCHAR(500),
    foto_selfie_ktp_path VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_citizens_nik ON citizens(nik);
CREATE INDEX idx_citizens_no_kk ON citizens(no_kk);
CREATE INDEX idx_citizens_rt_rw ON citizens(rt, rw);

-- ============================================================================
-- 4. MODUL MASTER & PENGAJUAN SURAT MENYURAT
-- ============================================================================

CREATE TABLE letter_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,       -- contoh: 'SKTM', 'SKDU', 'SKCK_PENGANTAR', 'SK_DOMISILI'
    name VARCHAR(255) NOT NULL,             -- Nama resmi surat
    description TEXT,
    estimated_days INT DEFAULT 1,           -- Estimasi lama pengerjaan (hari)
    required_docs JSONB NOT NULL DEFAULT '[]', -- List kebutuhan dokumen, contoh: [{"code": "ktp", "name": "Foto KTP", "required": true}]
    form_fields JSONB NOT NULL DEFAULT '[]',   -- Input form dinamis, contoh: [{"field": "keperluan", "type": "text", "required": true}]
    template_html TEXT,                     -- Format template surat untuk cetak/ekspor PDF
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE letter_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(60) NOT NULL UNIQUE, -- Contoh: 'SRT-202609-0001'
    letter_type_id INT NOT NULL REFERENCES letter_types(id),
    applicant_user_id UUID NOT NULL REFERENCES users(id),       -- Akun yang mengajukan
    citizen_id UUID NOT NULL REFERENCES citizens(id),           -- Warga subjek surat (bisa anggota keluarga)
    
    status letter_status NOT NULL DEFAULT 'submitted',
    purpose TEXT NOT NULL,                                      -- Keperluan pengajuan
    form_data JSONB DEFAULT '{}',                               -- Data dinamis sesuai kebutuhan form
    rejection_reason TEXT,                                      -- Catatan jika ditolak/perlu revisi
    
    -- Penerbitan Dokumen Digital & QR Code
    letter_official_number VARCHAR(100),                        -- Nomor Surat Resmi Desa
    qr_verification_token VARCHAR(255) UNIQUE,                  -- Token unik verifikasi publik
    qr_verification_url VARCHAR(500),                           -- URL validasi keaslian surat
    pdf_file_url VARCHAR(500),                                  -- File surat final (PDF)
    signed_by UUID REFERENCES users(id),                        -- Kades / Sekdes penandatangan
    signed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_letter_requests_tracking ON letter_requests(tracking_number);
CREATE INDEX idx_letter_requests_status ON letter_requests(status);
CREATE INDEX idx_letter_requests_user ON letter_requests(applicant_user_id);
CREATE INDEX idx_letter_requests_citizen ON letter_requests(citizen_id);

CREATE TABLE letter_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_request_id UUID NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
    document_name VARCHAR(100) NOT NULL, -- e.g. "KTP", "KK", "PBB"
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE letter_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_request_id UUID NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    status_from letter_status,
    status_to letter_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. MODUL PENGADUAN & ASPIRASI WARGA
-- ============================================================================

CREATE TABLE complaint_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Contoh: 'Infrastruktur Jalan', 'Kebersihan/Sampah', 'Penerangan Jalan', 'Pelayanan Aparatur'
    description TEXT,
    icon_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(60) NOT NULL UNIQUE, -- Contoh: 'ADU-202609-0012'
    category_id INT NOT NULL REFERENCES complaint_categories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_address TEXT NOT NULL,
    rt VARCHAR(5),
    rw VARCHAR(5),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    is_anonymous BOOLEAN DEFAULT FALSE,  -- Nama pelapor disamarkan dari feed publik
    is_public BOOLEAN DEFAULT TRUE,      -- Apakah tampil di feed aduan warga lain
    status complaint_status NOT NULL DEFAULT 'submitted',
    
    assigned_department VARCHAR(100),   -- e.g. "Kaur Pembangunan", "Satlinmas"
    assigned_officer_id UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complaints_ticket ON complaints(ticket_number);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_user ON complaints(user_id);

CREATE TABLE complaint_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'image', -- image, video
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_timelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    status_change complaint_status,
    message TEXT NOT NULL,
    proof_image_path VARCHAR(500),       -- Foto bukti pengerjaan/tindak lanjut
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. MODUL BERITA, INFORMASI, & BROADCAST PENGUMUMAN
-- ============================================================================

CREATE TABLE announcement_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Contoh: 'Bansos', 'Gotong Royong', 'Kesehatan / Posyandu', 'Darurat'
    color_hex VARCHAR(7) DEFAULT '#0284C7'
);

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id),
    category_id INT NOT NULL REFERENCES announcement_categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    banner_image_path VARCHAR(500),
    
    -- Target segmentasi penerima broadcast
    target_type target_audience_type NOT NULL DEFAULT 'all',
    target_dusun VARCHAR(100),
    target_rw VARCHAR(5),
    target_rt VARCHAR(5),
    
    is_urgent BOOLEAN DEFAULT FALSE,     -- Menentukan prioritas Push Notification
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_slug ON announcements(slug);
CREATE INDEX idx_announcements_published ON announcements(is_published, published_at);

-- ============================================================================
-- 7. MODUL PROFIL DESA & TRANSPARANSI ANGGARAN (APBDES)
-- ============================================================================

CREATE TABLE village_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,         -- e.g. "Desa Sukamaju"
    code VARCHAR(50) UNIQUE,            -- Kode Wilayah Kemendagri
    district VARCHAR(100) NOT NULL,     -- Kecamatan
    regency VARCHAR(100) NOT NULL,      -- Kabupaten
    province VARCHAR(100) NOT NULL,     -- Provinsi
    postal_code VARCHAR(10),
    office_address TEXT NOT NULL,
    office_phone VARCHAR(20),
    office_email VARCHAR(100),
    logo_path VARCHAR(500),
    vision TEXT,
    mission TEXT,
    org_structure_image_path VARCHAR(500),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE apbdes_summaries (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,                  -- e.g. 2026
    account_type apbdes_type NOT NULL,         -- pendapatan, belanja, pembiayaan
    account_code VARCHAR(50) NOT NULL,         -- Kode rekening anggaran
    category_name VARCHAR(255) NOT NULL,       -- e.g. "Dana Desa (DDS)", "Alokasi Dana Desa (ADD)"
    budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    realized_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    infographic_image_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apbdes_year_type ON apbdes_summaries(fiscal_year, account_type);

-- ============================================================================
-- 8. MODUL PUSH NOTIFIKASI & PERANGKAT
-- ============================================================================

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    device_name VARCHAR(100),
    os_type VARCHAR(30), -- 'android', 'ios', 'web'
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'letter', 'complaint', 'announcement', 'system'
    action_url VARCHAR(500),       -- Deeplink URL ke halaman spesifik
    data_payload JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_user_unread ON in_app_notifications(user_id, is_read);
