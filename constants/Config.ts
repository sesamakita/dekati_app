// constants/Config.ts

export const Config = {
  appName: 'Dekati',
  tagline: 'Desa Kita Dekat di Hati',
  villageName: process.env.EXPO_PUBLIC_VILLAGE_NAME || 'Pemerintah Desa',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  enableMockFallback: process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === 'true',
  
  emergencyContacts: []
};
