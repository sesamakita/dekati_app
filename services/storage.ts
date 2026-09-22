// services/storage.ts
import { supabase } from './supabase';

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64tab = new Uint8Array(256);
for (let i = 0; i < b64chars.length; i++) {
  b64tab[b64chars.charCodeAt(i)] = i;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bufferLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(bufferLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = b64tab[clean.charCodeAt(i)];
    const enc2 = b64tab[clean.charCodeAt(i + 1)];
    const enc3 = b64tab[clean.charCodeAt(i + 2)];
    const enc4 = b64tab[clean.charCodeAt(i + 3)];

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (i + 2 < len) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (i + 3 < len) bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }

  return bytes.subarray(0, p);
}

/**
 * Mengunggah berkas gambar lokal ke Supabase Storage (Bucket 'documents')
 * Menghasilkan URL publik https://... yang dapat diakses langsung oleh Web Admin
 * 
 * @param localUri Path lokal pada perangkat (file://...)
 * @param folder Kategori folder ('citizens' | 'letters' | 'complaints')
 * @param base64String Data base64 opsional dari ImagePicker untuk fallback instan
 * @returns URL Publik Cloud Supabase (atau fallback Data URI)
 */
let bucketNotFoundNotified = false;

export async function uploadImageToSupabase(
  localUri: string,
  folder: 'citizens' | 'letters' | 'complaints' = 'citizens',
  base64String?: string | null
): Promise<string> {
  if (!localUri) return '';

  // Jika sudah merupakan URL publik internet atau data URI, tidak perlu di-upload ulang
  if (localUri.startsWith('http://') || localUri.startsWith('https://') || localUri.startsWith('data:')) {
    return localUri;
  }

  const cleanExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt) ? cleanExt : 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  try {
    let fileBuffer: ArrayBuffer | Uint8Array;

    if (base64String) {
      fileBuffer = base64ToUint8Array(base64String);
    } else {
      const response = await fetch(localUri);
      fileBuffer = await response.arrayBuffer();
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('not found')) {
        if (!bucketNotFoundNotified) {
          bucketNotFoundNotified = true;
          console.warn(
            '[Dekati Storage] PEMBERITAHUAN: Bucket "documents" belum dibuat di Supabase Storage.\n' +
            'Sistem otomatis beralih ke mode Fallback Base64 Data URI agar gambar tetap tersimpan dan tampil di Web Admin.\n' +
            'Untuk mengaktifkan penyimpanan file permanen, buat bucket publik bernama "documents" di Supabase Dashboard.'
          );
        }
      } else {
        console.warn('[Dekati Storage] Bucket notice:', msg);
      }
    }
  } catch (err) {
    console.warn('[Dekati Storage] Upload exception:', err);
  }

  // Fallback: Jika ada data base64, jadikan Data URI agar Web Admin tetap dapat menampilkan gambar
  if (base64String) {
    return `data:${contentType};base64,${base64String}`;
  }

  return localUri;
}
