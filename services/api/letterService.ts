// services/api/letterService.ts
import { supabase } from '../supabase';
import { uploadImageToSupabase } from '../storage';
import { citizenService } from './citizenService';
import {
  mockLetterTypes,
  mockLetterRequests,
  mockFamilyMembers,
  LetterType,
  LetterRequest
} from '@/store/mockData';

class LetterService {
  private localLetterRequests: LetterRequest[] = [...mockLetterRequests];

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

  formatTimelineSteps(
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
    const user = await citizenService.getCurrentUser();
    const family = await citizenService.getFamilyMembers();
    const familyNiks = new Set<string>();
    if (user?.nik) familyNiks.add(user.nik);
    for (const f of family) {
      if (f.nik) familyNiks.add(f.nik);
    }

    let cloudRequests: LetterRequest[] = [];
    try {
      let query = supabase.from('letter_requests').select('*');
      
      // Filter langsung di level query database agar tidak mengunduh surat milik warga lain
      if (options?.onlyMyFamily !== false && familyNiks.size > 0) {
        query = query.in('citizen_nik', Array.from(familyNiks));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        let filteredData = data;
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
    const user = await citizenService.getCurrentUser();
    const selectedType = mockLetterTypes.find(t => t.id === payload.letter_type_id);
    const familyList = await citizenService.getFamilyMembers();
    const selectedCitizen = familyList.find(c => c.id === payload.citizen_id) || mockFamilyMembers.find(c => c.id === payload.citizen_id) || user;
    const now = new Date();
    const trackingNumber = `SRT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTimeStr = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    const timelineData = [
      { title: 'Permohonan Dikirim Warga', time: nowTimeStr, done: true },
      { title: 'Pemeriksaan Berkas Operator', time: '-', done: false },
      { title: 'Penerbitan Nomor Resmi Desa', time: '-', done: false },
      { title: 'Tanda Tangan Elektronik QR Kades', time: '-', done: false },
    ];

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
      applicant_name: user.nama_lengkap,
      citizen_name: selectedCitizen.nama_lengkap,
      citizen_nik: selectedCitizen.nik,
      status: 'submitted',
      purpose: payload.purpose,
      created_at: 'Baru saja',
      timeline: timelineData,
      attachments: processedAttachments as any
    };

    try {
      const { data, error } = await supabase
        .from('letter_requests')
        .insert({
          tracking_number: trackingNumber,
          letter_type_id: payload.letter_type_id,
          letter_name: newRequest.letter_name,
          applicant_user_id: user.id || 'usr-001',
          applicant_name: user.nama_lengkap,
          applicant_phone: user.no_telepon || (user as any).phone || (user as any).phone_number || null,
          citizen_name: selectedCitizen.nama_lengkap,
          citizen_nik: selectedCitizen.nik,
          citizen_address: selectedCitizen.alamat_lengkap || `RT ${selectedCitizen.rt || '01'} / RW ${selectedCitizen.rw || '01'}, ${selectedCitizen.village_name || 'Desa'}`,
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
}

export const letterService = new LetterService();
