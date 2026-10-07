-- ============================================================================
-- SOLUSI PERBAIKAN REGISTRASI & OTENTIKASI SUPABASE (DEKATI)
-- Jalankan skrip ini langsung di menu: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk enkripsi kata sandi
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Berikan izin eksekusi fungsi otentikasi & registrasi bawaan kepada role anon & authenticated
GRANT EXECUTE ON FUNCTION public.authenticate_citizen(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_official(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_official(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Berikan izin ke register_citizen jika fungsi lama ada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_citizen') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.register_citizen TO anon, authenticated';
    END IF;
END $$;

-- 3. Pasang / Perbarui Stored Procedure `register_citizen_secure`
-- Fungsi ini berjalan dengan hak SECURITY DEFINER (bypass RLS) untuk mendaftarkan warga baru dengan aman
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
    v_hash TEXT;
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

    IF EXISTS (SELECT 1 FROM public.citizens WHERE public.citizens.nik = v_clean_nik) THEN
        RAISE EXCEPTION 'NIK % sudah terdaftar dalam sistem desa.', v_clean_nik USING ERRCODE = '23505';
    END IF;

    v_hash := crypt(p_password, gen_salt('bf', 8));

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
        v_hash,
        COALESCE(NULLIF(TRIM(p_no_kk), ''), '3201010000000001'),
        COALESCE(NULLIF(TRIM(p_alamat), ''), 'Alamat Domisili Warga'),
        COALESCE(NULLIF(TRIM(p_rt), ''), '01'),
        COALESCE(NULLIF(TRIM(p_rw), ''), '01'),
        COALESCE(NULLIF(TRIM(p_dusun), ''), 'Dusun'),
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

-- 4. Berikan izin eksekusi register_citizen_secure ke role anon dan authenticated
REVOKE EXECUTE ON FUNCTION public.register_citizen_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_citizen_secure(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. Berikan izin INSERT dan SELECT ke tabel citizens untuk role anon & authenticated
GRANT SELECT, INSERT ON public.citizens TO anon, authenticated;

-- 6. Tampilkan pesan berhasil
SELECT 'Sukses! Izin registrasi Supabase untuk Dekati telah dibuka.' AS status_migrasi;
