// components/home/EmergencyModal.tsx
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Config } from '@/constants/Config';
import { mockEmergencyContacts, EmergencyContact as BaseEmergencyContact } from '@/store/mockData';

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
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  visible,
  onClose,
  villageName,
  contacts = [],
}) => {
  // Gunakan data dari server jika ada, jika tidak fallback ke kontak siaga bawaan
  const activeContacts: EmergencyContact[] =
    contacts && contacts.length > 0
      ? contacts
      : (mockEmergencyContacts as EmergencyContact[]);

  const handleCall = async (phone: string, title: string) => {
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
                <Text style={styles.modalTitle}>Kontak Siaga 24 Jam</Text>
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

          <Text style={styles.modalInstruction}>
            Pilih kontak di bawah untuk segera terhubung melalui Telepon atau WhatsApp dalam situasi genting:
          </Text>

          {/* List Kontak */}
          <ScrollView
            style={styles.contactsScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
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
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
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
    marginBottom: 12,
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
  modalInstruction: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  contactsScroll: {
    maxHeight: 380,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 10,
  },
  contactIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.urgent,
    marginTop: 1,
  },
  contactDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  waPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.radiusFull,
  },
  waPillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.radiusFull,
  },
  callPillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  modalCloseButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalCloseText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default EmergencyModal;
