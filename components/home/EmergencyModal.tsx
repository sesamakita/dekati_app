// components/home/EmergencyModal.tsx
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Config } from '@/constants/Config';

export interface EmergencyContact {
  id?: string;
  title: string;
  phone: string;
  icon?: string;
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
  const activeContacts =
    contacts.length > 0 ? contacts : (Config.emergencyContacts as EmergencyContact[]) || [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="alert-circle" size={20} color={Colors.urgent} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Kontak Siaga 24 Jam</Text>
                <Text style={styles.modalSubtitle}>{villageName || Config.villageName}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle-outline" size={26} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalInstruction}>
            Klik kontak di bawah untuk segera terhubung dalam situasi genting atau medis:
          </Text>

          {activeContacts.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Ionicons name="call-outline" size={36} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>
                Belum ada nomor kontak darurat terdaftar
              </Text>
            </View>
          ) : (
            activeContacts.map((contact, i) => (
              <TouchableOpacity
                key={contact.id || i}
                style={styles.contactItem}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(`tel:${contact.phone.replace(/[^0-9]/g, '')}`)}
              >
                <View style={styles.contactIconCircle}>
                  <Ionicons name={(contact.icon as any) || 'call'} size={16} color={Colors.urgent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{contact.title}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.callPill}>
                  <Text style={styles.callPillText}>Hubungi</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Tutup</Text>
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
    maxWidth: 400,
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
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
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
    gap: 12,
  },
  contactIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  callPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.radiusFull,
  },
  callPillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  modalCloseButton: {
    marginTop: 12,
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
