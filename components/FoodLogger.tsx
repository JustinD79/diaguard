import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Plus, 
  Camera, 
  Search, 
  Clock, 
  Utensils, 
  Calculator,
  TrendingUp,
  Target,
  X,
  Edit3
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FoodCameraScanner from '@/components/FoodCameraScanner';
import { Product, DiabetesInsights } from '@/services/FoodAPIService';

interface LoggedMeal {
  id: string;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Array<{
    product: Product;
    insights: DiabetesInsights;
    quantity: number;
  }>;
  totalCarbs: number;
  totalCalories: number;
  totalInsulin: number;
  notes?: string;
}

interface FoodLoggerProps {
  visible: boolean;
  onClose: () => void;
  onMealLogged: (meal: LoggedMeal) => void;
}

export default function FoodLogger({ visible, onClose, onMealLogged }: FoodLoggerProps) {
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [currentMeal, setCurrentMeal] = useState<Partial<LoggedMeal>>({
    foods: [],
    mealType: 'lunch',
    notes: '',
  });
  const [todaysMeals, setTodaysMeals] = useState<LoggedMeal[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualFood, setManualFood] = useState({
    name: '',
    carbs: '',
    calories: '',
    protein: '',
    fat: '',
  });

  useEffect(() => {
    if (visible) {
      loadTodaysMeals();
    }
  }, [visible]);

  const loadTodaysMeals = async () => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`meals_${today}`);
      if (stored) {
        const meals = JSON.parse(stored).map((meal: any) => ({
          ...meal,
          timestamp: new Date(meal.timestamp),
        }));
        setTodaysMeals(meals);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
  };

  const saveMeal = async (meal: LoggedMeal) => {
    try {
      const today = new Date().toDateString();
      const updatedMeals = [...todaysMeals, meal];
      await AsyncStorage.setItem(`meals_${today}`, JSON.stringify(updatedMeals));
      setTodaysMeals(updatedMeals);
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const handleFoodScanned = (product: Product, insights: DiabetesInsights) => {
    const newFood = {
      product,
      insights,
      quantity: 1,
    };

    setCurrentMeal(prev => ({
      ...prev,
      foods: [...(prev.foods || []), newFood],
    }));

    setShowCameraScanner(false);
    calculateMealTotals([...(currentMeal.foods || []), newFood]);
  };

  const handleManualFoodEntry = () => {
    if (!manualFood.name || !manualFood.carbs) {
      Alert.alert('Error', 'Please enter food name and carbs');
      return;
    }

    const product: Product = {
      id: `manual_${Date.now()}`,
      name: manualFood.name,
      brand: 'Manual Entry',
      nutrition: {
        calories: parseInt(manualFood.calories) || 0,
        carbs: parseFloat(manualFood.carbs),
        protein: parseFloat(manualFood.protein) || 0,
        fat: parseFloat(manualFood.fat) || 0,
        fiber: 0,
        sugars: 0,
        sodium: 0,
      },
      servingSize: '1 serving',
      servingWeight: 100,
      verified: false,
      source: 'Manual Entry',
    };

    const insights: DiabetesInsights = {
      isDiabetesFriendly: parseFloat(manualFood.carbs) <= 30,
      glycemicLoad: Math.round(parseFloat(manualFood.carbs) * 0.5),
      estimatedInsulinUnits: Math.round((parseFloat(manualFood.carbs) / 15) * 10) / 10,
      recommendations: [],
      bloodSugarImpact: parseFloat(manualFood.carbs) > 30 ? 'High' : 'Moderate',
    };

    handleFoodScanned(product, insights);
    setManualFood({ name: '', carbs: '', calories: '', protein: '', fat: '' });
    setShowManualEntry(false);
  };

  const calculateMealTotals = (foods: Array<{ product: Product; insights: DiabetesInsights; quantity: number }>) => {
    const totals = foods.reduce(
      (acc, food) => ({
        carbs: acc.carbs + (food.product.nutrition.carbs * food.quantity),
        calories: acc.calories + (food.product.nutrition.calories * food.quantity),
        insulin: acc.insulin + (food.insights.estimatedInsulinUnits * food.quantity),
      }),
      { carbs: 0, calories: 0, insulin: 0 }
    );

    setCurrentMeal(prev => ({
      ...prev,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalCalories: Math.round(totals.calories),
      totalInsulin: Math.round(totals.insulin * 10) / 10,
    }));
  };

  const logMeal = () => {
    if (!currentMeal.foods || currentMeal.foods.length === 0) {
      Alert.alert('Error', 'Please add at least one food item');
      return;
    }

    const meal: LoggedMeal = {
      id: `meal_${Date.now()}`,
      timestamp: new Date(),
      mealType: currentMeal.mealType || 'lunch',
      foods: currentMeal.foods,
      totalCarbs: currentMeal.totalCarbs || 0,
      totalCalories: currentMeal.totalCalories || 0,
      totalInsulin: currentMeal.totalInsulin || 0,
      notes: currentMeal.notes,
    };

    saveMeal(meal);
    onMealLogged(meal);
    
    // Reset current meal
    setCurrentMeal({ foods: [], mealType: 'lunch', notes: '' });
    
    Alert.alert(
      'Meal Logged!',
      `Successfully logged ${meal.foods.length} food item(s)\nTotal carbs: ${meal.totalCarbs}g\nRecommended insulin: ${meal.totalInsulin} units`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const removeFoodItem = (index: number) => {
    const updatedFoods = currentMeal.foods?.filter((_, i) => i !== index) || [];
    setCurrentMeal(prev => ({ ...prev, foods: updatedFoods }));
    calculateMealTotals(updatedFoods);
  };

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  const renderMealTypeSelector = () => (
    <Card style={styles.mealTypeCard}>
      <Text style={styles.sectionTitle}>Meal Type</Text>
      <View style={styles.mealTypeButtons}>
        {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.mealTypeButton,
              currentMeal.mealType === type && styles.mealTypeButtonSelected
            ]}
            onPress={() => setCurrentMeal(prev => ({ ...prev, mealType: type as any }))}
          >
            <Text style={styles.mealTypeEmoji}>{getMealTypeIcon(type)}</Text>
            <Text style={[
              styles.mealTypeText,
              currentMeal.mealType === type && styles.mealTypeTextSelected
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );

  const renderAddFoodOptions = () => (
    <Card style={styles.addFoodCard}>
      <Text style={styles.sectionTitle}>Add Food Items</Text>
      
      <View style={styles.addFoodButtons}>
        <TouchableOpacity
          style={styles.addFoodButton}
          onPress={() => setShowCameraScanner(true)}
        >
          <Camera size={24} color="#2563EB" />
          <Text style={styles.addFoodButtonText}>Scan with Camera</Text>
          <Text style={styles.addFoodButtonSubtext}>AI-powered recognition</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addFoodButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Edit3 size={24} color="#059669" />
          <Text style={styles.addFoodButtonText}>Manual Entry</Text>
          <Text style={styles.addFoodButtonSubtext}>Enter nutrition manually</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addFoodButton}
          onPress={() => Alert.alert('Coming Soon', 'Search food database feature coming soon!')}
        >
          <Search size={24} color="#8B5CF6" />
          <Text style={styles.addFoodButtonText}>Search Database</Text>
          <Text style={styles.addFoodButtonSubtext}>Find from database</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderCurrentMeal = () => {
    if (!currentMeal.foods || currentMeal.foods.length === 0) {
      return (
        <Card style={styles.emptyMealCard}>
          <Utensils size={48} color="#9CA3AF" />
          <Text style={styles.emptyMealText}>No food items added yet</Text>
          <Text style={styles.emptyMealSubtext}>
            Use the camera to scan food or add items manually
          </Text>
        </Card>
      );
    }

    return (
      <Card style={styles.currentMealCard}>
        <Text style={styles.sectionTitle}>Current Meal</Text>
        
        <View style={styles.foodList}>
          {currentMeal.foods.map((food, index) => (
            <View key={index} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodItemName}>{food.product.name}</Text>
                <Text style={styles.foodItemNutrition}>
                  {food.product.nutrition.carbs}g carbs • {food.product.nutrition.calories} cal
                </Text>
                <Text style={styles.foodItemInsulin}>
                  Insulin: {food.insights.estimatedInsulinUnits} units
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFoodItem(index)}
              >
                <X size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.mealTotals}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{currentMeal.totalCarbs || 0}g</Text>
            <Text style={styles.totalLabel}>Total Carbs</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{currentMeal.totalCalories || 0}</Text>
            <Text style={styles.totalLabel}>Total Calories</Text>
          </View>
          <View style={[styles.totalItem, styles.insulinTotal]}>
            <Text style={[styles.totalValue, { color: '#2563EB' }]}>
              {currentMeal.totalInsulin || 0}
            </Text>
            <Text style={styles.totalLabel}>Total Insulin (units)</Text>
          </View>
        </View>

        <Input
          label="Meal Notes (optional)"
          value={currentMeal.notes || ''}
          onChangeText={(text) => setCurrentMeal(prev => ({ ...prev, notes: text }))}
          placeholder="Add any notes about this meal..."
          multiline
          numberOfLines={2}
        />
      </Card>
    );
  };

  const renderTodaysSummary = () => {
    const todaysTotal = todaysMeals.reduce(
      (acc, meal) => ({
        carbs: acc.carbs + meal.totalCarbs,
        calories: acc.calories + meal.totalCalories,
        insulin: acc.insulin + meal.totalInsulin,
      }),
      { carbs: 0, calories: 0, insulin: 0 }
    );

    return (
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Math.round(todaysTotal.carbs)}g</Text>
            <Text style={styles.summaryLabel}>Carbs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Math.round(todaysTotal.calories)}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#2563EB' }]}>
              {Math.round(todaysTotal.insulin * 10) / 10}
            </Text>
            <Text style={styles.summaryLabel}>Insulin (units)</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todaysMeals.length}</Text>
            <Text style={styles.summaryLabel}>Meals</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderManualEntryModal = () => (
    <Modal
      visible={showManualEntry}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowManualEntry(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Manual Food Entry</Text>
          <TouchableOpacity onPress={handleManualFoodEntry}>
            <Text style={styles.modalSave}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Input
            label="Food Name *"
            value={manualFood.name}
            onChangeText={(text) => setManualFood({ ...manualFood, name: text })}
            placeholder="e.g., Grilled Chicken Breast"
          />

          <Input
            label="Carbohydrates (g) *"
            value={manualFood.carbs}
            onChangeText={(text) => setManualFood({ ...manualFood, carbs: text })}
            placeholder="e.g., 25"
            keyboardType="numeric"
          />

          <Input
            label="Calories"
            value={manualFood.calories}
            onChangeText={(text) => setManualFood({ ...manualFood, calories: text })}
            placeholder="e.g., 180"
            keyboardType="numeric"
          />

          <Input
            label="Protein (g)"
            value={manualFood.protein}
            onChangeText={(text) => setManualFood({ ...manualFood, protein: text })}
            placeholder="e.g., 30"
            keyboardType="numeric"
          />

          <Input
            label="Fat (g)"
            value={manualFood.fat}
            onChangeText={(text) => setManualFood({ ...manualFood, fat: text })}
            placeholder="e.g., 5"
            keyboardType="numeric"
          />

          <View style={styles.manualEntryInfo}>
            <Text style={styles.infoTitle}>💡 Manual Entry Tips</Text>
            <Text style={styles.infoText}>
              • Use nutrition labels when available{'\n'}
              • Estimate portions using your hand as a guide{'\n'}
              • 1 cup = closed fist, 1 oz = thumb{'\n'}
              • When in doubt, slightly overestimate carbs
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food Logger</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {renderTodaysSummary()}
          {renderMealTypeSelector()}
          {renderAddFoodOptions()}
          {renderCurrentMeal()}

          {currentMeal.foods && currentMeal.foods.length > 0 && (
            <View style={styles.logMealSection}>
              <Button
                title={`Log ${currentMeal.mealType || 'Meal'}`}
                onPress={logMeal}
                style={styles.logMealButton}
              />
            </View>
          )}
        </ScrollView>

        <FoodCameraScanner
          visible={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onFoodAnalyzed={handleFoodScanned}
        />

        {renderManualEntryModal()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCard: {
    marginBottom: 20,
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  mealTypeCard: {
    marginBottom: 20,
    padding: 20,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  mealTypeButtonSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#2563EB',
  },
  mealTypeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  mealTypeTextSelected: {
    color: '#2563EB',
  },
  addFoodCard: {
    marginBottom: 20,
    padding: 20,
  },
  addFoodButtons: {
    gap: 12,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  addFoodButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  addFoodButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyMealCard: {
    alignItems: 'center',
    padding: 40,
    marginBottom: 20,
  },
  emptyMealText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyMealSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  currentMealCard: {
    marginBottom: 20,
    padding: 20,
  },
  foodList: {
    gap: 12,
    marginBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  foodItemNutrition: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  foodItemInsulin: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTotals: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  insulinTotal: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 8,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  logMealSection: {
    marginTop: 20,
  },
  logMealButton: {
    backgroundColor: '#059669',
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
    color: '#111827',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  manualEntryInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
});