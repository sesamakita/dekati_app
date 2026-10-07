// services/api/__tests__/citizenService.test.ts
import { describe, it, expect } from 'vitest';
import { citizenService } from '../citizenService';

describe('CitizenService Validation & Family Management', () => {
  it('should reject family member addition with invalid NIK format', async () => {
    const resShortNik = await citizenService.addFamilyMember({
      nik: '12345',
      nama_lengkap: 'Budi Santoso',
      jenis_kelamin: 'L',
      status_keluarga: 'Anak'
    });
    expect(resShortNik.success).toBe(false);
    expect(resShortNik.message).toContain('16 digit');

    const resAlphabetNik = await citizenService.addFamilyMember({
      nik: '123456789012345A',
      nama_lengkap: 'Budi Santoso',
      jenis_kelamin: 'L',
      status_keluarga: 'Anak'
    });
    expect(resAlphabetNik.success).toBe(false);
  });

  it('should reject family member addition with empty name', async () => {
    const res = await citizenService.addFamilyMember({
      nik: '3201123456780009',
      nama_lengkap: '   ',
      jenis_kelamin: 'L',
      status_keluarga: 'Anak'
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('Nama lengkap');
  });

  it('should successfully add valid family member locally', async () => {
    const res = await citizenService.addFamilyMember({
      nik: '3201123456780099',
      nama_lengkap: 'Siti Rahmawati',
      jenis_kelamin: 'P',
      status_keluarga: 'Istri'
    });
    expect(res.success).toBe(true);
    expect(res.data?.nik).toBe('3201123456780099');
    expect(res.data?.nama_lengkap).toBe('Siti Rahmawati');
  }, 15000);
});
