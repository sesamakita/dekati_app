// components/home/AnnouncementModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export interface AnnouncementItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  category?: string;
  date: string;
  author: string;
  is_urgent?: boolean;
}

export interface AnnouncementModalProps {
  visible: boolean;
  announcement?: AnnouncementItem | null;
  isRead?: boolean;
  onMarkAsRead?: (id: string) => void;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  visible,
  announcement,
  isRead = false,
  onMarkAsRead,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClose = () => {
    setIsExpanded(false);
    onClose();
  };

  const handleRead = () => {
    if (announcement && onMarkAsRead) {
      onMarkAsRead(announcement.id);
    }
    setIsExpanded(true);
  };

  if (!announcement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.urgentModalContent,
            isExpanded && styles.urgentModalContentExpanded,
          ]}
        >
          {/* Header Modal (Badge & Tombol (x) Close) */}
          <View style={styles.urgentModalHeader}>
            <View
              style={[
                styles.urgentModalBadge,
                !announcement.is_urgent && {
                  backgroundColor: Colors.bento.hero.badge,
                  borderColor: Colors.bento.hero.border,
                },
              ]}
            >
              <Ionicons
                name={announcement.is_urgent ? 'warning' : 'newspaper-outline'}
                size={14}
                color={announcement.is_urgent ? Colors.urgent : Colors.primary}
              />
              <Text
                style={[
                  styles.urgentModalBadgeText,
                  !announcement.is_urgent && { color: Colors.primary },
                ]}
              >
                {announcement.is_urgent ? 'PENGUMUMAN PENTING' : 'KABAR DESA'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.urgentModalCloseBtn}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!isExpanded ? (
            // POPUP AWAL
            <View>
              <View style={styles.urgentMetaRow}>
                <View
                  style={[
                    styles.urgentCategoryPill,
                    !announcement.is_urgent && {
                      backgroundColor: Colors.bento.hero.badge,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.urgentCategoryPillText,
                      !announcement.is_urgent && { color: Colors.primary },
                    ]}
                  >
                    {announcement.category || 'Penting'}
                  </Text>
                </View>
                <Text style={styles.urgentMetaText}>
                  {announcement.date} • {announcement.author}
                </Text>
                <View style={isRead ? styles.readStatusBadge : styles.unreadStatusBadge}>
                  <Ionicons
                    name={isRead ? 'checkmark-done' : 'mail-unread'}
                    size={11}
                    color={isRead ? '#16A34A' : Colors.urgent}
                  />
                  <Text style={isRead ? styles.readStatusText : styles.unreadStatusText}>
                    {isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}
                  </Text>
                </View>
              </View>

              <Text style={styles.urgentModalTitle}>{announcement.title}</Text>

              <View style={styles.urgentBodyBox}>
                <Text style={styles.urgentModalDesc} numberOfLines={3}>
                  {announcement.summary}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.urgentReadButton,
                  !announcement.is_urgent && {
                    backgroundColor: Colors.primary,
                    shadowColor: Colors.primary,
                  },
                ]}
                activeOpacity={0.88}
                onPress={handleRead}
              >
                <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                <Text style={styles.urgentReadButtonText}>Baca Selengkapnya</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // BACA LENGKAP
            <ScrollView
              style={styles.urgentExpandedScroll}
              contentContainerStyle={styles.urgentExpandedScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.urgentMetaRow}>
                <View
                  style={[
                    styles.urgentCategoryPill,
                    !announcement.is_urgent && {
                      backgroundColor: Colors.bento.hero.badge,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.urgentCategoryPillText,
                      !announcement.is_urgent && { color: Colors.primary },
                    ]}
                  >
                    {announcement.category || 'Informasi'}
                  </Text>
                </View>
                <Text style={styles.urgentMetaText}>
                  {announcement.date} • {announcement.author}
                </Text>
                <View style={isRead ? styles.readStatusBadge : styles.unreadStatusBadge}>
                  <Ionicons
                    name={isRead ? 'checkmark-done' : 'mail-unread'}
                    size={11}
                    color={isRead ? '#16A34A' : Colors.urgent}
                  />
                  <Text style={isRead ? styles.readStatusText : styles.unreadStatusText}>
                    {isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}
                  </Text>
                </View>
              </View>

              <Text style={styles.urgentModalTitleExpanded}>{announcement.title}</Text>

              <View style={styles.urgentFullContentBox}>
                <Text style={styles.urgentFullContentText}>
                  {announcement.content || announcement.summary}
                </Text>
              </View>

              <View style={styles.urgentNoticeBox}>
                <Ionicons name="information-circle" size={16} color="#B45309" />
                <Text style={styles.urgentNoticeText}>
                  Informasi resmi dari pemerintah desa. Harap perhatikan waktu & ketentuan yang berlaku.
                </Text>
              </View>
            </ScrollView>
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
  urgentModalContent: {
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
  urgentModalContentExpanded: {
    maxHeight: '88%',
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  urgentModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.radiusFull,
  },
  urgentModalBadgeText: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.urgent,
    letterSpacing: 0.3,
  },
  urgentModalCloseBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  urgentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  urgentCategoryPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentCategoryPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.urgent,
  },
  urgentMetaText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  readStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  readStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#16A34A',
  },
  unreadStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  unreadStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.urgent,
  },
  urgentModalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 10,
  },
  urgentModalTitleExpanded: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 12,
  },
  urgentBodyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  urgentModalDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  urgentReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.urgent,
    paddingVertical: 12,
    borderRadius: Spacing.radiusMd,
    shadowColor: Colors.urgent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  urgentReadButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  urgentExpandedScroll: {
    maxHeight: 460,
  },
  urgentExpandedScrollContent: {
    paddingBottom: 16,
  },
  urgentFullContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  urgentFullContentText: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  urgentNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
  },
  urgentNoticeText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#B45309',
    flex: 1,
    lineHeight: 16,
  },
});

export default AnnouncementModal;
