// components/common/CustomAlertModal.tsx
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

export type AlertType = 'success' | 'warning' | 'danger' | 'info';

export interface CustomAlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'Mengerti',
  cancelText = 'Batal',
  onConfirm,
  showCancel = false,
}) => {
  if (!visible) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const getThemeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          iconName: 'trash-outline' as const,
          iconColor: '#DC2626',
          iconBg: '#FEE2E2',
          iconBorder: '#FCA5A5',
          confirmBg: '#DC2626',
          confirmText: '#FFFFFF',
        };
      case 'warning':
        return {
          iconName: 'alert-circle-outline' as const,
          iconColor: '#D97706',
          iconBg: '#FEF3C7',
          iconBorder: '#FDE047',
          confirmBg: '#D97706',
          confirmText: '#FFFFFF',
        };
      case 'success':
        return {
          iconName: 'checkmark-circle-outline' as const,
          iconColor: '#16A34A',
          iconBg: '#DCFCE7',
          iconBorder: '#86EFAC',
          confirmBg: '#16A34A',
          confirmText: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          iconName: 'information-circle-outline' as const,
          iconColor: '#0284C7',
          iconBg: '#E0F2FE',
          iconBorder: '#BAE6FD',
          confirmBg: '#0284C7',
          confirmText: '#FFFFFF',
        };
    }
  };

  const theme = getThemeConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Accent Icon Circle */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: theme.iconBg,
                borderColor: theme.iconBorder,
              },
            ]}
          >
            <Ionicons name={theme.iconName} size={30} color={theme.iconColor} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: theme.confirmBg },
                showCancel ? styles.flex1 : styles.fullWidth,
              ]}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmText, { color: theme.confirmText }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
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
  confirmButton: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  flex1: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  confirmText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
