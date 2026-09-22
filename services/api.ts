// services/api.ts
import { Config } from '@/constants/Config';
import { supabase } from './supabase';
import { auth } from './auth';
import { uploadImageToSupabase } from './storage';
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
  private localFamilyMembers: Citizen[] = [];
  private currentCitizen: Citizen = mockUser;

  // ==========================================
  // 1. Citizen Auth, User & Family Members
  // ==========================================
  async loginCitizen(identifier: string, password: string): Promise<{ success: boolean; data?: Citizen; message?: string }> {
    try {
      const session = await auth.loginCitizen(identifier, password);
      this.currentCitizen = session.citizen;
      return { success: true, data: session.citizen };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'NIK atau Kata Sandi tidak cocok dengan data Buku Induk Kependudukan Desa.'
      };
    }
  }

  async registerCitizen(payload: {
    nik: string;
    nama: string;
    phone: string;
    password: string;
    no_kk?: string;
  }): Promise<{ success: boolean; data?: Citizen; message?: string }> {
    try {
      const session = await auth.registerCitizen({
        nik: payload.nik,
        nama: payload.nama,
        phone: payload.phone,
        password: payload.password,
        no_kk: payload.no_kk,
      });
      this.currentCitizen = session.citizen;
      return { success: true, data: session.citizen };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Gagal mendaftarkan akun warga ke database desa.'
      };
    }
  }

  async logoutCitizen(): Promise<void> {
    await auth.logoutCitizen();
    this.currentCitizen = mockUser;
  }

  async getCurrentUser(): Promise<Citizen> {
    // 1. Cek sesi aktif di memori auth
    const active = auth.getCurrentCitizen();
    if (active) {
      this.currentCitizen = active;
      return active;
    }

    // 2. Cek sesi tersimpan di storage lokal
    try {
      const stored = await auth.getStoredSession();
      if (stored?.citizen) {
        this.currentCitizen = stored.citizen;
        return stored.citizen;
      }
    } catch (e) {
      console.warn('[Dekati Mobile] Gagal baca sesi lokal:', e);
    }

    // 3. Fallback query database jika ada NIK aktif
    try {
      const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .eq('nik', this.currentCitizen.nik)
        .maybeSingle();

      if (!error && data) {
        this.currentCitizen = {
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
        return this.currentCitizen;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getCurrentUser offline fallback.', err);
    }
    return this.currentCitizen;
  }

  async getFamilyMembers(): Promise<Citizen[]> {
    const current = await this.getCurrentUser();
    let members: Citizen[] = [];

    try {
      const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .eq('no_kk', current.no_kk)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        members = data.map((d: any) => {
          const isVerified = !!d.is_verified;
          const verifiedBy = d.verified_by || '';
          const isRevision = !isVerified && verifiedBy.startsWith('revisi:');
          const verificationStatus: 'verified' | 'pending' | 'needs_revision' = isVerified
            ? 'verified'
            : isRevision
            ? 'needs_revision'
            : 'pending';
          const rejectionReason = isRevision ? verifiedBy.replace(/^revisi:\s*/i, '').trim() : undefined;

          return {
            id: d.id,
            nik: d.nik,
            no_kk: d.no_kk,
            nama_lengkap: d.nama_lengkap,
            jenis_kelamin: (d.jenis_kelamin as 'L' | 'P') || 'L',
            status_keluarga: d.status_dalam_keluarga || 'Anggota Keluarga',
            tanggal_lahir: d.tanggal_lahir || '2000-01-01',
            pekerjaan: d.pekerjaan || 'Warga Desa',
            rt: d.rt || current.rt,
            rw: d.rw || current.rw,
            dusun: d.dusun || current.dusun,
            is_verified: isVerified,
            verified_by: verifiedBy,
            foto_kk_path: d.foto_kk_path,
            verification_status: verificationStatus,
            rejection_reason: rejectionReason,
          };
        });
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getFamilyMembers offline fallback.', err);
    }

    if (members.length === 0) {
      // Jika database belum mengembalikan data atau offline
      if (current.nik === mockUser.nik) {
        members = mockFamilyMembers.map(m => ({
          ...m,
          verification_status: 'verified' as const,
          foto_kk_path: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80'
        }));
      } else {
        members = [{ ...current, verification_status: 'verified' as const }];
      }
    }

    // Pastikan akun yang sedang login selalu ada di dalam list (sebagai Kepala Keluarga terverifikasi)
    if (!members.some((m) => m.nik === current.nik)) {
      members.unshift({ ...current, verification_status: 'verified' as const });
    }

    // Gabungkan dengan anggota yang baru ditambahkan secara lokal/sesi
    for (const local of this.localFamilyMembers) {
      if (!members.some((m) => m.id === local.id || m.nik === local.nik)) {
        members.push(local);
      }
    }

    return members;
  }

  async addFamilyMember(payload: {
    nik: string;
    nama_lengkap: string;
    jenis_kelamin: 'L' | 'P';
    status_keluarga: string;
    tanggal_lahir?: string;
    pekerjaan?: string;
    phone_number?: string;
    foto_kk_path?: string;
    document_type?: string;
  }): Promise<{ success: boolean; data?: Citizen; message?: string }> {
    const cleanNik = payload.nik.trim();
    const cleanNama = payload.nama_lengkap.trim();

    if (!cleanNik || cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
      return { success: false, message: 'NIK harus terdiri dari tepat 16 digit angka sesuai KTP/KIA.' };
    }
    if (!cleanNama) {
      return { success: false, message: 'Nama lengkap wajib diisi sesuai KTP/Akta/KIA.' };
    }

    const current = await this.getCurrentUser();
    const noKk = current.no_kk || '3201010000000001';

    let cloudPhotoPath = payload.foto_kk_path || '';
    if (cloudPhotoPath && cloudPhotoPath.startsWith('file://')) {
      cloudPhotoPath = await uploadImageToSupabase(cloudPhotoPath, 'citizens', (payload as any).base64);
    }

    const insertPayload: any = {
      nik: cleanNik,
      no_kk: noKk,
      nama_lengkap: cleanNama,
      jenis_kelamin: payload.jenis_kelamin || 'L',
      status_dalam_keluarga: payload.status_keluarga || 'Anak',
      tanggal_lahir: payload.tanggal_lahir || '2005-01-01',
      pekerjaan: payload.pekerjaan || 'Pelajar/Belum Bekerja',
      rt: current.rt || '01',
      rw: current.rw || '01',
      dusun: current.dusun || 'Dusun Mekar',
      alamat_lengkap: `Kp. Sukamaju, RT ${current.rt || '01'}/RW ${current.rw || '01'}, Desa ${Config.villageName}`,
      phone_number: payload.phone_number || '',
      foto_kk_path: cloudPhotoPath,
      is_verified: false,
    };

    try {
      const { data, error } = await supabase
        .from('citizens')
        .insert([insertPayload])
        .select('*')
        .single();

      if (!error && data) {
        const newCitizen: Citizen = {
          id: data.id,
          nik: data.nik,
          no_kk: data.no_kk,
          nama_lengkap: data.nama_lengkap,
          jenis_kelamin: (data.jenis_kelamin as 'L' | 'P') || payload.jenis_kelamin,
          status_keluarga: data.status_dalam_keluarga || payload.status_keluarga,
          tanggal_lahir: data.tanggal_lahir || payload.tanggal_lahir || '2005-01-01',
          pekerjaan: data.pekerjaan || payload.pekerjaan || 'Pelajar/Belum Bekerja',
          rt: data.rt || current.rt,
          rw: data.rw || current.rw,
          dusun: data.dusun || current.dusun,
          is_verified: false,
          verification_status: 'pending',
          foto_kk_path: data.foto_kk_path || cloudPhotoPath,
          document_type: payload.document_type || 'Foto Kartu Keluarga (KK)',
        };
        this.localFamilyMembers.push(newCitizen);
        return { success: true, data: newCitizen };
      }

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          return { success: false, message: 'NIK tersebut sudah terdaftar dalam sistem kependudukan desa.' };
        }
        console.warn('[Dekati Mobile] addFamilyMember Supabase error:', error);
      }
    } catch (err: any) {
      console.warn('[Dekati Mobile] addFamilyMember exception:', err);
    }

    // Fallback lokal jika database offline
    const localCitizen: Citizen = {
      id: 'cit_' + cleanNik,
      nik: cleanNik,
      no_kk: noKk,
      nama_lengkap: cleanNama,
      jenis_kelamin: payload.jenis_kelamin,
      status_keluarga: payload.status_keluarga,
      tanggal_lahir: payload.tanggal_lahir || '2005-01-01',
      pekerjaan: payload.pekerjaan || 'Pelajar/Belum Bekerja',
      rt: current.rt || '01',
      rw: current.rw || '01',
      dusun: current.dusun || 'Dusun Mekar',
      is_verified: false,
      verification_status: 'pending',
      foto_kk_path: cloudPhotoPath,
      document_type: payload.document_type || 'Foto Kartu Keluarga (KK)',
    };
    this.localFamilyMembers.push(localCitizen);
    return { success: true, data: localCitizen };
  }

  async updateFamilyMemberDocument(citizenId: string, photoUri: string, base64?: string): Promise<{ success: boolean; message?: string }> {
    let cloudPhotoUrl = photoUri;
    if (cloudPhotoUrl && cloudPhotoUrl.startsWith('file://')) {
      cloudPhotoUrl = await uploadImageToSupabase(cloudPhotoUrl, 'citizens', base64);
    }

    try {
      const { error } = await supabase
        .from('citizens')
        .update({
          foto_kk_path: cloudPhotoUrl,
          is_verified: false,
          verified_by: null, // Reset status revisi kembali ke pending setelah diunggah ulang
          updated_at: new Date().toISOString()
        })
        .eq('id', citizenId);

      if (error) {
        console.warn('[Dekati Mobile] updateFamilyMemberDocument error:', error);
      }
    } catch (err) {
      console.warn('[Dekati Mobile] updateFamilyMemberDocument exception:', err);
    }

    const idx = this.localFamilyMembers.findIndex(m => m.id === citizenId);
    if (idx !== -1) {
      this.localFamilyMembers[idx] = {
        ...this.localFamilyMembers[idx],
        foto_kk_path: cloudPhotoUrl,
        is_verified: false,
        verification_status: 'pending',
        rejection_reason: undefined,
        verified_by: undefined
      };
    }
    return { success: true };
  }

  async deleteFamilyMember(citizenId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('citizens')
        .delete()
        .eq('id', citizenId);

      if (error) {
        console.warn('[Dekati Mobile] deleteFamilyMember Supabase error:', error);
      }
    } catch (err) {
      console.warn('[Dekati Mobile] deleteFamilyMember exception:', err);
    }

    this.localFamilyMembers = this.localFamilyMembers.filter((m) => m.id !== citizenId);
    return { success: true };
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
    attachments?: Array<{ name: string; url: string }> | string[];
  }): Promise<LetterRequest> {
    const selectedType = mockLetterTypes.find(t => t.id === payload.letter_type_id);
    const familyList = await this.getFamilyMembers();
    const selectedCitizen = familyList.find(c => c.id === payload.citizen_id) || mockFamilyMembers.find(c => c.id === payload.citizen_id) || this.currentCitizen;
    const now = new Date();
    const trackingNumber = `SRT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTimeStr = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    const timelineData = [
      { title: 'Permohonan Dikirim Warga', time: nowTimeStr, done: true },
      { title: 'Pemeriksaan Berkas Operator', time: '-', done: false },
      { title: 'Penerbitan Nomor Resmi Desa', time: '-', done: false },
      { title: 'Tanda Tangan Elektronik QR Kades', time: '-', done: false },
    ];

    // Upload berkas lampiran ke Supabase Cloud Storage
    const processedAttachments: Array<{ name: string; url: string }> = [];
    if (Array.isArray(payload.attachments)) {
      for (const item of payload.attachments) {
        if (typeof item === 'string') {
          const cloudUrl = await uploadImageToSupabase(item, 'letters');
          processedAttachments.push({ name: 'Dokumen Persyaratan', url: cloudUrl });
        } else if (item && typeof item === 'object') {
          const cloudUrl = await uploadImageToSupabase(item.url, 'letters');
          processedAttachments.push({ name: item.name || 'Dokumen Persyaratan', url: cloudUrl });
        }
      }
    }

    const newRequest: LetterRequest = {
      id: `req-${Date.now()}`,
      tracking_number: trackingNumber,
      letter_type_id: payload.letter_type_id,
      letter_name: selectedType ? selectedType.name : 'Surat Keterangan',
      applicant_name: this.currentCitizen.nama_lengkap,
      citizen_name: selectedCitizen.nama_lengkap,
      citizen_nik: selectedCitizen.nik,
      status: 'submitted',
      purpose: payload.purpose,
      created_at: 'Baru saja',
      timeline: timelineData,
      attachments: processedAttachments as any
    };

    // Insert to Supabase
    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .insert({
          tracking_number: trackingNumber,
          letter_type_id: payload.letter_type_id,
          letter_name: newRequest.letter_name,
          applicant_user_id: this.currentCitizen.id || 'usr-001',
          applicant_name: this.currentCitizen.nama_lengkap,
          applicant_phone: '081234567890',
          citizen_name: selectedCitizen.nama_lengkap,
          citizen_nik: selectedCitizen.nik,
          citizen_address: `Kp. Sukamaju RT ${selectedCitizen.rt || '02'} / RW ${selectedCitizen.rw || '01'}, ${selectedCitizen.dusun || 'Dusun Mekar'}`,
          status: 'submitted',
          purpose: payload.purpose,
          timeline: timelineData,
          attachments: processedAttachments
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

    let cloudPhotoUrl = payload.photo_url;
    if (cloudPhotoUrl && cloudPhotoUrl.startsWith('file://')) {
      cloudPhotoUrl = await uploadImageToSupabase(cloudPhotoUrl, 'complaints');
    }

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      ticket_number: ticketNumber,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : this.currentCitizen.nama_lengkap,
      is_anonymous: payload.is_anonymous,
      status: 'submitted',
      photo_url: cloudPhotoUrl,
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
          reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : this.currentCitizen.nama_lengkap,
          reporter_phone: '081234567890',
          is_anonymous: payload.is_anonymous,
          status: 'submitted',
          photo_url: cloudPhotoUrl
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
