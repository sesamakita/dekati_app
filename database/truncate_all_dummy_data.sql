-- ============================================================================
-- SCRIPT PEMBERSIHAN DATA DUMMY (PURGE / TRUNCATE ALL DUMMY DATA)
-- SISTEM DESA TERPADU "DEKATI"
-- ============================================================================
-- Menghapus seluruh data transaksi, warga dummy, surat, aduan, pengumuman,
-- agenda, kontak darurat, pos anggaran, dan akun demo bawaan dari Supabase.
-- Master template surat (letter_types) dipertahankan agar katalog layanan tetap aktif.
-- ============================================================================

-- 1. Hapus seluruh data transaksi, warga, aparatur demo, dan operasional
TRUNCATE TABLE 
    public.letter_requests,
    public.complaints,
    public.announcements,
    public.village_events,
    public.emergency_contacts,
    public.apbdes_items,
    public.citizens,
    public.village_officials
CASCADE;

-- 2. Pastikan Master Template Jenis Surat (Katalog Dasar Layanan) Tetap Siap
INSERT INTO public.letter_types (id, code, name, description, estimated_days, icon, required_docs)
VALUES 
    (1, 'SKTM', 'Surat Keterangan Tidak Mampu (SKTM)', 'Keperluan beasiswa kuliah, permohonan keringanan RS, atau bantuan pendidikan.', 1, 'GraduationCap', '["Foto KTP Pemohon", "Foto Kartu Keluarga (KK)", "Surat Pengantar RT/RW"]'::jsonb),
    (2, 'SKU', 'Surat Keterangan Usaha (SKU)', 'Persyaratan pengajuan pinjaman modal usaha/KUR perbankan dan legalitas tempat usaha.', 1, 'Store', '["Foto KTP Pemilik Usaha", "Foto Kartu Keluarga (KK)", "Foto Tempat/Kegiatan Usaha"]'::jsonb),
    (3, 'SKCK_PENGANTAR', 'Surat Pengantar SKCK Kepolisian', 'Surat pengantar resmi ke Polsek untuk pembuatan SKCK melamar kerja / CPNS.', 1, 'ShieldCheck', '["Foto KTP", "Foto Kartu Keluarga (KK)", "Pas Foto Berwarna 4x6"]'::jsonb),
    (4, 'SK_DOMISILI', 'Surat Keterangan Domisili', 'Keterangan tempat tinggal sah bagi warga atau perorangan.', 1, 'Home', '["Foto KTP", "Foto Kartu Keluarga", "Bukti Pengantar RT/RW"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    estimated_days = EXCLUDED.estimated_days,
    icon = EXCLUDED.icon,
    required_docs = EXCLUDED.required_docs;
