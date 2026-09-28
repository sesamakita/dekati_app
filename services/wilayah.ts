// services/wilayah.ts
// Service pemilih data wilayah administrasi Indonesia (Kemendagri) untuk aplikasi mobile warga

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Seluruh 34 Provinsi Indonesia resmi Kemendagri
export const ALL_INDONESIA_PROVINCES: Province[] = [
  { id: '11', name: 'ACEH' },
  { id: '12', name: 'SUMATERA UTARA' },
  { id: '13', name: 'SUMATERA BARAT' },
  { id: '14', name: 'RIAU' },
  { id: '15', name: 'JAMBI' },
  { id: '16', name: 'SUMATERA SELATAN' },
  { id: '17', name: 'BENGKULU' },
  { id: '18', name: 'LAMPUNG' },
  { id: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
  { id: '21', name: 'KEPULAUAN RIAU' },
  { id: '31', name: 'DKI JAKARTA' },
  { id: '32', name: 'JAWA BARAT' },
  { id: '33', name: 'JAWA TENGAH' },
  { id: '34', name: 'DI YOGYAKARTA' },
  { id: '35', name: 'JAWA TIMUR' },
  { id: '36', name: 'BANTEN' },
  { id: '51', name: 'BALI' },
  { id: '52', name: 'NUSA TENGGARA BARAT' },
  { id: '53', name: 'NUSA TENGGARA TIMUR' },
  { id: '61', name: 'KALIMANTAN BARAT' },
  { id: '62', name: 'KALIMANTAN TENGAH' },
  { id: '63', name: 'KALIMANTAN SELATAN' },
  { id: '64', name: 'KALIMANTAN TIMUR' },
  { id: '65', name: 'KALIMANTAN UTARA' },
  { id: '71', name: 'SULAWESI UTARA' },
  { id: '72', name: 'SULAWESI TENGAH' },
  { id: '73', name: 'SULAWESI SELATAN' },
  { id: '74', name: 'SULAWESI TENGGARA' },
  { id: '75', name: 'GORONTALO' },
  { id: '76', name: 'SULAWESI BARAT' },
  { id: '81', name: 'MALUKU' },
  { id: '82', name: 'MALUKU UTARA' },
  { id: '91', name: 'PAPUA BARAT' },
  { id: '94', name: 'PAPUA' }
];

const BASE_MIRRORS = [
  'https://emsifa.github.io/api-wilayah-indonesia/api',
  'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api',
  'https://kanglerian.github.io/api-wilayah-indonesia/api'
];

// In-Memory Cache
const cache = {
  provinces: null as Province[] | null,
  regencies: new Map<string, Regency[]>(),
  districts: new Map<string, District[]>(),
  villages: new Map<string, Village[]>(),
};

async function fetchFromMirrors<T>(relativePath: string): Promise<T | null> {
  for (const base of BASE_MIRRORS) {
    try {
      const res = await fetch(`${base}/${relativePath}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data as T;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export const wilayahApi = {
  async getProvinces(): Promise<Province[]> {
    if (cache.provinces && cache.provinces.length > 0) return cache.provinces;

    const remote = await fetchFromMirrors<Province[]>('provinces.json');
    if (remote && remote.length > 0) {
      cache.provinces = remote;
      return remote;
    }

    cache.provinces = ALL_INDONESIA_PROVINCES;
    return ALL_INDONESIA_PROVINCES;
  },

  async getRegencies(provinceId: string): Promise<Regency[]> {
    if (!provinceId) return [];
    if (cache.regencies.has(provinceId)) {
      return cache.regencies.get(provinceId)!;
    }

    const data = await fetchFromMirrors<Regency[]>(`regencies/${provinceId}.json`);
    if (data && data.length > 0) {
      cache.regencies.set(provinceId, data);
      return data;
    }

    return [];
  },

  async getDistricts(regencyId: string): Promise<District[]> {
    if (!regencyId) return [];
    if (cache.districts.has(regencyId)) {
      return cache.districts.get(regencyId)!;
    }

    const data = await fetchFromMirrors<District[]>(`districts/${regencyId}.json`);
    if (data && data.length > 0) {
      cache.districts.set(regencyId, data);
      return data;
    }

    return [];
  },

  async getVillages(districtId: string): Promise<Village[]> {
    if (!districtId) return [];
    if (cache.villages.has(districtId)) {
      return cache.villages.get(districtId)!;
    }

    const data = await fetchFromMirrors<Village[]>(`villages/${districtId}.json`);
    if (data && data.length > 0) {
      cache.villages.set(districtId, data);
      return data;
    }

    return [];
  },
};
