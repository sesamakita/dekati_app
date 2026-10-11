// components/home/EventDetailModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { mockVillageEvents } from '@/store/mockData';

export interface VillageEvent {
  id?: string;
  title: string;
  category?: string;
  event_date: string;
  event_time?: string;
  location: string;
  organizer?: string;
  description?: string;
  is_active?: boolean;
}

export interface EventDetailModalProps {
  visible: boolean;
  event?: VillageEvent | null;
  events?: VillageEvent[];
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event: initialEvent,
  events = [],
  onClose,
}) => {
  const [activeEvent, setActiveEvent] = useState<VillageEvent | null>(initialEvent || null);

  // Jika events kosong, gunakan fallback data resmi desa
  const availableEvents: VillageEvent[] =
    events && events.length > 0 ? events : (mockVillageEvents as VillageEvent[]);

  useEffect(() => {
    if (initialEvent) {
      setActiveEvent(initialEvent);
    } else if (availableEvents.length === 1) {
      setActiveEvent(availableEvents[0]);
    } else {
      setActiveEvent(null);
    }
  }, [initialEvent, visible]);

  const handleClose = () => {
    setActiveEvent(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close button at top right */}
          <TouchableOpacity
            style={styles.eventModalCloseBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingRight: 36 }]}>
            <View style={[styles.modalTitleRow, { flex: 1 }]}>
              <View style={styles.modalIconBox}>
                <Ionicons name="calendar" size={20} color={Colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Agenda Resmi Desa
                </Text>
                <Text style={styles.modalSubtitle}>
                  {activeEvent ? activeEvent.category || 'Kegiatan Warga' : `${availableEvents.length} Jadwal Kegiatan`}
                </Text>
              </View>
            </View>
          </View>

          {/* VIEW 1: DETAIL SATU KEGIATAN */}
          {activeEvent ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={{ marginTop: 6 }}>
                {availableEvents.length > 1 && (
                  <TouchableOpacity
                    style={styles.backToListBtn}
                    onPress={() => setActiveEvent(null)}
                  >
                    <Ionicons name="arrow-back" size={14} color={Colors.purple} />
                    <Text style={styles.backToListText}>Lihat Semua Agenda</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.eventTitleText}>{activeEvent.title}</Text>

                <View style={styles.eventInfoBox}>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                    <Text style={styles.eventInfoText}>
                      {activeEvent.event_date} {activeEvent.event_time ? `• ${activeEvent.event_time}` : ''}
                    </Text>
                  </View>

                  <View style={styles.eventInfoRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.urgent} />
                    <Text style={[styles.eventInfoText, { flex: 1 }]}>
                      {activeEvent.location}
                    </Text>
                  </View>

                  {activeEvent.organizer && (
                    <View style={styles.eventInfoRow}>
                      <Ionicons name="people-outline" size={16} color={Colors.secondary} />
                      <Text style={[styles.eventInfoText, { color: Colors.textSecondary }]}>
                        Penyelenggara: {activeEvent.organizer}
                      </Text>
                    </View>
                  )}
                </View>

                {activeEvent.description ? (
                  <View style={styles.descBox}>
                    <Text style={styles.descHeading}>Keterangan & Rincian:</Text>
                    <Text style={styles.descText}>{activeEvent.description}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleClose}
                >
                  <Text style={styles.modalActionText}>Selesai Membaca</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : availableEvents.length > 0 ? (
            /* VIEW 2: LIST SEMUA AGENDA KEGIATAN */
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.listSubtitle}>
                Daftar kegiatan sosial, posyandu, gotong royong, dan musyawarah resmi:
              </Text>

              {availableEvents.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.eventListItem}
                  activeOpacity={0.75}
                  onPress={() => setActiveEvent(item)}
                >
                  <View style={styles.eventItemBadge}>
                    <Text style={styles.eventItemBadgeText}>{item.category || 'Umum'}</Text>
                  </View>

                  <Text style={styles.eventItemTitle}>{item.title}</Text>

                  <View style={styles.eventItemMetaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.eventItemMetaText}>{item.event_date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.eventItemMetaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                  </View>

                  <View style={styles.eventDetailLinkRow}>
                    <Text style={styles.eventDetailLinkText}>Lihat Detail Kegiatan</Text>
                    <Ionicons name="chevron-forward" size={13} color={Colors.purple} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            /* VIEW 3: EMPTY STATE JIKA TIDAK ADA AGENDA SAMA SEKALI */
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="calendar-outline" size={32} color={Colors.purple} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Agenda Terjadwal</Text>
              <Text style={styles.emptySubtitle}>
                Pemerintah desa belum menerbitkan kegiatan baru. Periksa kembali secara berkala.
              </Text>
              <TouchableOpacity
                style={[styles.modalActionButton, { marginTop: 20, width: '100%' }]}
                onPress={handleClose}
              >
                <Text style={styles.modalActionText}>Tutup</Text>
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
    maxHeight: '85%',
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
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
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
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  backToListText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.purple,
  },
  eventTitleText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 22,
  },
  eventInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 14,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  descBox: {
    marginBottom: 16,
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  descHeading: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.purple,
    marginBottom: 4,
  },
  descText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  listSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  eventListItem: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  eventItemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  eventItemBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.purple,
  },
  eventItemTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    lineHeight: 19,
    marginBottom: 8,
  },
  eventItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eventItemMetaText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  eventDetailLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  eventDetailLinkText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.purple,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  modalActionButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.purple,
    borderRadius: Spacing.radiusMd,
  },
  modalActionText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default EventDetailModal;
