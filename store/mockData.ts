// store/mockData.ts

export interface Citizen {
  id: string;
  nik: string;
  no_kk: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  jenis_kelamin: 'L' | 'P';
  status_keluarga: string;
  tanggal_lahir: string;
  pekerjaan: string;
  rt: string;
  rw: string;
  dusun: string;
  is_verified: boolean;
  verified_by?: string;
  foto_kk_path?: string;
  foto_ktp_path?: string;
  foto_selfie_ktp_path?: string;
  verification_status?: 'verified' | 'pending' | 'needs_revision';
  rejection_reason?: string;
  document_type?: string;
  no_telepon?: string;
  phone?: string;
  phone_number?: string;
  alamat_lengkap?: string;
  village_name?: string;
  village_code?: string;
  district?: string;
  regency?: string;
  province?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VillageProfile {
  id: number;
  name: string;
  code?: string;
  village_type?: 'desa' | 'kelurahan';
  district?: string;
  regency?: string;
  province?: string;
  postal_code?: string;
  office_address?: string;
  office_phone?: string;
  office_email?: string;
  kades_name?: string;
  kades_nip?: string;
  sekdes_name?: string;
  vision?: string;
  mission?: string[];
  logo_kabupaten_url?: string;
  logo_desa_url?: string;
  logo_provinsi_url?: string;
}

export interface LetterType {
  id: number;
  code: string;
  name: string;
  description: string;
  estimated_days: number;
  icon: string;
  required_docs: string[];
  requires_rt_approval?: boolean;
  rt_guidelines?: string;
}

export type LetterLogoLayout = 'standard_left' | 'dual_logo' | 'center_garuda' | 'no_logo';

export interface LetterTemplateHeaderConfig {
  font_family?: string;
  line_spacing?: number;
  border_style?: 'double' | 'single' | 'none';
  show_kab_logo?: boolean;
  show_desa_logo?: boolean;
  show_garuda_logo?: boolean;
  logo_layout?: LetterLogoLayout;
  kab_logo_url?: string;
  desa_logo_url?: string;
  garuda_logo_url?: string;
}

export interface LetterTemplateCustomField {
  label: string;
  key: string;
  placeholder?: string;
}

export interface LetterTemplate {
  id?: string;
  letter_type_code: string; // 'SKTM' | 'SKU' | 'SKCK_PENGANTAR' | 'SK_DOMISILI' | 'DEFAULT'
  letter_name?: string;
  is_active?: boolean;
  title_format: string;
  opening_text: string;
  declaration_text: string;
  closing_text: string;
  header_config?: LetterTemplateHeaderConfig;
  custom_fields?: LetterTemplateCustomField[];
  signer_role?: string;
  updated_at?: string;
  created_at?: string;
}

export type LetterStatus = 'pending_rt' | 'submitted' | 'in_verification' | 'needs_revision' | 'approved' | 'signed' | 'completed' | 'rejected';
export type RtApprovalStatus = 'not_required' | 'pending_rt' | 'approved_by_rt' | 'rejected_by_rt';

export interface LetterRequest {
  id: string;
  tracking_number: string;
  letter_type_id: number;
  letter_name: string;
  applicant_name: string;
  citizen_name: string;
  citizen_nik: string;
  status: LetterStatus;
  purpose: string;
  official_number?: string;
  qr_token?: string;
  qr_url?: string;
  citizen_address?: string;
  created_at: string;
  timeline: { title: string; time: string; done: boolean; actor?: string }[];
  attachments?: { name: string; url: string }[];
  rejection_reason?: string;
  signed_by_name?: string;
  rt_number?: string;
  rw_number?: string;
  rt_status?: RtApprovalStatus;
  rt_leader_name?: string;
  rt_leader_phone?: string;
  rt_approved_at?: string;
  rt_rejection_reason?: string;
  rt_notes?: string;
}

export interface NeighborhoodUnit {
  id: string;
  rt_number: string;
  rw_number: string;
  dusun?: string;
  rt_leader_name: string;
  rt_leader_phone: string;
  rw_leader_name?: string;
  rw_leader_phone?: string;
  active: boolean;
}

export interface Complaint {
  id: string;
  ticket_number: string;
  category: string;
  title: string;
  description: string;
  location: string;
  reporter_name: string;
  is_anonymous: boolean;
  status: 'submitted' | 'in_progress' | 'resolved';
  photo_url?: string;
  photo_urls?: string[];
  latitude?: number;
  longitude?: number;
  resolution_proof?: string;
  resolution_notes?: string;
  assigned_department?: string;
  assigned_officer?: string;
  citizen_id?: string;
  citizen_nik?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: string;
  summary: string;
  content?: string;
  date: string;
  is_urgent: boolean;
  author: string;
  views: number;
}

export interface EmergencyContact {
  id: string;
  title: string;
  phone: string;
  icon?: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface VillageEvent {
  id: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  location: string;
  organizer?: string;
  description?: string;
  is_active?: boolean;
}

export const mockEmergencyContacts: EmergencyContact[] = [
  {
    id: 'emg-1',
    title: 'Ambulans Desa 24 Jam',
    phone: '0812-3456-7890',
    icon: 'car',
    description: 'Layanan antar rujukan medis & persalinan darurat gratis warga',
    order_index: 1,
    is_active: true
  },
  {
    id: 'emg-2',
    title: 'Bhabinkamtibmas Polsek',
    phone: '0813-9876-5432',
    icon: 'shield',
    description: 'Petugas kepolisian pembina kamtibmas & keamanan wilayah desa',
    order_index: 2,
    is_active: true
  },
  {
    id: 'emg-3',
    title: 'Babinsa Koramil',
    phone: '0811-2233-4455',
    icon: 'shield-checkmark',
    description: 'Bintara pembina ketahanan wilayah & penanggulangan bencana',
    order_index: 3,
    is_active: true
  },
  {
    id: 'emg-4',
    title: 'Puskesmas / Bidan Desa',
    phone: '0821-5566-7788',
    icon: 'medkit',
    description: 'Pemeriksaan darurat medis, posyandu & layanan ibu-anak',
    order_index: 4,
    is_active: true
  },
  {
    id: 'emg-5',
    title: 'Sekretariat Kantor Desa',
    phone: '0251-876543',
    icon: 'business',
    description: 'Layanan informasi umum & pengaduan administrasi kantor desa',
    order_index: 5,
    is_active: true
  }
];

export const mockVillageEvents: VillageEvent[] = [
  {
    id: 'evt-1',
    title: 'Posyandu Balita & Lansia Dusun Mekar',
    category: 'Kesehatan',
    event_date: 'Kamis, 15 Okt 2026',
    event_time: '08.30 - 11.30 WIB',
    location: 'Pos RW 01 Kp. Sukamaju',
    organizer: 'Kader Posyandu Melati',
    description: 'Pemeriksaan rutin tumbuh kembang balita, imunisasi dasar lengkap, serta cek tensi dan gula darah gratis bagi warga lansia.',
    is_active: true
  },
  {
    id: 'evt-2',
    title: 'Kerja Bakti Lingkungan & Normalisasi Drainase',
    category: 'Lingkungan',
    event_date: 'Minggu, 18 Okt 2026',
    event_time: '07.00 - 10.00 WIB',
    location: 'Saluran Drainase RT 01 - RT 04',
    organizer: 'Karang Taruna & Satlinmas Desa',
    description: 'Gotong royong warga membersihkan sedimentasi saluran air untuk mengantisipasi genangan air di musim penghujan.',
    is_active: true
  },
  {
    id: 'evt-3',
    title: 'Musyawarah Perencanaan Pembangunan Desa (Musrenbangdes)',
    category: 'Pemerintahan',
    event_date: 'Rabu, 21 Okt 2026',
    event_time: '09.00 - 12.30 WIB',
    location: 'Aula Balai Desa',
    organizer: 'BPD & Pemerintah Desa',
    description: 'Penyusunan usulan prioritas program kerja pembangunan desa bersama ketua RT, RW, dan tokoh masyarakat.',
    is_active: true
  }
];

// Current User Initial State
export const mockUser: Citizen = {
  id: '',
  nik: '',
  no_kk: '',
  nama_lengkap: '',
  jenis_kelamin: 'L',
  status_keluarga: '',
  tanggal_lahir: '',
  pekerjaan: '',
  rt: '',
  rw: '',
  dusun: '',
  is_verified: false,
};

// Family Members under the same KK
export const mockFamilyMembers: Citizen[] = [];

export const mockLetterTypes: LetterType[] = [
  {
    id: 1,
    code: 'SKTM',
    name: 'Surat Keterangan Tidak Mampu (SKTM)',
    description: 'Keperluan beasiswa kuliah, permohonan keringanan RS, atau bantuan pendidikan.',
    estimated_days: 1,
    icon: 'school',
    required_docs: ['Foto KTP Pemohon', 'Foto Kartu Keluarga (KK)', 'Surat Pengantar RT/RW'],
    requires_rt_approval: true,
    rt_guidelines: 'Memerlukan surat keterangan pengantar / rekomendasi kelayakan dari Ketua RT'
  },
  {
    id: 2,
    code: 'SKU',
    name: 'Surat Keterangan Usaha (SKU)',
    description: 'Persyaratan pengajuan pinjaman modal usaha/KUR perbankan dan legalitas toko.',
    estimated_days: 1,
    icon: 'store',
    required_docs: ['Foto KTP Pemilik Usaha', 'Foto Kartu Keluarga (KK)', 'Foto Tempat/Kegiatan Usaha'],
    requires_rt_approval: true,
    rt_guidelines: 'Memerlukan validasi keberadaan usaha aktif di lingkungan oleh Ketua RT'
  },
  {
    id: 3,
    code: 'SKCK',
    name: 'Surat Pengantar SKCK Kepolisian',
    description: 'Surat pengantar resmi ke Polsek untuk pembuatan SKCK melamar kerja / CPNS.',
    estimated_days: 1,
    icon: 'badge',
    required_docs: ['Foto KTP', 'Foto Kartu Keluarga (KK)', 'Pas Foto Berwarna 4x6'],
    requires_rt_approval: true,
    rt_guidelines: 'Memerlukan surat pengantar dan keterangan kelakuan baik dari Ketua RT'
  },
  {
    id: 4,
    code: 'SK_DOMISILI',
    name: 'Surat Keterangan Domisili',
    description: 'Keterangan tempat tinggal sah bagi warga atau perorangan.',
    estimated_days: 1,
    icon: 'home',
    required_docs: ['Foto KTP', 'Foto Kartu Keluarga', 'Bukti Pengantar RT'],
    requires_rt_approval: true,
    rt_guidelines: 'Memerlukan konfirmasi Ketua RT atas domisili nyata tempat tinggal pemohon'
  }
];

export const mockNeighborhoodUnits: NeighborhoodUnit[] = [
  {
    id: 'rt-lk-001',
    rt_number: '01',
    rw_number: '01',
    dusun: 'Dusun I Lancang Kuning',
    rt_leader_name: 'Bapak Hendra Gunawan',
    rt_leader_phone: '081266000001',
    rw_leader_name: 'Bapak H. Mansyur',
    rw_leader_phone: '081266000000',
    active: true
  },
  {
    id: 'rt-lk-002',
    rt_number: '02',
    rw_number: '01',
    dusun: 'Dusun I Lancang Kuning',
    rt_leader_name: 'Bapak Wawan Setiawan',
    rt_leader_phone: '081266000002',
    rw_leader_name: 'Bapak H. Mansyur',
    rw_leader_phone: '081266000000',
    active: true
  },
  {
    id: 'rt-lk-003',
    rt_number: '03',
    rw_number: '02',
    dusun: 'Dusun II Lancang Kuning',
    rt_leader_name: 'Bapak Bambang Herwanto',
    rt_leader_phone: '081266000003',
    rw_leader_name: 'Bapak Sugiono',
    rw_leader_phone: '082166000000',
    active: true
  },
  {
    id: 'rt-lk-004',
    rt_number: '04',
    rw_number: '02',
    dusun: 'Dusun II Lancang Kuning',
    rt_leader_name: 'Bapak Sukirman',
    rt_leader_phone: '081366000004',
    rw_leader_name: 'Bapak Sugiono',
    rw_leader_phone: '082166000000',
    active: true
  }
];

export const mockLetterRequests: LetterRequest[] = [];

export const mockComplaints: Complaint[] = [];

export const mockAnnouncements: Announcement[] = [];

export const mockApbdes = {
  fiscal_year: new Date().getFullYear(),
  pendapatan: {
    total: 0,
    items: []
  },
  belanja: {
    total: 0,
    items: []
  },
  realisasi_persen: 0
};
