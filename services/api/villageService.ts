// services/api/villageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  mockEmergencyContacts,
  mockVillageEvents,
  EmergencyContact,
  VillageEvent,
  VillageProfile
} from '@/store/mockData';

class VillageService {
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

  async getVillageProfile(): Promise<VillageProfile | null> {
    try {
      const { data, error } = await supabase
        .from('village_profiles')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
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
        return parsed as VillageProfile;
      }
    } catch {}

    return null;
  }
}

export const villageService = new VillageService();
