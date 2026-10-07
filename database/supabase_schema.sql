-- ============================================================================
-- SKEMA BASIS DATA SUPABASE: SISTEM DESA TERPADU "DEKATI"
-- Dialek: PostgreSQL / Supabase
-- Target: Web Admin (dekati_web) & Mobile App Warga (dekatip_app)
-- ============================================================================

-- 1. Ekstensi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABEL: BUKU INDUK KEPENDUDUKAN (CITIZENS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,                                       -- Opsional: Relasi ke auth.users jika login via Supabase Auth
    nik VARCHAR(16) NOT NULL UNIQUE,                    -- Nomor Induk Kependudukan (16 digit)
    no_kk VARCHAR(16) NOT NULL,                         -- Nomor Kartu Keluarga
    nama_lengkap VARCHAR(255) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    agama VARCHAR(50) DEFAULT 'Islam',
    pekerjaan VARCHAR(100),
    status_perkawinan VARCHAR(50),
    status_dalam_keluarga VARCHAR(50),                  -- Kepala Keluarga, Istri, Anak, dll.
    alamat_lengkap TEXT NOT NULL,
    rt VARCHAR(5) NOT NULL,
    rw VARCHAR(5) NOT NULL,
    dusun VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    foto_ktp_path TEXT,
    foto_kk_path TEXT,
    foto_selfie_ktp_path TEXT,
    is_verified BOOLEAN DEFAULT FALSE,                  -- Status verifikasi akun warga
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizens_nik ON public.citizens(nik);
CREATE INDEX IF NOT EXISTS idx_citizens_no_kk ON public.citizens(no_kk);

-- ============================================================================
-- 3. TABEL: MASTER JENIS SURAT (LETTER TYPES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.letter_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,                  -- e.g. 'SKTM', 'SKU', 'SKCK', 'SK_DOMISILI'
    name VARCHAR(255) NOT NULL,                        -- e.g. 'Surat Keterangan Tidak Mampu (SKTM)'
    description TEXT,
    estimated_days INT DEFAULT 1,
    icon VARCHAR(50) DEFAULT 'FileText',
    required_docs JSONB DEFAULT '[]'::jsonb,           -- List syarat: ["Foto KTP", "Foto KK", dll]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABEL: PERMOHONAN E-SURAT WARGA (LETTER REQUESTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.letter_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(60) NOT NULL UNIQUE,       -- e.g. 'SRT-202609-0012'
    letter_type_id INT REFERENCES public.letter_types(id),
    letter_name VARCHAR(255) NOT NULL,
    applicant_user_id TEXT,                            -- ID akun pengaju
    applicant_name VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(20),
    citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
    citizen_name VARCHAR(255) NOT NULL,
    citizen_nik VARCHAR(16) NOT NULL,
    citizen_address TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',   -- submitted, in_verification, approved, signed, rejected
    purpose TEXT NOT NULL,                             -- Keperluan surat
    letter_official_number VARCHAR(100),               -- No. Registrasi Resmi Desa (e.g. 470/12/SKTM/IX/2026)
    qr_verification_token VARCHAR(255) UNIQUE,         -- Token TTE QR unik
    qr_verification_url TEXT,                          -- URL verifikasi publik
    pdf_file_url TEXT,
    signed_by_name VARCHAR(255),                       -- Kades pengesah
    signed_at TIMESTAMPTZ,
    rejection_reason TEXT,                             -- Catatan jika ditolak
    attachments JSONB DEFAULT '[]'::jsonb,             -- Lampiran file berkas
    timeline JSONB DEFAULT '[]'::jsonb,                -- Riwayat alur pengerjaan surat
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_letter_requests_tracking ON public.letter_requests(tracking_number);
CREATE INDEX IF NOT EXISTS idx_letter_requests_status ON public.letter_requests(status);
CREATE INDEX IF NOT EXISTS idx_letter_requests_citizen_nik ON public.letter_requests(citizen_nik);

-- ============================================================================
-- 5. TABEL: ADUAN & ASPIRASI WARGA (COMPLAINTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(60) NOT NULL UNIQUE,         -- e.g. 'ADU-202609-0012'
    category VARCHAR(100) NOT NULL,                    -- Infrastruktur Jalan, PJU, Sampah, dll.
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_address TEXT NOT NULL,
    rt VARCHAR(5),
    rw VARCHAR(5),
    dusun VARCHAR(100),
    reporter_name VARCHAR(255) NOT NULL,
    reporter_phone VARCHAR(20),
    is_anonymous BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',   -- submitted, in_progress, resolved, rejected
    photo_url TEXT,                                    -- Foto kerusakan lapangan (kompatibilitas mundur)
    photo_urls JSONB DEFAULT '[]'::jsonb,              -- Multi-foto bukti kerusakan lapangan
    resolution_proof TEXT,                             -- Foto bukti pengerjaan selesai
    resolution_notes TEXT,                             -- Catatan tindak lanjut aparat
    assigned_department VARCHAR(100),                  -- e.g. 'Seksi Pembangunan', 'Satlinmas'
    assigned_officer VARCHAR(100),
    citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL, -- Relasi akun warga pelapor
    citizen_nik VARCHAR(16),                           -- NIK warga pelapor
    latitude NUMERIC(10, 7),                           -- Koordinat GPS Latitude
    longitude NUMERIC(10, 7),                          -- Koordinat GPS Longitude
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_ticket ON public.complaints(ticket_number);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_nik ON public.complaints(citizen_nik);

-- ============================================================================
-- 6. TABEL: BROADCAST & PENGUMUMAN DESA (ANNOUNCEMENTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,                     -- Bansos, Kesehatan, Lingkungan, Darurat, Pemerintahan
    summary TEXT,
    content TEXT NOT NULL,
    date VARCHAR(50) DEFAULT TO_CHAR(NOW(), 'DD Mon YYYY'),
    is_urgent BOOLEAN DEFAULT FALSE,                   -- Prioritas notifikasi HP
    author VARCHAR(100) NOT NULL,
    views INT DEFAULT 0,
    target_type VARCHAR(20) DEFAULT 'all',             -- all, dusun, rw, rt
    target_value VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABEL: TRANSPARANSI APBDES (APBDES ITEMS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.apbdes_items (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,                          -- e.g. 2026
    type VARCHAR(20) NOT NULL,                         -- pendapatan, belanja, pembiayaan
    account_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    realized_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. TABEL: PROFIL PEMERINTAHAN DESA (VILLAGE PROFILES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.village_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    district VARCHAR(100) NOT NULL,
    regency VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    office_address TEXT NOT NULL,
    office_phone VARCHAR(50),
    office_email VARCHAR(100),
    kades_name VARCHAR(150),
    sekdes_name VARCHAR(150),
    vision TEXT,
    mission JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. KEBIJAKAN ROW LEVEL SECURITY (RLS) & IZIN AKSES
-- Fail closed for private data; public information is read-only.
-- ============================================================================
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apbdes_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_officials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Anon All citizens" ON public.citizens;
DROP POLICY IF EXISTS "Public Anon All letter_types" ON public.letter_types;
DROP POLICY IF EXISTS "Public Anon All letter_requests" ON public.letter_requests;
DROP POLICY IF EXISTS "Public Anon All complaints" ON public.complaints;
DROP POLICY IF EXISTS "Public Anon All announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public Anon All apbdes_items" ON public.apbdes_items;
DROP POLICY IF EXISTS "Public Anon All village_profiles" ON public.village_profiles;
DROP POLICY IF EXISTS "dekati_public_read_letter_types" ON public.letter_types;
DROP POLICY IF EXISTS "dekati_public_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "dekati_public_read_apbdes_items" ON public.apbdes_items;
DROP POLICY IF EXISTS "dekati_public_read_village_profiles" ON public.village_profiles;

REVOKE ALL ON TABLE public.letter_types, public.announcements, public.apbdes_items, public.village_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.letter_types, public.announcements, public.apbdes_items, public.village_profiles TO anon, authenticated;
DROP POLICY IF EXISTS "dekati_public_read_letter_types" ON public.letter_types;
DROP POLICY IF EXISTS "dekati_public_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "dekati_public_read_apbdes_items" ON public.apbdes_items;
DROP POLICY IF EXISTS "dekati_public_read_village_profiles" ON public.village_profiles;
CREATE POLICY "dekati_public_read_letter_types" ON public.letter_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dekati_public_read_announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dekati_public_read_apbdes_items" ON public.apbdes_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dekati_public_read_village_profiles" ON public.village_profiles FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON TABLE public.citizens, public.letter_requests, public.complaints FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Public Anon All village_officials" ON public.village_officials;

-- ============================================================================
-- 10. AKTIFKAN SUPABASE REALTIME
-- Memastikan perubahan data di mobile langsung muncul di web admin tanpa refresh
-- ============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.citizens, 
    public.letter_requests, 
    public.complaints, 
    public.announcements, 
    public.apbdes_items;
COMMIT;

-- ============================================================================
-- 11. STORAGE BUCKETS (Penyimpanan Foto & Dokumen)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dokumen-warga', 'dokumen-warga', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('foto-aduan', 'foto-aduan', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access Dokumen" ON storage.objects;
CREATE POLICY "Public Access Dokumen" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. DATA AWAL (SEED DATA) DESA SUKAMAJU
-- ============================================================================

-- Profil Desa
INSERT INTO public.village_profiles (id, name, code, district, regency, province, postal_code, office_address, office_phone, office_email, kades_name, sekdes_name, vision, mission)
VALUES (
    1,
    'Desa Sukamaju',
    '32.01.01.2005',
    'Kecamatan Ciawi',
    'Kabupaten Bogor',
    'Jawa Barat',
    '16720',
    'Jl. Raya Sukamaju No. 12, Ciawi, Bogor',
    '(0251) 8245678',
    'sekretariat@sukamaju.desa.id',
    'Drs. H. Mulyadi Kartodirdjo, M.Si',
    'Bambang Irawan, S.AP',
    'Mewujudkan Desa Sukamaju yang Mandiri, Sejahtera, Transparan, dan Berdaya Saing Berbasis Pelayanan Digital Ramah Warga.',
    '["Meningkatkan transparansi tata kelola pemerintahan desa berbasis teknologi informasi.", "Mempercepat dan mempermudah layanan administrasi kependudukan tanpa pungutan liar.", "Pemberdayaan ekonomi kerakyatan melalui BUMDes dan optimalisasi potensi lokal.", "Pemerataan pembangunan infrastruktur pertanian, jalan lingkungan, dan fasilitas umum desa."]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Jenis Surat Master
INSERT INTO public.letter_types (id, code, name, description, estimated_days, icon, required_docs)
VALUES 
    (1, 'SKTM', 'Surat Keterangan Tidak Mampu (SKTM)', 'Keperluan beasiswa kuliah, permohonan keringanan RS, atau bantuan pendidikan.', 1, 'GraduationCap', '["Foto KTP Pemohon", "Foto Kartu Keluarga (KK)", "Surat Pengantar RT/RW"]'::jsonb),
    (2, 'SKU', 'Surat Keterangan Usaha (SKU)', 'Persyaratan pengajuan pinjaman modal usaha/KUR perbankan dan legalitas tempat usaha.', 1, 'Store', '["Foto KTP Pemilik Usaha", "Foto Kartu Keluarga (KK)", "Foto Tempat/Kegiatan Usaha"]'::jsonb),
    (3, 'SKCK_PENGANTAR', 'Surat Pengantar SKCK Kepolisian', 'Surat pengantar resmi ke Polsek untuk pembuatan SKCK melamar kerja / CPNS.', 1, 'ShieldCheck', '["Foto KTP", "Foto Kartu Keluarga (KK)", "Pas Foto Berwarna 4x6"]'::jsonb),
    (4, 'SK_DOMISILI', 'Surat Keterangan Domisili', 'Keterangan tempat tinggal sah bagi warga atau perorangan.', 1, 'Home', '["Foto KTP", "Foto Kartu Keluarga", "Bukti Pengantar RT/RW"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- CATATAN: Seluruh data operasional (warga, permohonan surat, aduan, pengumuman, dan APBDes)
-- dimulai dalam kondisi bersih (kosong). Data akan terisi secara dinamis melalui registrasi warga
-- dan penginputan resmi oleh aparat desa.

-- ============================================================================
-- 13. TABEL: AKUN APARATUR / PAMONG DESA & KELURAHAN (VILLAGE OFFICIALS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.village_officials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,                                       -- Relasi opsional ke auth.users
    nik VARCHAR(16) NOT NULL UNIQUE,                    -- NIK 16 digit aparat
    nip VARCHAR(30),                                    -- NIP jika ASN / PNS
    nama_lengkap VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                        -- Password bcrypt terenkripsi
    role VARCHAR(50) NOT NULL,                          -- kades, lurah, sekdes, kasi_layanan, kaur_keuangan, kaur_pembangunan, satlinmas, operator
    village_id INT DEFAULT 1,
    village_code VARCHAR(50) DEFAULT '32.01.01.2005',
    village_name VARCHAR(150) DEFAULT 'Desa Sukamaju',
    phone_number VARCHAR(20),
    avatar_url TEXT,
    can_sign_tte BOOLEAN DEFAULT FALSE,                 -- TRUE khusus Kepala Desa / Lurah
    status VARCHAR(20) DEFAULT 'active',                -- active, pending_approval, suspended
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_village_officials_email ON public.village_officials(email);
CREATE INDEX IF NOT EXISTS idx_village_officials_nik ON public.village_officials(nik);
CREATE INDEX IF NOT EXISTS idx_village_officials_role ON public.village_officials(role);

-- Tambah kolom otentikasi pada tabel warga (citizens) jika belum ada
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6);
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS device_token TEXT;
ALTER TABLE public.citizens ALTER COLUMN pin_code DROP DEFAULT;

-- RLS & Hak Akses
ALTER TABLE public.village_officials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All village_officials" ON public.village_officials;
REVOKE ALL ON TABLE public.village_officials FROM PUBLIC, anon, authenticated;

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.village_officials;

-- ============================================================================
-- 14. FUNGSI STORED PROCEDURES (RPC) OTENTIKASI & KEAMANAN TINGGI
-- ============================================================================

-- A. Otentikasi Aparat Desa (Login)
CREATE OR REPLACE FUNCTION public.authenticate_official(
    p_email TEXT,
    p_password TEXT
)
RETURNS TABLE (
    id UUID,
    nama_lengkap VARCHAR,
    email VARCHAR,
    role VARCHAR,
    can_sign_tte BOOLEAN,
    village_name VARCHAR,
    village_code VARCHAR,
    status VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_official RECORD;
BEGIN
    SELECT * INTO v_official 
    FROM public.village_officials 
    WHERE LOWER(public.village_officials.email) = LOWER(p_email)
      AND public.village_officials.status = 'active';

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Verifikasi password hash via crypt (pgcrypto bcrypt)
    IF v_official.password_hash = crypt(p_password, v_official.password_hash) THEN
        UPDATE public.village_officials 
        SET last_login_at = NOW(), updated_at = NOW() 
        WHERE public.village_officials.id = v_official.id;

        RETURN QUERY SELECT 
            v_official.id,
            v_official.nama_lengkap,
            v_official.email,
            v_official.role,
            v_official.can_sign_tte,
            v_official.village_name,
            v_official.village_code,
            v_official.status;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.authenticate_official(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_official(TEXT, TEXT) TO anon, authenticated;

-- B. Registrasi publik aparat dinonaktifkan sampai proses administratif terverifikasi.
CREATE OR REPLACE FUNCTION public.register_official(
    p_nama TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_nik TEXT,
    p_village_code TEXT DEFAULT '32.01.01.2005',
    p_village_name TEXT DEFAULT 'Desa Sukamaju',
    p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nama_lengkap VARCHAR,
    email VARCHAR,
    role VARCHAR,
    village_name VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'Pendaftaran aparat publik dinonaktifkan; akun harus dibuat melalui proses administratif terverifikasi.'
        USING ERRCODE = '42501';
END;
$$;

-- C. Otentikasi Warga (Mobile App)
CREATE OR REPLACE FUNCTION public.authenticate_citizen(
    p_nik TEXT,
    p_password TEXT
)
RETURNS TABLE (
    id UUID,
    nik VARCHAR,
    no_kk VARCHAR,
    nama_lengkap VARCHAR,
    is_verified BOOLEAN,
    rt VARCHAR,
    rw VARCHAR,
    dusun VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cit RECORD;
BEGIN
    SELECT * INTO v_cit 
    FROM public.citizens 
    WHERE public.citizens.nik = p_nik
      AND public.citizens.is_verified IS TRUE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_cit.password_hash IS NOT NULL AND v_cit.password_hash = crypt(p_password, v_cit.password_hash) THEN
        UPDATE public.citizens SET last_login_at = NOW() WHERE public.citizens.id = v_cit.id;
        RETURN QUERY SELECT v_cit.id, v_cit.nik, v_cit.no_kk, v_cit.nama_lengkap, v_cit.is_verified, v_cit.rt, v_cit.rw, v_cit.dusun;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.authenticate_citizen(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_citizen(TEXT, TEXT) TO anon, authenticated;

-- D. Registrasi publik dinonaktifkan sampai verifikasi identitas berbasis server.
CREATE OR REPLACE FUNCTION public.register_citizen(
    p_nik TEXT,
    p_nama TEXT,
    p_phone TEXT,
    p_password TEXT,
    p_no_kk TEXT DEFAULT '3201010000000001',
    p_alamat TEXT DEFAULT 'Desa Sukamaju',
    p_rt TEXT DEFAULT '01',
    p_rw TEXT DEFAULT '01',
    p_dusun TEXT DEFAULT 'Dusun Mekar'
)
RETURNS TABLE (
    id UUID,
    nik VARCHAR,
    nama_lengkap VARCHAR,
    is_verified BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'Pendaftaran warga publik dinonaktifkan sampai verifikasi identitas berbasis server tersedia.'
        USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_citizen(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- D2. Registrasi Warga Aman dengan Hash Bcrypt (Mobile App)
CREATE OR REPLACE FUNCTION public.register_citizen_secure(
    p_nik TEXT,
    p_nama TEXT,
    p_phone TEXT,
    p_password TEXT,
    p_no_kk TEXT DEFAULT NULL,
    p_alamat TEXT DEFAULT NULL,
    p_rt TEXT DEFAULT NULL,
    p_rw TEXT DEFAULT NULL,
    p_dusun TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nik VARCHAR,
    nama_lengkap VARCHAR,
    is_verified BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_clean_nik TEXT;
    v_clean_nama TEXT;
BEGIN
    v_clean_nik := TRIM(p_nik);
    v_clean_nama := TRIM(p_nama);

    IF LENGTH(v_clean_nik) != 16 OR v_clean_nik !~ '^\d+$' THEN
        RAISE EXCEPTION 'NIK harus tepat 16 digit angka sesuai KTP.' USING ERRCODE = '22023';
    END IF;

    IF LENGTH(v_clean_nama) = 0 THEN
        RAISE EXCEPTION 'Nama lengkap wajib diisi.' USING ERRCODE = '22023';
    END IF;

    IF LENGTH(COALESCE(p_password, '')) < 6 THEN
        RAISE EXCEPTION 'Kata sandi minimal 6 karakter demi keamanan akun Anda.' USING ERRCODE = '22023';
    END IF;

    -- Cek duplikasi NIK
    IF EXISTS (SELECT 1 FROM public.citizens WHERE public.citizens.nik = v_clean_nik) THEN
        RAISE EXCEPTION 'NIK % sudah terdaftar dalam sistem desa.', v_clean_nik USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.citizens (
        nik,
        nama_lengkap,
        phone_number,
        password_hash,
        no_kk,
        alamat_lengkap,
        rt,
        rw,
        dusun,
        is_verified,
        created_at
    ) VALUES (
        v_clean_nik,
        v_clean_nama,
        NULLIF(TRIM(p_phone), ''),
        crypt(p_password, gen_salt('bf', 8)),
        COALESCE(NULLIF(TRIM(p_no_kk), ''), '3201010000000001'),
        COALESCE(NULLIF(TRIM(p_alamat), ''), 'Desa Sukamaju'),
        COALESCE(NULLIF(TRIM(p_rt), ''), '01'),
        COALESCE(NULLIF(TRIM(p_rw), ''), '01'),
        COALESCE(NULLIF(TRIM(p_dusun), ''), 'Dusun Mekar'),
        FALSE,
        NOW()
    )
    RETURNING citizens.id INTO v_new_id;

    RETURN QUERY 
    SELECT c.id, c.nik, c.nama_lengkap, c.is_verified 
    FROM public.citizens c 
    WHERE c.id = v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_citizen_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_citizen_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 15. TABEL: KONTAK SIAGA & DARURAT DESA (EMERGENCY CONTACTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    icon VARCHAR(50) DEFAULT 'call',
    description VARCHAR(255),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All emergency_contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "dekati_public_read_emergency_contacts" ON public.emergency_contacts;
REVOKE ALL ON TABLE public.emergency_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.emergency_contacts TO anon, authenticated;
CREATE POLICY "dekati_public_read_emergency_contacts" ON public.emergency_contacts FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_order ON public.emergency_contacts(order_index);

-- ============================================================================
-- 16. TABEL: AGENDA KEGIATAN & JADWAL RESMI DESA (VILLAGE EVENTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.village_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Kesehatan',
    event_date DATE NOT NULL,
    event_time VARCHAR(50) NOT NULL,
    location VARCHAR(200) NOT NULL,
    organizer VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.village_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All village_events" ON public.village_events;
DROP POLICY IF EXISTS "dekati_public_read_village_events" ON public.village_events;
REVOKE ALL ON TABLE public.village_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.village_events TO anon, authenticated;
CREATE POLICY "dekati_public_read_village_events" ON public.village_events FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_village_events_date ON public.village_events(event_date);

