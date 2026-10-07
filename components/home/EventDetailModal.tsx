// components/home/EventDetailModal.tsx
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export interface VillageEvent {
  id?: string;
  title: string;
  category?: string;
  event_date: string;
  event_time?: string;
  location: string;
  organizer?: string;
  description?: string;
}

export interface EventDetailModalProps {
  visible: boolean;
  event: VillageEvent | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event,
  onClose,
}) => {
  return (
    <Modal
      visible={visible && !!event}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close button at top right */}
          <TouchableOpacity
            style={styles.eventModalCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.modalHeader, { paddingRight: 36 }]}>
            <View style={[styles.modalTitleRow, { flex: 1 }]}>
              <View
                style={[
                  styles.modalIconBox,
                  { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' },
                ]}
              >
                <Ionicons name="calendar" size={20} color={Colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Agenda Resmi Desa
                </Text>
                <Text style={styles.modalSubtitle}>{event?.category || 'Kegiatan Warga'}</Text>
              </View>
            </View>
          </View>

          {event && (
            <View style={{ marginTop: 6 }}>
              <Text
                style={{
                  fontFamily: Fonts.bold,
                  fontSize: 16,
                  color: Colors.textPrimary,
                  marginBottom: 12,
                }}
              >
                {event.title}
              </Text>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 12.5,
                      color: Colors.textPrimary,
                    }}
                  >
                    {event.event_date} {event.event_time ? `• ${event.event_time}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="location-outline" size={16} color={Colors.urgent} />
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 12.5,
                      color: Colors.textPrimary,
                      flex: 1,
                    }}
                  >
                    {event.location}
                  </Text>
                </View>
                {event.organizer && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="people-outline" size={16} color={Colors.secondary} />
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 12.5,
                        color: Colors.textSecondary,
                      }}
                    >
                      Penyelenggara: {event.organizer}
                    </Text>
                  </View>
                )}
              </View>

              {event.description ? (
                <Text
                  style={{
                    fontFamily: Fonts.regular,
                    fontSize: 13,
                    color: Colors.textSecondary,
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  {event.description}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: Colors.purple, borderColor: Colors.purple },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.modalCloseText, { color: '#FFFFFF' }]}>
                  Tutup Informasi
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  eventModalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
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
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  modalCloseButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
  },
  modalCloseText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
});

export default EventDetailModal;
