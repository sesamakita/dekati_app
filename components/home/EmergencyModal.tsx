// components/home/EmergencyModal.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Config } from '@/constants/Config';
import {
  mockEmergencyContacts,
  mockNeighborhoodUnits,
  EmergencyContact as BaseEmergencyContact,
  NeighborhoodUnit
} from '@/store/mockData';

export interface EmergencyContact {
  id?: string;
  title: string;
  phone: string;
  icon?: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  villageName?: string;
  contacts?: EmergencyContact[];
  userRt?: string;
  userRw?: string;
  userDusun?: string;
  neighborhoodUnits?: NeighborhoodUnit[];
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  visible,
  onClose,
  villageName,
  contacts = [],
  userRt,
  userRw,
  userDusun,
  neighborhoodUnits = [],
}) => {
  const [activeTab, setActiveTab] = useState<'layanan' | 'rt'>('layanan');
  const [rtSearchQuery, setRtSearchQuery] = useState('');

  // Gunakan data dari server jika ada, jika tidak fallback ke kontak siaga bawaan
  const activeContacts: EmergencyContact[] =
    contacts && contacts.length > 0
      ? contacts
      : (mockEmergencyContacts as EmergencyContact[]);

  const allUnits: NeighborhoodUnit[] =
    neighborhoodUnits && neighborhoodUnits.length > 0
      ? neighborhoodUnits
      : mockNeighborhoodUnits;

  // Mencari Ketua RT dari warga yang login
  const matchedUserRt = useMemo(() => {
    if (!userRt) return null;
    const cleanUserRt = userRt.replace(/^0+/, '');
    const cleanUserRw = userRw ? userRw.replace(/^0+/, '') : '';

    return (
      allUnits.find((u) => {
        const uRt = u.rt_number.replace(/^0+/, '');
        const uRw = u.rw_number ? u.rw_number.replace(/^0+/, '') : '';
        if (cleanUserRw && uRw) {
          return uRt === cleanUserRt && uRw === cleanUserRw;
        }
        return uRt === cleanUserRt;
      }) || null
    );
  }, [allUnits, userRt, userRw]);

  // Filter daftar RT berdasarkan input pencarian
  const filteredNeighborhoodUnits = useMemo(() => {
    if (!rtSearchQuery.trim()) return allUnits;
    const q = rtSearchQuery.toLowerCase().trim();
    return allUnits.filter(
      (u) =>
        u.rt_number.toLowerCase().includes(q) ||
        (u.rw_number && u.rw_number.toLowerCase().includes(q)) ||
        (u.dusun && u.dusun.toLowerCase().includes(q)) ||
        (u.rt_leader_name && u.rt_leader_name.toLowerCase().includes(q)) ||
        (u.rw_leader_name && u.rw_leader_name.toLowerCase().includes(q))
    );
  }, [allUnits, rtSearchQuery]);

  const handleCall = async (phone: string, title: string) => {
    if (!phone) {
      Alert.alert('Nomor Tidak Tersedia', `Nomor kontak ${title} belum terdaftar.`);
      return;
    }
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const url = `tel:${cleanDigits}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Panggilan Darurat',
          `Silakan hubungi nomor ${title} secara langsung:\n\n${phone}`,
          [{ text: 'Mengerti' }]
        );
      }
    } catch {
      Alert.alert(
        'Panggilan Darurat',
        `Nomor telepon ${title}:\n\n${phone}`,
        [{ text: 'Tutup' }]
      );
    }
  };

  const handleWhatsApp = async (phone: string, title: string) => {
    if (!phone) {
      Alert.alert('Nomor Tidak Tersedia', `Nomor kontak ${title} belum terdaftar.`);
      return;
    }
    let cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.startsWith('0')) {
      cleanDigits = '62' + cleanDigits.slice(1);
    } else if (!cleanDigits.startsWith('62')) {
      cleanDigits = '62' + cleanDigits;
    }

    const message = encodeURIComponent(
      `Halo ${title}, saya warga ${villageName || 'desa'} memerlukan bantuan siaga darurat.`
    );
    const waUrl = `https://wa.me/${cleanDigits}?text=${message}`;

    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        Alert.alert(
          'WhatsApp Tidak Tersedia',
          `Nomor WhatsApp ${title}: ${phone}`,
          [{ text: 'Tutup' }]
        );
      }
    } catch {
      Alert.alert(
        'Pesan Siaga',
        `Silakan simpan nomor ${title}: ${phone}`,
        [{ text: 'Tutup' }]
      );
    }
  };

  const handleRtWhatsApp = async (unit: NeighborhoodUnit) => {
    const phone = unit.rt_leader_phone;
    if (!phone) {
      Alert.alert('Kontak Belum Tersedia', `Nomor telepon Ketua RT ${unit.rt_number} belum tercatat.`);
      return;
    }
    let cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.startsWith('0')) {
      cleanDigits = '62' + cleanDigits.slice(1);
    } else if (!cleanDigits.startsWith('62')) {
      cleanDigits = '62' + cleanDigits;
    }
    const message = encodeURIComponent(
      `Halo Bapak ${unit.rt_leader_name} (Ketua RT ${unit.rt_number}/RW ${unit.rw_number || '01'} ${unit.dusun}), saya warga lingkungan Anda memerlukan bantuan darurat / informasi penting.`
    );
    const waUrl = `https://wa.me/${cleanDigits}?text=${message}`;
    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        Alert.alert('WhatsApp Tidak Tersedia', `Nomor Ketua RT ${unit.rt_number}: ${phone}`);
      }
    } catch {
      Alert.alert('Kontak RT', `Nomor Ketua RT ${unit.rt_number}: ${phone}`);
    }
  };

  const isMobileNumber = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.startsWith('08') || clean.startsWith('628');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="alert-circle" size={20} color={Colors.urgent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Kontak Siaga &amp; Darurat</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {villageName || Config.villageName || 'Pemerintah Desa'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle-outline" size={26} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Controls */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'layanan' && styles.tabButtonActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('layanan')}
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={activeTab === 'layanan' ? Colors.urgent : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'layanan' && styles.tabTextActive,
                ]}
              >
                Layanan Siaga Desa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'rt' && styles.tabButtonActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('rt')}
            >
              <Ionicons
                name="people"
                size={14}
                color={activeTab === 'rt' ? '#059669' : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'rt' && styles.tabTextActiveRt,
                ]}
              >
                Ketua RT &amp; RW ({allUnits.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* HIGHLIGHT: KETUA RT WARGA (SELALU MUNCUL DI ATAS JIKA ADA DATA RT WARGA) */}
          {matchedUserRt && (
            <View style={styles.myRtCard}>
              <View style={styles.myRtBadgeRow}>
                <View style={styles.myRtBadge}>
                  <Ionicons name="home" size={11} color="#047857" />
                  <Text style={styles.myRtBadgeText}>
                    Ketua RT Anda: RT {matchedUserRt.rt_number} / RW {matchedUserRt.rw_number || '01'}
                  </Text>
                </View>
                <Text style={styles.myRtDusunText} numberOfLines={1}>
                  {matchedUserRt.dusun}
                </Text>
              </View>

              <View style={styles.myRtBody}>
                <View style={styles.myRtAvatar}>
                  <Ionicons name="person" size={16} color="#065F46" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.myRtName}>{matchedUserRt.rt_leader_name}</Text>
                  <Text style={styles.myRtPhone}>{matchedUserRt.rt_leader_phone || 'Nomor belum tercatat'}</Text>
                </View>

                <View style={styles.actionButtonsCol}>
                  {matchedUserRt.rt_leader_phone ? (
                    <>
                      <TouchableOpacity
                        style={styles.waPill}
                        activeOpacity={0.75}
                        onPress={() => handleRtWhatsApp(matchedUserRt)}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                        <Text style={styles.waPillText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.callPill}
                        activeOpacity={0.75}
                        onPress={() => handleCall(matchedUserRt.rt_leader_phone, `Ketua RT ${matchedUserRt.rt_number}`)}
                      >
                        <Ionicons name="call" size={12} color="#FFFFFF" />
                        <Text style={styles.callPillText}>Panggil</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* TAB 1: LAYANAN SIAGA 24 JAM */}
          {activeTab === 'layanan' && (
            <>
              <Text style={styles.modalInstruction}>
                Panggil petugas medis, ambulans, keamanan kepolisian/TNI, atau balai desa:
              </Text>

              <ScrollView
                style={styles.contactsScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 6 }}
              >
                {activeContacts.map((contact, i) => {
                  const hasWa = isMobileNumber(contact.phone);
                  const iconName = (contact.icon as any) || 'call';

                  return (
                    <View key={contact.id || i} style={styles.contactItem}>
                      <View style={styles.contactIconCircle}>
                        <Ionicons name={iconName} size={16} color={Colors.urgent} />
                      </View>

                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.title}
                        </Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                        {contact.description ? (
                          <Text style={styles.contactDesc} numberOfLines={2}>
                            {contact.description}
                          </Text>
                        ) : null}
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtonsCol}>
                        {hasWa && (
                          <TouchableOpacity
                            style={styles.waPill}
                            activeOpacity={0.75}
                            onPress={() => handleWhatsApp(contact.phone, contact.title)}
                          >
                            <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                            <Text style={styles.waPillText}>WA</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.callPill}
                          activeOpacity={0.75}
                          onPress={() => handleCall(contact.phone, contact.title)}
                        >
                          <Ionicons name="call" size={12} color="#FFFFFF" />
                          <Text style={styles.callPillText}>Panggil</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* TAB 2: DIREKTORI KETUA RT & RW WILAYAH */}
          {activeTab === 'rt' && (
            <>
              {/* Search Box */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={15} color={Colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="Cari RT, RW, Dusun, atau Nama Ketua RT..."
                  placeholderTextColor={Colors.textMuted}
                  value={rtSearchQuery}
                  onChangeText={setRtSearchQuery}
                  style={styles.searchInput}
                  clearButtonMode="while-editing"
                />
                {rtSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setRtSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={styles.contactsScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 6 }}
              >
                {filteredNeighborhoodUnits.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Tidak ditemukan Ketua RT dengan kata kunci tersebut.</Text>
                  </View>
                ) : (
                  filteredNeighborhoodUnits.map((unit) => {
                    const isMyRt = matchedUserRt?.id === unit.id;

                    return (
                      <View
                        key={unit.id}
                        style={[
                          styles.contactItem,
                          isMyRt && styles.contactItemHighlighted,
                        ]}
                      >
                        <View style={[styles.contactIconCircle, isMyRt && styles.contactIconCircleRt]}>
                          <Ionicons
                            name={isMyRt ? 'home' : 'person'}
                            size={16}
                            color={isMyRt ? '#059669' : '#047857'}
                          />
                        </View>

                        <View style={styles.contactInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.contactName} numberOfLines={1}>
                              RT {unit.rt_number} / RW {unit.rw_number || '01'}
                            </Text>
                            {isMyRt && (
                              <View style={styles.tinyMyBadge}>
                                <Text style={styles.tinyMyBadgeText}>RT Anda</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.rtLeaderNameText} numberOfLines={1}>
                            {unit.rt_leader_name || 'Ketua RT'}
                          </Text>
                          <Text style={styles.contactPhone}>
                            {unit.rt_leader_phone || 'Nomor belum tercatat'}
                          </Text>
                          <Text style={styles.contactDesc} numberOfLines={1}>
                            {unit.dusun}
                            {unit.rw_leader_name ? ` • RW: ${unit.rw_leader_name}` : ''}
                          </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtonsCol}>
                          {unit.rt_leader_phone ? (
                            <>
                              <TouchableOpacity
                                style={styles.waPill}
                                activeOpacity={0.75}
                                onPress={() => handleRtWhatsApp(unit)}
                              >
                                <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                                <Text style={styles.waPillText}>WA</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.callPill}
                                activeOpacity={0.75}
                                onPress={() =>
                                  handleCall(
                                    unit.rt_leader_phone,
                                    `Ketua RT ${unit.rt_number} (${unit.rt_leader_name})`
                                  )
                                }
                              >
                                <Ionicons name="call" size={12} color="#FFFFFF" />
                                <Text style={styles.callPillText}>Panggil</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Text style={styles.noPhoneText}>Belum Ada No.</Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup Layanan Siaga</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: 18,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Spacing.radiusMd,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: Spacing.radiusSm,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.urgent,
  },
  tabTextActiveRt: {
    fontFamily: Fonts.bold,
    color: '#059669',
  },
  // Highlighted My RT Card
  myRtCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: Spacing.radiusMd,
    padding: 10,
    marginBottom: 10,
  },
  myRtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  myRtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  myRtBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: '#047857',
  },
  myRtDusunText: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: '#065F46',
  },
  myRtBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myRtAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRtName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#064E3B',
  },
  myRtPhone: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    color: '#059669',
    marginTop: 1,
  },
  modalInstruction: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  // Search box in RT tab
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contactsScroll: {
    maxHeight: 330,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 10,
  },
  contactItemHighlighted: {
    borderColor: '#6EE7B7',
    backgroundColor: '#F0FDF4',
  },
  contactIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconCircleRt: {
    backgroundColor: '#D1FAE5',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  tinyMyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tinyMyBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: '#047857',
  },
  rtLeaderNameText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 1,
  },
  contactPhone: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.urgent,
    marginTop: 1,
  },
  contactDesc: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  noPhoneText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 5,
    alignItems: 'flex-end',
  },
  waPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
  },
  waPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: Spacing.radiusFull,
  },
  callPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalCloseText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
});

export default EmergencyModal;
