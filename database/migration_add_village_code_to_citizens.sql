-- ============================================================================
-- MIGRASI: MENAMBAHKAN RELASI KODE DESA & KELURAHAN (VILLAGE_CODE)
-- File: database/migration_add_village_code_to_citizens.sql
-- Keterangan:
-- Menghubungkan akun warga, permohonan surat, dan aduan secara langsung ke desa/kelurahan
-- melalui Kode Wilayah Kemendagri 10-Digit (village_code) & QR Code Pendaftaran.
-- ============================================================================

-- 1. Tambah kolom village_code dan village_name pada tabel citizens (Buku Induk Warga)
ALTER TABLE public.citizens 
ADD COLUMN IF NOT EXISTS village_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS village_name VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_citizens_village_code ON public.citizens(village_code);

-- 2. Tambah kolom village_code pada tabel letter_requests (Permohonan Surat)
ALTER TABLE public.letter_requests 
ADD COLUMN IF NOT EXISTS village_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS village_name VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_letter_requests_village_code ON public.letter_requests(village_code);

-- 3. Tambah kolom village_code pada tabel complaints (Aduan / Aspirasi Warga)
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS village_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS village_name VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_complaints_village_code ON public.complaints(village_code);

-- 4. Update data warga yang sudah ada agar terhubung ke desa aktif saat ini (Klandasan Ulu - 6471011003)
UPDATE public.citizens 
SET village_code = '6471011003', village_name = 'Klandasan Ulu' 
WHERE village_code IS NULL;

UPDATE public.letter_requests 
SET village_code = '6471011003', village_name = 'Klandasan Ulu' 
WHERE village_code IS NULL;

UPDATE public.complaints 
SET village_code = '6471011003', village_name = 'Klandasan Ulu' 
WHERE village_code IS NULL;

-- 5. Dokumentasi kolom
COMMENT ON COLUMN public.citizens.village_code IS 'Kode Wilayah Kemendagri 10-Digit (Sinkron dengan QR Code & Web Admin Desa)';
COMMENT ON COLUMN public.citizens.village_name IS 'Nama resmi desa/kelurahan domisili akun warga';
