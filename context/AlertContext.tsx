// context/AlertContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CustomAlertModal, AlertType } from '@/components/common/CustomAlertModal';
import { PhotoSourceModal } from '@/components/common/PhotoSourceModal';

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  onConfirm?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface PhotoPickerOptions {
  title?: string;
  description?: string;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
  showPhotoPicker: (options: PhotoPickerOptions) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Alert & Confirm State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    showCancel: false,
  });

  // Photo Picker State
  const [photoPickerConfig, setPhotoPickerConfig] = useState<{
    visible: boolean;
    title?: string;
    description?: string;
    onSelectCamera?: () => void;
    onSelectGallery?: () => void;
  }>({
    visible: false,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      confirmText: options.confirmText || 'Mengerti',
      cancelText: 'Batal',
      showCancel: false,
      onConfirm: options.onConfirm,
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setAlertConfig({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Ya, Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      showCancel: true,
      onConfirm: () => {
        if (options.onConfirm) {
          options.onConfirm();
        }
      },
    });
  }, []);

  const showPhotoPicker = useCallback((options: PhotoPickerOptions) => {
    setPhotoPickerConfig({
      visible: true,
      title: options.title,
      description: options.description,
      onSelectCamera: options.onSelectCamera,
      onSelectGallery: options.onSelectGallery,
    });
  }, []);

  const handleCloseAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleClosePhotoPicker = useCallback(() => {
    setPhotoPickerConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showPhotoPicker }}>
      {children}

      {/* Global Bento Alert / Confirm Dialog */}
      <CustomAlertModal
        visible={alertConfig.visible}
        onClose={handleCloseAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
      />

      {/* Global Bento Photo Source Picker Modal */}
      <PhotoSourceModal
        visible={photoPickerConfig.visible}
        onClose={handleClosePhotoPicker}
        title={photoPickerConfig.title}
        description={photoPickerConfig.description}
        onSelectCamera={() => {
          if (photoPickerConfig.onSelectCamera) {
            photoPickerConfig.onSelectCamera();
          }
        }}
        onSelectGallery={() => {
          if (photoPickerConfig.onSelectGallery) {
            photoPickerConfig.onSelectGallery();
          }
        }}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextValue => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
