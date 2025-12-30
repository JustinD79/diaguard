import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  X,
  Scale,
  Utensils,
  Hand,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react-native';
import {
  PortionSizeEstimator,
  PortionGuide,
  HouseholdMeasurement,
} from '@/services/PortionSizeEstimator';

interface PortionGuideModalProps {
  visible: boolean;
  onClose: () => void;
  foodName?: string;
}

export function PortionGuideModal({ visible, onClose, foodName }: PortionGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'guides' | 'measurements' | 'hand'>('guides');
  const [portionGuides, setPortionGuides] = useState<PortionGuide[]>([]);
  const [householdMeasurements, setHouseholdMeasurements] = useState<HouseholdMeasurement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [specificGuide, setSpecificGuide] = useState<ReturnType<typeof PortionSizeEstimator.getVisualGuideForFood>>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, foodName]);

  const loadData = async () => {
    const guides = await PortionSizeEstimator.getPortionGuides();
    setPortionGuides(guides);
    setHouseholdMeasurements(PortionSizeEstimator.getHouseholdMeasurements());

    if (foodName) {
      const guide = PortionSizeEstimator.getVisualGuideForFood(foodName);
      setSpecificGuide(guide);
    }
  };

  const categories = PortionSizeEstimator.getPortionCategories();

  const filteredGuides = selectedCategory
    ? portionGuides.filter(g => g.food_category === selectedCategory)
    : portionGuides;

  const handPortionGuides = [
    {
      part: 'Palm',
      icon: '🤚',
      equals: '3 oz of protein',
      examples: ['Chicken breast', 'Fish fillet', 'Lean beef'],
      description: 'Use your palm (without fingers) to measure a serving of meat or fish',
    },
    {
      part: 'Fist',
      icon: '✊',
      equals: '1 cup',
      examples: ['Cooked rice', 'Pasta', 'Vegetables', 'Cereal'],
      description: 'Your closed fist equals about 1 cup of grains or vegetables',
    },
    {
      part: 'Cupped Hand',
      icon: '🤲',
      equals: '1/2 cup',
      examples: ['Cooked pasta', 'Cooked rice', 'Ice cream', 'Nuts'],
      description: 'Your cupped palm measures about 1/2 cup of foods',
    },
    {
      part: 'Thumb',
      icon: '👍',
      equals: '1 tbsp or 1 oz cheese',
      examples: ['Peanut butter', 'Cheese', 'Salad dressing'],
      description: 'Your whole thumb equals about 1 tablespoon or 1 oz of cheese',
    },
    {
      part: 'Thumb Tip',
      icon: '👆',
      equals: '1 tsp',
      examples: ['Oil', 'Butter', 'Mayonnaise'],
      description: 'The tip of your thumb (to first joint) equals about 1 teaspoon',
    },
    {
      part: 'Two Fingers',
      icon: '✌️',
      equals: '1 oz',
      examples: ['Cheese stick', 'Deli meat'],
      description: 'Two fingers held together approximate 1 oz of cheese or meat',
    },
    {
      part: 'Handful',
      icon: '🫳',
      equals: '1 oz nuts or snack',
      examples: ['Almonds', 'Chips', 'Pretzels', 'Raisins'],
      description: 'A small handful measures about 1 oz of small foods',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Portion Size Guide</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {specificGuide && (
            <View style={styles.specificGuideCard}>
              <View style={styles.specificGuideHeader}>
                <Info size={18} color="#2563eb" />
                <Text style={styles.specificGuideTitle}>
                  Guide for {foodName}
                </Text>
              </View>
              <View style={styles.specificGuideContent}>
                <View style={styles.guideRow}>
                  <Text style={styles.guideLabel}>Standard Portion:</Text>
                  <Text style={styles.guideValue}>{specificGuide.portion}</Text>
                </View>
                <View style={styles.guideRow}>
                  <Text style={styles.guideLabel}>Visual Guide:</Text>
                  <Text style={styles.guideValue}>{specificGuide.visualGuide}</Text>
                </View>
                <View style={styles.guideRow}>
                  <Text style={styles.guideLabel}>Calories:</Text>
                  <Text style={styles.guideValue}>{specificGuide.calorieEstimate}</Text>
                </View>
                <View style={styles.guideRow}>
                  <Text style={styles.guideLabel}>Carbs:</Text>
                  <Text style={styles.guideValue}>{specificGuide.carbEstimate}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'guides' && styles.activeTab]}
              onPress={() => setActiveTab('guides')}
            >
              <Utensils size={16} color={activeTab === 'guides' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === 'guides' && styles.activeTabText]}>
                Food Guides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'measurements' && styles.activeTab]}
              onPress={() => setActiveTab('measurements')}
            >
              <Scale size={16} color={activeTab === 'measurements' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === 'measurements' && styles.activeTabText]}>
                Measurements
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'hand' && styles.activeTab]}
              onPress={() => setActiveTab('hand')}
            >
              <Hand size={16} color={activeTab === 'hand' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === 'hand' && styles.activeTabText]}>
                Hand Guide
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'guides' && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScroll}
                  contentContainerStyle={styles.categoriesContent}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      !selectedCategory && styles.activeCategoryChip,
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        !selectedCategory && styles.activeCategoryText,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.activeCategoryChip,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === category && styles.activeCategoryText,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filteredGuides.map((guide, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.guideCard}
                    onPress={() =>
                      setExpandedGuide(
                        expandedGuide === guide.food_item ? null : guide.food_item
                      )
                    }
                  >
                    <View style={styles.guideCardHeader}>
                      <View>
                        <Text style={styles.guideFoodName}>{guide.food_item}</Text>
                        <Text style={styles.guideVisual}>{guide.visual_reference}</Text>
                      </View>
                      {expandedGuide === guide.food_item ? (
                        <ChevronUp size={20} color="#6b7280" />
                      ) : (
                        <ChevronDown size={20} color="#6b7280" />
                      )}
                    </View>

                    {expandedGuide === guide.food_item && (
                      <View style={styles.guideCardExpanded}>
                        <View style={styles.guideDetail}>
                          <Text style={styles.guideDetailLabel}>Household Measure</Text>
                          <Text style={styles.guideDetailValue}>
                            {guide.household_measurement}
                          </Text>
                        </View>
                        <View style={styles.guideDetail}>
                          <Text style={styles.guideDetailLabel}>Weight</Text>
                          <Text style={styles.guideDetailValue}>
                            {guide.weight_grams}g
                            {guide.volume_ml ? ` / ${guide.volume_ml}ml` : ''}
                          </Text>
                        </View>
                        {guide.equivalent_descriptions && (
                          <View style={styles.guideDetail}>
                            <Text style={styles.guideDetailLabel}>Visual Comparisons</Text>
                            <View style={styles.equivalentsList}>
                              {guide.equivalent_descriptions.map((desc, i) => (
                                <Text key={i} style={styles.equivalentItem}>
                                  • {desc}
                                </Text>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === 'measurements' && (
              <View>
                <Text style={styles.sectionDescription}>
                  Convert between common household measurements and grams
                </Text>
                {householdMeasurements.map((measurement, index) => (
                  <View key={index} style={styles.measurementCard}>
                    <View style={styles.measurementHeader}>
                      <Text style={styles.measurementName}>{measurement.name}</Text>
                      <Text style={styles.measurementAbbr}>({measurement.abbreviation})</Text>
                    </View>
                    <View style={styles.measurementDetails}>
                      <View style={styles.measurementValue}>
                        <Text style={styles.measurementNumber}>{measurement.grams}</Text>
                        <Text style={styles.measurementUnit}>grams</Text>
                      </View>
                      {measurement.ml && (
                        <View style={styles.measurementValue}>
                          <Text style={styles.measurementNumber}>{measurement.ml}</Text>
                          <Text style={styles.measurementUnit}>ml</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.visualComparison}>
                      Visual: {measurement.visualComparison}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'hand' && (
              <View>
                <Text style={styles.sectionDescription}>
                  Use your hand as a portable measuring tool - always available!
                </Text>
                {handPortionGuides.map((guide, index) => (
                  <View key={index} style={styles.handGuideCard}>
                    <View style={styles.handGuideHeader}>
                      <Text style={styles.handIcon}>{guide.icon}</Text>
                      <View style={styles.handGuideInfo}>
                        <Text style={styles.handPart}>{guide.part}</Text>
                        <Text style={styles.handEquals}>= {guide.equals}</Text>
                      </View>
                    </View>
                    <Text style={styles.handDescription}>{guide.description}</Text>
                    <View style={styles.handExamples}>
                      <Text style={styles.handExamplesLabel}>Examples:</Text>
                      <Text style={styles.handExamplesText}>
                        {guide.examples.join(', ')}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.tipCard}>
                  <Text style={styles.tipTitle}>Pro Tips</Text>
                  <Text style={styles.tipText}>
                    • Hand sizes vary - adjust portions if you have larger or smaller hands
                  </Text>
                  <Text style={styles.tipText}>
                    • Use a food scale occasionally to calibrate your hand measurements
                  </Text>
                  <Text style={styles.tipText}>
                    • These are estimates - when in doubt, measure precisely
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  specificGuideCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
  },
  specificGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  specificGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  specificGuideContent: {
    gap: 8,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  guideLabel: {
    fontSize: 14,
    color: '#3b82f6',
  },
  guideValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginVertical: 12,
    textAlign: 'center',
  },
  categoriesScroll: {
    marginVertical: 12,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  activeCategoryChip: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    fontSize: 13,
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#fff',
  },
  guideCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideFoodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  guideVisual: {
    fontSize: 13,
    color: '#6b7280',
  },
  guideCardExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  guideDetail: {},
  guideDetailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  guideDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  equivalentsList: {
    marginTop: 4,
  },
  equivalentItem: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  measurementCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  measurementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  measurementAbbr: {
    fontSize: 13,
    color: '#6b7280',
  },
  measurementDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  measurementValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  measurementNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
  },
  measurementUnit: {
    fontSize: 13,
    color: '#6b7280',
  },
  visualComparison: {
    fontSize: 13,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  handGuideCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  handGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  handIcon: {
    fontSize: 32,
  },
  handGuideInfo: {},
  handPart: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  handEquals: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  handDescription: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
  },
  handExamples: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
  },
  handExamplesLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  handExamplesText: {
    fontSize: 13,
    color: '#1f2937',
  },
  tipCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
});
