import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X, Scan, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Product, DiabetesInsights, FoodAPIService } from '@/services/FoodAPIService';
import { useScanLimit } from '@/contexts/ScanLimitContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface BarcodeFoodScannerProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: Product, insights: DiabetesInsights) => void;
}

export default function BarcodeFoodScanner({
  visible,
  onClose,
  onProductFound,
}: BarcodeFoodScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{
    product: Product;
    insights: DiabetesInsights;
  } | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { useScan, canScan } = useScanLimit();
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  useEffect(() => {
    // Reset state when modal opens
    if (visible) {
      setScanning(true);
      setScannedProduct(null);
      setLastScannedBarcode('');
    }
  }, [visible]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent duplicate scans
    if (!scanning || loading || result.data === lastScannedBarcode) {
      return;
    }

    if (!canScan) {
      Alert.alert(
        'Scan Limit Reached',
        "You've used all your free scans this month. Upgrade to premium for unlimited scanning."
      );
      return;
    }

    setLastScannedBarcode(result.data);
    setScanning(false);
    setLoading(true);

    try {
      const scanUsed = await useScan();
      if (!scanUsed) {
        Alert.alert(
          'Scan Limit Reached',
          "You've used all your free scans this month."
        );
        setScanning(true);
        return;
      }

      // Look up product by barcode
      const product = await FoodAPIService.searchFoodByBarcode(result.data);

      if (!product) {
        Alert.alert(
          'Product Not Found',
          `Barcode ${result.data} not found in our database. Try manual entry or photo scan instead.`,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                setScanning(true);
                setLastScannedBarcode('');
              },
            },
            { text: 'Close', onPress: onClose },
          ]
        );
        return;
      }

      const insights = FoodAPIService.generateDiabetesInsights(product.nutrition);

      setScannedProduct({ product, insights });
    } catch (error) {
      console.error('Error scanning barcode:', error);
      Alert.alert(
        'Scan Error',
        'Failed to look up product information. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanning(true);
              setLastScannedBarcode('');
            },
          },
          { text: 'Close', onPress: onClose },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmProduct = () => {
    if (scannedProduct) {
      onProductFound(scannedProduct.product, scannedProduct.insights);
      onClose();
    }
  };

  const scanAgain = () => {
    setScannedProduct(null);
    setScanning(true);
    setLastScannedBarcode('');
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Scan size={64} color="#6B7280" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to scan product barcodes.
            </Text>
            <View style={styles.permissionButtons}>
              <Button
                title="Grant Permission"
                onPress={requestPermission}
                style={styles.permissionButton}
              />
              <Button
                title="Cancel"
                onPress={onClose}
                variant="outline"
                style={styles.permissionButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <View style={styles.closeButton} />
        </View>

        {scanning && !scannedProduct ? (
          // Scanner View
          <View style={styles.scannerContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
              }}
              onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.topLeft]} />
                  <View style={[styles.scanCorner, styles.topRight]} />
                  <View style={[styles.scanCorner, styles.bottomLeft]} />
                  <View style={[styles.scanCorner, styles.bottomRight]} />
                </View>

                <Text style={styles.scanInstruction}>
                  Position barcode within the frame
                </Text>

                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Looking up product...</Text>
                  </View>
                )}
              </View>
            </CameraView>
          </View>
        ) : scannedProduct ? (
          // Product Found View
          <View style={styles.resultContainer}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color="#059669" />
            </View>

            <Text style={styles.successTitle}>Product Found!</Text>

            <Card style={styles.productCard}>
              <Text style={styles.productName}>{scannedProduct.product.name}</Text>
              <Text style={styles.productBrand}>{scannedProduct.product.brand}</Text>
              <Text style={styles.productServing}>{scannedProduct.product.servingSize}</Text>
            </Card>

            <Card style={styles.nutritionCard}>
              <Text style={styles.nutritionTitle}>Nutrition per Serving</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {scannedProduct.product.nutrition.calories}
                  </Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={[styles.nutritionItem, styles.carbsHighlight]}>
                  <Text style={styles.nutritionValue}>
                    {scannedProduct.product.nutrition.carbs}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {scannedProduct.product.nutrition.protein}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {scannedProduct.product.nutrition.fat}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>Diabetes Awareness</Text>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Glycemic Load:</Text>
                <Text style={styles.insightValue}>
                  {scannedProduct.insights.glycemicLoad}
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Blood Sugar Impact:</Text>
                <Text
                  style={[
                    styles.insightValue,
                    {
                      color:
                        scannedProduct.insights.bloodSugarImpact === 'Low'
                          ? '#059669'
                          : scannedProduct.insights.bloodSugarImpact === 'Moderate'
                          ? '#D97706'
                          : '#DC2626',
                    },
                  ]}
                >
                  {scannedProduct.insights.bloodSugarImpact}
                </Text>
              </View>
            </Card>

            <View style={styles.actionButtons}>
              <Button
                title="Log This Food"
                onPress={confirmProduct}
                style={styles.confirmButton}
              />
              <Button
                title="Scan Another"
                onPress={scanAgain}
                variant="outline"
                style={styles.scanAgainButton}
              />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },
  permissionButton: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 100,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  successIcon: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  productCard: {
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  productName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  productServing: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  nutritionCard: {
    padding: 20,
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  carbsHighlight: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  nutritionValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  insightsCard: {
    padding: 20,
    marginBottom: 24,
  },
  insightsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  insightLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  insightValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  actionButtons: {
    gap: 12,
  },
  confirmButton: {
    width: '100%',
  },
  scanAgainButton: {
    width: '100%',
  },
});
