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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, FlipHorizontal, Slash as Flash, Image as ImageIcon, Zap, Target, CircleCheck as CheckCircle, RefreshCw } from 'lucide-react-native';
import { FoodAPIService, Product, DiabetesInsights } from '@/services/FoodAPIService';
import { AIVisionFoodAnalyzer, AIVisionAnalysisResult } from '@/services/AIVisionFoodAnalyzer';
import { useScanLimit } from '@/contexts/ScanLimitContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import CarbExplanationModal from '@/components/nutrition/CarbExplanationModal';
import EstimateDetailModal from '@/components/nutrition/EstimateDetailModal';

const { width, height } = Dimensions.get('window');

interface FoodCameraScannerProps {
  visible: boolean;
  onClose: () => void;
  onFoodAnalyzed: (product: Product, insights: DiabetesInsights) => void;
}

export default function FoodCameraScanner({ 
  visible, 
  onClose, 
  onFoodAnalyzed 
}: FoodCameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    product: Product;
    insights: DiabetesInsights;
    aiResult: AIVisionAnalysisResult;
  } | null>(null);
  const [showCarbExplanation, setShowCarbExplanation] = useState(false);
  const [showEstimateDetail, setShowEstimateDetail] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { useScan, canScan } = useScanLimit();

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const takePicture = async () => {
    if (!cameraRef.current || !canScan) {
      Alert.alert('Error', 'Cannot take picture at this time');
      return;
    }

    try {
      const scanUsed = await useScan();
      if (!scanUsed) {
        Alert.alert(
          'Scan Limit Reached',
          'You\'ve used all your free scans this month. Upgrade to premium for unlimited scanning.'
        );
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        setCapturedImage(photo.uri);
        await analyzeFood(photo.uri, photo.base64);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    if (!canScan) {
      Alert.alert('Error', 'Cannot select image at this time');
      return;
    }

    try {
      const scanUsed = await useScan();
      if (!scanUsed) {
        Alert.alert(
          'Scan Limit Reached',
          'You\'ve used all your free scans this month. Upgrade to premium for unlimited scanning.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        await analyzeFood(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const analyzeFood = async (imageUri: string, base64?: string) => {
    setAnalyzing(true);

    try {
      // Call real AI Vision service (Claude or OpenAI)
      const aiResult: AIVisionAnalysisResult = await AIVisionFoodAnalyzer.analyzeFoodImage(
        imageUri,
        base64
      );

      // Convert AI result to Product format for compatibility
      const firstFood = aiResult.foods[0];
      const product: Product = {
        id: `food_${Date.now()}`,
        name: firstFood.name,
        brand: 'AI Analyzed',
        nutrition: {
          calories: aiResult.totalNutrition.calories,
          carbs: aiResult.totalNutrition.totalCarbs,
          protein: aiResult.totalNutrition.protein,
          fat: aiResult.totalNutrition.fat,
          fiber: aiResult.totalNutrition.fiber,
          sugars: aiResult.totalNutrition.sugars,
          sodium: 0, // Not provided by AI
        },
        servingSize: `${firstFood.portionWeight}${firstFood.portionUnit}`,
        servingWeight: firstFood.portionWeight,
        verified: true,
        source: `AI Vision (${aiResult.apiProvider})`,
        imageUrl: imageUri,
      };

      const insights = FoodAPIService.generateDiabetesInsights(product.nutrition);

      setAnalysisResult({ product, insights, aiResult });
    } catch (error) {
      console.error('Error analyzing food:', error);
      Alert.alert(
        'Analysis Failed',
        'Failed to analyze the food image with AI. Please try again or enter food information manually.'
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
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalyzing(false);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => !current);
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
              We need access to your camera to scan food and analyze nutritional content for diabetes management.
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
    <>
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        {!capturedImage ? (
          // Camera View
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Food</Text>
              <TouchableOpacity style={styles.headerButton} onPress={selectFromGallery}>
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
                <Zap size={24} color={flash ? "#FFD700" : "#FFFFFF"} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner}>
                  <Camera size={32} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <FlipHorizontal size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Analysis View
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

            <View style={styles.imagePreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              {analyzing && (
                <View style={styles.analysisOverlay}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.analysisText}>Analyzing food...</Text>
                  <Text style={styles.analysisSubtext}>
                    Identifying ingredients and calculating nutrition
                  </Text>
                </View>
              )}
            </View>

            {analysisResult && !analyzing && (
              <View style={styles.resultsContainer}>
                <Card style={styles.foodInfoCard}>
                  <Text style={styles.foodName}>{analysisResult.product.name}</Text>
                  <Text style={styles.foodBrand}>{analysisResult.product.brand}</Text>
                  <Text style={styles.servingSize}>{analysisResult.product.servingSize}</Text>
                </Card>

                <Card style={styles.nutritionCard}>
                  <Text style={styles.cardTitle}>Nutritional Information</Text>
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{analysisResult.product.nutrition.calories}</Text>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                    </View>
                    <View style={[styles.nutritionItem, styles.carbsHighlight]}>
                      <Text style={styles.nutritionValue}>{analysisResult.product.nutrition.carbs}g</Text>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{analysisResult.product.nutrition.sugars}g</Text>
                      <Text style={styles.nutritionLabel}>Sugars</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{analysisResult.product.nutrition.protein}g</Text>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.carbInfoCard}>
                  <View style={styles.carbInfoHeader}>
                    <Target size={20} color="#2563EB" />
                    <Text style={styles.cardTitle}>Carbohydrate Information</Text>
                  </View>
                  <View style={styles.carbInfoContent}>
                    <View style={styles.carbInfoRow}>
                      <Text style={styles.carbInfoLabel}>Total Carbs:</Text>
                      <Text style={styles.carbInfoValue}>{analysisResult.product.nutrition.carbs}g</Text>
                    </View>
                    <View style={styles.carbInfoRow}>
                      <Text style={styles.carbInfoLabel}>Net Carbs:</Text>
                      <Text style={styles.carbInfoValue}>
                        {analysisResult.product.nutrition.carbs - analysisResult.product.nutrition.fiber}g
                      </Text>
                    </View>
                    <View style={styles.carbInfoRow}>
                      <Text style={styles.carbInfoLabel}>Fiber:</Text>
                      <Text style={styles.carbInfoValue}>{analysisResult.product.nutrition.fiber}g</Text>
                    </View>
                    <Text style={styles.carbInfoNote}>
                      💡 Consult your healthcare provider for personalized dietary guidance
                    </Text>
                  </View>
                </Card>

                <Card style={styles.insightsCard}>
                  <Text style={styles.cardTitle}>Diabetes Insights</Text>
                  <View style={styles.insightItem}>
                    <CheckCircle 
                      size={16} 
                      color={analysisResult.insights.isDiabetesFriendly ? "#059669" : "#DC2626"} 
                    />
                    <Text style={styles.insightText}>
                      {analysisResult.insights.isDiabetesFriendly 
                        ? 'Diabetes-friendly meal' 
                        : 'Monitor blood sugar carefully'
                      }
                    </Text>
                  </View>
                  <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>Blood Sugar Impact:</Text>
                    <Text style={[
                      styles.insightValue,
                      { color: analysisResult.insights.bloodSugarImpact === 'Low' ? '#059669' : 
                               analysisResult.insights.bloodSugarImpact === 'Moderate' ? '#D97706' : '#DC2626' }
                    ]}>
                      {analysisResult.insights.bloodSugarImpact}
                    </Text>
                  </View>
                  <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>Glycemic Load:</Text>
                    <Text style={styles.insightValue}>{analysisResult.insights.glycemicLoad}</Text>
                  </View>
                </Card>

                {/* Explanation Buttons */}
                <View style={styles.explanationButtons}>
                  <TouchableOpacity
                    style={styles.explanationButton}
                    onPress={() => setShowCarbExplanation(true)}
                  >
                    <Target size={18} color="#2563EB" />
                    <Text style={styles.explanationButtonText}>Carb Breakdown</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.explanationButton}
                    onPress={() => setShowEstimateDetail(true)}
                  >
                    <CheckCircle size={18} color="#059669" />
                    <Text style={styles.explanationButtonText}>Why This Estimate?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                  <Button
                    title="Log This Meal"
                    onPress={confirmAnalysis}
                    style={styles.confirmButton}
                  />
                  <Button
                    title="Retake Photo"
                    onPress={retakePhoto}
                    variant="outline"
                    style={styles.retakeButton}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>

      {/* Explanation Modals */}
      {analysisResult?.aiResult && (
        <>
          <CarbExplanationModal
            visible={showCarbExplanation}
            onClose={() => setShowCarbExplanation(false)}
            analysisResult={analysisResult.aiResult}
          />
          <EstimateDetailModal
            visible={showEstimateDetail}
            onClose={() => setShowEstimateDetail(false)}
            analysisResult={analysisResult.aiResult}
          />
        </>
      )}
    </>
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
    fontFamily: 'Inter-SemiBold',
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
    left: 'auto',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: -50,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  imagePreview: {
    position: 'relative',
    height: 250,
    margin: 20,
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  analysisSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  foodInfoCard: {
    alignItems: 'center',
    padding: 20,
  },
  foodName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  servingSize: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  nutritionCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  carbInfoCard: {
    padding: 20,
    backgroundColor: '#EBF4FF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  carbInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  carbInfoContent: {
    gap: 12,
  },
  carbInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  carbInfoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  carbInfoValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  carbInfoNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  insightsCard: {
    padding: 20,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    flex: 1,
  },
  insightLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  insightValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  explanationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  explanationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  explanationButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
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