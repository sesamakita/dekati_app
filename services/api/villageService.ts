// services/api/villageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  mockEmergencyContacts,
  mockVillageEvents,
  mockNeighborhoodUnits,
  EmergencyContact,
  VillageEvent,
  VillageProfile,
  LetterTemplate,
  NeighborhoodUnit
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

  async getLetterTemplates(): Promise<LetterTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        try {
          await AsyncStorage.setItem('@dekatip_letter_templates', JSON.stringify(data));
        } catch {}
        return data as LetterTemplate[];
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getLetterTemplates fallback to cache.', err);
    }

    try {
      const cached = await AsyncStorage.getItem('@dekatip_letter_templates');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed as LetterTemplate[];
      }
    } catch {}

    return [];
  }

  async getNeighborhoodUnits(): Promise<NeighborhoodUnit[]> {
    try {
      const { data, error } = await supabase
        .from('neighborhood_units')
        .select('*')
        .eq('is_active', true)
        .order('rt_number', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          rt_number: d.rt_number,
          rw_number: d.rw_number,
          dusun: d.dusun_name || d.dusun || 'Lingkungan Warga',
          rt_leader_name: d.rt_leader_name || '',
          rt_leader_phone: d.rt_leader_phone || '',
          rw_leader_name: d.rw_leader_name,
          rw_leader_phone: d.rw_leader_phone,
          active: d.is_active ?? true,
        }));
        try {
          await AsyncStorage.setItem('@dekatip_neighborhood_units', JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getNeighborhoodUnits fallback.', err);
    }

    try {
      const cached = await AsyncStorage.getItem('@dekatip_neighborhood_units');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return mockNeighborhoodUnits;
  }
}

export const villageService = new VillageService();
