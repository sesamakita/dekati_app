// store/mockData.ts

export interface Citizen {
  id: string;
  nik: string;
  no_kk: string;
  nama_lengkap: string;
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
  verification_status?: 'verified' | 'pending' | 'needs_revision';
  rejection_reason?: string;
  document_type?: string;
  no_telepon?: string;
  phone?: string;
}

export interface LetterType {
  id: number;
  code: string;
  name: string;
  description: string;
  estimated_days: number;
  icon: string;
  required_docs: string[];
}

export interface LetterRequest {
  id: string;
  tracking_number: string;
  letter_type_id: number;
  letter_name: string;
  applicant_name: string;
  citizen_name: string;
  citizen_nik: string;
  status: 'submitted' | 'in_verification' | 'needs_revision' | 'approved' | 'signed' | 'completed' | 'rejected';
  purpose: string;
  official_number?: string;
  qr_token?: string;
  created_at: string;
  timeline: { title: string; time: string; done: boolean; actor?: string }[];
  attachments?: { name: string; url: string }[];
  rejection_reason?: string;
  signed_by_name?: string;
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

export const mockEmergencyContacts: EmergencyContact[] = [];

export const mockVillageEvents: VillageEvent[] = [];

// Current User Initial State
export const mockUser: Citizen = {
  id: '',
  nik: '',
  no_kk: '',
  nama_lengkap: 'Warga Desa',
  jenis_kelamin: 'L',
  status_keluarga: 'Kepala Keluarga',
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
    required_docs: ['Foto KTP Pemohon', 'Foto Kartu Keluarga (KK)', 'Surat Pengantar RT/RW']
  },
  {
    id: 2,
    code: 'SKU',
    name: 'Surat Keterangan Usaha (SKU)',
    description: 'Persyaratan pengajuan pinjaman modal usaha/KUR perbankan dan legalitas toko.',
    estimated_days: 1,
    icon: 'store',
    required_docs: ['Foto KTP Pemilik Usaha', 'Foto Kartu Keluarga (KK)', 'Foto Tempat/Kegiatan Usaha']
  },
  {
    id: 3,
    code: 'SKCK',
    name: 'Surat Pengantar SKCK Kepolisian',
    description: 'Surat pengantar resmi ke Polsek untuk pembuatan SKCK melamar kerja / CPNS.',
    estimated_days: 1,
    icon: 'badge',
    required_docs: ['Foto KTP', 'Foto Kartu Keluarga (KK)', 'Pas Foto Berwarna 4x6']
  },
  {
    id: 4,
    code: 'SK_DOMISILI',
    name: 'Surat Keterangan Domisili',
    description: 'Keterangan tempat tinggal sah bagi warga atau perorangan.',
    estimated_days: 1,
    icon: 'home',
    required_docs: ['Foto KTP', 'Foto Kartu Keluarga', 'Bukti Pengantar RT']
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
