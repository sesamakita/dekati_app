// services/api/announcementService.ts
import { supabase } from '../supabase';
import { mockAnnouncements, Announcement } from '@/store/mockData';

class AnnouncementService {
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

  async getAnnouncementById(id: string): Promise<Announcement | null> {
    const list = await this.getAnnouncements();
    return list.find((a) => a.id === id) || null;
  }
}

export const announcementService = new AnnouncementService();
