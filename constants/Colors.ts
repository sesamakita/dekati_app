// constants/Colors.ts
// Palet warna resmi aplikasi Desa "Dekati" (Desa Kita Dekat di Hati)
// Karakter: Minimalis, bersih, pastel modern, ramah warga

export const Colors = {
  primary: '#16A34A',       // Hijau Desa Utama
  primaryDark: '#14532D',   // Hijau Gelap
  primaryLight: '#DCFCE7',  // Hijau Sangat Lembut untuk badge & background
  primarySubtle: '#F0FDF4', // Tint hijau ekstra lembut untuk bento card hero

  secondary: '#0284C7',     // Biru Layanan
  secondaryLight: '#E0F2FE',
  secondarySubtle: '#F0F9FF',

  accent: '#D97706',        // Amber Siaga / Info
  accentLight: '#FEF3C7',
  accentSubtle: '#FFFBEB',

  // Kuning Soft untuk AppBar Panel Uji Coba
  appBarYellow: '#FEF9C3',       // Kuning soft pastel (Yellow-100)
  appBarYellowBorder: '#FDE047', // Garis pembatas kuning lembut (Yellow-300)
  tabActiveYellow: '#FACC15',    // Kuning cerah aktif untuk tab switcher (Yellow-400)
  tabActiveYellowBorder: '#EAB308', // Border kuning aktif (Yellow-500)
  tabActiveYellowText: '#713F12',   // Teks amber gelap kontras tinggi (Amber-900)

  // Navigasi Bawah (Bottom Tab Bar) Hijau Soft & Efek Klik
  navBarGreenSoft: '#C6F0D3',       // Hijau soft untuk panel navigasi bawah
  navBarGreenBorder: '#9DE3B4',     // Garis pembatas atas panel navigasi
  navItemActiveBg: '#F0FDF4',       // Hijau lebih soft (ultra soft) untuk efek klik & tab aktif
  navItemActiveBorder: '#A7E8BD',   // Garis tepi halus untuk tab aktif
  navItemActiveText: '#14532D',     // Teks & icon tab aktif (hijau pekat)
  navItemInactiveText: '#235338',   // Teks & icon tab tidak aktif (hijau lumut pekat)

  urgent: '#DC2626',        // Merah Darurat / Bencana
  urgentLight: '#FEE2E2',
  urgentSubtle: '#FEF2F2',

  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  purpleSubtle: '#F5F3FF',

  textPrimary: '#0F172A',   // Slate gelap 900 (kontras maksimal 16:1)
  textSecondary: '#334155', // Slate 700 (tebal dan kontras tinggi >7:1)
  textMuted: '#475569',     // Slate 600 (jelas terbaca, tidak pudar)
  textSubtle: '#64748B',    // Slate 500

  background: '#F1F5F9',    // Canvas Slate-100 kontras membuat kartu putih pop-out
  surface: '#FFFFFF',       // Warna kartu putih bersih
  surfaceBorder: '#CBD5E1',  // Garis tepi kartu Slate-300 tegas (high contrast)
  borderMedium: '#94A3B8',  // Border pembatas sedang

  cardHighlight: '#F8FAFC',

  // Bento Specific Palettes (White Card Surface + High-Contrast Accents)
  bento: {
    hero: {
      bg: '#FFFFFF',
      border: '#86EFAC',      // Green 300 (tegas & segar)
      badge: '#DCFCE7',       // Green 100
      badgeBorder: '#86EFAC', // Green 300
      text: '#14532D',        // Green 900 (kontras tinggi)
    },
    blue: {
      bg: '#FFFFFF',
      border: '#BAE6FD',      // Sky 300
      badge: '#E0F2FE',       // Sky 100
      badgeBorder: '#7DD3FC', // Sky 300
      text: '#0369A1',        // Sky 700
    },
    amber: {
      bg: '#FFFFFF',
      border: '#FDE68A',      // Amber 300
      badge: '#FEF3C7',       // Amber 100
      badgeBorder: '#FCD34D', // Amber 300
      text: '#92400E',        // Amber 800
    },
    rose: {
      bg: '#FFFFFF',
      border: '#FECDD3',      // Rose 300
      badge: '#FFE4E6',       // Rose 100
      badgeBorder: '#FDA4AF', // Rose 300
      text: '#9F1239',        // Rose 800
    },
    purple: {
      bg: '#FFFFFF',
      border: '#DDD6FE',      // Purple 300
      badge: '#F3E8FF',       // Purple 100
      badgeBorder: '#C4B5FD', // Purple 300
      text: '#581C87',        // Purple 900
    },
  },

  status: {
    submitted: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: 'Menunggu Cek' },
    in_verification: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: 'Diverifikasi' },
    needs_revision: { bg: '#FEE2E2', text: '#991B1B', border: '#FECDD3', label: 'Perlu Revisi' },
    approved: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', label: 'Disetujui' },
    signed: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', label: 'Selesai (TTE QR)' },
    ready_for_pickup: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE', label: 'Siap Diambil' },
    completed: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC', label: 'Selesai' },
    rejected: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: 'Ditolak' },
  }
};

