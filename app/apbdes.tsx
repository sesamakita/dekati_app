// app/apbdes.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { Header } from '@/components/common/Header';

export default function ApbdesScreen() {
  const [apbdes, setApbdes] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pendapatan' | 'belanja'>('belanja');

  useEffect(() => {
    const fetchApbdes = async () => {
      const data = await api.getApbdes();
      setApbdes(data);
    };
    fetchApbdes();
  }, []);

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  if (!apbdes) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title="Transparansi Dana Desa" showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD BENTO APBDES */}
        <View style={styles.heroCard}>
          <View style={styles.heroTagRow}>
            <View style={styles.heroTagBadge}>
              <Ionicons name="pie-chart" size={13} color={Colors.accent} />
              <Text style={styles.heroTagText}>APBDes Tahun {apbdes.fiscal_year}</Text>
            </View>
            <Text style={styles.heroYearBadge}>Transparan & Terbuka</Text>
          </View>

          <Text style={styles.heroTitle}>{Config.villageName}</Text>
          <Text style={styles.heroDesc}>
            Publikasi pertanggungjawaban pengelolaan keuangan desa sesuai amanat UU Desa No. 6 Tahun 2014.
          </Text>

          <View style={styles.realisasiBox}>
            <View style={styles.realisasiHeader}>
              <Text style={styles.realisasiLabel}>Realisasi Fisik & Anggaran</Text>
              <Text style={styles.realisasiPercent}>{apbdes.realisasi_persen}%</Text>
            </View>
            <View style={styles.realisasiBarBg}>
              <View style={[styles.realisasiBarFill, { width: `${apbdes.realisasi_persen}%` }]} />
            </View>
          </View>
        </View>

        {/* TAB TOGGLE PENDAPATAN VS BELANJA */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'belanja' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('belanja')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'belanja' && styles.tabBtnTextActive]}>
              Pengeluaran & Belanja
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pendapatan' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('pendapatan')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'pendapatan' && styles.tabBtnTextActive]}>
              Sumber Pendapatan
            </Text>
          </TouchableOpacity>
        </View>

        {/* TOTAL SNAPSHOT */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Total {activeTab === 'belanja' ? 'Alokasi Belanja Desa' : 'Penerimaan Pendapatan Desa'}
          </Text>
          <Text style={styles.totalAmount}>
            {formatRupiah(activeTab === 'belanja' ? apbdes.belanja.total : apbdes.pendapatan.total)}
          </Text>
        </View>

        {/* LIST BREAKDOWN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian Pos Anggaran:</Text>

          {(activeTab === 'belanja' ? apbdes.belanja.items : apbdes.pendapatan.items).map(
            (item: any, idx: number) => (
              <View key={idx} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPercent}>{item.percentage}%</Text>
                </View>

                <View style={styles.itemBarBg}>
                  <View
                    style={[
                      styles.itemBarFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: activeTab === 'belanja' ? Colors.accent : Colors.primary,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.itemAmount}>{formatRupiah(item.amount)}</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.appBarYellow,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.bento.amber.bg,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
    borderWidth: 1.5,
    borderColor: Colors.bento.amber.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bento.amber.badge,
    borderWidth: 1,
    borderColor: Colors.bento.amber.border,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  heroTagText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.bento.amber.text,
  },
  heroYearBadge: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  realisasiBox: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  realisasiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  realisasiLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  realisasiPercent: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.accent,
  },
  realisasiBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  realisasiBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    padding: 3,
    marginBottom: Spacing.cardGap,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Spacing.radiusSm,
  },
  tabBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.bento.hero.border,
  },
  tabBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  totalCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.cardPadding,
    borderRadius: Spacing.radiusXl,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.cardGap,
  },
  totalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.cardPadding,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    flex: 1,
  },
  itemPercent: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  itemBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  itemBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
