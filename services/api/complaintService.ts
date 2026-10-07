// services/api/complaintService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { uploadImageToSupabase } from '../storage';
import { citizenService } from './citizenService';
import { mockComplaints, Complaint } from '@/store/mockData';

class ComplaintService {
  private localComplaints: Complaint[] = [...mockComplaints];
  private static readonly STORAGE_KEY_MY_COMPLAINTS = '@dekati:my_complaints';

  async getMyComplaintTickets(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(ComplaintService.STORAGE_KEY_MY_COMPLAINTS);
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
        await AsyncStorage.setItem(ComplaintService.STORAGE_KEY_MY_COMPLAINTS, JSON.stringify(tickets));
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
            location: d.location_address || d.location || 'Desa',
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

    const combined = [...cloudComplaints];
    for (const local of this.localComplaints) {
      if (!combined.some((c) => c.id === local.id || c.ticket_number === local.ticket_number)) {
        combined.push(local);
      }
    }

    return combined.length > 0 ? combined : this.localComplaints;
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    const list = await this.getComplaints();
    return list.find((c) => c.id === id || c.ticket_number === id) || null;
  }

  async getComplaintByTicket(ticketNumber: string): Promise<Complaint | null> {
    const list = await this.getComplaints();
    return list.find((c) => c.ticket_number === ticketNumber || c.id === ticketNumber) || null;
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
    const user = await citizenService.getCurrentUser();
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

    try {
      const insertData: any = {
        ticket_number: ticketNumber,
        category: payload.category,
        title: payload.title,
        description: payload.description,
        location_address: payload.location,
        reporter_name: payload.is_anonymous ? 'Warga Desa (Anonim)' : user.nama_lengkap,
        reporter_phone: user.no_telepon || (user as any).phone || (user as any).phone_number || null,
        is_anonymous: payload.is_anonymous,
        status: 'submitted',
        photo_url: photoUrlToSave,
        photo_urls: uploadedUrls.length > 0 ? uploadedUrls : (primaryPhotoUrl ? [primaryPhotoUrl] : []),
        citizen_id: user.id || null,
        citizen_nik: user.nik || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
      };

      let res = await supabase.from('complaints').insert(insertData).select('*').single();

      if (res.error && res.error.message && (
        res.error.message.includes('citizen_id') || 
        res.error.message.includes('citizen_nik') || 
        res.error.message.includes('photo_urls') ||
        res.error.message.includes('latitude') || 
        res.error.message.includes('longitude') || 
        res.error.code === 'PGRST204'
      )) {
        delete insertData.citizen_id;
        delete insertData.citizen_nik;
        delete insertData.photo_urls;
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
}

export const complaintService = new ComplaintService();
