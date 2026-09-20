// constants/Config.ts

export const Config = {
  appName: 'Dekati',
  tagline: 'Desa Kita Dekat di Hati',
  villageName: process.env.EXPO_PUBLIC_VILLAGE_NAME || 'Desa Sukamaju',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.desa-sukamaju.desa.id/api/v1',
  enableMockFallback: process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK !== 'false',
  
  emergencyContacts: [
    { title: 'Ambulans Desa', phone: '0812-3456-7890', icon: 'car' },
    { title: 'Bhabinkamtibmas', phone: '0813-9876-5432', icon: 'shield' },
    { title: 'Babinsa', phone: '0811-2233-4455', icon: 'shield-halved' },
    { title: 'Kantor Desa Sukamaju', phone: '0251-876543', icon: 'building-columns' },
  ]
};
