// services/api.ts
import { Config } from '@/constants/Config';
import { supabase } from './supabase';
import {
  mockUser,
  mockFamilyMembers,
  mockLetterTypes,
  mockLetterRequests,
  mockComplaints,
  mockAnnouncements,
  mockApbdes,
  Citizen,
  LetterType,
  LetterRequest,
  Complaint,
  Announcement
} from '@/store/mockData';

class ApiService {
  private localLetterRequests: LetterRequest[] = [...mockLetterRequests];
  private localComplaints: Complaint[] = [...mockComplaints];

  // ==========================================
  // 1. User & Family Members
  // ==========================================
  async getCurrentUser(): Promise<Citizen> {
    try {
      const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .eq('nik', '3201012345670001')
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          nik: data.nik,
          no_kk: data.no_kk,
          nama_lengkap: data.nama_lengkap,
          jenis_kelamin: data.jenis_kelamin,
          status_keluarga: data.status_dalam_keluarga || 'Kepala Keluarga',
          tanggal_lahir: data.tanggal_lahir,
          pekerjaan: data.pekerjaan,
          rt: data.rt,
          rw: data.rw,
          dusun: data.dusun,
          is_verified: !!data.is_verified,
        };
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getCurrentUser offline fallback.', err);
    }
    return mockUser;
  }

  async getFamilyMembers(): Promise<Citizen[]> {
    try {
      const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .eq('no_kk', '3201012345670000')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          nik: d.nik,
          no_kk: d.no_kk,
          nama_lengkap: d.nama_lengkap,
          jenis_kelamin: d.jenis_kelamin,
          status_keluarga: d.status_dalam_keluarga || 'Anggota Keluarga',
          tanggal_lahir: d.tanggal_lahir,
          pekerjaan: d.pekerjaan,
          rt: d.rt,
          rw: d.rw,
          dusun: d.dusun,
          is_verified: !!d.is_verified,
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getFamilyMembers offline fallback.', err);
    }
    return mockFamilyMembers;
  }

  // ==========================================
  // 2. Letters (E-Surat Pelayanan)
  // ==========================================
  async getLetterTypes(): Promise<LetterType[]> {
    try {
      const { data, error } = await supabase
        .from('letter_types')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          description: d.description || '',
          estimated_days: d.estimated_days || 1,
          icon: d.icon || 'document-text',
          required_docs: Array.isArray(d.required_docs) ? d.required_docs : ['Foto KTP', 'Foto KK'],
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterTypes offline fallback.', err);
    }
    return mockLetterTypes;
  }

  async getLetterRequests(): Promise<LetterRequest[]> {
    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          tracking_number: d.tracking_number,
          letter_type_id: d.letter_type_id || 1,
          letter_name: d.letter_name,
          applicant_name: d.applicant_name,
          citizen_name: d.citizen_name,
          citizen_nik: d.citizen_nik,
          status: d.status,
          purpose: d.purpose,
          official_number: d.letter_official_number,
          qr_token: d.qr_verification_token,
          created_at: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
          timeline: Array.isArray(d.timeline) && d.timeline.length > 0 ? d.timeline : [
            { title: 'Permohonan Dikirim Warga', time: 'Baru saja', done: true }
          ]
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterRequests offline fallback.', err);
    }
    return this.localLetterRequests;
  }

  async getLetterRequestByTracking(trackingNumber: string): Promise<LetterRequest> {
    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          tracking_number: data.tracking_number,
          letter_type_id: data.letter_type_id || 1,
          letter_name: data.letter_name,
          applicant_name: data.applicant_name,
          citizen_name: data.citizen_name,
          citizen_nik: data.citizen_nik,
          status: data.status,
          purpose: data.purpose,
          official_number: data.letter_official_number,
          qr_token: data.qr_verification_token,
          created_at: data.created_at ? new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
          timeline: Array.isArray(data.timeline) ? data.timeline : []
        };
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterRequestByTracking fallback.', err);
    }

    const fallback = this.localLetterRequests.find(r => r.tracking_number === trackingNumber) || this.localLetterRequests[0];
    return fallback;
  }

  async submitLetterRequest(payload: {
    letter_type_id: number;
    citizen_id: string;
    purpose: string;
    attachments?: string[];
  }): Promise<LetterRequest> {
    const selectedType = mockLetterTypes.find(t => t.id === payload.letter_type_id);
    const selectedCitizen = mockFamilyMembers.find(c => c.id === payload.citizen_id) || mockUser;
    const now = new Date();
    const trackingNumber = `SRT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTimeStr = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    const timelineData = [
      { title: 'Permohonan Dikirim Warga', time: nowTimeStr, done: true },
      { title: 'Pemeriksaan Berkas Operator', time: '-', done: false },
      { title: 'Penerbitan Nomor Resmi Desa', time: '-', done: false },
      { title: 'Tanda Tangan Elektronik QR Kades', time: '-', done: false },
    ];

    const newRequest: LetterRequest = {
      id: `req-${Date.now()}`,
      tracking_number: trackingNumber,
      letter_type_id: payload.letter_type_id,
      letter_name: selectedType ? selectedType.name : 'Surat Keterangan',
      applicant_name: mockUser.nama_lengkap,
      citizen_name: selectedCitizen.nama_lengkap,
      citizen_nik: selectedCitizen.nik,
      status: 'submitted',
      purpose: payload.purpose,
      created_at: 'Baru saja',
      timeline: timelineData
    };

    // Insert to Supabase
    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .insert({
          tracking_number: trackingNumber,
          letter_type_id: payload.letter_type_id,
          letter_name: newRequest.letter_name,
          applicant_user_id: 'usr-001',
          applicant_name: mockUser.nama_lengkap,
          applicant_phone: '081234567890',
          citizen_name: selectedCitizen.nama_lengkap,
          citizen_nik: selectedCitizen.nik,
          citizen_address: `Kp. Sukamaju RT ${selectedCitizen.rt || '02'} / RW ${selectedCitizen.rw || '01'}, ${selectedCitizen.dusun || 'Dusun Mekar'}`,
          status: 'submitted',
          purpose: payload.purpose,
          timeline: timelineData
        })
        .select('*')
        .single();

      if (!error && data) {
        newRequest.id = data.id;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase insert letter error, saving locally.', err);
    }

    this.localLetterRequests = [newRequest, ...this.localLetterRequests];
    return newRequest;
  }

  // ==========================================
  // 3. Complaints (Aduan & Aspirasi)
  // ==========================================
  async getComplaints(): Promise<Complaint[]> {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          ticket_number: d.ticket_number,
          category: d.category,
          title: d.title,
          description: d.description,
          location: d.location_address || d.location || 'Desa Sukamaju',
          reporter_name: d.is_anonymous ? 'Warga Desa (Anonim)' : d.reporter_name,
          is_anonymous: !!d.is_anonymous,
          status: d.status,
          photo_url: d.photo_url,
          resolution_proof: d.resolution_proof,
          created_at: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getComplaints offline fallback.', err);
    }
    return this.localComplaints;
  }

  async submitComplaint(payload: {
    category: string;
    title: string;
    description: string;
    location: string;
    is_anonymous: boolean;
    photo_url?: string;
  }): Promise<Complaint> {
    const now = new Date();
    const ticketNumber = `ADU-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      ticket_number: ticketNumber,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : mockUser.nama_lengkap,
      is_anonymous: payload.is_anonymous,
      status: 'submitted',
      photo_url: payload.photo_url,
      created_at: 'Baru saja'
    };

    // Insert to Supabase
    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          ticket_number: ticketNumber,
          category: payload.category,
          title: payload.title,
          description: payload.description,
          location_address: payload.location,
          reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : mockUser.nama_lengkap,
          reporter_phone: '081234567890',
          is_anonymous: payload.is_anonymous,
          status: 'submitted',
          photo_url: payload.photo_url
        })
        .select('*')
        .single();

      if (!error && data) {
        newComplaint.id = data.id;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase insert complaint error, saving locally.', err);
    }

    this.localComplaints = [newComplaint, ...this.localComplaints];
    return newComplaint;
  }

  // ==========================================
  // 4. Announcements & APBDes
  // ==========================================
  async getAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          summary: d.summary || (d.content ? d.content.substring(0, 120) : ''),
          content: d.content || d.summary || '',
          date: d.date || (d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'),
          is_urgent: !!d.is_urgent,
          author: d.author || 'Sekretariat Desa',
          views: d.views || 0
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getAnnouncements offline fallback.', err);
    }
    return mockAnnouncements;
  }

  async getApbdes() {
    try {
      const { data, error } = await supabase
        .from('apbdes_items')
        .select('*')
        .order('account_code', { ascending: true });

      if (!error && data && data.length > 0) {
        const pendapatanItems = data.filter((i: any) => i.type === 'pendapatan').map((i: any) => ({
          name: i.name,
          amount: Number(i.budget_amount),
          percentage: Number(i.percentage)
        }));
        const belanjaItems = data.filter((i: any) => i.type === 'belanja').map((i: any) => ({
          name: i.name,
          amount: Number(i.budget_amount),
          percentage: Number(i.percentage)
        }));

        const totalPendapatan = pendapatanItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const totalBelanja = belanjaItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);

        return {
          fiscal_year: 2026,
          pendapatan: {
            total: totalPendapatan,
            items: pendapatanItems
          },
          belanja: {
            total: totalBelanja,
            items: belanjaItems
          },
          realisasi_persen: 74.5
        };
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getApbdes offline fallback.', err);
    }
    return mockApbdes;
  }
}

export const api = new ApiService();
