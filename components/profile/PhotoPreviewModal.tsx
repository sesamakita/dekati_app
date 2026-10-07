// components/profile/PhotoPreviewModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export interface PhotoPreviewItem {
  label: string;
  uri: string;
}

export interface PhotoPreviewModalProps {
  visible: boolean;
  photos?: PhotoPreviewItem[];
  singleUri?: string | null;
  onClose: () => void;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  visible,
  photos = [],
  singleUri,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleClose = () => {
    setActiveIndex(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.previewOverlay}>
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewTopBar}>
            <View>
              <Text style={styles.previewTitle}>Bukti Dokumen Fisik</Text>
              <Text style={styles.previewSub}>
                {photos.length > 0
                  ? `Berkas ${activeIndex + 1} dari ${photos.length}: ${photos[activeIndex]?.label}`
                  : 'Lampiran verifikasi data kependudukan'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={handleClose}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* TABS SELECTOR JIKA BERKAS LEBIH DARI 1 */}
          {photos.length > 1 && (
            <View style={styles.previewTabsRow}>
              {photos.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.previewTabItem,
                    activeIndex === idx && styles.previewTabItemActive,
                  ]}
                  onPress={() => setActiveIndex(idx)}
                >
                  <Text
                    style={[
                      styles.previewTabText,
                      activeIndex === idx && styles.previewTabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.previewImageWrapper}>
            {photos.length > 0 ? (
              <Image
                source={{ uri: photos[activeIndex]?.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : singleUri ? (
              <Image
                source={{ uri: singleUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={styles.previewBottomBar}>
            <TouchableOpacity
              style={styles.previewDoneBtn}
              onPress={handleClose}
            >
              <Text style={styles.previewDoneBtnText}>Tutup Tampilan</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  previewContainer: {
    flex: 1,
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  previewSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  previewCloseBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  previewTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTabItemActive: {
    backgroundColor: Colors.primary,
  },
  previewTabText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewTabTextActive: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  previewImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    alignItems: 'center',
  },
  previewDoneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Spacing.radiusFull,
  },
  previewDoneBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default PhotoPreviewModal;
