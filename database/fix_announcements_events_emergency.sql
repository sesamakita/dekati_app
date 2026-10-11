-- ============================================================================
-- SINKRONISASI & PERBAIKAN AKSES: KONTAK SIAGA, AGENDA DESA & PENGUMUMAN
-- File: database/fix_announcements_events_emergency.sql
-- Keterangan:
-- 1. Memberikan izin penuh (SELECT, INSERT, UPDATE, DELETE) ke role anon & authenticated
--    agar Web Admin & APK Mobile dapat membuat, mengedit, dan membaca data secara langsung.
-- 2. Mengaktifkan Row Level Security (RLS) dengan kebijakan terbuka (permissive).
-- 3. Mengaktifkan Realtime Supabase untuk tabel announcements, village_events, dan emergency_contacts.
-- 4. Mengisi data default berkualitas (seed data) jika tabel masih kosong.
--
-- CARA MENJALANKAN:
-- 1. Buka Supabase Dashboard -> Project Anda (https://supabase.com/dashboard)
-- 2. Masuk ke menu "SQL Editor" di bilah navigasi sebelah kiri
-- 3. Klik "New Query", paste seluruh isi skrip ini, lalu klik "Run"
-- ============================================================================

-- 1. PASTIKAN STRUKTUR TABEL LENGKAP & INDEKS AKTIF
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

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Pemerintahan',
    summary TEXT,
    content TEXT NOT NULL,
    date VARCHAR(50) DEFAULT TO_CHAR(NOW(), 'DD Mon YYYY'),
    is_urgent BOOLEAN DEFAULT FALSE,
    author VARCHAR(100) NOT NULL DEFAULT 'Pemerintah Desa',
    views INT DEFAULT 0,
    target_type VARCHAR(20) DEFAULT 'all',
    target_value VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.apbdes_items (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    realized_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HAK AKSES GRANT (PENTING AGAR TIDAK ERROR 42501 permission denied)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apbdes_items TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. ROW LEVEL SECURITY (RLS) KEBIJAKAN TERBUKA (PERMISSIVE POLICIES)
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apbdes_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Anon All emergency_contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "dekati_public_read_emergency_contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "dekati_emergency_contacts_all" ON public.emergency_contacts;
CREATE POLICY "dekati_emergency_contacts_all" ON public.emergency_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon All village_events" ON public.village_events;
DROP POLICY IF EXISTS "dekati_public_read_village_events" ON public.village_events;
DROP POLICY IF EXISTS "dekati_village_events_all" ON public.village_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon All announcements" ON public.announcements;
DROP POLICY IF EXISTS "dekati_public_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "dekati_announcements_all" ON public.announcements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon All apbdes_items" ON public.apbdes_items;
DROP POLICY IF EXISTS "dekati_public_read_apbdes_items" ON public.apbdes_items;
DROP POLICY IF EXISTS "dekati_apbdes_items_all" ON public.apbdes_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. REALTIME REPLICATION (AGAR PERUBAHAN DARI WEB ADMIN LANGSUNG MASUK KE APK HP)
ALTER TABLE public.emergency_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.village_events REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.village_events;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- 5. SEED DATA DEFAULT AWAL JIKA TABEL MASIH KOSONG
-- A. Kontak Siaga 24 Jam
INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
SELECT 'Ambulans Desa 24 Jam', '0812-3456-7890', 'car', 'Layanan antar rujukan medis & persalinan darurat gratis warga', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone = '0812-3456-7890');

INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
SELECT 'Bhabinkamtibmas Polsek', '0813-9876-5432', 'shield', 'Petugas kepolisian pembina kamtibmas & keamanan wilayah desa', 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone = '0813-9876-5432');

INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
SELECT 'Babinsa Koramil', '0811-2233-4455', 'shield-checkmark', 'Bintara pembina ketahanan wilayah & penanggulangan bencana', 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone = '0811-2233-4455');

INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
SELECT 'Puskesmas / Bidan Desa', '0821-5566-7788', 'medkit', 'Pemeriksaan darurat medis, posyandu & layanan ibu-anak', 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone = '0821-5566-7788');

INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
SELECT 'Sekretariat Kantor Desa', '0251-876543', 'business', 'Layanan informasi umum & pengaduan administrasi kantor desa', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone = '0251-876543');

-- B. Agenda Kegiatan Resmi Desa
INSERT INTO public.village_events (title, category, event_date, event_time, location, organizer, description, is_active)
SELECT 
    'Posyandu Balita & Lansia Dusun Mekar', 
    'Kesehatan', 
    CURRENT_DATE + INTERVAL '2 day', 
    '08.30 - 11.30 WIB', 
    'Pos RW 01 Kp. Sukamaju', 
    'Kader Posyandu Melati', 
    'Pemeriksaan rutin tumbuh kembang balita, imunisasi dasar lengkap, serta cek tensi dan gula darah gratis bagi warga lansia.', 
    true
WHERE NOT EXISTS (SELECT 1 FROM public.village_events WHERE title LIKE 'Posyandu Balita%');

INSERT INTO public.village_events (title, category, event_date, event_time, location, organizer, description, is_active)
SELECT 
    'Kerja Bakti Lingkungan & Normalisasi Drainase', 
    'Lingkungan', 
    CURRENT_DATE + INTERVAL '5 day', 
    '07.00 - 10.00 WIB', 
    'Saluran Drainase RT 01 - RT 04', 
    'Karang Taruna & Satlinmas Desa', 
    'Gotong royong warga membersihkan sedimentasi saluran air untuk mengantisipasi genangan air di musim penghujan.', 
    true
WHERE NOT EXISTS (SELECT 1 FROM public.village_events WHERE title LIKE 'Kerja Bakti Lingkungan%');

INSERT INTO public.village_events (title, category, event_date, event_time, location, organizer, description, is_active)
SELECT 
    'Musyawarah Perencanaan Pembangunan Desa (Musrenbangdes)', 
    'Pemerintahan', 
    CURRENT_DATE + INTERVAL '10 day', 
    '09.00 - 12.30 WIB', 
    'Aula Balai Desa', 
    'BPD & Pemerintah Desa', 
    'Penyusunan usulan prioritas program kerja pembangunan desa bersama ketua RT, RW, dan tokoh masyarakat.', 
    true
WHERE NOT EXISTS (SELECT 1 FROM public.village_events WHERE title LIKE 'Musyawarah Perencanaan%');

-- C. Pengumuman / Kabar Desa Terkini
INSERT INTO public.announcements (title, category, summary, content, is_urgent, author, views)
SELECT 
    'Pelayanan Administrasi Kependudukan Digital DEKATI Aktif 24 Jam', 
    'Pemerintahan', 
    'Warga kini dapat mengajukan surat keterangan dan melacak statusnya langsung dari smartphone tanpa perlu antre di kantor desa.', 
    'Pemerintah Desa resmi memberlakukan layanan digital DEKATI. Seluruh warga dapat mengajukan Surat Keterangan Tidak Mampu (SKTM), Surat Keterangan Usaha (SKU), dan surat resmi lainnya lengkap dengan tanda tangan elektronik QR Code. Silakan manfaatkan layanan ini dengan bijak demi efisiensi administrasi desa kita.', 
    false, 
    'Sekretariat Desa', 
    145
WHERE NOT EXISTS (SELECT 1 FROM public.announcements WHERE title LIKE 'Pelayanan Administrasi Kependudukan%');

INSERT INTO public.announcements (title, category, summary, content, is_urgent, author, views)
SELECT 
    'Peringatan Kesiapsiagaan Cuaca Ekstrem & Pengecekan Pohon Rawan Tumbang', 
    'Darurat', 
    'Warga dihimbau waspada terhadap hujan lebat dan angin kencang. Segera laporkan potensi pohon tumbang melalui menu Pengaduan.', 
    'Berdasarkan peringatan dini BMKG, diperkirakan terjadi cuaca ekstrem dalam beberapa hari ke depan. Warga diharapkan memperhatikan kebersihan selokan di lingkungan masing-masing dan menghindari berteduh di bawah pohon rindang saat hujan deras. Jika terjadi keadaan darurat, segera hubungi kontak siaga desa.', 
    true, 
    'Satgas Siaga Bencana Desa', 
    210
WHERE NOT EXISTS (SELECT 1 FROM public.announcements WHERE title LIKE 'Peringatan Kesiapsiagaan%');

SELECT 'SUKSES! Izin akses tabel, Realtime, dan data awal Kontak Siaga, Agenda Desa, serta Pengumuman telah aktif 100%.' AS status_migrasi;
