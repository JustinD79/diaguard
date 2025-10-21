import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  X,
  FlipHorizontal,
  Zap,
  Image as ImageIcon,
  Target,
  CircleCheck as CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { FoodAPIService, Product, DiabetesInsights } from '@/services/FoodAPIService';
import { EnhancedFoodRecognitionService } from '@/services/EnhancedFoodRecognitionService';
import { ScanCreditManager, ScanReservation } from '@/services/ScanCreditManager';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const { width } = Dimensions.get('window');

interface ImprovedFoodCameraScannerProps {
  visible: boolean;
  onClose: () => void;
  onFoodAnalyzed: (product: Product, insights: DiabetesInsights) => void;
}

export default function ImprovedFoodCameraScanner({
  visible,
  onClose,
  onFoodAnalyzed,
}: ImprovedFoodCameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    product: Product;
    insights: DiabetesInsights;
    warnings: string[];
  } | null>(null);
  const [currentReservation, setCurrentReservation] = useState<ScanReservation | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const takePicture = async () => {
    if (!cameraRef.current || !user) {
      Alert.alert('Error', 'Cannot take picture at this time');
      return;
    }

    let reservation: ScanReservation | null = null;

    try {
      reservation = await ScanCreditManager.reserveScanCredit(user.id);

      if (!reservation) {
        Alert.alert(
          'Scan Limit Reached',
          'You\\'ve used all your free scans this month. Upgrade to Diamond Plan for unlimited scanning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {} },
          ]
        );
        return;
      }

      setCurrentReservation(reservation);
      setAnalysisError(null);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        setCapturedImage(photo.uri);
        await analyzeFood(photo.uri, photo.base64, reservation);
      }
    } catch (error) {
      console.error('Error taking picture:', error);

      if (reservation) {
        await ScanCreditManager.rollbackScanCredit(reservation.transactionId);
        Alert.alert(
          'Error',
          'Failed to take picture. Your scan credit has been restored.'
        );
      } else {
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const selectFromGallery = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to use this feature');
      return;
    }

    let reservation: ScanReservation | null = null;

    try {
      reservation = await ScanCreditManager.reserveScanCredit(user.id);

      if (!reservation) {
        Alert.alert(
          'Scan Limit Reached',
          'You\\'ve used all your free scans this month. Upgrade to Diamond Plan for unlimited scanning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {} },
          ]
        );
        return;
      }

      setCurrentReservation(reservation);
      setAnalysisError(null);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        await analyzeFood(
          result.assets[0].uri,
          result.assets[0].base64,
          reservation
        );
      } else if (reservation) {
        await ScanCreditManager.rollbackScanCredit(reservation.transactionId);
      }
    } catch (error) {
      console.error('Error selecting image:', error);

      if (reservation) {
        await ScanCreditManager.rollbackScanCredit(reservation.transactionId);
      }

      Alert.alert(
        'Error',
        'Failed to select image. Your scan credit has been restored.'
      );
    }
  };

  const analyzeFood = async (
    imageUri: string,
    base64: string | undefined,
    reservation: ScanReservation
  ) => {
    setAnalyzing(true);

    try {
      const result = await EnhancedFoodRecognitionService.analyzeFoodImage(
        imageUri,
        base64
      );

      if (!result.success || result.foods.length === 0) {
        throw new Error('No food items detected in image');
      }

      await ScanCreditManager.confirmScanSuccess(reservation.transactionId);

      const primaryFood = result.foods[0];
      const warnings = primaryFood.warnings || [];

      const mockProduct: Product = {
        id: `food_${Date.now()}`,
        name: primaryFood.item.name,
        brand: 'Detected from Image',
        nutrition: {
          calories: primaryFood.nutrition.calories,
          carbs: primaryFood.nutrition.macronutrients.carbohydrates,
          protein: primaryFood.nutrition.macronutrients.protein,
          fat: primaryFood.nutrition.macronutrients.fat,
          fiber: primaryFood.nutrition.macronutrients.fiber,
          sugars: primaryFood.nutrition.macronutrients.sugars,
          sodium: 0,
        },
        servingSize: primaryFood.nutrition.portionSize,
        servingWeight: primaryFood.item.portion.estimatedWeight,
        verified: primaryFood.item.confidence > 0.85,
        source: 'Enhanced AI Recognition',
        imageUrl: imageUri,
      };

      const insights = FoodAPIService.generateDiabetesInsights(
        mockProduct.nutrition
      );

      setAnalysisResult({ product: mockProduct, insights, warnings });
      setAnalysisError(null);
    } catch (error) {
      console.error('Error analyzing food:', error);

      await ScanCreditManager.rollbackScanCredit(reservation.transactionId);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);

      Alert.alert(
        'Analysis Failed',
        `Failed to analyze the food image: ${errorMessage}\\n\\n✅ Your scan credit has been restored.`,
        [
          { text: 'Retry', onPress: () => retakePhoto() },
          { text: 'Cancel', onPress: () => onClose(), style: 'cancel' },
        ]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmAnalysis = () => {
    if (analysisResult) {
      onFoodAnalyzed(analysisResult.product, analysisResult.insights);
      resetScanner();
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setCurrentReservation(null);
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalyzing(false);
    setAnalysisError(null);
    setCurrentReservation(null);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => !current);
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Camera size={64} color="#6B7280" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to scan food and analyze nutritional
              content for diabetes management.
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
        {!capturedImage ? (
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Food</Text>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={selectFromGallery}
              >
                <ImageIcon size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flash ? 'on' : 'off'}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame}>
                  <View style={styles.scanCorner} />
                  <View style={[styles.scanCorner, styles.topRight]} />
                  <View style={[styles.scanCorner, styles.bottomLeft]} />
                  <View style={[styles.scanCorner, styles.bottomRight]} />
                </View>

                <Text style={styles.scanInstruction}>
                  Position food within the frame for best results
                </Text>
              </View>
            </CameraView>

            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                <Zap size={24} color={flash ? '#FFD700' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner}>
                  <Camera size={32} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCameraFacing}
              >
                <FlipHorizontal size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.analysisContainer}>
            <View style={styles.analysisHeader}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.analysisHeaderTitle}>Food Analysis</Text>
              <TouchableOpacity style={styles.headerButton} onPress={retakePhoto}>
                <RefreshCw size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.analysisScrollContent}>
              <View style={styles.imagePreview}>
                <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                {analyzing && (
                  <View style={styles.analysisOverlay}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.analysisText}>Analyzing food...</Text>
                    <Text style={styles.analysisSubtext}>
                      Using advanced AI to identify ingredients and calculate nutrition
                    </Text>
                  </View>
                )}
              </View>

              {analysisError && (
                <Card style={styles.errorCard}>
                  <View style={styles.errorHeader}>
                    <AlertCircle size={24} color="#DC2626" />
                    <Text style={styles.errorTitle}>Analysis Failed</Text>
                  </View>
                  <Text style={styles.errorMessage}>{analysisError}</Text>
                  <Text style={styles.errorNote}>
                    ✅ Your scan credit has been automatically restored
                  </Text>
                </Card>
              )}

              {analysisResult && !analyzing && (
                <>
                  <Card style={styles.foodInfoCard}>
                    <Text style={styles.foodName}>{analysisResult.product.name}</Text>
                    <Text style={styles.foodBrand}>
                      {analysisResult.product.brand}
                    </Text>
                    <Text style={styles.servingSize}>
                      {analysisResult.product.servingSize}
                    </Text>
                    {analysisResult.product.verified && (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle size={16} color="#059669" />
                        <Text style={styles.verifiedText}>High Confidence</Text>
                      </View>
                    )}
                  </Card>

                  <Card style={styles.nutritionCard}>
                    <Text style={styles.cardTitle}>Nutritional Information</Text>
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>
                          {analysisResult.product.nutrition.calories}
                        </Text>
                        <Text style={styles.nutritionLabel}>Calories</Text>
                      </View>
                      <View style={[styles.nutritionItem, styles.carbsHighlight]}>
                        <Text style={styles.nutritionValue}>
                          {analysisResult.product.nutrition.carbs}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Carbs</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>
                          {analysisResult.product.nutrition.sugars}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Sugars</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>
                          {analysisResult.product.nutrition.protein}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Protein</Text>
                      </View>
                    </View>
                  </Card>

                  <Card style={styles.insulinCard}>
                    <View style={styles.insulinHeader}>
                      <Target size={20} color="#2563EB" />
                      <Text style={styles.cardTitle}>Insulin Recommendation</Text>
                    </View>
                    <View style={styles.insulinInfo}>
                      <Text style={styles.insulinDose}>
                        {analysisResult.insights.estimatedInsulinUnits} units
                      </Text>
                      <Text style={styles.insulinNote}>
                        Based on {analysisResult.product.nutrition.carbs}g carbs
                        (1:15 ratio)
                      </Text>
                      <Text style={styles.insulinWarning}>
                        ⚠️ Always verify with your healthcare provider
                      </Text>
                    </View>
                  </Card>

                  {analysisResult.warnings.length > 0 && (
                    <Card style={styles.warningsCard}>
                      <Text style={styles.cardTitle}>Important Warnings</Text>
                      {analysisResult.warnings.map((warning, index) => (
                        <Text key={index} style={styles.warningText}>
                          {warning}
                        </Text>
                      ))}
                    </Card>
                  )}

                  <View style={styles.actionButtons}>
                    <Button
                      title="Log This Meal"
                      onPress={confirmAnalysis}
                      style={styles.confirmButton}
                    />
                    <Button
                      title="Retake"
                      onPress={retakePhoto}
                      variant="outline"
                      style={styles.retakeButton}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}
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
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
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
  cameraContainer: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.8,
    height: width * 0.8,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: undefined,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: -50,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2563EB',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  analysisHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  analysisScrollContent: {
    padding: 20,
    gap: 16,
  },
  imagePreview: {
    position: 'relative',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analysisText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  analysisSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 12,
    lineHeight: 20,
  },
  errorNote: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  foodInfoCard: {
    alignItems: 'center',
    padding: 20,
  },
  foodName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  servingSize: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  nutritionCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  carbsHighlight: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  insulinCard: {
    padding: 20,
    backgroundColor: '#EBF4FF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  insulinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  insulinInfo: {
    alignItems: 'center',
  },
  insulinDose: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  insulinNote: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  insulinWarning: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
  warningsCard: {
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    flex: 2,
  },
  retakeButton: {
    flex: 1,
  },
});
