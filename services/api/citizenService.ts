// services/api/citizenService.ts
import { supabase } from '../supabase';
import { auth, RegisterParams } from '../auth';
import { uploadImageToSupabase } from '../storage';
import { mockUser, Citizen } from '@/store/mockData';

class CitizenService {
  private currentCitizen: Citizen = mockUser;
  private localFamilyMembers: Citizen[] = [];

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
    const active = auth.getCurrentCitizen();
    if (active) {
      this.currentCitizen = active;
      return active;
    }

    try {
      const stored = await auth.getStoredSession();
      if (stored?.citizen) {
        this.currentCitizen = stored.citizen;
        return stored.citizen;
      }
    } catch (e) {
      console.warn('[Dekati Mobile] Gagal baca sesi lokal:', e);
    }

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

    if (current && current.nik && !members.some((m) => m.nik === current.nik)) {
      members.unshift({ ...current, verification_status: (current.is_verified ? 'verified' : 'pending') as 'verified' | 'pending' });
    }

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
    if (cloudPhotoPath && !cloudPhotoPath.startsWith('http://') && !cloudPhotoPath.startsWith('https://') && !cloudPhotoPath.startsWith('data:')) {
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
    if (cloudPhotoUrl && !cloudPhotoUrl.startsWith('http://') && !cloudPhotoUrl.startsWith('https://') && !cloudPhotoUrl.startsWith('data:')) {
      cloudPhotoUrl = await uploadImageToSupabase(cloudPhotoUrl, 'citizens', base64);
    }

    try {
      const { error } = await supabase
        .from('citizens')
        .update({
          foto_kk_path: cloudPhotoUrl,
          is_verified: false,
          verified_by: null,
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
      const shouldUpload = (uri?: string | null) => {
        if (!uri) return false;
        return !uri.startsWith('http://') && !uri.startsWith('https://') && !uri.startsWith('data:');
      };

      let cloudKtp = payload.fotoKtpUri;
      if (shouldUpload(cloudKtp)) {
        cloudKtp = await uploadImageToSupabase(cloudKtp, 'citizens', payload.fotoKtpBase64);
      }

      let cloudSelfie = payload.fotoSelfieUri;
      if (shouldUpload(cloudSelfie)) {
        cloudSelfie = await uploadImageToSupabase(cloudSelfie, 'citizens', payload.fotoSelfieBase64);
      }

      let cloudKk = payload.fotoKkUri || '';
      if (shouldUpload(cloudKk)) {
        cloudKk = await uploadImageToSupabase(cloudKk, 'citizens', payload.fotoKkBase64);
      }

      const updatePayload: any = {
        foto_ktp_path: cloudKtp,
        foto_selfie_ktp_path: cloudSelfie,
        foto_kk_path: cloudKk || cloudKtp,
        is_verified: false,
        verified_by: null,
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
      if (this.currentCitizen.id === updatedCitizen.id || this.currentCitizen.nik === updatedCitizen.nik) {
        this.currentCitizen = { ...this.currentCitizen, ...updatedCitizen };
        await auth.updateSessionCitizen(updatedCitizen);
      }

      const lIdx = this.localFamilyMembers.findIndex((m) => m.id === updatedCitizen!.id);
      if (lIdx !== -1) {
        this.localFamilyMembers[lIdx] = updatedCitizen;
      }

      return { success: true, data: updatedCitizen };
    }

    return { success: false, message: 'Gagal memperbarui profil di database.' };
  }
}

export const citizenService = new CitizenService();
