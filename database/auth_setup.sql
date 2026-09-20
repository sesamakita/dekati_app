-- ============================================================================
-- SKRIP SETUP AUTENTIKASI WARGA: SISTEM DESA TERPADU "DEKATI"
-- Jalankan skrip ini di SQL Editor Supabase Dashboard jika ingin menambahkan
-- kolom password_hash khusus pada tabel citizens.
-- ============================================================================

-- 1. Tambah kolom password_hash pada tabel citizens
ALTER TABLE public.citizens 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Berikan kata sandi default 'password123' untuk data sensus warga awal
-- SHA-256 dari 'password123' = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
UPDATE public.citizens 
SET password_hash = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE password_hash IS NULL;

-- 3. Pastikan RLS mengizinkan pembacaan & pembaruan akun warga via Anon Key
DROP POLICY IF EXISTS "Public Anon All citizens" ON public.citizens;
CREATE POLICY "Public Anon All citizens" ON public.citizens FOR ALL USING (true) WITH CHECK (true);
