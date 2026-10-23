// services/api/letterService.ts
import { supabase } from '../supabase';
import { uploadImageToSupabase } from '../storage';
import { citizenService } from './citizenService';
import {
  mockLetterTypes,
  mockLetterRequests,
  mockFamilyMembers,
  mockNeighborhoodUnits,
  LetterType,
  LetterRequest
} from '@/store/mockData';
import { Config } from '@/constants/Config';
import { villageService } from './villageService';

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
    signedBy?: string,
    rtInfo?: {
      rtNumber?: string;
      rtStatus?: string;
      rtLeaderName?: string;
      rtApprovedAt?: string;
    }
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
    const hasRtRequirement = !!rtInfo?.rtStatus || status === 'pending_rt';
    const isRtApproved = rtInfo?.rtStatus === 'approved_by_rt' || (['submitted', 'in_verification', 'approved', 'signed', 'completed'].includes(status) && rtInfo?.rtStatus !== 'pending_rt' && status !== 'pending_rt');
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
    const stepRt = findStep(['rt', 'rekomendasi']);
    const step2 = findStep(['verifikasi', 'pemeriksaan', 'operator']);
    const step3 = findStep(['nomor', 'registrasi', 'no.']);
    const step4 = findStep(['tanda tangan', 'tte', 'disahkan', 'selesai', 'dokumen']);
    const rejectStep = findStep(['ditolak', 'tolak']);

    const steps: { title: string; time: string; done: boolean; actor?: string }[] = [
      {
        title: 'Permohonan Dikirim Warga',
        time: step1?.time || createdTimeStr,
        done: isSubmitted,
      },
    ];

    if (hasRtRequirement) {
      steps.push({
        title: rtInfo?.rtStatus === 'approved_by_rt' || isRtApproved
          ? `Rekomendasi Ketua RT ${rtInfo?.rtNumber || ''} (Disetujui)`
          : rtInfo?.rtStatus === 'rejected_by_rt'
          ? 'Rekomendasi Ditolak Ketua RT'
          : `Rekomendasi Ketua RT ${rtInfo?.rtNumber || ''}`,
        time: rtInfo?.rtApprovedAt || (stepRt?.time || (isRtApproved ? 'Disetujui RT' : status === 'pending_rt' ? 'Menunggu via WhatsApp' : '-')),
        done: isRtApproved,
        actor: rtInfo?.rtLeaderName || stepRt?.actor || (rtInfo?.rtNumber ? `Ketua RT ${rtInfo.rtNumber}` : 'Ketua RT Setempat'),
      });
    }

    steps.push(
      {
        title: isRejected && status === 'rejected' && (!hasRtRequirement || rtInfo?.rtStatus !== 'rejected_by_rt')
          ? (rejectStep?.title || 'Pengajuan Ditolak Petugas')
          : 'Pemeriksaan Berkas Operator Pelayanan',
        time: isRejected && (!hasRtRequirement || rtInfo?.rtStatus !== 'rejected_by_rt')
          ? (rejectStep?.time || 'Ditolak')
          : (step2?.time || (isInVerification ? 'Selesai diverifikasi' : '-')),
        done: isInVerification || (isRejected && rtInfo?.rtStatus !== 'rejected_by_rt'),
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
      }
    );

    return steps;
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
          citizen_address: d.citizen_address,
          status: d.status,
          purpose: d.purpose,
          official_number: d.letter_official_number,
          qr_token: d.qr_verification_token,
          qr_url: d.qr_verification_url || (d.qr_verification_token ? `${Config.webPortalUrl}/#/verify/${d.qr_verification_token}` : undefined),
          signed_by_name: d.signed_by_name,
          rejection_reason: d.rejection_reason,
          created_at: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
          rt_number: d.rt_number,
          rw_number: d.rw_number,
          rt_status: d.rt_status,
          rt_leader_name: d.rt_leader_name,
          rt_leader_phone: d.rt_leader_phone,
          rt_approved_at: d.rt_approved_at,
          rt_rejection_reason: d.rt_rejection_reason,
          rt_notes: d.rt_notes,
          timeline: this.formatTimelineSteps(d.timeline, d.status, d.created_at, d.letter_official_number, d.signed_by_name, {
            rtNumber: d.rt_number,
            rtStatus: d.rt_status,
            rtLeaderName: d.rt_leader_name,
            rtApprovedAt: d.rt_approved_at,
          }),
          attachments: Array.isArray(d.attachments) ? d.attachments : []
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
          citizen_address: data.citizen_address,
          status: data.status,
          purpose: data.purpose,
          official_number: data.letter_official_number,
          qr_token: data.qr_verification_token,
          qr_url: data.qr_verification_url || (data.qr_verification_token ? `${Config.webPortalUrl}/#/verify/${data.qr_verification_token}` : undefined),
          signed_by_name: data.signed_by_name,
          rejection_reason: data.rejection_reason,
          created_at: data.created_at ? new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
          rt_number: data.rt_number,
          rw_number: data.rw_number,
          rt_status: data.rt_status,
          rt_leader_name: data.rt_leader_name,
          rt_leader_phone: data.rt_leader_phone,
          rt_approved_at: data.rt_approved_at,
          rt_rejection_reason: data.rt_rejection_reason,
          rt_notes: data.rt_notes,
          timeline: this.formatTimelineSteps(data.timeline, data.status, data.created_at, data.letter_official_number, data.signed_by_name, {
            rtNumber: data.rt_number,
            rtStatus: data.rt_status,
            rtLeaderName: data.rt_leader_name,
            rtApprovedAt: data.rt_approved_at,
          }),
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

    const citizenRt = selectedCitizen.rt || user.rt || '01';
    const citizenRw = selectedCitizen.rw || user.rw || '01';
    const requiresRt = !!selectedType?.requires_rt_approval;

    const initialStatus = requiresRt ? 'pending_rt' : 'submitted';
    const rtStatus = requiresRt ? 'pending_rt' : 'not_required';

    let matchedRt: any = null;
    try {
      const activeUnits = await villageService.getNeighborhoodUnits();
      const cleanRt = citizenRt.replace(/^0+/, '');
      const cleanRw = citizenRw.replace(/^0+/, '');
      matchedRt = activeUnits.find(n => {
        const matchRt = n.rt_number.replace(/^0+/, '') === cleanRt;
        return cleanRw ? matchRt && (n.rw_number || '').replace(/^0+/, '') === cleanRw : matchRt;
      });
    } catch {}

    if (!matchedRt) {
      const cleanRt = citizenRt.replace(/^0+/, '');
      matchedRt = mockNeighborhoodUnits.find(n => n.rt_number.replace(/^0+/, '') === cleanRt);
    }

    const rtLeaderName = matchedRt?.rt_leader_name || `Ketua RT ${citizenRt}`;
    const rtLeaderPhone = matchedRt?.rt_leader_phone || '';

    const timelineData = [
      { title: 'Permohonan Dikirim Warga', time: nowTimeStr, done: true },
      ...(requiresRt ? [{
        title: `Rekomendasi Ketua RT ${citizenRt}`,
        time: 'Menunggu konfirmasi via WhatsApp',
        done: false,
        actor: rtLeaderName
      }] : []),
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
      status: initialStatus,
      purpose: payload.purpose,
      created_at: 'Baru saja',
      timeline: timelineData,
      attachments: processedAttachments as any,
      rt_number: citizenRt,
      rw_number: citizenRw,
      rt_status: rtStatus,
      rt_leader_name: rtLeaderName,
      rt_leader_phone: rtLeaderPhone
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
          citizen_address: selectedCitizen.alamat_lengkap || `RT ${citizenRt} / RW ${citizenRw}, ${selectedCitizen.village_name || 'Desa'}`,
          status: initialStatus,
          purpose: payload.purpose,
          timeline: timelineData,
          attachments: processedAttachments,
          rt_number: citizenRt,
          rw_number: citizenRw,
          rt_status: rtStatus,
          rt_leader_name: rtLeaderName,
          rt_leader_phone: rtLeaderPhone
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
