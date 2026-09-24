-- ============================================================================
-- MIGRATION: Menambahkan Kolom Koordinat GPS (latitude & longitude) ke Tabel Complaints
-- File: database/migration_add_gps_to_complaints.sql
-- ============================================================================

ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

CREATE INDEX IF NOT EXISTS idx_complaints_lat_lng ON public.complaints(latitude, longitude);

COMMENT ON COLUMN public.complaints.latitude IS 'Titik koordinat Latitude GPS lokasi aduan warga';
COMMENT ON COLUMN public.complaints.longitude IS 'Titik koordinat Longitude GPS lokasi aduan warga';
