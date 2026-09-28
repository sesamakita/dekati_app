// services/api.ts
import { Config } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  mockEmergencyContacts,
  mockVillageEvents,
  Citizen,
  LetterType,
  LetterRequest,
  Complaint,
  Announcement,
  EmergencyContact,
  VillageEvent,
  VillageProfile
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
        const isVerified = !!data.is_verified;
        const verifiedBy = data.verified_by || '';
        const isRevision = !isVerified && verifiedBy.startsWith('revisi:');
        const verificationStatus: 'verified' | 'pending' | 'needs_revision' = isVerified
          ? 'verified'
          : isRevision
          ? 'needs_revision'
          : 'pending';
        const rejectionReason = isRevision ? verifiedBy.replace(/^revisi:\s*/i, '').trim() : undefined;

        this.currentCitizen = {
          id: data.id,
          nik: data.nik,
          no_kk: data.no_kk || '',
          nama_lengkap: data.nama_lengkap,
          jenis_kelamin: data.jenis_kelamin || 'L',
          status_keluarga: data.status_dalam_keluarga || '',
          tanggal_lahir: data.tanggal_lahir || '',
          pekerjaan: data.pekerjaan || '',
          rt: data.rt || '',
          rw: data.rw || '',
          dusun: data.dusun || '',
          is_verified: isVerified,
          verified_by: verifiedBy,
          foto_kk_path: data.foto_kk_path || undefined,
          foto_ktp_path: data.foto_ktp_path || undefined,
          foto_selfie_ktp_path: data.foto_selfie_ktp_path || undefined,
          verification_status: verificationStatus,
          rejection_reason: rejectionReason,
          alamat_lengkap: data.alamat_lengkap || undefined,
          village_name: data.village_name || undefined,
        };
        auth.updateSessionCitizen(this.currentCitizen);
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
      let queryRes: any = null;
      if (current.no_kk && current.no_kk.trim()) {
        queryRes = await supabase
          .from('citizens')
          .select('*')
          .eq('no_kk', current.no_kk.trim())
          .order('created_at', { ascending: true });
      } else if (current.nik) {
        queryRes = await supabase
          .from('citizens')
          .select('*')
          .eq('nik', current.nik);
      }

      const data = queryRes?.data;
      const error = queryRes?.error;

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
            no_kk: d.no_kk || '',
            nama_lengkap: d.nama_lengkap,
            jenis_kelamin: (d.jenis_kelamin as 'L' | 'P') || 'L',
            status_keluarga: d.status_dalam_keluarga || '',
            tanggal_lahir: d.tanggal_lahir || '',
            pekerjaan: d.pekerjaan || '',
            rt: d.rt || current.rt || '',
            rw: d.rw || current.rw || '',
            dusun: d.dusun || current.dusun || '',
            is_verified: isVerified,
            verified_by: verifiedBy,
            foto_kk_path: d.foto_kk_path,
            foto_ktp_path: d.foto_ktp_path,
            foto_selfie_ktp_path: d.foto_selfie_ktp_path,
            verification_status: verificationStatus,
            rejection_reason: rejectionReason,
          };
        });
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getFamilyMembers offline fallback.', err);
    }

    if (members.length === 0) {
      if (current && current.nik) {
        members = [{ ...current, verification_status: (current.is_verified ? 'verified' : 'pending') as 'verified' | 'pending' }];
      } else {
        members = [];
      }
    }

    // Pastikan akun yang sedang login ada di dalam list jika memiliki NIK
    if (current && current.nik && !members.some((m) => m.nik === current.nik)) {
      members.unshift({ ...current, verification_status: (current.is_verified ? 'verified' : 'pending') as 'verified' | 'pending' });
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
    const noKk = current.no_kk || '';

    let cloudPhotoPath = payload.foto_kk_path || '';
    if (cloudPhotoPath && cloudPhotoPath.startsWith('file://')) {
      cloudPhotoPath = await uploadImageToSupabase(cloudPhotoPath, 'citizens', (payload as any).base64);
    }

    const insertPayload: any = {
      nik: cleanNik,
      no_kk: noKk || null,
      nama_lengkap: cleanNama,
      jenis_kelamin: payload.jenis_kelamin || 'L',
      status_dalam_keluarga: payload.status_keluarga || null,
      tanggal_lahir: payload.tanggal_lahir?.trim() || null,
      pekerjaan: payload.pekerjaan?.trim() || null,
      rt: current.rt?.trim() || null,
      rw: current.rw?.trim() || null,
      dusun: current.dusun?.trim() || null,
      alamat_lengkap: current.alamat_lengkap || null,
      phone_number: payload.phone_number?.trim() || null,
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
          no_kk: data.no_kk || noKk || '',
          nama_lengkap: data.nama_lengkap,
          jenis_kelamin: (data.jenis_kelamin as 'L' | 'P') || payload.jenis_kelamin,
          status_keluarga: data.status_dalam_keluarga || payload.status_keluarga || '',
          tanggal_lahir: data.tanggal_lahir || payload.tanggal_lahir || '',
          pekerjaan: data.pekerjaan || payload.pekerjaan || '',
          rt: data.rt || current.rt || '',
          rw: data.rw || current.rw || '',
          dusun: data.dusun || current.dusun || '',
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
      status_keluarga: payload.status_keluarga || '',
      tanggal_lahir: payload.tanggal_lahir || '',
      pekerjaan: payload.pekerjaan || '',
      rt: current.rt || '',
      rw: current.rw || '',
      dusun: current.dusun || '',
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

  /**
   * Mengunggah dua berkas verifikasi identitas (Foto KTP dan Swafoto Pegang KTP)
   * Mengirimkan berkas ke Supabase Storage & memperbarui profil warga di database.
   */
  async uploadCitizenVerificationDocs(payload: {
    citizenId: string;
    fotoKtpUri: string;
    fotoKtpBase64?: string | null;
    fotoSelfieUri: string;
    fotoSelfieBase64?: string | null;
    fotoKkUri?: string | null;
    fotoKkBase64?: string | null;
  }): Promise<{ success: boolean; data?: Citizen; message?: string }> {
    try {
      let cloudKtp = payload.fotoKtpUri;
      if (cloudKtp && cloudKtp.startsWith('file://')) {
        cloudKtp = await uploadImageToSupabase(cloudKtp, 'citizens', payload.fotoKtpBase64);
      }

      let cloudSelfie = payload.fotoSelfieUri;
      if (cloudSelfie && cloudSelfie.startsWith('file://')) {
        cloudSelfie = await uploadImageToSupabase(cloudSelfie, 'citizens', payload.fotoSelfieBase64);
      }

      let cloudKk = payload.fotoKkUri || '';
      if (cloudKk && cloudKk.startsWith('file://')) {
        cloudKk = await uploadImageToSupabase(cloudKk, 'citizens', payload.fotoKkBase64);
      }

      const updatePayload: any = {
        foto_ktp_path: cloudKtp,
        foto_selfie_ktp_path: cloudSelfie,
        foto_kk_path: cloudKk || cloudKtp,
        is_verified: false,
        verified_by: null, // Reset catatan revisi lama agar status kembali 'Menunggu Validasi'
        updated_at: new Date().toISOString()
      };

      try {
        await supabase
          .from('citizens')
          .update(updatePayload)
          .eq('id', payload.citizenId);
      } catch (dbErr) {
        console.warn('[Dekati Mobile] uploadCitizenVerificationDocs Supabase exception:', dbErr);
      }

      const updatedCitizen: Citizen = {
        ...this.currentCitizen,
        foto_ktp_path: cloudKtp,
        foto_selfie_ktp_path: cloudSelfie,
        foto_kk_path: cloudKk || this.currentCitizen.foto_kk_path || cloudKtp,
        is_verified: false,
        verification_status: 'pending',
        rejection_reason: undefined,
        verified_by: undefined
      };

      this.currentCitizen = updatedCitizen;
      await auth.updateSessionCitizen(updatedCitizen);

      // Sinkronkan juga pada daftar family members lokal jika ada
      const fIdx = this.localFamilyMembers.findIndex(m => m.id === payload.citizenId || m.nik === updatedCitizen.nik);
      if (fIdx !== -1) {
        this.localFamilyMembers[fIdx] = {
          ...this.localFamilyMembers[fIdx],
          foto_ktp_path: cloudKtp,
          foto_selfie_ktp_path: cloudSelfie,
          foto_kk_path: cloudKk || this.localFamilyMembers[fIdx].foto_kk_path || cloudKtp,
          is_verified: false,
          verification_status: 'pending',
          rejection_reason: undefined,
          verified_by: undefined
        };
      }

      return { success: true, data: updatedCitizen };
    } catch (err: any) {
      console.warn('[Dekati Mobile] uploadCitizenVerificationDocs error:', err);
      return { success: false, message: err?.message || 'Gagal mengunggah berkas verifikasi.' };
    }
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

  /**
   * Memperbarui profil kependudukan warga/anggota keluarga dan sinkronisasi ke VPS database (Supabase)
   */
  async updateCitizenProfile(payload: {
    id: string;
    nama_lengkap?: string;
    no_kk?: string;
    status_keluarga?: string;
    jenis_kelamin?: 'L' | 'P';
    tanggal_lahir?: string;
    pekerjaan?: string;
    rt?: string;
    rw?: string;
    dusun?: string;
    alamat_lengkap?: string;
    phone_number?: string;
  }): Promise<{ success: boolean; data?: Citizen; message?: string }> {
    if (!payload.id) {
      return { success: false, message: 'ID warga tidak valid.' };
    }

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (payload.nama_lengkap !== undefined) dbPayload.nama_lengkap = payload.nama_lengkap.trim();
    if (payload.no_kk !== undefined) dbPayload.no_kk = payload.no_kk.trim() || null;
    if (payload.status_keluarga !== undefined) dbPayload.status_dalam_keluarga = payload.status_keluarga.trim() || null;
    if (payload.jenis_kelamin !== undefined) dbPayload.jenis_kelamin = payload.jenis_kelamin;
    if (payload.tanggal_lahir !== undefined) dbPayload.tanggal_lahir = payload.tanggal_lahir.trim() || null;
    if (payload.pekerjaan !== undefined) dbPayload.pekerjaan = payload.pekerjaan.trim() || null;
    if (payload.rt !== undefined) dbPayload.rt = payload.rt.trim() || null;
    if (payload.rw !== undefined) dbPayload.rw = payload.rw.trim() || null;
    if (payload.dusun !== undefined) dbPayload.dusun = payload.dusun.trim() || null;
    if (payload.alamat_lengkap !== undefined) dbPayload.alamat_lengkap = payload.alamat_lengkap.trim() || null;
    if (payload.phone_number !== undefined) dbPayload.phone_number = payload.phone_number.trim() || null;

    let updatedCitizen: Citizen | undefined;

    try {
      const { data, error } = await supabase
        .from('citizens')
        .update(dbPayload)
        .eq('id', payload.id)
        .select('*')
        .single();

      if (!error && data) {
        const isVerified = !!data.is_verified;
        const verifiedBy = data.verified_by || '';
        const isRevision = !isVerified && verifiedBy.startsWith('revisi:');
        const verificationStatus: 'verified' | 'pending' | 'needs_revision' = isVerified
          ? 'verified'
          : isRevision
          ? 'needs_revision'
          : 'pending';

        updatedCitizen = {
          id: data.id,
          nik: data.nik,
          no_kk: data.no_kk || '',
          nama_lengkap: data.nama_lengkap,
          jenis_kelamin: (data.jenis_kelamin as 'L' | 'P') || 'L',
          status_keluarga: data.status_dalam_keluarga || '',
          tanggal_lahir: data.tanggal_lahir || '',
          pekerjaan: data.pekerjaan || '',
          rt: data.rt || '',
          rw: data.rw || '',
          dusun: data.dusun || '',
          is_verified: isVerified,
          verified_by: verifiedBy,
          foto_kk_path: data.foto_kk_path,
          foto_ktp_path: data.foto_ktp_path,
          foto_selfie_ktp_path: data.foto_selfie_ktp_path,
          verification_status: verificationStatus,
          rejection_reason: isRevision ? verifiedBy.replace(/^revisi:\s*/i, '').trim() : undefined,
          alamat_lengkap: data.alamat_lengkap,
          village_name: data.village_name,
        };
      } else if (error) {
        console.warn('[Dekati Mobile] updateCitizenProfile Supabase error:', error);
      }
    } catch (err: any) {
      console.warn('[Dekati Mobile] updateCitizenProfile exception:', err);
    }

    // Jika Supabase offline atau fallback lokal
    if (!updatedCitizen) {
      const fallbackMember = this.localFamilyMembers.find((m) => m.id === payload.id) ||
        (this.currentCitizen.id === payload.id ? this.currentCitizen : undefined);

      if (fallbackMember) {
        updatedCitizen = {
          ...fallbackMember,
          nama_lengkap: payload.nama_lengkap !== undefined ? payload.nama_lengkap.trim() : fallbackMember.nama_lengkap,
          no_kk: payload.no_kk !== undefined ? payload.no_kk.trim() : fallbackMember.no_kk,
          status_keluarga: payload.status_keluarga !== undefined ? payload.status_keluarga.trim() : fallbackMember.status_keluarga,
          jenis_kelamin: payload.jenis_kelamin !== undefined ? payload.jenis_kelamin : fallbackMember.jenis_kelamin,
          tanggal_lahir: payload.tanggal_lahir !== undefined ? payload.tanggal_lahir.trim() : fallbackMember.tanggal_lahir,
          pekerjaan: payload.pekerjaan !== undefined ? payload.pekerjaan.trim() : fallbackMember.pekerjaan,
          rt: payload.rt !== undefined ? payload.rt.trim() : fallbackMember.rt,
          rw: payload.rw !== undefined ? payload.rw.trim() : fallbackMember.rw,
          dusun: payload.dusun !== undefined ? payload.dusun.trim() : fallbackMember.dusun,
          alamat_lengkap: payload.alamat_lengkap !== undefined ? payload.alamat_lengkap.trim() : fallbackMember.alamat_lengkap,
        };
      }
    }

    if (updatedCitizen) {
      // Sinkronkan ke akun aktif jika id sesuai
      if (this.currentCitizen.id === updatedCitizen.id || this.currentCitizen.nik === updatedCitizen.nik) {
        this.currentCitizen = { ...this.currentCitizen, ...updatedCitizen };
        await auth.updateSessionCitizen(updatedCitizen);
      }

      // Sinkronkan ke list lokal jika ada
      const lIdx = this.localFamilyMembers.findIndex((m) => m.id === updatedCitizen!.id);
      if (lIdx !== -1) {
        this.localFamilyMembers[lIdx] = updatedCitizen;
      }

      return { success: true, data: updatedCitizen };
    }

    return { success: false, message: 'Gagal memperbarui profil di database.' };
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

  // Helper untuk memformat alur verifikasi surat secara terstruktur dan sinkron
  private formatTimelineSteps(
    rawTimeline: any,
    status: string,
    createdAt?: string,
    officialNumber?: string,
    signedBy?: string
  ): { title: string; time: string; done: boolean; actor?: string }[] {
    let parsed: any[] = [];
    if (Array.isArray(rawTimeline)) {
      parsed = rawTimeline;
    } else if (typeof rawTimeline === 'string') {
      try {
        const p = JSON.parse(rawTimeline);
        if (Array.isArray(p)) parsed = p;
      } catch {
        parsed = [];
      }
    }

    const createdTimeStr = createdAt
      ? `${new Date(createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
      : 'Baru saja';

    const isSubmitted = true;
    const isInVerification = ['in_verification', 'approved', 'signed', 'completed'].includes(status);
    const isApproved = ['approved', 'signed', 'completed'].includes(status);
    const isSigned = ['signed', 'completed'].includes(status);
    const isRejected = status === 'rejected';

    // Helper pencari langkah berdasarkan variasi kata kunci (prioritaskan rekaman terbaru)
    const findStep = (keywords: string[]) => {
      const reversed = [...parsed].reverse();
      return reversed.find((p) =>
        p && p.title && keywords.some((kw) => p.title.toLowerCase().includes(kw.toLowerCase())) && p.done
      );
    };

    const step1 = findStep(['dikirim', 'diajukan', 'permohonan']);
    const step2 = findStep(['verifikasi', 'pemeriksaan', 'operator']);
    const step3 = findStep(['nomor', 'registrasi', 'no.']);
    const step4 = findStep(['tanda tangan', 'tte', 'disahkan', 'selesai', 'dokumen']);
    const rejectStep = findStep(['ditolak', 'tolak']);

    return [
      {
        title: 'Permohonan Dikirim Warga',
        time: step1?.time || createdTimeStr,
        done: isSubmitted,
      },
      {
        title: isRejected
          ? (rejectStep?.title || 'Pengajuan Ditolak Petugas')
          : 'Pemeriksaan Berkas Operator Pelayanan',
        time: isRejected
          ? (rejectStep?.time || 'Ditolak')
          : (step2?.time || (isInVerification ? 'Selesai diverifikasi' : '-')),
        done: isInVerification || isRejected,
        actor: step2?.actor || 'Operator Pelayanan',
      },
      {
        title: officialNumber
          ? `Penerbitan No. Registrasi Desa (${officialNumber})`
          : 'Penerbitan Nomor Registrasi Surat Desa',
        time: step3?.time || (isApproved ? 'Nomor Terbit' : '-'),
        done: isApproved,
        actor: step3?.actor || 'Sekretariat Desa',
      },
      {
        title: isSigned
          ? `Tanda Tangan Elektronik QR Disahkan (${signedBy || 'Kepala Desa'})`
          : 'Pengesahan TTE QR Kepala Desa',
        time: step4?.time || (isSigned ? 'Telah Disahkan' : '-'),
        done: isSigned,
        actor: step4?.actor || signedBy || 'Kepala Desa',
      },
    ];
  }

  async getLetterRequests(options?: { onlyMyFamily?: boolean }): Promise<LetterRequest[]> {
    const user = await this.getCurrentUser();
    const family = await this.getFamilyMembers();
    const familyNiks = new Set<string>();
    if (user?.nik) familyNiks.add(user.nik);
    for (const f of family) {
      if (f.nik) familyNiks.add(f.nik);
    }

    let cloudRequests: LetterRequest[] = [];
    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        let filteredData = data;
        // Filter privasi: Hanya tampilkan permohonan surat milik pengguna atau anggota keluarga 1 KK
        if (options?.onlyMyFamily !== false) {
          filteredData = data.filter((d: any) => {
            if (d.citizen_nik && familyNiks.has(d.citizen_nik)) return true;
            if (d.applicant_user_id && user?.id && d.applicant_user_id === user.id) return true;
            if (d.applicant_name && user?.nama_lengkap && d.applicant_name.trim().toLowerCase() === user.nama_lengkap.trim().toLowerCase()) return true;
            return false;
          });
        }

        cloudRequests = filteredData.map((d: any) => ({
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
          timeline: this.formatTimelineSteps(d.timeline, d.status, d.created_at, d.letter_official_number, d.signed_by_name),
        }));

        // Sinkronkan state memori lokal agar tidak membawa data usang
        for (const c of cloudRequests) {
          const lIdx = this.localLetterRequests.findIndex(r => r.tracking_number === c.tracking_number || r.id === c.id);
          if (lIdx !== -1) {
            this.localLetterRequests[lIdx] = c;
          }
        }
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterRequests offline fallback.', err);
    }

    // Gabungkan data dari Supabase dengan data lokal sesi
    const combined = [...cloudRequests];
    for (const local of this.localLetterRequests) {
      const matchFamily = options?.onlyMyFamily !== false
        ? (familyNiks.has(local.citizen_nik) || local.applicant_name === user?.nama_lengkap)
        : true;
      if (matchFamily && !combined.some((c) => c.id === local.id || c.tracking_number === local.tracking_number)) {
        combined.push(local);
      }
    }

    return combined.length > 0 ? combined : this.localLetterRequests;
  }

  async getLetterRequestByTracking(trackingNumber: string): Promise<LetterRequest> {
    const cleanId = (trackingNumber || '').trim();
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let query = supabase.from('letter_requests').select('*');

      // Hindari error PostgreSQL 22P02: id bertipe UUID sehingga jangan dicocokkan dengan teks SRT-...
      if (isUuid) {
        query = query.or(`id.eq.${cleanId},tracking_number.eq.${cleanId}`);
      } else {
        query = query.eq('tracking_number', cleanId);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const item: LetterRequest = {
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
          timeline: this.formatTimelineSteps(data.timeline, data.status, data.created_at, data.letter_official_number, data.signed_by_name),
          attachments: Array.isArray(data.attachments) ? data.attachments : []
        };

        // Perbarui cache memori lokal dengan data cloud termutakhir
        const localIdx = this.localLetterRequests.findIndex(r => r.tracking_number === cleanId || r.id === cleanId);
        if (localIdx !== -1) {
          this.localLetterRequests[localIdx] = item;
        } else {
          this.localLetterRequests.unshift(item);
        }

        return item;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterRequestByTracking fallback.', err);
    }

    const fallback = this.localLetterRequests.find((r) => r.tracking_number === cleanId || r.id === cleanId) || this.localLetterRequests[0];
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
          const cloudUrl = await uploadImageToSupabase(item.url, 'letters', (item as any).base64);
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
          citizen_address: selectedCitizen.alamat_lengkap || `RT ${selectedCitizen.rt || '01'} / RW ${selectedCitizen.rw || '01'}, ${Config.villageName}`,
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
  private static readonly STORAGE_KEY_MY_COMPLAINTS = '@dekati:my_complaints';

  async getMyComplaintTickets(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(ApiService.STORAGE_KEY_MY_COMPLAINTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[Dekati Mobile] Gagal membaca riwayat tiket aduan lokal:', e);
    }
    return [];
  }

  async saveMyComplaintTicket(ticketNumber: string): Promise<void> {
    try {
      const tickets = await this.getMyComplaintTickets();
      if (!tickets.includes(ticketNumber)) {
        tickets.unshift(ticketNumber);
        await AsyncStorage.setItem(ApiService.STORAGE_KEY_MY_COMPLAINTS, JSON.stringify(tickets));
      }
    } catch (e) {
      console.warn('[Dekati Mobile] Gagal menyimpan nomor tiket aduan lokal:', e);
    }
  }

  async getComplaints(): Promise<Complaint[]> {
    const cloudComplaints: Complaint[] = [];
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        for (const d of data) {
          // Parse multi-foto lapangan jika tersimpan dalam format JSON array atau koma
          let parsedPhotos: string[] = [];
          if (d.photo_url) {
            const rawUrl = d.photo_url.trim();
            if (rawUrl.startsWith('[') && rawUrl.endsWith(']')) {
              try {
                const arr = JSON.parse(rawUrl);
                if (Array.isArray(arr)) parsedPhotos = arr;
              } catch {
                parsedPhotos = [rawUrl];
              }
            } else if (rawUrl.includes(',')) {
              parsedPhotos = rawUrl.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else {
              parsedPhotos = [rawUrl];
            }
          }

          cloudComplaints.push({
            id: d.id,
            ticket_number: d.ticket_number,
            category: d.category,
            title: d.title,
            description: d.description,
            location: d.location_address || d.location || Config.villageName,
            reporter_name: d.is_anonymous ? 'Warga Desa (Anonim)' : d.reporter_name,
            is_anonymous: !!d.is_anonymous,
            status: d.status,
            photo_url: parsedPhotos[0] || d.photo_url || undefined,
            photo_urls: parsedPhotos.length > 0 ? parsedPhotos : undefined,
            resolution_proof: d.resolution_proof,
            resolution_notes: d.resolution_notes,
            assigned_department: d.assigned_department,
            assigned_officer: d.assigned_officer,
            citizen_id: d.citizen_id,
            citizen_nik: d.citizen_nik,
            latitude: d.latitude,
            longitude: d.longitude,
            resolved_at: d.resolved_at,
            created_at: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'
          });
        }
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getComplaints offline fallback.', err);
    }

    // Gabungkan data cloud dengan local session complaints jika ada yang belum terunggah
    const combined = [...cloudComplaints];
    for (const local of this.localComplaints) {
      if (!combined.some((c) => c.id === local.id || c.ticket_number === local.ticket_number)) {
        combined.push(local);
      }
    }

    return combined.length > 0 ? combined : this.localComplaints;
  }

  async submitComplaint(payload: {
    category: string;
    title: string;
    description: string;
    location: string;
    is_anonymous: boolean;
    photo_url?: string;
    photos?: Array<{ uri: string; base64?: string | null }> | string[];
    latitude?: number;
    longitude?: number;
  }): Promise<Complaint> {
    const user = await this.getCurrentUser();
    const now = new Date();
    const ticketNumber = `ADU-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const uploadedUrls: string[] = [];

    if (Array.isArray(payload.photos) && payload.photos.length > 0) {
      for (const item of payload.photos) {
        if (typeof item === 'string') {
          const u = await uploadImageToSupabase(item, 'complaints');
          if (u) uploadedUrls.push(u);
        } else if (item && typeof item === 'object' && item.uri) {
          const u = await uploadImageToSupabase(item.uri, 'complaints', item.base64);
          if (u) uploadedUrls.push(u);
        }
      }
    } else if (payload.photo_url) {
      let cloudPhotoUrl = payload.photo_url;
      if (!cloudPhotoUrl.startsWith('http://') && !cloudPhotoUrl.startsWith('https://') && !cloudPhotoUrl.startsWith('data:')) {
        cloudPhotoUrl = await uploadImageToSupabase(cloudPhotoUrl, 'complaints', (payload as any).base64);
      }
      if (cloudPhotoUrl) uploadedUrls.push(cloudPhotoUrl);
    }

    const primaryPhotoUrl = uploadedUrls[0] || payload.photo_url || undefined;
    const photoUrlToSave = uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : (primaryPhotoUrl || null);

    // Selalu simpan tiket aduan ke penyimpanan lokal perangkat agar muncul di "Laporan Saya" (bahkan jika anonim)
    await this.saveMyComplaintTicket(ticketNumber);

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      ticket_number: ticketNumber,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : user.nama_lengkap,
      is_anonymous: payload.is_anonymous,
      status: 'submitted',
      photo_url: primaryPhotoUrl,
      photo_urls: uploadedUrls,
      citizen_id: user.id,
      citizen_nik: user.nik,
      latitude: payload.latitude,
      longitude: payload.longitude,
      created_at: 'Baru saja'
    };

    // Insert to Supabase dengan penanganan defensif jika kolom citizen_id belum dimigrasi di remote
    try {
      const insertData: any = {
        ticket_number: ticketNumber,
        category: payload.category,
        title: payload.title,
        description: payload.description,
        location_address: payload.location,
        reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : user.nama_lengkap,
        reporter_phone: user.no_telepon || (user as any).phone || '081234567890',
        is_anonymous: payload.is_anonymous,
        status: 'submitted',
        photo_url: photoUrlToSave,
        citizen_id: user.id || null,
        citizen_nik: user.nik || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
      };

      let res = await supabase.from('complaints').insert(insertData).select('*').single();

      // Fallback jika database Supabase belum memiliki kolom citizen_id / citizen_nik / latitude / longitude
      if (res.error && res.error.message && (
        res.error.message.includes('citizen_id') || 
        res.error.message.includes('citizen_nik') || 
        res.error.message.includes('latitude') || 
        res.error.message.includes('longitude') || 
        res.error.code === 'PGRST204'
      )) {
        delete insertData.citizen_id;
        delete insertData.citizen_nik;
        delete insertData.latitude;
        delete insertData.longitude;
        res = await supabase.from('complaints').insert(insertData).select('*').single();
      }

      if (!res.error && res.data) {
        newComplaint.id = res.data.id;
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
          realized: Number(i.realized_amount || 0),
          percentage: Number(i.percentage)
        }));
        const belanjaItems = data.filter((i: any) => i.type === 'belanja').map((i: any) => ({
          name: i.name,
          amount: Number(i.budget_amount),
          realized: Number(i.realized_amount || 0),
          percentage: Number(i.percentage)
        }));

        const totalPendapatan = pendapatanItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const totalBelanja = belanjaItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const totalBelanjaRealisasi = belanjaItems.reduce((acc: number, curr: any) => acc + curr.realized, 0);

        const realisasiPersen = totalBelanja > 0
          ? Number(((totalBelanjaRealisasi / totalBelanja) * 100).toFixed(1))
          : 74.5;

        return {
          fiscal_year: 2026,
          pendapatan: {
            total: totalPendapatan,
            items: pendapatanItems
          },
          belanja: {
            total: totalBelanja,
            total_realisasi: totalBelanjaRealisasi,
            items: belanjaItems
          },
          realisasi_persen: realisasiPersen
        };
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getApbdes offline fallback.', err);
    }
    return mockApbdes;
  }

  // ==========================================
  // 5. Emergency Contacts & Village Events
  // ==========================================
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          phone: d.phone,
          icon: d.icon || 'call',
          description: d.description || '',
          order_index: d.order_index,
          is_active: d.is_active,
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getEmergencyContacts fallback.', err);
    }
    return mockEmergencyContacts;
  }

  async getVillageEvents(): Promise<VillageEvent[]> {
    try {
      const { data, error } = await supabase
        .from('village_events')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category || 'Kesehatan',
          event_date: d.event_date ? new Date(d.event_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : 'Segera',
          event_time: d.event_time || '08.00 WIB',
          location: d.location || 'Balai Desa',
          organizer: d.organizer || 'Pemerintah Desa',
          description: d.description || '',
          is_active: d.is_active,
        }));
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getVillageEvents fallback.', err);
    }
    return mockVillageEvents;
  }

  // ==========================================
  // 6. Profil & Identitas Desa Cloud
  // ==========================================
  async getVillageProfile(): Promise<VillageProfile | null> {
    try {
      const { data, error } = await supabase
        .from('village_profiles')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        if (data.name) {
          Config.villageName = data.name;
        }
        try {
          await AsyncStorage.setItem('@dekatip_village_profile', JSON.stringify(data));
        } catch {}
        return data as VillageProfile;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getVillageProfile fallback to cache.', err);
    }

    try {
      const cached = await AsyncStorage.getItem('@dekatip_village_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name) {
          Config.villageName = parsed.name;
        }
        return parsed as VillageProfile;
      }
    } catch {}

    return null;
  }
}

export const api = new ApiService();
