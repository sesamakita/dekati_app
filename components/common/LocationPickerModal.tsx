// components/common/LocationPickerModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

const RNWebView: any = WebView;

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (data: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
  initialLatitude = -6.2088,
  initialLongitude = 106.8456,
  initialAddress = '',
}) => {
  const [currentLat, setCurrentLat] = useState(initialLatitude);
  const [currentLng, setCurrentLng] = useState(initialLongitude);
  const [address, setAddress] = useState(initialAddress || 'Memuat titik lokasi...');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [loadingGps, setLoadingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const webViewRef = useRef<any>(null);
  const geocodeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLatitude);
      setCurrentLng(initialLongitude);
      if (initialAddress) {
        setAddress(initialAddress);
      } else {
        performReverseGeocode(initialLatitude, initialLongitude);
      }
    }
  }, [visible, initialLatitude, initialLongitude]);

  const performReverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const item = results[0];
        const parts: string[] = [];
        if (item.street) parts.push(item.street);
        if (item.subregion) parts.push(item.subregion);
        if (item.district) parts.push(`Kec. ${item.district}`);
        if (item.city) parts.push(item.city);

        const fullAddr = parts.join(', ') || `Titik Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        setAddress(fullAddr);
      } else {
        setAddress(`Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddress(`Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapMoved = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);

    // Debounce reverse geocoding agar tidak spam request
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = setTimeout(() => {
      performReverseGeocode(lat, lng);
    }, 600);
  };

  const handleLocateMe = async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin GPS Dibutuhkan',
          'Mohon izinkan akses lokasi perangkat untuk mendeteksi koordinat GPS secara otomatis.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;
      setCurrentLat(latitude);
      setCurrentLng(longitude);

      // Arahkan kamera map
      webViewRef.current?.injectJavaScript(`
        if (typeof setCenter === 'function') {
          setCenter(${latitude}, ${longitude}, 17);
        }
        true;
      `);

      performReverseGeocode(latitude, longitude);
    } catch (err) {
      Alert.alert('Gagal Mendeteksi GPS', 'Pastikan GPS perangkat Anda telah aktif.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleToggleMapType = () => {
    const nextType = mapType === 'street' ? 'satellite' : 'street';
    setMapType(nextType);
    webViewRef.current?.injectJavaScript(`
      if (typeof setMapType === 'function') {
        setMapType('${nextType}');
      }
      true;
    `);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    webViewRef.current?.injectJavaScript(`
      if (typeof ${direction === 'in' ? 'zoomIn' : 'zoomOut'} === 'function') {
        ${direction === 'in' ? 'zoomIn' : 'zoomOut'}();
      }
      true;
    `);
  };

  const handleSave = () => {
    onSelectLocation({
      latitude: currentLat,
      longitude: currentLng,
      address: address.trim(),
    });
    onClose();
  };

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #e2e8f0; }
    .center-pin-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.15s ease-out;
    }
    .pin-shadow {
      width: 14px;
      height: 6px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      margin-top: -3px;
    }
    .leaflet-control-zoom { display: none !important; }
    .leaflet-control-attribution { font-size: 8px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin-container" id="centerPin">
    <svg width="42" height="52" viewBox="0 0 24 32">
      <path fill="#EF4444" stroke="#991B1B" stroke-width="1.2" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12zm0 17a5 5 0 110-10 5 5 0 010 10z"/>
      <circle cx="12" cy="12" r="3.5" fill="#FFFFFF"/>
    </svg>
    <div class="pin-shadow"></div>
  </div>
  <script>
    var currentLat = ${initialLatitude};
    var currentLng = ${initialLongitude};
    var currentZoom = 16;
    
    var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    var satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© Esri Satellite'
    });

    var map = L.map('map', {
      center: [currentLat, currentLng],
      zoom: currentZoom,
      layers: [${mapType === 'satellite' ? 'satLayer' : 'streetLayer'}],
      zoomControl: false
    });

    var pin = document.getElementById('centerPin');

    map.on('movestart', function() {
      if (pin) pin.style.transform = 'translate(-50%, -120%) scale(1.08)';
    });

    map.on('moveend', function() {
      if (pin) pin.style.transform = 'translate(-50%, -100%) scale(1.0)';
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'map_moved',
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      }));
    });

    map.on('click', function(e) {
      map.panTo(e.latlng);
    });

    function setMapType(type) {
      if (type === 'satellite') {
        if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
        if (!map.hasLayer(satLayer)) map.addLayer(satLayer);
      } else {
        if (map.hasLayer(satLayer)) map.removeLayer(satLayer);
        if (!map.hasLayer(streetLayer)) map.addLayer(streetLayer);
      }
    }

    function zoomIn() { map.zoomIn(); }
    function zoomOut() { map.zoomOut(); }
    function setCenter(lat, lng, zoom) {
      map.setView([lat, lng], zoom || map.getZoom());
    }
  </script>
</body>
</html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* HEADER BAR */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Tentukan Titik Kejadian</Text>
            <Text style={styles.headerSub}>Geser peta hingga pin merah tepat di lokasi aduan</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* MAP CONTAINER */}
        <View style={styles.mapWrap}>
          <RNWebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.mapLoadingText}>Memuat Peta Desa...</Text>
              </View>
            )}
            onMessage={(event: any) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'map_moved') {
                  handleMapMoved(data.lat, data.lng);
                }
              } catch (e) {
                // ignore
              }
            }}
          />

          {/* FLOATING CONTROLS */}
          {/* 1. Toggle Satelit / Peta */}
          <TouchableOpacity
            style={styles.floatingLayerBtn}
            activeOpacity={0.85}
            onPress={handleToggleMapType}
          >
            <Ionicons
              name={mapType === 'satellite' ? 'map' : 'earth'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.floatingLayerText}>
              {mapType === 'satellite' ? 'Mode Jalan' : 'Mode Satelit'}
            </Text>
          </TouchableOpacity>

          {/* 2. Floating Zoom Controls */}
          <View style={styles.floatingZoomGroup}>
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.8}
              onPress={() => handleZoom('in')}
            >
              <Ionicons name="add" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.8}
              onPress={() => handleZoom('out')}
            >
              <Ionicons name="remove" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* 3. Floating Current Location GPS */}
          <TouchableOpacity
            style={styles.floatingGpsBtn}
            activeOpacity={0.85}
            onPress={handleLocateMe}
            disabled={loadingGps}
          >
            {loadingGps ? (
              <ActivityIndicator size="small" color={Colors.urgent} />
            ) : (
              <Ionicons name="locate" size={22} color={Colors.urgent} />
            )}
          </TouchableOpacity>
        </View>

        {/* BOTTOM ACTION SHEET */}
        <View style={styles.bottomSheet}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.markerCircle}>
                <Ionicons name="location" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.infoLabel}>Titik Terpilih</Text>
                  {geocoding && <ActivityIndicator size="small" color={Colors.secondary} />}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                  {address}
                </Text>
                <Text style={styles.coordText}>
                  GPS: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.88} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Simpan & Gunakan Titik Ini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    ...Platform.select({
      ios: { paddingTop: 48 },
      android: { paddingTop: 16 },
    }),
  },
  backBtn: {
    padding: 6,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  floatingLayerBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radiusFull,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingLayerText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  floatingZoomGroup: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  zoomBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  floatingGpsBtn: {
    position: 'absolute',
    right: 14,
    bottom: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.urgent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 18,
  },
  coordText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#0284C7',
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Spacing.radiusFull,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: Spacing.radiusFull,
    backgroundColor: Colors.urgent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.urgent,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
