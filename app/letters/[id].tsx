import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { api } from '@/services/api';
import { villageService } from '@/services/api/villageService';
import { supabase } from '@/services/supabase';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LetterRequest, VillageProfile } from '@/store/mockData';
import { useAlert } from '@/context/AlertContext';

export default function LetterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const [request, setRequest] = useState<LetterRequest | null>(null);
  const [villageProfile, setVillageProfile] = useState<VillageProfile | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    villageService.getVillageProfile().then((p) => {
      if (p) setVillageProfile(p);
    });
  }, []);

  const fetchDetail = useCallback(async () => {
    if (id) {
      const data = await api.getLetterRequestByTracking(id);
      setRequest(data);
    }
  }, [id]);

  // Muat ulang data terbaru setiap kali layar Lacak Surat aktif / fokus
  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  useEffect(() => {
    fetchDetail();

    // Berlangganan Supabase Realtime untuk memperbarui alur proses secara instan saat operator desa memproses berkas
    const channel = supabase
      .channel(`detail-letter-realtime-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'letter_requests' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row || row.tracking_number === id || row.id === id) {
            fetchDetail();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  if (!request) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header title="Lacak Surat" showBack />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Memuat data surat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = request.status === 'signed' || request.status === 'completed';

  const verificationUrl =
    request.qr_url ||
    (request.qr_token
      ? `${Config.webPortalUrl}/#/verify/${request.qr_token}`
      : `${Config.webPortalUrl}/#/verify/${request.tracking_number}`);

  const generateLetterHtml = () => {
    const vName = villageProfile?.name || Config.villageName || 'Desa';
    const vDistrict = villageProfile?.district || '';
    const vRegency = villageProfile?.regency || '';
    const vAddress = villageProfile?.office_address || 'Alamat Kantor Pemerintahan Desa';
    const vPhone = villageProfile?.office_phone ? `Telp: ${villageProfile.office_phone}` : '';
    const vEmail = villageProfile?.office_email || 'sekretariat@desa.id';
    const kades = request.signed_by_name || villageProfile?.kades_name || 'Kepala Desa';
    const officialNo = request.official_number || request.tracking_number;
    const todayDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      verificationUrl
    )}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <title>${request.letter_name} - ${request.citizen_name}</title>
  <style>
    @page {
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111827;
      padding: 10px 15px;
      line-height: 1.5;
      background-color: #ffffff;
      margin: 0;
    }
    .kop {
      text-align: center;
      border-bottom: 3px double #111827;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .kop h4 {
      margin: 0;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: Arial, sans-serif;
    }
    .kop h3 {
      margin: 2px 0;
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: Arial, sans-serif;
    }
    .kop h2 {
      margin: 2px 0;
      font-size: 19px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: Arial, sans-serif;
    }
    .kop p {
      margin: 2px 0 0 0;
      font-size: 11px;
      font-family: Arial, sans-serif;
      color: #4b5563;
    }
    .title-box {
      text-align: center;
      margin: 16px 0 20px 0;
    }
    .title-box h3 {
      margin: 0;
      font-size: 16px;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-box p {
      margin: 4px 0 0 0;
      font-size: 12px;
      font-family: Arial, sans-serif;
      font-weight: 600;
      color: #374151;
    }
    .content {
      font-size: 13px;
      font-family: Arial, sans-serif;
      text-align: justify;
      color: #1f2937;
    }
    .content p {
      margin: 8px 0;
      line-height: 1.6;
    }
    .bio-table {
      margin: 12px 0 12px 16px;
      width: 95%;
    }
    .bio-table td {
      padding: 3px 6px;
      font-size: 12.5px;
      vertical-align: top;
    }
    .bio-label {
      width: 170px;
      color: #4b5563;
    }
    .bio-colon {
      width: 15px;
    }
    .bio-val {
      color: #111827;
      font-weight: 600;
    }
    .footer-section {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .tte-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 290px;
      font-family: Arial, sans-serif;
    }
    .tte-box img {
      width: 72px;
      height: 72px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 2px;
      border-radius: 6px;
    }
    .tte-text {
      font-size: 9.5px;
      color: #4b5563;
      line-height: 1.35;
    }
    .tte-badge {
      font-weight: bold;
      color: #065f46;
      margin-bottom: 2px;
      font-size: 10px;
    }
    .tte-token {
      font-family: monospace;
      font-size: 8.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .signer-box {
      text-align: center;
      font-family: Arial, sans-serif;
      min-width: 200px;
    }
    .signer-date {
      font-size: 12px;
      color: #374151;
      margin-bottom: 4px;
    }
    .signer-role {
      font-size: 12px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 45px;
    }
    .signer-name {
      font-size: 13px;
      font-weight: bold;
      text-decoration: underline;
      color: #111827;
      margin: 0;
    }
    .signer-nip {
      font-size: 10px;
      color: #6b7280;
      margin: 2px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="kop">
    <h4>${vRegency ? `PEMERINTAH ${vRegency.toUpperCase()}` : 'PEMERINTAH KABUPATEN'}</h4>
    <h3>${vDistrict ? `KECAMATAN ${vDistrict.toUpperCase()}` : 'KECAMATAN'}</h3>
    <h2>PEMERINTAH ${vName.toUpperCase()}</h2>
    <p>${[vAddress, vPhone].filter(Boolean).join(' • ')}</p>
    <p>Email: ${vEmail}</p>
  </div>

  <div class="title-box">
    <h3>${request.letter_name}</h3>
    <p>Nomor: ${officialNo}</p>
  </div>

  <div class="content">
    <p>
      Yang bertanda tangan di bawah ini, Kepala ${vName}, ${vDistrict ? `Kecamatan ${vDistrict}, ` : ''}${vRegency ? `${vRegency}, ` : ''}menerangkan dengan sebenarnya bahwa:
    </p>

    <table class="bio-table">
      <tr>
        <td class="bio-label">Nama Lengkap</td>
        <td class="bio-colon">:</td>
        <td class="bio-val">${request.citizen_name}</td>
      </tr>
      <tr>
        <td class="bio-label">NIK</td>
        <td class="bio-colon">:</td>
        <td class="bio-val" style="font-family: monospace;">${request.citizen_nik}</td>
      </tr>
      <tr>
        <td class="bio-label">Alamat Kependudukan</td>
        <td class="bio-colon">:</td>
        <td class="bio-val">${request.citizen_address || 'Wilayah Desa'}</td>
      </tr>
      <tr>
        <td class="bio-label">Keperluan</td>
        <td class="bio-colon">:</td>
        <td class="bio-val" style="font-style: italic;">${request.purpose}</td>
      </tr>
    </table>

    <p>
      Adalah benar-benar warga yang bertempat tinggal secara sah di wilayah ${vName} dan tercatat dalam data kependudukan resmi desa. Sepanjang sepengetahuan kami, yang bersangkutan memiliki catatan permohonan sesuai dengan maksud dan tujuan di atas.
    </p>

    <p>
      Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh yang berkepentingan.
    </p>
  </div>

  <div class="footer-section">
    <div class="tte-box">
      <img src="${qrCodeImgSrc}" alt="QR TTE" width="72" height="72" onerror="this.style.display='none'" />
      <div class="tte-text">
        <div class="tte-badge">✓ TTE Sah Resmi Desa</div>
        Dokumen ini telah disahkan secara digital dengan Tanda Tangan Elektronik resmi.
        <div class="tte-token">ID: ${(request.qr_token || request.tracking_number || '').slice(0, 20)}</div>
      </div>
    </div>

    <div class="signer-box">
      <div class="signer-date">${vName.replace(/^(Desa|Kelurahan)\s+/i, '')}, ${todayDateStr}</div>
      <div class="signer-role">Kepala ${vName}</div>
      <div class="signer-name">${kades}</div>
      <div class="signer-nip">NIP. 19740510 199903 1 004</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleDownload = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = generateLetterHtml();

      // Metode 1: printToFileAsync + Expo Sharing
      let sharedSuccessfully = false;
      try {
        const fileResult = await Print.printToFileAsync({ html });
        if (fileResult?.uri) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileResult.uri, {
              UTI: 'com.adobe.pdf',
              mimeType: 'application/pdf',
              dialogTitle: `Unduh / Simpan Surat Resmi ${request.letter_name}`,
            });
            sharedSuccessfully = true;
            return;
          } else {
            showAlert({
              title: 'Surat PDF Berhasil Dibuat',
              message: `Surat resmi disimpan di: ${fileResult.uri}`,
              type: 'success',
            });
            sharedSuccessfully = true;
            return;
          }
        }
      } catch (fileErr) {
        console.warn('[LetterDetail] printToFileAsync failed, trying native system print:', fileErr);
      }

      // Metode 2: Fallback ke Native Print Spooler Android (Bisa langsung 'Simpan sebagai PDF' di HP)
      if (!sharedSuccessfully) {
        await Print.printAsync({ html });
      }
    } catch (err: any) {
      console.error('[LetterDetailScreen] handleDownload error:', err);
      // Metode 3: Fallback ke Portal Web Resmi jika sistem perangkat terkendala
      showAlert({
        title: 'Buka Dokumen Resmi',
        message: 'Gagal membuat file PDF langsung di perangkat. Apakah Anda ingin membuka dokumen resmi ini di peramban web untuk dicetak/disimpan?',
        type: 'warning',
        confirmText: 'Buka di Browser',
        onConfirm: () => Linking.openURL(verificationUrl),
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintDirect = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = generateLetterHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      console.error('[LetterDetailScreen] handlePrintDirect error:', err);
      Linking.openURL(verificationUrl);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWa = () => {
    const text = encodeURIComponent(
      `*Surat Resmi Desa - ${request.letter_name}*\n\n` +
      `Nomor Surat: ${request.official_number || request.tracking_number}\n` +
      `Nama Warga: ${request.citizen_name}\n` +
      `NIK: ${request.citizen_nik}\n` +
      `Keperluan: ${request.purpose}\n\n` +
      `Surat telah disahkan secara digital dengan Tanda Tangan Elektronik (TTE QR) resmi Pemerintah ${villageProfile?.name || Config.villageName || 'Desa'}.\n\n` +
      `Cek keabsahan dokumen:\n${verificationUrl}`
    );
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header title={`Lacak: ${request.tracking_number}`} showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* CARD RINGKASAN SURAT */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.trackingText}>{request.tracking_number}</Text>
              <Text style={styles.letterName}>{request.letter_name}</Text>
            </View>
            <StatusBadge statusKey={request.status} />
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nama Pemohon / Subjek</Text>
            <Text style={styles.detailValue}>{request.citizen_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NIK Subjek</Text>
            <Text style={styles.detailValueMono}>{request.citizen_nik}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Keperluan</Text>
            <Text style={styles.detailValue}>{request.purpose}</Text>
          </View>
          {request.official_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>No. Surat Resmi Desa</Text>
              <Text style={styles.detailValueBold}>{request.official_number}</Text>
            </View>
          )}
        </View>

        {/* NOTIFIKASI PENOLAKAN JIKA DITOLAK */}
        {request.status === 'rejected' && (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.rejectionTitle}>Permohonan Tidak Disetujui</Text>
            </View>
            <Text style={styles.rejectionReason}>
              Catatan Petugas: {request.rejection_reason || 'Persyaratan dokumen belum memenuhi ketentuan resmi desa.'}
            </Text>
          </View>
        )}

        {/* TIMELINE PROSES VERIFIKASI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riwayat Proses Verifikasi</Text>
          <View style={styles.timelineContainer}>
            {(Array.isArray(request.timeline) && request.timeline.length > 0 ? request.timeline : [
              { title: 'Permohonan Dikirim Warga', time: request.created_at || 'Baru saja', done: true, actor: 'Warga Pemohon' },
              { title: 'Pemeriksaan Berkas Operator', time: '-', done: false, actor: 'Operator Pelayanan' },
              { title: 'Penerbitan Nomor Resmi Desa', time: '-', done: false, actor: 'Sekretariat Desa' },
              { title: 'Tanda Tangan Elektronik QR Kades', time: '-', done: false, actor: 'Kepala Desa' },
            ]).map((step: { title: string; time: string; done: boolean; actor?: string }, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineIndicator}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.done && styles.timelineDotDone,
                      ]}
                    >
                      {step.done ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={styles.timelineDotPending} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          step.done && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        step.done && styles.timelineTitleDone,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.timelineTime}>{step.time}</Text>
                      {step.actor && (
                        <Text style={styles.timelineActor}>• Oleh: {step.actor}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* PRATINJAU QR CODE TTE & KEABSAHAN SURAT */}
        {isCompleted && (
          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <View style={styles.qrHeader}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.qrTitle}>TANDA TANGAN ELEKTRONIK (TTE)</Text>
                  <Text style={styles.qrSubtitle}>Sah & Dikeluarkan oleh Kepala {Config.villageName}</Text>
                </View>
              </View>

              {/* QR Code Scannable Visual */}
              <View style={styles.qrContainer}>
                <View style={styles.qrVisualBox}>
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        verificationUrl
                      )}`,
                    }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrCodeToken}>TOKEN: {request.qr_token || request.tracking_number}</Text>
                </View>
                <Text style={styles.qrNotice}>
                  Pindai QR Code ini menggunakan kamera HP untuk memeriksa keaslian surat langsung pada portal resmi desa:
                </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(verificationUrl)}>
                  <Text style={styles.qrUrl} numberOfLines={2}>
                    {verificationUrl}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.downloadBtn, isGeneratingPdf && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleDownload}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.downloadBtnText}>Menyiapkan PDF Resmi...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.downloadBtnText}>Unduh Surat Resmi (PDF)</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.printBtn}
                activeOpacity={0.85}
                onPress={handlePrintDirect}
                disabled={isGeneratingPdf}
              >
                <Ionicons name="print-outline" size={18} color={Colors.primary} />
                <Text style={styles.printBtnText}>Cetak / Simpan PDF Sistem</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={handleShareWa}>
                <Ionicons name="logo-whatsapp" size={18} color="#15803D" />
                <Text style={styles.shareBtnText}>Bagikan Berkas ke WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.appBarYellow,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: Spacing.cardGap,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackingText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  letterName: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 14,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 19,
  },
  detailValueMono: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailValueBold: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  timelineContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: Colors.primary,
  },
  timelineDotPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: Colors.primary,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timelineTitleDone: {
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 3,
  },
  timelineTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  timelineActor: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  qrSection: {
    marginBottom: Spacing.sectionGap,
  },
  qrBox: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    borderWidth: 1.5,
    borderColor: Colors.bento.hero.border,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 12,
  },
  qrTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  qrSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  qrVisualBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  qrCodeToken: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
  },
  qrNotice: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  qrUrl: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
    textDecorationLine: 'underline',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Spacing.radiusFull,
    marginTop: 10,
    gap: 6,
  },
  downloadBtnText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 14,
    borderRadius: Spacing.radiusFull,
    marginTop: 8,
    gap: 6,
  },
  printBtnText: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bento.hero.badge,
    paddingVertical: 14,
    borderRadius: Spacing.radiusFull,
    marginTop: 8,
    gap: 6,
  },
  shareBtnText: {
    fontFamily: Fonts.bold,
    color: '#15803D',
    fontSize: 13,
  },
  rejectionCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: Spacing.radiusXl,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardGap,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rejectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#DC2626',
  },
  rejectionReason: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
});
