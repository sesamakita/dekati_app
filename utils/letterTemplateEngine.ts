import * as FileSystem from 'expo-file-system/legacy';
import { LetterRequest, LetterTemplate, VillageProfile } from '@/store/mockData';
import {
  DEFAULT_GARUDA_DATA_URI,
  DEFAULT_KAB_LOGO_DATA_URI,
  DEFAULT_DESA_LOGO_DATA_URI,
} from './logoAssets';

export {
  DEFAULT_GARUDA_DATA_URI,
  DEFAULT_KAB_LOGO_DATA_URI,
  DEFAULT_DESA_LOGO_DATA_URI,
};

/**
 * Mengunduh URL logo eksternal ke memori/cache HP dan mengubahnya menjadi Data URI Base64
 * secara asinkron sebelum diserahkan ke mesin PDF Print Spooler Android / iOS.
 * Ini menjamin logo 100% muncul seketika di PDF tanpa terpengaruh koneksi lambat,
 * timeout headless webview, atau blokir hotlink.
 */
export async function prefetchImageAsDataUri(
  url: string | undefined,
  fallbackDataUri: string
): Promise<string> {
  if (!url || typeof url !== 'string') return fallbackDataUri;
  const trimmed = url.trim();
  if (!trimmed) return fallbackDataUri;
  if (trimmed.startsWith('data:')) return trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return fallbackDataUri;

  try {
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = ((hash << 5) - hash) + trimmed.charCodeAt(i);
      hash |= 0;
    }
    const cleanExt = (trimmed.split('?')[0].split('.').pop() || 'png').toLowerCase().slice(0, 4);
    const validExt = ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(cleanExt) ? cleanExt : 'png';
    const cacheFile = `${FileSystem.cacheDirectory}logo_cache_${Math.abs(hash)}.${validExt}`;

    const fileInfo = await FileSystem.getInfoAsync(cacheFile);
    if (!fileInfo.exists) {
      await FileSystem.downloadAsync(trimmed, cacheFile);
    }

    const base64 = await FileSystem.readAsStringAsync(cacheFile, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const mime = validExt === 'svg' ? 'image/svg+xml' : validExt === 'jpg' || validExt === 'jpeg' ? 'image/jpeg' : `image/${validExt}`;
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('[letterTemplateEngine] prefetchImageAsDataUri fallback triggered:', err);
    return fallbackDataUri;
  }
}

export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{{nama_warga}}', label: 'Nama Warga', desc: 'Nama lengkap pemohon surat' },
  { tag: '{{nik}}', label: 'NIK Pemohon', desc: '16 digit NIK pemohon' },
  { tag: '{{alamat}}', label: 'Alamat Kependudukan', desc: 'Alamat domisili sah warga' },
  { tag: '{{keperluan}}', label: 'Maksud / Keperluan', desc: 'Tujuan pengajuan surat' },
  { tag: '{{nomor_surat}}', label: 'Nomor Surat Resmi', desc: 'Nomor registrasi resmi desa' },
  { tag: '{{tanggal_surat}}', label: 'Tanggal Surat', desc: 'Tanggal penetapan/penerbitan' },
  { tag: '{{nama_desa}}', label: 'Nama Desa / Kelurahan', desc: 'Contoh: Desa Mekar Jaya' },
  { tag: '{{nama_kecamatan}}', label: 'Kecamatan', desc: 'Nama kecamatan setempat' },
  { tag: '{{nama_kabupaten}}', label: 'Kabupaten / Kota', desc: 'Nama kabupaten/kota' },
  { tag: '{{alamat_kantor}}', label: 'Alamat Kantor Desa', desc: 'Alamat kantor sekretariat' },
  { tag: '{{nama_kades}}', label: 'Nama Kepala Desa', desc: 'Nama lengkap penandatangan' },
  { tag: '{{jabatan_penandatangan}}', label: 'Jabatan Penandatangan', desc: 'Kepala Desa / a.n. Sekretaris Desa' },
];

export const DEFAULT_GARUDA_URL = DEFAULT_GARUDA_DATA_URI;
export const DEFAULT_KAB_LOGO_URL = DEFAULT_KAB_LOGO_DATA_URI;

export const DEFAULT_TEMPLATES: Record<string, LetterTemplate> = {
  DEFAULT: {
    letter_type_code: 'DEFAULT',
    title_format: 'SURAT KETERANGAN',
    header_config: {
      show_kab_logo: true,
      show_desa_logo: false,
      show_garuda_logo: false,
      logo_layout: 'standard_left',
      font_family: 'Times New Roman',
      line_spacing: 1.5,
      border_style: 'double',
    },
    opening_text:
      'Yang bertanda tangan di bawah ini, {{jabatan_penandatangan}} {{nama_desa}}, Kecamatan {{nama_kecamatan}}, {{nama_kabupaten}}, menerangkan dengan sebenarnya bahwa:',
    declaration_text:
      'Adalah benar-benar warga yang bertempat tinggal secara sah di wilayah {{nama_desa}} dan tercatat dalam data kependudukan resmi desa kami. Sepanjang sepengetahuan kami, yang bersangkutan memiliki catatan permohonan sesuai dengan maksud dan tujuan di atas.',
    closing_text:
      'Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh yang berkepentingan.',
    signer_role: 'Kepala Desa',
  },
  SKTM: {
    letter_type_code: 'SKTM',
    title_format: 'SURAT KETERANGAN TIDAK MAMPU',
    header_config: {
      show_kab_logo: true,
      show_desa_logo: false,
      show_garuda_logo: false,
      logo_layout: 'standard_left',
      font_family: 'Times New Roman',
      line_spacing: 1.5,
      border_style: 'double',
    },
    opening_text:
      'Yang bertanda tangan di bawah ini, {{jabatan_penandatangan}} {{nama_desa}}, Kecamatan {{nama_kecamatan}}, {{nama_kabupaten}}, menerangkan dengan sebenarnya bahwa:',
    declaration_text:
      'Berdasarkan data kependudukan dan peninjauan lapangan yang ada pada kami, yang bersangkutan adalah benar-benar warga yang bertempat tinggal di {{nama_desa}} dan tergolong dalam keluarga Kurang Mampu / Pra-Sejahtera. Surat keterangan ini dikeluarkan untuk keperluan: {{keperluan}}.',
    closing_text:
      'Demikian surat keterangan tidak mampu ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.',
    signer_role: 'Kepala Desa',
  },
  SKU: {
    letter_type_code: 'SKU',
    title_format: 'SURAT KETERANGAN USAHA',
    header_config: {
      show_kab_logo: true,
      show_desa_logo: false,
      show_garuda_logo: false,
      logo_layout: 'standard_left',
      font_family: 'Times New Roman',
      line_spacing: 1.5,
      border_style: 'double',
    },
    opening_text:
      'Yang bertanda tangan di bawah ini, {{jabatan_penandatangan}} {{nama_desa}}, Kecamatan {{nama_kecamatan}}, {{nama_kabupaten}}, menerangkan dengan sebenarnya bahwa:',
    declaration_text:
      'Adalah benar-benar warga yang bertempat tinggal di wilayah {{nama_desa}} dan sepanjang sepengetahuan kami, yang bersangkutan benar-benar memiliki kegiatan usaha aktif di wilayah kami untuk keperluan: {{keperluan}}.',
    closing_text:
      'Demikian surat keterangan usaha ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagai persyaratan kelengkapan administrasi yang sah.',
    signer_role: 'Kepala Desa',
  },
  SKCK_PENGANTAR: {
    letter_type_code: 'SKCK_PENGANTAR',
    title_format: 'SURAT PENGANTAR CATATAN KEPOLISIAN',
    header_config: {
      show_kab_logo: true,
      show_desa_logo: false,
      show_garuda_logo: false,
      logo_layout: 'standard_left',
      font_family: 'Times New Roman',
      line_spacing: 1.5,
      border_style: 'double',
    },
    opening_text:
      'Yang bertanda tangan di bawah ini, {{jabatan_penandatangan}} {{nama_desa}}, Kecamatan {{nama_kecamatan}}, {{nama_kabupaten}}, menerangkan dengan sebenarnya bahwa:',
    declaration_text:
      'Adalah benar warga bertempat tinggal di {{nama_desa}}, berkelakuan baik, tidak sedang menjalani proses pidana hukum, dan sepanjang catatan kami belum pernah terlibat tindak kejahatan. Surat ini diberikan sebagai pengantar pengurusan SKCK di Polsek setempat dengan keperluan: {{keperluan}}.',
    closing_text:
      'Demikian surat pengantar ini kami berikan untuk dapat dipergunakan sebagaimana mestinya.',
    signer_role: 'Kepala Desa',
  },
  SK_DOMISILI: {
    letter_type_code: 'SK_DOMISILI',
    title_format: 'SURAT KETERANGAN DOMISILI',
    header_config: {
      show_kab_logo: true,
      show_desa_logo: false,
      show_garuda_logo: false,
      logo_layout: 'standard_left',
      font_family: 'Times New Roman',
      line_spacing: 1.5,
      border_style: 'double',
    },
    opening_text:
      'Yang bertanda tangan di bawah ini, {{jabatan_penandatangan}} {{nama_desa}}, Kecamatan {{nama_kecamatan}}, {{nama_kabupaten}}, menerangkan dengan sebenarnya bahwa:',
    declaration_text:
      'Adalah benar-benar penduduk yang berdomisili dan bertempat tinggal sah di alamat tersebut di atas di wilayah {{nama_desa}}. Surat keterangan domisili ini dibuat untuk keperluan: {{keperluan}}.',
    closing_text:
      'Demikian surat keterangan domisili ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.',
    signer_role: 'Kepala Desa',
  },
};

/**
 * Gantikan placeholder {{variable}} dengan nilai riil dari konteks data
 */
export function interpolateTemplateText(
  templateText: string,
  context: Record<string, string | undefined>
): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return context[key] ?? `{{${key}}}`;
  });
}

/**
 * Normalisasi kode surat dari letter_name atau letter_type_code
 */
export function normalizeLetterCode(nameOrCode: string): string {
  const upper = (nameOrCode || '').toUpperCase();
  if (upper.includes('SKTM') || upper.includes('TIDAK MAMPU')) return 'SKTM';
  if (upper.includes('SKU') || upper.includes('USAHA')) return 'SKU';
  if (upper.includes('SKCK') || upper.includes('KEPOLISIAN')) return 'SKCK_PENGANTAR';
  if (upper.includes('DOMISILI')) return 'SK_DOMISILI';
  return upper.replace(/\s+/g, '_');
}

/**
 * Buat kamus data variabel dari permohonan surat & profil desa
 */
export function buildTemplateContext(
  letter: LetterRequest,
  profile: VillageProfile,
  signerRoleOverride?: string
): Record<string, string> {
  const vName = profile.name || 'Desa';
  const isKelurahan = profile.village_type === 'kelurahan' || vName.toLowerCase().startsWith('kelurahan');
  const cleanName = vName.replace(/^(PEMERINTAH\s+)?(DESA|KELURAHAN)\s+/i, '').trim();
  const vDistrict = profile.district || '';
  const vRegency = profile.regency || '';
  const officialNo = (letter as any).letter_official_number || letter.official_number || letter.tracking_number;
  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const defaultSignerTitle = isKelurahan ? 'Lurah' : 'Kepala Desa';
  let signerTitle = signerRoleOverride || defaultSignerTitle;
  if (isKelurahan && signerTitle === 'Kepala Desa') {
    signerTitle = 'Lurah';
  }

  return {
    nama_warga: letter.citizen_name,
    nik: letter.citizen_nik,
    alamat: letter.citizen_address || (isKelurahan ? 'Wilayah Kelurahan' : 'Wilayah Desa'),
    keperluan: letter.purpose,
    nomor_surat: officialNo,
    tanggal_surat: todayDateStr,
    nama_desa: isKelurahan ? `Kelurahan ${cleanName}` : `Desa ${cleanName}`,
    nama_kecamatan: vDistrict,
    nama_kabupaten: vRegency,
    alamat_kantor: profile.office_address || (isKelurahan ? 'Alamat Kantor Kelurahan' : 'Alamat Kantor Pemerintahan Desa'),
    telp_kantor: profile.office_phone || '',
    email_kantor: profile.office_email || (isKelurahan ? 'sekretariat@kelurahan.go.id' : 'sekretariat@desa.id'),
    nama_kades: letter.signed_by_name || profile.kades_name || (isKelurahan ? 'Lurah' : 'Kepala Desa'),
    jabatan_penandatangan: signerTitle,
  };
}

/**
 * Ambil template aktif untuk jenis surat tertentu (dengan fallback hierarkis)
 */
export function getEffectiveTemplate(
  letterNameOrCode: string,
  customTemplates?: LetterTemplate[]
): LetterTemplate {
  const code = normalizeLetterCode(letterNameOrCode);
  const rawUpper = (letterNameOrCode || '').toUpperCase().trim();

  // 1. Cari di kustomisasi desa yang tersimpan
  if (customTemplates && customTemplates.length > 0) {
    const foundCustom = customTemplates.find(
      (t) =>
        t.is_active !== false &&
        (t.letter_type_code.toUpperCase() === code ||
         t.letter_type_code.toUpperCase() === rawUpper ||
         (t.letter_name && t.letter_name.toUpperCase() === rawUpper) ||
         (t.letter_name && normalizeLetterCode(t.letter_name) === code))
    );
    if (foundCustom) return foundCustom;

    // Cari fallback DEFAULT di custom
    const customDefault = customTemplates.find((t) => t.letter_type_code === 'DEFAULT' && t.is_active !== false);
    if (customDefault) return customDefault;
  }

  // 2. Cari di template default bawaan berdasarkan kode
  if (DEFAULT_TEMPLATES[code]) {
    return DEFAULT_TEMPLATES[code];
  }
  if (DEFAULT_TEMPLATES[rawUpper]) {
    return DEFAULT_TEMPLATES[rawUpper];
  }

  // 3. Fallback terakhir ke template DEFAULT standar Permendagri
  return DEFAULT_TEMPLATES.DEFAULT;
}

/**
 * Render dokumen HTML lengkap siap unduh PDF / cetak dengan Tata Naskah Dinas & TTE
 */
export function renderFullLetterHtml(params: {
  letter: LetterRequest;
  profile: VillageProfile;
  template?: LetterTemplate;
  qrVerificationUrl?: string;
}): string {
  const { letter, profile, template, qrVerificationUrl } = params;
  const effectiveTemplate = template || getEffectiveTemplate(letter.letter_name, undefined);
  const context = buildTemplateContext(letter, profile, effectiveTemplate.signer_role);

  const vRegency = profile.regency || '';
  const vDistrict = profile.district || '';
  const vName = profile.name || 'Desa';
  const isKelurahan = profile.village_type === 'kelurahan' || vName.toLowerCase().startsWith('kelurahan');
  const cleanName = vName.replace(/^(PEMERINTAH\s+)?(DESA|KELURAHAN)\s+/i, '').trim();
  const institutionHeading = isKelurahan ? `PEMERINTAH KELURAHAN ${cleanName.toUpperCase()}` : `PEMERINTAH DESA ${cleanName.toUpperCase()}`;
  const vAddress = profile.office_address || (isKelurahan ? 'Alamat Kantor Kelurahan' : 'Alamat Kantor Pemerintahan Desa');
  const vPhone = profile.office_phone ? `Telp: ${profile.office_phone}` : '';
  const vEmail = profile.office_email ? `Email: ${profile.office_email}` : '';
  const vPostal = profile.postal_code ? `Kode Pos: ${profile.postal_code}` : '';

  const headerConfig = effectiveTemplate.header_config || DEFAULT_TEMPLATES.DEFAULT.header_config!;
  const logoLayout = headerConfig.logo_layout || 'standard_left';
  const showKab = headerConfig.show_kab_logo !== false && logoLayout !== 'no_logo' && logoLayout !== 'center_garuda';
  const showDesa = (headerConfig.show_desa_logo || logoLayout === 'dual_logo') && logoLayout !== 'no_logo' && logoLayout !== 'center_garuda';
  const showGaruda = logoLayout === 'center_garuda' || Boolean(headerConfig.show_garuda_logo);

  const kabLogoUrl = headerConfig.kab_logo_url || profile.logo_kabupaten_url || DEFAULT_KAB_LOGO_DATA_URI;
  const desaLogoUrl = headerConfig.desa_logo_url || profile.logo_desa_url || (headerConfig.show_desa_logo || logoLayout === 'dual_logo' ? DEFAULT_DESA_LOGO_DATA_URI : '');
  const garudaLogoUrl = headerConfig.garuda_logo_url || DEFAULT_GARUDA_DATA_URI;

  const hasLeftLogo = showKab && Boolean(kabLogoUrl);
  const hasRightLogo = showDesa && Boolean(desaLogoUrl);

  const fontFamily = headerConfig.font_family || 'Times New Roman';
  const borderBottom =
    headerConfig.border_style === 'none'
      ? 'none'
      : headerConfig.border_style === 'single'
      ? '2px solid #111827'
      : '3px double #111827';

  const verificationUrl =
    qrVerificationUrl ||
    letter.qr_url ||
    (letter as any).qr_verification_url ||
    letter.tracking_number;

  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    verificationUrl
  )}`;

  const openingText = interpolateTemplateText(effectiveTemplate.opening_text, context);
  const declarationText = interpolateTemplateText(effectiveTemplate.declaration_text, context);
  const closingText = interpolateTemplateText(effectiveTemplate.closing_text, context);
  const titleText = interpolateTemplateText(effectiveTemplate.title_format, context);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <title>${titleText} - ${letter.citizen_name}</title>
  <style>
    @page {
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: '${fontFamily}', 'Times New Roman', Times, serif;
      color: #111827;
      padding: 10px 15px;
      line-height: ${headerConfig.line_spacing || 1.5};
      background-color: #ffffff;
      margin: 0;
    }
    .kop {
      text-align: center;
      border-bottom: ${borderBottom};
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .kop h4 {
      margin: 0;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: Arial, sans-serif;
    }
    .kop h3 {
      margin: 2px 0;
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: Arial, sans-serif;
    }
    .kop h2 {
      margin: 2px 0;
      font-size: 19px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: Arial, sans-serif;
    }
    .kop p {
      margin: 2px 0 0 0;
      font-size: 11px;
      font-family: Arial, sans-serif;
      color: #4b5563;
    }
    .title-box {
      text-align: center;
      margin: 16px 0 20px 0;
    }
    .title-box h3 {
      margin: 0;
      font-size: 16px;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-box p {
      margin: 4px 0 0 0;
      font-size: 12px;
      font-family: Arial, sans-serif;
      font-weight: 600;
      color: #374151;
    }
    .content {
      font-size: 13px;
      text-align: justify;
      color: #1f2937;
    }
    .content p {
      margin: 8px 0;
      line-height: 1.6;
    }
    .bio-table {
      margin: 12px 0 12px 16px;
      width: 95%;
    }
    .bio-table td {
      padding: 3px 6px;
      font-size: 12.5px;
      vertical-align: top;
    }
    .bio-label {
      width: 170px;
      color: #4b5563;
    }
    .bio-colon {
      width: 15px;
    }
    .bio-val {
      color: #111827;
      font-weight: 600;
    }
    .footer-section {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .tte-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 300px;
      font-family: Arial, sans-serif;
    }
    .tte-box img {
      width: 72px;
      height: 72px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 2px;
      border-radius: 6px;
    }
    .tte-text {
      font-size: 9.5px;
      color: #4b5563;
      line-height: 1.35;
    }
    .tte-badge {
      font-weight: bold;
      color: #065f46;
      margin-bottom: 2px;
      font-size: 10px;
    }
    .tte-token {
      font-family: monospace;
      font-size: 8.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .signer-box {
      text-align: center;
      font-family: Arial, sans-serif;
      min-width: 200px;
    }
    .signer-date {
      font-size: 12px;
      color: #374151;
      margin-bottom: 4px;
    }
    .signer-role {
      font-size: 12px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 45px;
    }
    .signer-name {
      font-size: 13px;
      font-weight: bold;
      text-decoration: underline;
      color: #111827;
      margin: 0;
    }
    .signer-nip {
      font-size: 10px;
      color: #6b7280;
      margin: 2px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="kop">
    ${showGaruda ? `
      <div style="text-align: center; margin-bottom: 8px;">
        <img src="${garudaLogoUrl}" alt="Garuda Pancasila" crossorigin="anonymous" referrerpolicy="no-referrer" style="max-height: 65px; max-width: 65px; object-fit: contain;" onerror="this.onerror=null; this.src='${DEFAULT_GARUDA_DATA_URI}';" />
      </div>
    ` : ''}
    <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
      <tr>
        ${hasLeftLogo ? `
          <td style="width: 75px; vertical-align: middle; text-align: left; padding-right: 12px;">
            <img src="${kabLogoUrl}" alt="Lambang Daerah" crossorigin="anonymous" referrerpolicy="no-referrer" style="max-height: 75px; max-width: 75px; object-fit: contain;" onerror="this.onerror=null; this.src='${DEFAULT_KAB_LOGO_DATA_URI}';" />
          </td>
        ` : (hasRightLogo ? `<td style="width: 75px;"></td>` : '')}

        <td style="text-align: center; vertical-align: middle;">
          <h4>${vRegency ? `PEMERINTAH ${vRegency.toUpperCase()}` : (isKelurahan ? 'PEMERINTAH KOTA' : 'PEMERINTAH KABUPATEN')}</h4>
          <h3>${vDistrict ? `KECAMATAN ${vDistrict.toUpperCase()}` : 'KECAMATAN'}</h3>
          <h2>${institutionHeading}</h2>
          <p>${[vAddress, vPhone, vPostal].filter(Boolean).join(' • ')}</p>
          ${vEmail ? `<p>${vEmail}</p>` : ''}
        </td>

        ${hasRightLogo ? `
          <td style="width: 75px; vertical-align: middle; text-align: right; padding-left: 12px;">
            <img src="${desaLogoUrl}" alt="Lambang Desa" crossorigin="anonymous" referrerpolicy="no-referrer" style="max-height: 75px; max-width: 75px; object-fit: contain;" onerror="this.onerror=null; this.src='${DEFAULT_DESA_LOGO_DATA_URI}';" />
          </td>
        ` : (hasLeftLogo ? `<td style="width: 75px;"></td>` : '')}
      </tr>
    </table>
  </div>

  <div class="title-box">
    <h3>${titleText}</h3>
    <p>Nomor: ${context.nomor_surat}</p>
  </div>

  <div class="content">
    <p>${openingText}</p>

    <table class="bio-table">
      <tr>
        <td class="bio-label">Nama Lengkap</td>
        <td class="bio-colon">:</td>
        <td class="bio-val">${letter.citizen_name}</td>
      </tr>
      <tr>
        <td class="bio-label">NIK</td>
        <td class="bio-colon">:</td>
        <td class="bio-val" style="font-family: monospace;">${letter.citizen_nik}</td>
      </tr>
      <tr>
        <td class="bio-label">Alamat Kependudukan</td>
        <td class="bio-colon">:</td>
        <td class="bio-val">${letter.citizen_address || 'Wilayah Desa'}</td>
      </tr>
      <tr>
        <td class="bio-label">Keperluan</td>
        <td class="bio-colon">:</td>
        <td class="bio-val" style="font-style: italic;">${letter.purpose}</td>
      </tr>
    </table>

    <p>${declarationText}</p>

    <p>${closingText}</p>
  </div>

  <div class="footer-section">
    <div class="tte-box">
      <img src="${qrCodeImgSrc}" alt="QR TTE" width="72" height="72" onerror="this.style.display='none'" />
      <div class="tte-text">
        <div class="tte-badge">✓ TTE Sah Resmi ${isKelurahan ? 'Kelurahan' : 'Desa'}</div>
        Dokumen ini telah disahkan secara digital dengan Tanda Tangan Elektronik resmi.
        <div class="tte-token">ID: ${(letter.qr_token || letter.tracking_number || '').slice(0, 20)}</div>
      </div>
    </div>

    <div class="signer-box">
      <div class="signer-date">${cleanName}, ${context.tanggal_surat}</div>
      <div class="signer-role">${context.jabatan_penandatangan}</div>
      <div class="signer-name">${context.nama_kades}</div>
      ${profile.kades_nip ? `<div class="signer-nip">NIP. ${profile.kades_nip}</div>` : (isKelurahan ? `<div class="signer-nip">NIP. 19780512 200312 1 002</div>` : '')}
    </div>
  </div>
</body>
</html>`;
}
