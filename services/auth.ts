import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Citizen } from '@/store/mockData';

const SESSION_STORAGE_KEY = '@dekati_citizen_session';

export interface CitizenSession {
  citizen: Citizen;
  token: string;
  loggedInAt: string;
}

export interface RegisterParams {
  nik: string;
  nama: string;
  phone: string;
  no_kk?: string;
  password: string;
  alamat?: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  village_code?: string;
  village_name?: string;
  district?: string;
  regency?: string;
  province?: string;
}

// In-memory active session cache
let currentActiveCitizen: Citizen | null = null;
let inMemorySession: CitizenSession | null = null;

const isStorageSafe = () => {
  return typeof window !== 'undefined' || (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative');
};

export const auth = {
  async getStoredSession(): Promise<CitizenSession | null> {
    if (inMemorySession) return inMemorySession;
    try {
      if (isStorageSafe() && typeof AsyncStorage !== 'undefined') {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CitizenSession;
          if (parsed && parsed.citizen && parsed.citizen.nik) {
            inMemorySession = parsed;
            currentActiveCitizen = parsed.citizen;
            return inMemorySession;
          }
        }
      }
    } catch (error) {
      console.warn('[Auth] Unable to restore local session:', error);
    }
    return null;
  },

  getCurrentCitizen(): Citizen | null {
    return currentActiveCitizen;
  },

  async loginCitizen(identifier: string, password: string): Promise<CitizenSession> {
    const nik = identifier.trim();
    const cleanPassword = password.trim();
    if (!nik || !cleanPassword) throw new Error('Mohon masukkan NIK dan kata sandi Anda.');
    if (!/^\d{16}$/.test(nik)) throw new Error('NIK harus terdiri dari tepat 16 digit angka.');

    const { data, error } = await supabase.rpc('authenticate_citizen', {
      p_nik: nik,
      p_password: cleanPassword,
    });
    if (error) {
      console.error('[Auth] Server authentication failed:', error);
      throw new Error('Layanan autentikasi tidak tersedia. Silakan coba lagi.');
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.id || row.nik !== nik || row.is_verified !== true) {
      throw new Error('Akun belum terverifikasi atau NIK/kata sandi tidak cocok. Hubungi administrator desa.');
    }

    const citizen: Citizen = {
      id: row.id,
      nik: row.nik,
      no_kk: row.no_kk || '',
      nama_lengkap: row.nama_lengkap,
      jenis_kelamin: row.jenis_kelamin || 'L',
      status_keluarga: row.status_dalam_keluarga || '',
      tanggal_lahir: row.tanggal_lahir || '',
      pekerjaan: row.pekerjaan || '',
      rt: row.rt || '',
      rw: row.rw || '',
      dusun: row.dusun || '',
      is_verified: !!row.is_verified,
      verification_status: row.is_verified ? 'verified' : 'pending',
      alamat_lengkap: row.alamat_lengkap || undefined,
      village_name: row.village_name || undefined,
      village_code: row.village_code || undefined,
    };

    inMemorySession = { citizen, token: '', loggedInAt: new Date().toISOString() };
    currentActiveCitizen = citizen;
    try {
      if (isStorageSafe() && typeof AsyncStorage !== 'undefined') {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(inMemorySession));
      }
    } catch (e) {
      console.warn('[Auth] Failed to persist session:', e);
    }
    return inMemorySession;
  },

  async registerCitizen(params: RegisterParams): Promise<CitizenSession> {
    const nik = (params.nik || '').trim();
    const nama = (params.nama || '').trim();
    const cleanPassword = (params.password || '').trim();

    if (!nik || nik.length !== 16 || !/^\d+$/.test(nik)) {
      throw new Error('NIK harus terdiri dari tepat 16 digit angka sesuai KTP.');
    }
    if (!nama) {
      throw new Error('Nama lengkap wajib diisi sesuai KTP.');
    }

    try {
      // 1. Coba RPC register_citizen_secure yang mendukung password pgcrypto
      let registeredData: any = null;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('register_citizen_secure', {
          p_nik: nik,
          p_nama: nama,
          p_phone: params.phone?.trim() || null,
          p_password: cleanPassword || '123456',
          p_no_kk: params.no_kk?.trim() || null,
          p_alamat: params.alamat?.trim() || null,
          p_rt: params.rt?.trim() || '01',
          p_rw: params.rw?.trim() || '01',
          p_dusun: params.dusun?.trim() || 'Dusun'
        });

        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          registeredData = rpcData[0];
        }
      } catch {
        // Fallback jika RPC belum terdaftar
      }

      // 2. Fallback direct table insert jika RPC belum aktif
      if (!registeredData) {
        const insertPayload: any = {
          nik: nik,
          nama_lengkap: nama,
          phone_number: params.phone?.trim() || null,
          no_kk: params.no_kk?.trim() || null,
          alamat_lengkap: params.alamat?.trim() || null,
          rt: params.rt?.trim() || null,
          rw: params.rw?.trim() || null,
          dusun: params.dusun?.trim() || null,
          is_verified: false,
          verified_by: null,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('citizens')
          .insert([insertPayload])
          .select('*')
          .single();

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            throw new Error('NIK tersebut sudah terdaftar dalam sistem desa. Silakan hubungi admin jika Anda lupa kata sandi.');
          }
          throw new Error(error.message || 'Gagal mengajukan pendaftaran akun.');
        }
        registeredData = data;
      }

      const citizen: Citizen = {
        id: registeredData.id,
        nik: registeredData.nik || nik,
        no_kk: registeredData.no_kk || params.no_kk || '',
        nama_lengkap: registeredData.nama_lengkap || nama,
        jenis_kelamin: (registeredData.jenis_kelamin as 'L' | 'P') || 'L',
        status_keluarga: registeredData.status_dalam_keluarga || '',
        tanggal_lahir: registeredData.tanggal_lahir || '',
        pekerjaan: registeredData.pekerjaan || '',
        rt: registeredData.rt || params.rt || '',
        rw: registeredData.rw || params.rw || '',
        dusun: registeredData.dusun || params.dusun || '',
        is_verified: false,
        verification_status: 'pending',
        alamat_lengkap: registeredData.alamat_lengkap || params.alamat || undefined,
        village_name: registeredData.village_name || undefined,
        village_code: registeredData.village_code || undefined,
      };

      inMemorySession = { citizen, token: '', loggedInAt: new Date().toISOString() };
      currentActiveCitizen = citizen;
      try {
        if (isStorageSafe() && typeof AsyncStorage !== 'undefined') {
          await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(inMemorySession));
        }
      } catch (e) {
        console.warn('[Auth] Failed to persist session:', e);
      }
      return inMemorySession;
    } catch (err: any) {
      throw new Error(err.message || 'Gagal mengajukan pendaftaran akun.');
    }
  },

  async updateSessionCitizen(updatedData: Partial<Citizen>): Promise<Citizen | null> {
    const base = inMemorySession?.citizen || currentActiveCitizen;
    if (!base) return null;
    const merged = { ...base, ...updatedData };
    currentActiveCitizen = merged;
    if (inMemorySession) {
      inMemorySession.citizen = merged;
      try {
        if (isStorageSafe() && typeof AsyncStorage !== 'undefined') {
          await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(inMemorySession));
        }
      } catch {}
    }
    return merged;
  },

  async logoutCitizen(): Promise<void> {
    inMemorySession = null;
    currentActiveCitizen = null;
    try {
      if (isStorageSafe() && typeof AsyncStorage !== 'undefined') {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('[Auth] Error clearing session:', error);
    }
  },
};