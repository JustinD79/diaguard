import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, Scan, Plus, Clock, Utensils, Search, Barcode, Zap, Brain, Target } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CameraProcessingAgent } from '@/services/CameraProcessingAgent';
import { FoodRecognitionAgent } from '@/services/FoodRecognitionAgent';
import { BarcodeScannerAgent } from '@/services/BarcodeScannerAgent';
import { PortionSizeEstimator } from '@/services/PortionSizeEstimator';
import { NutritionAnalysisAgent } from '@/services/NutritionAnalysisAgent';
import { MedicalAIAgent } from '@/services/MedicalAIAgent';
import { MedicalComplianceAgent } from '@/services/MedicalComplianceAgent';
import { useErrorHandler, useMedicalErrorHandler, useNetworkErrorHandler } from '@/hooks/useErrorHandler';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { OfflineService } from '@/services/OfflineService';
import { useScanLimit } from '@/contexts/ScanLimitContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import ScanLimitBanner from '@/components/notifications/ScanLimitBanner';
import SubscriptionNotification from '@/components/notifications/SubscriptionNotification';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  time: string;
  image?: string;
  servingSize?: string;
  confidence?: number;
  glycemicLoad?: number;
  insulinImpact?: string;
}

interface NutritionDatabase {
  [key: string]: Omit<FoodItem, 'id' | 'time'>;
}

export default function FoodScanScreen() {
  const { user, isGuest } = useAuth();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(() => {
    return false;
  });
  
  const { scansRemaining, canScan, useScan } = useScanLimit();
  const { hasActiveSubscription } = useSubscription();
  const [showScanLimitNotification, setShowScanLimitNotification] = useState(false);
  
  const { error, clearError } = useErrorHandler();
  const { handleMedicalError } = useMedicalErrorHandler();
  const { handleNetworkError } = useNetworkErrorHandler();
  
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([
    {
      id: '1',
      name: 'Grilled Chicken Breast',
      calories: 231,
      carbs: 0,
      protein: 43.5,
      fat: 5,
      fiber: 0,
      sugars: 0,
      time: '12:30 PM',
      servingSize: '6 oz',
      confidence: 0.95,
      glycemicLoad: 0,
      insulinImpact: 'minimal',
      image: 'https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: '2',
      name: 'Mixed Green Salad',
      calories: 85,
      carbs: 12,
      protein: 4,
      fat: 3,
      fiber: 8,
      sugars: 6,
      time: '12:25 PM',
      servingSize: '2 cups',
      confidence: 0.88,
      glycemicLoad: 4,
      insulinImpact: 'low',
      image: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  ]);

  const [newFood, setNewFood] = useState({
    name: '',
    calories: '',
    carbs: '',
    protein: '',
    fat: '',
    servingSize: '',
  });

  // Monitor network status
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const handleOnline = () => {
        setIsOffline(false);
        OfflineService.processQueue(); // Process queued operations
      };
    
      const handleOffline = () => setIsOffline(true);
      
      // Set initial state
      setIsOffline(!navigator.onLine);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Enhanced nutrition database with AI-powered data
  const nutritionDatabase: NutritionDatabase = {
    'apple': {
      name: 'Apple (Medium)',
      calories: 95,
      carbs: 25,
      protein: 0.5,
      fat: 0.3,
      fiber: 4,
      sugars: 19,
      servingSize: '1 medium',
      confidence: 0.92,
      glycemicLoad: 6,
      insulinImpact: 'moderate',
      image: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    'banana': {
      name: 'Banana (Medium)',
      calories: 105,
      carbs: 27,
      protein: 1.3,
      fat: 0.4,
      fiber: 3,
      sugars: 14,
      servingSize: '1 medium',
      confidence:  0.94,
      glycemicLoad: 12,
      insulinImpact: 'moderate',
      image: 'https://images.pexels.com/photos/61127/pexels-photo-61127.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    'salmon': {
      name: 'Grilled Salmon',
      calories: 206,
      carbs: 0,
      protein: 22,
      fat: 12,
      fiber: 0,
      sugars: 0,
      servingSize: '3.5 oz',
      confidence: 0.96,
      glycemicLoad: 0,
      insulinImpact: 'minimal',
      image: 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    'quinoa': {
      name: 'Quinoa (Cooked)',
      calories: 222,
      carbs: 39,
      protein: 8,
      fat: 4,
      fiber: 5,
      sugars: 2,
      servingSize: '1 cup',
      confidence: 0.89,
      glycemicLoad: 18,
      insulinImpact: 'moderate',
      image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#6B7280" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan and identify food items for accurate nutritional tracking and diabetes management.
          </Text>
          <Button
            title="Grant Camera Permission"
            onPress={requestPermission}
          />
        </View>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const processImageWithAI = async (imageUri: string) => {
    // Check if user is authenticated
    if (!user && !isGuest) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or continue as guest to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }

    // Check scan limit before processing
    if (!canScan) {
      setShowScanLimitNotification(true);
      return;
    }

    // Use a scan
    const scanUsed = await useScan();
    if (!scanUsed) {
      setShowScanLimitNotification(true);
      return;
    }

    setIsProcessing(true);
    clearError();
    
    try {
      // Check if offline and provide cached data
      if (isOffline) {
        const offlineData = await OfflineService.getOfflineData('food_database');
        if (!offlineData) {
          throw new Error('No offline data available for food recognition');
        }
      }

      // Medical compliance check first
      const userProfile = {
        userId: 'current_user_id', // Would come from auth
        carbRatio: 15,
        correctionFactor: 50,
        targetBG: 100,
        maxInsulinDose: 10
      };

      // Step 1: Process image with Camera Processing Agent
      const processedImage = await CameraProcessingAgent.processImage(imageUri, userProfile);
      
      // Step 2: Recognize food with AI
      const recognitionResults = await FoodRecognitionAgent.recognizeFood(imageUri);
      
      if (recognitionResults.length > 0) {
        const recognizedFood = recognitionResults[0];
        
        // Step 3: Estimate portion size
        const portionEstimate = await PortionSizeEstimator.estimatePortionSize(
          imageUri, 
          recognizedFood.name.toLowerCase()
        );
        
        // Step 4: Analyze nutrition
        const nutritionAnalysis = await NutritionAnalysisAgent.analyzeNutrition(
          recognizedFood.name,
          portionEstimate.weight
        );
        
        // Step 5: Medical AI Analysis with compliance
        const medicalAnalysis = await MedicalAIAgent.analyzeFoodForDiabetes(
          {
            foodType: recognizedFood.category,
            carbohydrates: nutritionAnalysis.macronutrients.carbohydrates,
            calories: nutritionAnalysis.calories,
            protein: nutritionAnalysis.macronutrients.protein,
            fat: nutritionAnalysis.macronutrients.fat,
            fiber: nutritionAnalysis.macronutrients.fiber,
            sugars: nutritionAnalysis.macronutrients.sugars,
            portionConfidence: recognizedFood.confidence
          },
          userProfile
        );

        // Create enhanced food item
        const enhancedFoodItem: FoodItem = {
          id: Date.now().toString(),
          name: recognizedFood.name,
          calories: nutritionAnalysis.calories,
          carbs: nutritionAnalysis.macronutrients.carbohydrates,
          protein: nutritionAnalysis.macronutrients.protein,
          fat: nutritionAnalysis.macronutrients.fat,
          fiber: nutritionAnalysis.macronutrients.fiber,
          sugars: nutritionAnalysis.macronutrients.sugars,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          servingSize: nutritionAnalysis.portionSize,
          confidence: recognizedFood.confidence,
          glycemicLoad: nutritionAnalysis.glycemicInfo.glycemicLoad,
          insulinImpact: nutritionAnalysis.glycemicInfo.insulinImpact,
          image: imageUri
        };
        
        // Show medical-compliant alert with educational content
        Alert.alert(
          '🏥 Medical AI Food Analysis',
          `${medicalAnalysis.educationalContent.primaryMessage}\n\n${medicalAnalysis.complianceData.disclaimer}\n\nDetected: ${recognizedFood.name}\nConfidence: ${Math.round(recognizedFood.confidence * 100)}%\nNet Carbs: ${medicalAnalysis.nutritionalAnalysis.netCarbs}g\nEducational Insulin Simulation: ${medicalAnalysis.insulinSimulation.totalInsulin} units\n\n${medicalAnalysis.safetyAssessment.warnings.join('\n')}\n\nWould you like to log this food for educational tracking?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Learn More', 
              onPress: () => {
                Alert.alert(
                  'Educational Information',
                  `${medicalAnalysis.educationalContent.glycemicEducation}\n\n${medicalAnalysis.educationalContent.timingEducation}\n\n${medicalAnalysis.educationalContent.safetyReminder}`
                );
              }
            },
            { 
              text: 'Log Food', 
              onPress: () => {
                addFoodToLog(enhancedFoodItem);
                setShowCamera(false);
              }
            },
          ]
        );
      } else {
        await handleMedicalError(
          new Error('Food recognition confidence too low for medical use'),
          'food_recognition'
        );
      }
    } catch (error) {
      if (isOffline) {
        await handleNetworkError(error, 'food_recognition_offline');
      } else {
        await handleMedicalError(error, 'ai_processing');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateBarcodeScanning = async () => {
    // Check if user is authenticated
    if (!user && !isGuest) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or continue as guest to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }

    // Check scan limit before processing
    if (!canScan) {
      setShowScanLimitNotification(true);
      return;
    }

    // Use a scan
    const scanUsed = await useScan();
    if (!scanUsed) {
      setShowScanLimitNotification(true);
      return;
    }

    setIsProcessing(true);
    clearError();
    
    try {
      // Queue operation if offline
      if (isOffline) {
        await OfflineService.queueOperation({
          type: 'api_call',
          endpoint: '/api/barcode-scan',
          method: 'POST',
          data: { barcode: '123456789012' }
        });
        
        // Try to get cached barcode data
        const cachedData = await OfflineService.getCachedData('barcode_123456789012');
        if (cachedData) {
          // Use cached data
          const foodItem: FoodItem = {
            id: Date.now().toString(),
            name: cachedData.name,
            calories: cachedData.calories,
            carbs: cachedData.carbs,
            protein: cachedData.protein,
            fat: cachedData.fat,
            fiber: cachedData.fiber,
            sugars: cachedData.sugars,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            servingSize: cachedData.servingSize,
            confidence: 0.98,
            glycemicLoad: Math.round(cachedData.carbs * 0.5),
            insulinImpact: cachedData.carbs > 15 ? 'moderate' : 'low'
          };
          addFoodToLog(foodItem);
          return;
        } else {
          throw new Error('No cached barcode data available offline');
        }
      }

      // Simulate barcode scanning
      const barcodeResult = await BarcodeScannerAgent.scanBarcode('123456789012');
      
      if (barcodeResult) {
        const product = barcodeResult.product;
        
        Alert.alert(
          '📦 Barcode Scanned!',
          `Product: ${product.name}\nBrand: ${product.brand}\nCalories: ${product.nutrition.calories}\nCarbs: ${product.nutrition.carbs}g\nSource: ${product.source}\n\nWould you like to log this food item?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Log Food', 
              onPress: () => {
                const foodItem: FoodItem = {
                  id: Date.now().toString(),
                  name: product.name,
                  calories: product.nutrition.calories,
                  carbs: product.nutrition.carbs,
                  protein: product.nutrition.protein,
                  fat: product.nutrition.fat,
                  fiber: product.nutrition.fiber,
                  sugars: product.nutrition.sugars,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  servingSize: product.nutrition.servingSize,
                  confidence: 0.98,
                  glycemicLoad: Math.round(product.nutrition.carbs * 0.5),
                  insulinImpact: product.nutrition.carbs > 15 ? 'moderate' : 'low'
                };
                addFoodToLog(foodItem);
              }
            },
          ]
        );
      } else {
          throw new Error('Barcode not found in database');
      }
    } catch (error) {
      if (isOffline) {
        await handleNetworkError(error, 'barcode_scanning_offline');
      } else {
        await handleNetworkError(error, 'barcode_scanning');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const addFoodToLog = (foodData: Omit<FoodItem, 'id' | 'time'> | FoodItem) => {
    const newFoodItem: FoodItem = {
      ...foodData,
      id: 'id' in foodData ? foodData.id : Date.now().toString(),
      time: 'time' in foodData ? foodData.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setRecentFoods([newFoodItem, ...recentFoods]);
  };

  const searchFoods = (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = Object.values(nutritionDatabase)
      .filter(food => 
        food.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(food => ({
        ...food,
        id: Date.now().toString() + Math.random(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

    setSearchResults(results);
  };

  const addManualFood = () => {
    if (!newFood.name.trim() || !newFood.calories.trim()) {
      // This would be handled by form validation in a real app
      return;
    }

    const foodItem: FoodItem = {
      id: Date.now().toString(),
      name: newFood.name,
      calories: parseFloat(newFood.calories) || 0,
      carbs: parseFloat(newFood.carbs) || 0,
      protein: parseFloat(newFood.protein) || 0,
      fat: parseFloat(newFood.fat) || 0,
      fiber: 0,
      sugars: 0,
      servingSize: newFood.servingSize || '1 serving',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 1.0,
      glycemicLoad: Math.round((parseFloat(newFood.carbs) || 0) * 0.5),
      insulinImpact: (parseFloat(newFood.carbs) || 0) > 15 ? 'moderate' : 'low'
    };

    setRecentFoods([foodItem, ...recentFoods]);
    setNewFood({ name: '', calories: '', carbs: '', protein: '', fat: '', servingSize: '' });
    setShowManualEntry(false);
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions} accessibilityRole="group" accessible={true} accessibilityLabel="Food tracking action buttons">
      <TouchableOpacity 
        style={[styles.actionButton, !canScan && styles.actionButtonDisabled]}
        onPress={() => setShowCamera(true)}
        disabled={!canScan}
        accessibilityRole="button"
        accessible={true}
        accessibilityLabel="AI Scan"
        accessibilityHint="Use AI to scan and recognize food items"
      >
        <View style={styles.actionIconContainer}>
          <Brain size={24} color={canScan ? "#2563EB" : "#9CA3AF"} />
        </View>
        <Text style={[styles.actionText, !canScan && styles.actionTextDisabled]}>AI Scan</Text>
        <Text style={[styles.actionSubtext, !canScan && styles.actionTextDisabled]}>
          {canScan ? 'Smart Recognition' : `${scansRemaining} left`}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, !canScan && styles.actionButtonDisabled]}
        onPress={simulateBarcodeScanning}
        disabled={!canScan}
        accessibilityRole="button"
        accessible={true}
        accessibilityLabel="Barcode Scanner"
        accessibilityHint="Scan product barcodes for nutrition information"
      >
        <View style={styles.actionIconContainer}>
          <Barcode size={24} color={canScan ? "#2563EB" : "#9CA3AF"} />
        </View>
        <Text style={[styles.actionText, !canScan && styles.actionTextDisabled]}>Barcode</Text>
        <Text style={[styles.actionSubtext, !canScan && styles.actionTextDisabled]}>
          {canScan ? 'Product Scan' : 'Upgrade needed'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => setShowManualEntry(true)}
        accessibilityRole="button"
        accessible={true}
        accessibilityLabel="Manual Entry"
        accessibilityHint="Manually add food information"
      >
        <View style={styles.actionIconContainer}>
          <Plus size={24} color="#2563EB" />
        </View>
        <Text style={styles.actionText}>Manual</Text>
        <Text style={styles.actionSubtext}>Add Entry</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => setShowSearch(true)}
        accessibilityRole="button"
        accessible={true}
        accessibilityLabel="Search Food Database"
        accessibilityHint="Search for food items in the database"
      >
        <View style={styles.actionIconContainer}>
          <Search size={24} color="#2563EB" />
        </View>
        <Text style={styles.actionText}>Search</Text>
        <Text style={styles.actionSubtext}>Food Database</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDailySummary = () => {
    const totalCalories = recentFoods.reduce((sum, food) => sum + food.calories, 0);
    const totalCarbs = recentFoods.reduce((sum, food) => sum + food.carbs, 0);
    const totalProtein = recentFoods.reduce((sum, food) => sum + food.protein, 0);
    const totalFat = recentFoods.reduce((sum, food) => sum + food.fat, 0);
    const avgGlycemicLoad = recentFoods.reduce((sum, food) => sum + (food.glycemicLoad || 0), 0) / recentFoods.length;

    return (
      <Card style={styles.dailySummary} accessibilityRole="summary" accessible={true} accessibilityLabel="Today's nutrition summary">
        <Text style={styles.summaryTitle}>Today's AI-Powered Summary</Text>
        <View style={styles.summaryGrid} accessibilityRole="group" accessible={true} accessibilityLabel="Nutrition totals">
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue} accessibilityLabel={`${Math.round(totalCalories)} calories consumed today`}>
              {Math.round(totalCalories)}
            </Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue} accessibilityLabel={`${Math.round(totalCarbs)} grams of carbohydrates`}>
              {Math.round(totalCarbs)}g
            </Text>
            <Text style={styles.summaryLabel}>Carbs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue} accessibilityLabel={`${Math.round(totalProtein)} grams of protein`}>
              {Math.round(totalProtein)}g
            </Text>
            <Text style={styles.summaryLabel}>Protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue} accessibilityLabel={`${Math.round(totalFat)} grams of fat`}>
              {Math.round(totalFat)}g
            </Text>
            <Text style={styles.summaryLabel}>Fat</Text>
          </View>
        </View>
        
        <View style={styles.insulinInsight} accessibilityRole="alert" accessible={true} accessibilityLabel="Insulin calculation insight">
          <Target size={16} color="#DC2626" />
          <Text style={styles.insulinText}>
            Avg Glycemic Load: {Math.round(avgGlycemicLoad)} | Est. Insulin: {Math.round(totalCarbs / 15 * 10) / 10} units
          </Text>
        </View>
      </Card>
    );
  };

  const renderRecentFoods = () => (
    <View style={styles.section} accessibilityRole="region" accessible={true} accessibilityLabel="Recent food entries">
      <Text style={styles.sectionTitle}>Recent AI-Analyzed Foods</Text>
      {recentFoods.map((food) => (
        <Card 
          key={food.id} 
          style={styles.foodItem}
          accessibilityRole="listitem"
          accessible={true}
          accessibilityLabel={`${food.name}, ${food.calories} calories, ${food.carbs} grams carbs, logged at ${food.time}`}
        >
          {food.image && (
            <Image 
              source={{ uri: food.image }} 
              style={styles.foodImage}
              accessibilityRole="image"
              accessible={true}
              accessibilityLabel={`Image of ${food.name}`}
            />
          )}
          <View style={styles.foodInfo}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{food.name}</Text>
              {food.confidence && (
                <View style={styles.confidenceContainer} accessibilityRole="text" accessible={true} accessibilityLabel={`AI confidence ${Math.round(food.confidence * 100)} percent`}>
                  <Zap size={12} color="#059669" />
                  <Text style={styles.confidenceText}>{Math.round(food.confidence * 100)}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.foodDetails}>
              {food.calories} cal • {food.carbs}g carbs • {food.protein}g protein
            </Text>
            {food.servingSize && (
              <Text style={styles.foodServing}>Serving: {food.servingSize}</Text>
            )}
            <View style={styles.foodMetrics}>
              <Text style={styles.foodTime}>{food.time}</Text>
              {food.glycemicLoad !== undefined && (
                <Text style={styles.glycemicLoad}>GL: {food.glycemicLoad}</Text>
              )}
              {food.insulinImpact && (
                <Text style={[
                  styles.insulinImpact,
                  { color: food.insulinImpact === 'minimal' ? '#059669' : 
                           food.insulinImpact === 'low' ? '#D97706' : '#DC2626' }
                ]}>
                  {food.insulinImpact} impact
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            accessibilityRole="button"
            accessible={true}
            accessibilityLabel={`Add ${food.name} to meal plan`}
            accessibilityHint="Tap to add this food item to your meal plan"
          >
            <Plus size={20} color="#2563EB" />
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.cameraButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>🧠 AI Food Recognition</Text>
              <TouchableOpacity style={styles.cameraButton} onPress={toggleCameraFacing}>
                <Text style={styles.cameraButtonText}>Flip</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Position food within the frame for AI analysis</Text>
              {isProcessing && (
                <View style={styles.processingIndicator}>
                  <Brain size={24} color="#2563EB" />
                  <Text style={styles.processingText}>AI Processing...</Text>
                </View>
              )}
            </View>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                onPress={() => processImageWithAI('simulated-image-uri')}
                disabled={isProcessing}
              >
                <View style={styles.captureButtonInner}>
                  {isProcessing ? (
                    <Brain size={24} color="#2563EB" />
                  ) : (
                    <Camera size={24} color="#2563EB" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View accessibilityRole="banner" accessible={true} accessibilityLabel="App header with title and status">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* Logo placeholder - replace with actual logo when uploaded */}
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🩺</Text>
            </View>
          </View>
          <Text style={styles.title}>AI Food Tracker</Text>
          <Text style={styles.subtitle}>Powered by advanced AI for diabetes management</Text>
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <WifiOff size={16} color="#D97706" />
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}
        </View>
      </View>

      <View accessibilityRole="navigation" accessible={true} accessibilityLabel="Quick action buttons for food tracking">
        <ScanLimitBanner />
        {renderQuickActions()}
      </View>

      <View accessibilityRole="main" accessible={true} accessibilityLabel="Main content area with food tracking and summary">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ErrorDisplay
          error={error}
          type={isOffline ? 'network' : 'general'}
          onDismiss={clearError}
          isOffline={isOffline}
        />

        <View accessibilityRole="complementary" accessible={true} accessibilityLabel="Daily nutrition summary">
          {renderDailySummary()}
        </View>
        
        <View accessibilityRole="region" accessible={true} accessibilityLabel="Recent food entries list">
          {renderRecentFoods()}
        </View>
      </ScrollView>
      </View>

      <SubscriptionNotification
        visible={showScanLimitNotification}
        onClose={() => setShowScanLimitNotification(false)}
        trigger="scan_limit"
      />

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        accessibilityViewIsModal={true}
      >
        <SafeAreaView style={styles.modalContainer} accessibilityRole="dialog" accessible={true} accessibilityLabel="Add food manually form">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowManualEntry(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Food Manually</Text>
            <TouchableOpacity onPress={addManualFood}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} accessibilityRole="form" accessible={true} accessibilityLabel="Food entry form fields">
            <Input
              label="Food Name"
              value={newFood.name}
              onChangeText={(text) => setNewFood({ ...newFood, name: text })}
              placeholder="e.g., Grilled Chicken"
              accessibilityHint="Enter the name of the food item"
            />

            <Input
              label="Calories"
              value={newFood.calories}
              onChangeText={(text) => setNewFood({ ...newFood, calories: text })}
              placeholder="e.g., 200"
              keyboardType="numeric"
              accessibilityHint="Enter the number of calories"
            />

            <Input
              label="Carbohydrates (g)"
              value={newFood.carbs}
              onChangeText={(text) => setNewFood({ ...newFood, carbs: text })}
              placeholder="e.g., 15"
              keyboardType="numeric"
              accessibilityHint="Enter carbohydrates in grams"
            />

            <Input
              label="Protein (g)"
              value={newFood.protein}
              onChangeText={(text) => setNewFood({ ...newFood, protein: text })}
              placeholder="e.g., 25"
              keyboardType="numeric"
              accessibilityHint="Enter protein in grams"
            />

            <Input
              label="Fat (g)"
              value={newFood.fat}
              onChangeText={(text) => setNewFood({ ...newFood, fat: text })}
              placeholder="e.g., 5"
              keyboardType="numeric"
              accessibilityHint="Enter fat in grams"
            />

            <Input
              label="Serving Size"
              value={newFood.servingSize}
              onChangeText={(text) => setNewFood({ ...newFood, servingSize: text })}
              placeholder="e.g., 1 cup, 6 oz"
              accessibilityHint="Enter the serving size description"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        accessibilityViewIsModal={true}
      >
        <SafeAreaView style={styles.modalContainer} accessibilityRole="dialog" accessible={true} accessibilityLabel="Search food database">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Foods</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.modalContent}>
            <Input
              label="Search for food"
              value={searchQuery}
              onChangeText={searchFoods}
              placeholder="Type food name..."
              accessibilityHint="Type to search for food items in the database"
            />

            <ScrollView 
              style={styles.searchResults} 
              accessibilityRole="list" 
              accessible={true} 
              accessibilityLabel="Search results list"
            >
              {searchResults.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    addFoodToLog(food);
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  accessibilityRole="button"
                  accessible={true}
                  accessibilityLabel={`Add ${food.name} to food log`}
                  accessibilityHint={`${food.calories} calories, ${food.carbs} grams of carbs`}
                >
                  {food.image && (
                    <Image 
                      source={{ uri: food.image }} 
                      style={styles.searchResultImage}
                      accessibilityRole="image"
                      accessible={true}
                      accessibilityLabel={`Image of ${food.name}`}
                    />
                  )}
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{food.name}</Text>
                    <Text style={styles.searchResultDetails}>
                      {food.calories} cal • {food.carbs}g carbs
                    </Text>
                    <Text style={styles.searchResultServing}>{food.servingSize}</Text>
                    {food.confidence && (
                      <Text style={styles.searchResultConfidence}>
                        AI Confidence: {Math.round(food.confidence * 100)}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#6B4EFF',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 4,
  },
  offlineText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFB74D',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#EAE6F7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 2,
  },
  actionTextDisabled: {
    color: '#9CA3AF',
  },
  actionSubtext: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  dailySummary: {
    margin: 20,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#6B4EFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  insulinInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  insulinText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFB74D',
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  foodName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    flex: 1,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#1CC7A8',
  },
  foodDetails: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  foodServing: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  foodMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  glycemicLoad: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFB74D',
  },
  insulinImpact: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  addButton: {
    backgroundColor: '#EAE6F7',
    borderRadius: 8,
    padding: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  cameraButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
    gap: 8,
  },
  processingText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234, 230, 247, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B4EFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 2,
  },
  searchResultDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  searchResultServing: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  searchResultConfidence: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1CC7A8',
    marginTop: 2,
  },
});