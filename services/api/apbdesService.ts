// services/api/apbdesService.ts
import { supabase } from '../supabase';
import { mockApbdes } from '@/store/mockData';

class ApbdesService {
  async getApbdes() {
    try {
      const { data, error } = await supabase
        .from('apbdes_items')
        .select('*')
        .order('account_code', { ascending: true });

      if (!error && data && data.length > 0) {
        const pendapatanItems = data.filter((i: any) => i.type === 'pendapatan').map((i: any) => ({
          name: i.name,
          amount: Number(i.budget_amount),
          realized: Number(i.realized_amount || 0),
          percentage: Number(i.percentage)
        }));
        const belanjaItems = data.filter((i: any) => i.type === 'belanja').map((i: any) => ({
          name: i.name,
          amount: Number(i.budget_amount),
          realized: Number(i.realized_amount || 0),
          percentage: Number(i.percentage)
        }));

        const totalPendapatan = pendapatanItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const totalBelanja = belanjaItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const totalBelanjaRealisasi = belanjaItems.reduce((acc: number, curr: any) => acc + curr.realized, 0);

        const realisasiPersen = totalBelanja > 0
          ? Number(((totalBelanjaRealisasi / totalBelanja) * 100).toFixed(1))
          : 74.5;

        return {
          fiscal_year: 2026,
          pendapatan: {
            total: totalPendapatan,
            items: pendapatanItems
          },
          belanja: {
            total: totalBelanja,
            total_realisasi: totalBelanjaRealisasi,
            items: belanjaItems
          },
          realisasi_persen: realisasiPersen
        };
      }
    } catch (err) {
      console.warn('[Dekati Mobile] Supabase getApbdes offline fallback.', err);
    }
    return mockApbdes;
  }
}

export const apbdesService = new ApbdesService();
