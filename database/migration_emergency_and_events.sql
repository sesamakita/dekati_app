-- ============================================================================
-- MIGRASI: TABEL KONTAK SIAGA DARURAT & AGENDA KEGIATAN DESA
-- File: database/migration_emergency_and_events.sql
-- Keterangan:
-- 1. public.emergency_contacts: Kontak siaga 24 jam desa yang dapat dikelola secara dinamis
-- 2. public.village_events: Jadwal kegiatan desa (Posyandu, Musrenbang, Gotong Royong)
-- ============================================================================

-- 1. TABEL: KONTAK SIAGA & DARURAT DESA (EMERGENCY CONTACTS)
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

-- RLS & Kebijakan Akses
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Public Anon All emergency_contacts" ON public.emergency_contacts FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_order ON public.emergency_contacts(order_index);

-- Data Default Kontak Darurat Awal
INSERT INTO public.emergency_contacts (title, phone, icon, description, order_index, is_active)
VALUES
    ('Ambulans Desa 24 Jam', '0812-3456-7890', 'car', 'Layanan antar rujukan darurat gratis untuk warga', 1, true),
    ('Bhabinkamtibmas Polsek', '0813-9876-5432', 'shield', 'Petugas kepolisian pembina kamtibmas desa', 2, true),
    ('Babinsa Koramil', '0811-2233-4455', 'shield-checkmark', 'Bintara pembina ketahanan wilayah desa', 3, true),
    ('Puskesmas / Bidan Desa', '0821-5566-7788', 'medkit', 'Pemeriksaan darurat medis & persalinan', 4, true),
    ('Sekretariat Kantor Desa', '0251-876543', 'business', 'Layanan informasi umum & administrasi kantor', 5, true)
ON CONFLICT DO NOTHING;


-- 2. TABEL: AGENDA KEGIATAN & JADWAL RESMI DESA (VILLAGE EVENTS)
CREATE TABLE IF NOT EXISTS public.village_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Kesehatan', -- Kesehatan, Lingkungan, Pemerintahan, Keagamaan, Kepemudaan
    event_date DATE NOT NULL,
    event_time VARCHAR(50) NOT NULL,
    location VARCHAR(200) NOT NULL,
    organizer VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS & Kebijakan Akses
ALTER TABLE public.village_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All village_events" ON public.village_events;
CREATE POLICY "Public Anon All village_events" ON public.village_events FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_village_events_date ON public.village_events(event_date);

-- Data Default Agenda Desa Awal
INSERT INTO public.village_events (title, category, event_date, event_time, location, organizer, description, is_active)
VALUES
    ('Posyandu Balita & Lansia Dusun Mekar', 'Kesehatan', CURRENT_DATE + INTERVAL '2 day', '08.30 - 11.30 WIB', 'Pos RW 01 Kp. Sukamaju', 'Kader Posyandu Melati', 'Pemeriksaan rutin tumbuh kembang balita, imunisasi, dan cek tensi/gula darah gratis untuk lansia.', true),
    ('Kerja Bakti Lingkungan Menghadapi Musim Hujan', 'Lingkungan', CURRENT_DATE + INTERVAL '5 day', '07.00 - 10.00 WIB', 'Saluran Drainase RT 01 - RT 04', 'Karang Taruna & Satlinmas', 'Gotong royong membersihkan sedimentasi selokan dan pemangkasan dahan pohon rawan tumbang.', true),
    ('Musyawarah Perencanaan Pembangunan Desa (Musrenbangdes)', 'Pemerintahan', CURRENT_DATE + INTERVAL '10 day', '09.00 - 12.30 WIB', 'Aula Pertemuan Balai Desa', 'BPD & Pemerintah Desa', 'Penyusunan usulan prioritas program pembangunan desa tahun anggaran berjalan bersama perwakilan RT/RW.', true)
ON CONFLICT DO NOTHING;


-- 3. PERBARUI PUBLIKASI REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.village_events;
