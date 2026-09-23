-- ============================================================================
-- MIGRASI: MENAMBAHKAN RELASI AKUN WARGA KE TABEL ADUAN (COMPLAINTS)
-- File: database/migration_add_citizen_to_complaints.sql
-- Keterangan:
-- Menghubungkan aduan warga dengan akun warga terdaftar (citizen_id & citizen_nik)
-- agar tab "Laporan Saya" pada aplikasi mobile dapat menampilkan laporan secara realtime.
-- ============================================================================

-- 1. Tambahkan kolom relasi warga jika belum ada
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS citizen_nik VARCHAR(16);

-- 2. Buat index performa untuk filter pencarian laporan warga
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_nik ON public.complaints(citizen_nik);

-- 3. Komentar kolom untuk dokumentasi skema
COMMENT ON COLUMN public.complaints.citizen_id IS 'ID UUID warga pelapor (relasi ke tabel public.citizens)';
COMMENT ON COLUMN public.complaints.citizen_nik IS 'NIK warga pelapor untuk pencocokan cepat profil akun';
