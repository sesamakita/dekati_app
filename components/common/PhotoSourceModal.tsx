// components/common/PhotoSourceModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

export interface PhotoSourceModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

export const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({
  visible,
  onClose,
  title = 'Lampirkan Foto / Berkas',
  description = 'Pilih metode pengambilan berkas dari perangkat Anda',
  onSelectCamera,
  onSelectGallery,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="document-attach-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsWrap}>
            {/* Camera Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.75}
              onPress={() => {
                onClose();
                onSelectCamera();
              }}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                <Ionicons name="camera-outline" size={24} color="#16A34A" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Buka Kamera Langsung</Text>
                <Text style={styles.optionSubtitle}>Ambil foto fisik dokumen atau bukti baru menggunakan kamera HP</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.75}
              onPress={() => {
                onClose();
                onSelectGallery();
              }}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                <Ionicons name="images-outline" size={24} color="#0284C7" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Pilih dari Galeri Foto</Text>
                <Text style={styles.optionSubtitle}>Gunakan foto yang telah tersimpan di album perangkat Anda</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  description: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSubtle,
    marginTop: 2,
  },
  optionsWrap: {
    gap: 10,
    marginBottom: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  optionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#475569',
  },
});
