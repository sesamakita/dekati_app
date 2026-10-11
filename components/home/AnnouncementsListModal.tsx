// components/home/AnnouncementsListModal.tsx
import React from 'react';
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
import { Announcement } from '@/store/mockData';

export interface AnnouncementsListModalProps {
  visible: boolean;
  announcements: Announcement[];
  readAnnouncementIds: Set<string>;
  onSelectAnnouncement: (announcement: Announcement) => void;
  onClose: () => void;
}

export const AnnouncementsListModal: React.FC<AnnouncementsListModalProps> = ({
  visible,
  announcements = [],
  readAnnouncementIds,
  onSelectAnnouncement,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="notifications" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Kabar & Pengumuman Desa</Text>
                <Text style={styles.modalSubtitle}>
                  {announcements.length} Informasi Resmi
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

          {announcements.length === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="newspaper-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Pengumuman</Text>
              <Text style={styles.emptySubtitle}>
                Pemerintah desa belum mempublikasikan pengumuman baru.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.announcementsScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {announcements.map((item) => {
                const isRead = readAnnouncementIds.has(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.announcementCard}
                    activeOpacity={0.75}
                    onPress={() => onSelectAnnouncement(item)}
                  >
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.categoryChip,
                          item.is_urgent && styles.urgentCategoryChip,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            item.is_urgent && styles.urgentCategoryChipText,
                          ]}
                        >
                          {item.is_urgent ? 'PENTING' : item.category || 'Info'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardDate}>{item.date}</Text>
                        <View
                          style={[
                            styles.readStatusBadge,
                            isRead ? styles.readBadge : styles.unreadBadge,
                          ]}
                        >
                          <Ionicons
                            name={isRead ? 'checkmark-done' : 'mail-unread'}
                            size={11}
                            color={isRead ? '#16A34A' : Colors.urgent}
                          />
                          <Text
                            style={[
                              styles.readStatusText,
                              isRead ? styles.readText : styles.unreadText,
                            ]}
                          >
                            {isRead ? 'Dibaca' : 'Baru'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={styles.cardSummary} numberOfLines={2}>
                      {item.summary || item.content}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardAuthor} numberOfLines={1}>
                        Oleh: {item.author}
                      </Text>
                      <View style={styles.readMoreRow}>
                        <Text style={styles.readMoreText}>Baca Rincian</Text>
                        <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
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
  announcementsScroll: {
    maxHeight: 380,
  },
  announcementCard: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.radiusMd,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryChipText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.primary,
  },
  urgentCategoryChip: {
    backgroundColor: '#FEF2F2',
  },
  urgentCategoryChipText: {
    color: Colors.urgent,
  },
  cardDate: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  readStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readBadge: {
    backgroundColor: '#F0FDF4',
  },
  unreadBadge: {
    backgroundColor: '#FEF2F2',
  },
  readStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  readText: {
    color: '#16A34A',
  },
  unreadText: {
    color: Colors.urgent,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  cardSummary: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  cardAuthor: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.primary,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  modalCloseButton: {
    marginTop: 10,
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

export default AnnouncementsListModal;
