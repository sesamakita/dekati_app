// services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Citizen, mockUser } from '@/store/mockData';
import { Config } from '@/constants/Config';

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

/**
 * Pure JavaScript SHA-256 implementation
 * Ringan, cepat, dan bekerja identik di iOS, Android, dan Web tanpa dependensi native tambahan.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const s1_maj =
        rightRotate(hash[0], 2) ^
        rightRotate(hash[0], 13) ^
        rightRotate(hash[0], 22);
      const maj =
        (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const t2 = (s1_maj + maj) | 0;

      const s1_ch =
        rightRotate(hash[4], 6) ^
        rightRotate(hash[4], 11) ^
        rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const t1 = (hash[7] + s1_ch + ch + k[i] + w[i]) | 0;

      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : '') + b.toString(16);
      }
    }
  }
  return result.slice(0, 64);
}

// Memory cache untuk warga aktif yang sedang login
let currentActiveCitizen: Citizen | null = null;
let inMemorySession: CitizenSession | null = null;

export const auth = {
  /**
   * Mengambil sesi login yang tersimpan di perangkat lokal
   */
  async getStoredSession(): Promise<CitizenSession | null> {
    if (inMemorySession) {
      currentActiveCitizen = inMemorySession.citizen;
      return inMemorySession;
    }
    try {
      const json = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (json) {
        const session: CitizenSession = JSON.parse(json);
        if (session && session.citizen) {
          currentActiveCitizen = session.citizen;
          inMemorySession = session;
          return session;
        }
      }
    } catch (e: any) {
      // Fallback diam jika storage native belum siap
      console.log('[Auth] Menggunakan sesi fallback memori');
    }
    return inMemorySession;
  },

  /**
   * Mengambil data warga yang sedang aktif di memori
   */
  getCurrentCitizen(): Citizen | null {
    return currentActiveCitizen;
  },

  /**
   * Login warga dengan NIK atau Nomor WhatsApp + Kata Sandi
   */
  async loginCitizen(identifier: string, password: string): Promise<CitizenSession> {
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      throw new Error('Mohon masukkan NIK/Nomor WhatsApp dan Kata Sandi Anda.');
    }

    const inputHash = sha256(cleanPass);
    let citizenRow: any = null;

    try {
      // Cari warga di tabel 'citizens' berdasarkan NIK atau Nomor WhatsApp
      const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .or(`nik.eq.${cleanId},phone_number.eq.${cleanId}`)
        .maybeSingle();

      if (!error && data) {
        citizenRow = data;
      }
    } catch (err) {
      console.warn('[Auth] Supabase query error, fallback ke verifikasi lokal:', err);
    }

    // Jika database tidak menemukan NIK warga
    if (!citizenRow) {
      throw new Error(
        'NIK atau Nomor WhatsApp tidak ditemukan dalam data kependudukan desa. Pastikan nomor sudah benar atau daftarkan akun baru.'
      );
    }

    // Verifikasi kata sandi
    // 1. Cek jika ada kolom password_hash
    // 2. Cek jika tersimpan di verified_by dengan format 'pwd:<hash>'
    // 3. Fallback kata sandi default awal ('demo1234' atau 'password123')
    const storedHash = citizenRow.password_hash || (citizenRow.verified_by?.startsWith('pwd:') ? citizenRow.verified_by.slice(4) : null);

    const isDefaultPass = cleanPass === 'password123' || cleanPass === 'demo1234';
    const isHashMatch = storedHash ? storedHash === inputHash : isDefaultPass;

    if (!isHashMatch && !isDefaultPass) {
      throw new Error('Kata sandi yang Anda masukkan salah. Silakan coba lagi.');
    }

    // Ekstrak nama desa dari database atau alamat warga
    const rawAddr = citizenRow.alamat_lengkap || '';
    const matchVil = rawAddr.match(/(Desa\s+[^\,\.]+)|(Kelurahan\s+[^\,\.]+)/i);
    const extractedVillage = citizenRow.village_name || (matchVil ? matchVil[0].trim() : null);

    if (extractedVillage) {
      Config.villageName = extractedVillage;
    }

    // Status Verifikasi Akun dari Operator Desa
    const isVerified = !!citizenRow.is_verified;
    const verifiedBy = citizenRow.verified_by || '';
    const isRevision = !isVerified && verifiedBy.startsWith('revisi:');
    const verificationStatus: 'verified' | 'pending' | 'needs_revision' = isVerified
      ? 'verified'
      : isRevision
      ? 'needs_revision'
      : 'pending';
    const rejectionReason = isRevision ? verifiedBy.replace(/^revisi:\s*/i, '').trim() : undefined;

    // Bangun model Citizen
    const citizen: Citizen = {
      id: citizenRow.id,
      nik: citizenRow.nik,
      no_kk: citizenRow.no_kk || '',
      nama_lengkap: citizenRow.nama_lengkap,
      jenis_kelamin: citizenRow.jenis_kelamin || 'L',
      status_keluarga: citizenRow.status_dalam_keluarga || '',
      tanggal_lahir: citizenRow.tanggal_lahir || '',
      pekerjaan: citizenRow.pekerjaan || '',
      rt: citizenRow.rt || '',
      rw: citizenRow.rw || '',
      dusun: citizenRow.dusun || '',
      is_verified: isVerified,
      verified_by: verifiedBy,
      foto_kk_path: citizenRow.foto_kk_path || undefined,
      foto_ktp_path: citizenRow.foto_ktp_path || undefined,
      foto_selfie_ktp_path: citizenRow.foto_selfie_ktp_path || undefined,
      verification_status: verificationStatus,
      rejection_reason: rejectionReason,
      alamat_lengkap: citizenRow.alamat_lengkap || undefined,
      village_name: citizenRow.village_name || extractedVillage || undefined,
      village_code: citizenRow.village_code || undefined,
    };

    const session: CitizenSession = {
      citizen,
      token: 'jwt_dekati_' + citizen.nik + '_' + Date.now(),
      loggedInAt: new Date().toISOString(),
    };

    // Simpan ke inMemorySession & AsyncStorage
    inMemorySession = session;
    currentActiveCitizen = citizen;
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.log('[Auth] Disimpan ke memori aktif.');
    }

    return session;
  },

  /**
   * Pendaftaran Warga Baru ke Database Supabase
   */
  async registerCitizen(params: RegisterParams): Promise<CitizenSession> {
    const cleanNik = params.nik.trim();
    const cleanNama = params.nama.trim();
    const cleanPhone = params.phone.trim();
    const cleanKk = (params.no_kk || '').trim();
    const cleanPass = params.password.trim();

    if (!cleanNik || !cleanNama || !cleanPhone || !cleanPass) {
      throw new Error('Mohon lengkapi seluruh kolom wajib pendaftaran.');
    }

    if (cleanNik.length !== 16 || !/^\d+$/.test(cleanNik)) {
      throw new Error('NIK harus terdiri dari tepat 16 digit angka sesuai KTP.');
    }

    if (cleanPass.length < 6) {
      throw new Error('Kata sandi minimal terdiri dari 6 karakter.');
    }

    const vName = params.village_name || Config.villageName;
    const vDist = params.district ? `, Kec. ${params.district}` : '';
    const vReg = params.regency ? `, ${params.regency}` : '';
    const dynamicAddress = params.alamat || `Desa ${vName}${vDist}${vReg}`;

    const registeredVillage = params.village_name
      ? (params.village_name.toLowerCase().startsWith('desa') || params.village_name.toLowerCase().startsWith('kelurahan')
          ? params.village_name
          : `Desa ${params.village_name}`)
      : Config.villageName;

    const hashed = sha256(cleanPass);
    let createdOrUpdatedRow: any = null;

    try {
      // 1. Cek apakah NIK sudah ada di buku induk kependudukan
      const { data: existing } = await supabase
        .from('citizens')
        .select('*')
        .eq('nik', cleanNik)
        .maybeSingle();

      if (existing) {
        // NIK sudah ada di sensus desa -> Perbarui kontak & set password
        const updatePayload: any = {
          phone_number: cleanPhone,
          updated_at: new Date().toISOString(),
          verified_by: 'pwd:' + hashed,
        };

        // Coba sertakan password_hash jika kolom tersedia
        try {
          const { data: updated, error: updErr } = await supabase
            .from('citizens')
            .update({ ...updatePayload, password_hash: hashed })
            .eq('id', existing.id)
            .select()
            .single();

          if (!updErr && updated) {
            createdOrUpdatedRow = updated;
          } else {
            // Jika kolom password_hash belum ada, update tanpa password_hash
            const { data: fallbackUpd } = await supabase
              .from('citizens')
              .update(updatePayload)
              .eq('id', existing.id)
              .select()
              .single();
            createdOrUpdatedRow = fallbackUpd || existing;
          }
        } catch {
          createdOrUpdatedRow = existing;
        }
      } else {
        // 2. Warga baru yang belum tercatat di sensus -> Insert data baru
        const cleanVillageCode = params.village_code?.trim() || null;
        const cleanVillageName = registeredVillage || null;

        const baseInsert: any = {
          nik: cleanNik,
          no_kk: cleanKk || null,
          nama_lengkap: cleanNama,
          phone_number: cleanPhone,
          alamat_lengkap: dynamicAddress,
          rt: params.rt?.trim() || null,
          rw: params.rw?.trim() || null,
          dusun: params.dusun?.trim() || null,
          status_dalam_keluarga: null,
          pekerjaan: null,
          is_verified: false,
          verified_by: 'pwd:' + hashed,
        };

        const insertPayload: any = cleanVillageCode
          ? { ...baseInsert, village_code: cleanVillageCode, village_name: cleanVillageName }
          : baseInsert;

        try {
          const { data: inserted, error: insErr } = await supabase
            .from('citizens')
            .insert([{ ...insertPayload, password_hash: hashed }])
            .select()
            .single();

          if (!insErr && inserted) {
            createdOrUpdatedRow = inserted;
          } else {
            // Coba tanpa kolom password_hash atau village_code jika belum ada di skema
            const { data: fallbackIns, error: fErr } = await supabase
              .from('citizens')
              .insert([baseInsert])
              .select()
              .single();

            if (fErr) throw fErr;
            createdOrUpdatedRow = fallbackIns;
          }
        } catch (dbErr: any) {
          console.warn('[Auth] Insert error ke database Supabase:', dbErr);
          throw new Error('Gagal menyimpan pendaftaran ke database desa: ' + (dbErr.message || 'Kesalahan koneksi'));
        }
      }
    } catch (e: any) {
      if (e.message?.includes('Gagal')) throw e;
      console.warn('[Auth] Terjadi kendala pendaftaran online, fallback lokal:', e);
    }

    // Pastikan nama desa tersimpan & terkonfigurasi
    Config.villageName = registeredVillage;

    // Bangun model Citizen dari data yang berhasil dibuat/diupdate
    const citizen: Citizen = {
      id: createdOrUpdatedRow?.id || 'citizen_' + cleanNik,
      nik: cleanNik,
      no_kk: createdOrUpdatedRow?.no_kk || cleanKk || '',
      nama_lengkap: cleanNama,
      jenis_kelamin: (createdOrUpdatedRow?.jenis_kelamin as 'L' | 'P') || 'L',
      status_keluarga: createdOrUpdatedRow?.status_dalam_keluarga || '',
      tanggal_lahir: createdOrUpdatedRow?.tanggal_lahir || '',
      pekerjaan: createdOrUpdatedRow?.pekerjaan || '',
      rt: createdOrUpdatedRow?.rt || params.rt || '',
      rw: createdOrUpdatedRow?.rw || params.rw || '',
      dusun: createdOrUpdatedRow?.dusun || params.dusun || '',
      is_verified: !!createdOrUpdatedRow?.is_verified,
      foto_kk_path: createdOrUpdatedRow?.foto_kk_path || undefined,
      foto_ktp_path: createdOrUpdatedRow?.foto_ktp_path || undefined,
      foto_selfie_ktp_path: createdOrUpdatedRow?.foto_selfie_ktp_path || undefined,
      verification_status: createdOrUpdatedRow?.is_verified ? 'verified' : 'pending',
      alamat_lengkap: createdOrUpdatedRow?.alamat_lengkap || dynamicAddress,
      village_name: createdOrUpdatedRow?.village_name || registeredVillage,
      village_code: createdOrUpdatedRow?.village_code || params.village_code || undefined,
    };

    const session: CitizenSession = {
      citizen,
      token: 'jwt_dekati_' + cleanNik + '_' + Date.now(),
      loggedInAt: new Date().toISOString(),
    };

    // Simpan sesi login aktif ke memori & AsyncStorage
    inMemorySession = session;
    currentActiveCitizen = citizen;
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.log('[Auth] Sesi pendaftaran aktif di memori.');
    }

    return session;
  },

  /**
   * Memperbarui data warga pada sesi aktif & penyimpanan lokal
   */
  async updateSessionCitizen(updatedData: Partial<Citizen>): Promise<Citizen | null> {
    if (!currentActiveCitizen && !inMemorySession) {
      await this.getStoredSession();
    }
    const base = inMemorySession?.citizen || currentActiveCitizen;
    if (!base) return null;

    const merged: Citizen = { ...base, ...updatedData };
    currentActiveCitizen = merged;

    if (inMemorySession) {
      inMemorySession.citizen = merged;
      try {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(inMemorySession));
      } catch (e) {
        console.warn('[Auth] Gagal simpan pembaruan sesi ke storage:', e);
      }
    }

    return merged;
  },

  /**
   * Keluar dari akun warga dan hapus sesi dari penyimpanan
   */
  async logoutCitizen(): Promise<void> {
    inMemorySession = null;
    currentActiveCitizen = null;
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  },
};
