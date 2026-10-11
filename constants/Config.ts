// constants/Config.ts

export const Config = {
  appName: 'Dekati',
  tagline: 'Desa Kita Dekat di Hati',
  villageName: process.env.EXPO_PUBLIC_VILLAGE_NAME || '',
  defaultVillageName: 'Pemerintah Desa',
  villagePhone: process.env.EXPO_PUBLIC_VILLAGE_PHONE || '',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  webPortalUrl: process.env.EXPO_PUBLIC_WEB_PORTAL_URL || 'https://dekati-web.vercel.app',
  enableMockFallback: process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === 'true',
  
  emergencyContacts: []
};
