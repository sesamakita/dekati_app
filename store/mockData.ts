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
  timeline: { title: string; time: string; done: boolean }[];
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
  resolution_proof?: string;
  created_at: string;
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

// Current User Mock
export const mockUser: Citizen = {
  id: 'usr-001',
  nik: '3201012345670001',
  no_kk: '3201012345670000',
  nama_lengkap: 'Ahmad Subarjo',
  jenis_kelamin: 'L',
  status_keluarga: 'Kepala Keluarga',
  tanggal_lahir: '1978-05-14',
  pekerjaan: 'Wiraswasta',
  rt: '02',
  rw: '01',
  dusun: 'Dusun Mekar',
  is_verified: true,
};

// Family Members under the same KK
export const mockFamilyMembers: Citizen[] = [
  mockUser,
  {
    id: 'usr-002',
    nik: '3201012345670002',
    no_kk: '3201012345670000',
    nama_lengkap: 'Siti Rahmawati',
    jenis_kelamin: 'P',
    status_keluarga: 'Istri',
    tanggal_lahir: '1982-08-20',
    pekerjaan: 'Mengurus Rumah Tangga',
    rt: '02',
    rw: '01',
    dusun: 'Dusun Mekar',
    is_verified: true,
  },
  {
    id: 'usr-003',
    nik: '3201016543210002',
    no_kk: '3201012345670000',
    nama_lengkap: 'Siti Subarjo',
    jenis_kelamin: 'P',
    status_keluarga: 'Anak',
    tanggal_lahir: '2005-11-10',
    pekerjaan: 'Pelajar / Mahasiswa',
    rt: '02',
    rw: '01',
    dusun: 'Dusun Mekar',
    is_verified: true,
  },
  {
    id: 'usr-004',
    nik: '3201016543210003',
    no_kk: '3201012345670000',
    nama_lengkap: 'Doni Subarjo',
    jenis_kelamin: 'L',
    status_keluarga: 'Anak',
    tanggal_lahir: '2010-02-18',
    pekerjaan: 'Pelajar',
    rt: '02',
    rw: '01',
    dusun: 'Dusun Mekar',
    is_verified: true,
  }
];

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

export const mockLetterRequests: LetterRequest[] = [
  {
    id: 'req-001',
    tracking_number: 'SRT-202609-0012',
    letter_type_id: 1,
    letter_name: 'Surat Keterangan Tidak Mampu (SKTM)',
    applicant_name: 'Ahmad Subarjo',
    citizen_name: 'Siti Subarjo (Anak)',
    citizen_nik: '3201016543210002',
    status: 'signed',
    purpose: 'Syarat pengajuan beasiswa pendidikan di perguruan tinggi negeri',
    official_number: '470/12/SKTM/IX/2026',
    qr_token: 'valid-4f8a92-sktm-2026',
    created_at: '19 September 2026, 08:30 WIB',
    timeline: [
      { title: 'Permohonan Dikirim Warga', time: '19 Sep 08:30', done: true },
      { title: 'Berkas Diverifikasi Petugas Desa', time: '19 Sep 09:15', done: true },
      { title: 'Diterbitkan No. Registrasi Desa', time: '19 Sep 10:00', done: true },
      { title: 'Ditandatangani Digital (TTE QR Kades)', time: '19 Sep 10:20', done: true },
      { title: 'Surat Selesai & Siap Diunduh', time: '19 Sep 10:25', done: true },
    ]
  },
  {
    id: 'req-002',
    tracking_number: 'SRT-202609-0005',
    letter_type_id: 2,
    letter_name: 'Surat Keterangan Usaha (SKU)',
    applicant_name: 'Ahmad Subarjo',
    citizen_name: 'Ahmad Subarjo',
    citizen_nik: '3201012345670001',
    status: 'in_verification',
    purpose: 'Pengajuan modal kerja KUR Mikro Bank BRI',
    created_at: '18 September 2026, 14:10 WIB',
    timeline: [
      { title: 'Permohonan Dikirim Warga', time: '18 Sep 14:10', done: true },
      { title: 'Sedang Diverifikasi Petugas Desa', time: '19 Sep 08:00', done: true },
      { title: 'Penerbitan No. Registrasi Desa', time: '-', done: false },
      { title: 'Pengesahan TTE Kades', time: '-', done: false },
    ]
  }
];

export const mockComplaints: Complaint[] = [
  {
    id: 'cmp-001',
    ticket_number: 'ADU-202609-0012',
    category: 'Jalan Rusak / Berlubang',
    title: 'Jalan Berlubang Parah Dekat Jembatan RT 03',
    description: 'Kedalaman lubang sekitar 30cm dan sering menimbulkan genangan air serta kecelakaan pengendara motor saat malam.',
    location: 'Jl. Raya Desa Km 2, Dusun Mekar (RT 03 / RW 01)',
    reporter_name: 'Warga Dusun Mekar',
    is_anonymous: true,
    status: 'in_progress',
    created_at: '18 September 2026, 16:45 WIB'
  },
  {
    id: 'cmp-002',
    ticket_number: 'ADU-202609-0008',
    category: 'Penerangan Jalan (PJU)',
    title: 'Lampu PJU Padam di Gang Mawar',
    description: 'Sudah 4 hari lampu penerangan jalan mati membuat jalanan gelap gulita.',
    location: 'Gang Mawar RT 01 / RW 01',
    reporter_name: 'Ahmad Subarjo',
    is_anonymous: false,
    status: 'resolved',
    resolution_proof: 'Lampu telah diganti bohlam LED baru oleh Tim Satlinmas Desa.',
    created_at: '15 September 2026, 19:20 WIB'
  }
];

export const mockAnnouncements: Announcement[] = [
  {
    id: 'anc-001',
    title: 'Penyaluran Bantuan Langsung Tunai (BLT) Dana Desa Tahap 3',
    category: 'Bansos',
    summary: 'Penyaluran BLT-DD akan dilaksanakan pada Sabtu, 21 September 2026 mulai pukul 09.00 WIB di Aula Balai Desa Sukamaju.',
    content: `Pemberitahuan kepada seluruh warga Keluarga Penerima Manfaat (KPM) Desa Sukamaju:

1. Waktu & Lokasi Penyaluran:
• Hari / Tanggal: Sabtu, 21 September 2026
• Waktu: Pukul 09.00 s/d 14.00 WIB
• Tempat: Gedung Pertemuan & Aula Balai Desa Sukamaju

2. Syarat Dokumen Pengambilan:
• Membawa KTP Elektronik Asli dan Kartu Keluarga (KK) Asli.
• Membawa Surat Undangan Penyaluran Resmi dari RT/RW setempat.
• Bagi lansia atau warga sakit keras, pengambilan dapat diwakilkan oleh anggota keluarga dalam satu Kartu Keluarga (KK) dengan melampirkan Surat Kuasa bermeterai cukup.

3. Ketentuan & Rincian Bantuan:
• Bantuan berupa uang tunai sebesar Rp 300.000,- per bulan (total alokasi Tahap 3 sebesar Rp 900.000,-).
• Warga diharapkan datang sesuai jadwal giliran dusun untuk menghindari penumpukan antrean:
  - Dusun Mekar: 09.00 - 10.30 WIB
  - Dusun Kencana: 10.30 - 12.00 WIB
  - Dusun Harapan: 13.00 - 14.00 WIB
• Penyaluran ini 100% GRATIS tanpa potongan biaya apapun.

Himbauan:
Mohon hadir tepat waktu dan selalu menjaga ketertiban umum. Jika ada kendala, silakan hubungi kepala dusun masing-masing.`,
    date: '18 Sep 2026',
    is_urgent: true,
    author: 'Sekretariat Desa Sukamaju',
    views: 412
  },
  {
    id: 'anc-002',
    title: 'Jadwal Pelayanan Posyandu Balita & Lansia Dusun Mekar',
    category: 'Kesehatan',
    summary: 'Pemeriksaan rutin kesehatan anak dan lansia bertempat di Pos RW 01 Sukamaju.',
    date: '17 Sep 2026',
    is_urgent: false,
    author: 'Kader Posyandu Melati',
    views: 185
  },
  {
    id: 'anc-003',
    title: 'Kerja Bakti & Gotong Royong Pembersihan Saluran Air Musim Hujan',
    category: 'Lingkungan',
    summary: 'Dihimbau seluruh warga RT 01 s/d RT 04 untuk berpartisipasi menjaga kebersihan parit.',
    date: '14 Sep 2026',
    is_urgent: false,
    author: 'Kepala Dusun Mekar',
    views: 320
  }
];

export const mockApbdes = {
  fiscal_year: 2026,
  pendapatan: {
    total: 2150000000,
    items: [
      { name: 'Dana Desa (DDS) APBN', amount: 1200000000, percentage: 56 },
      { name: 'Alokasi Dana Desa (ADD) APBD', amount: 650000000, percentage: 30 },
      { name: 'Bagi Hasil Pajak & Retribusi Daerah', amount: 180000000, percentage: 8 },
      { name: 'Pendapatan Asli Desa (BUMDes & Pasar)', amount: 120000000, percentage: 6 }
    ]
  },
  belanja: {
    total: 2100000000,
    items: [
      { name: 'Pembangunan Infrastruktur Desa', amount: 950000000, percentage: 45 },
      { name: 'Penyelenggaraan Pemerintahan Desa', amount: 550000000, percentage: 26 },
      { name: 'Pembinaan & Pemberdayaan Masyarakat', amount: 350000000, percentage: 17 },
      { name: 'Penanggulangan Bencana & Mendesak', amount: 250000000, percentage: 12 }
    ]
  },
  realisasi_persen: 74.5
};
