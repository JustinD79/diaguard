import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Clock, Users, ChefHat, Heart, Star, Plus } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import { RecipeIntelligenceAgent, Recipe, RecipeFilters } from '@/services/RecipeIntelligenceAgent';

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllRecipes, setShowAllRecipes] = useState(false);

  const [filters, setFilters] = useState<RecipeFilters>({
    diabeticFriendly: true,
    maxCarbs: undefined,
    minProtein: undefined,
    maxCalories: undefined,
    tags: [],
    difficulty: undefined,
    maxPrepTime: undefined,
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    searchRecipes();
  }, [searchQuery, filters, recipes]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const allRecipes = await RecipeIntelligenceAgent.searchRecipes('', { diabeticFriendly: true });
      setRecipes(allRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRecipes = async () => {
    try {
      const results = await RecipeIntelligenceAgent.searchRecipes(searchQuery, filters);
      setFilteredRecipes(results);
    } catch (error) {
      console.error('Error searching recipes:', error);
    }
  };

  const openRecipeDetail = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDetail(true);
  };

  const renderRecipeCard = ({ item: recipe }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => openRecipeDetail(recipe)}
    >
      <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {recipe.description}
        </Text>
        
        <View style={styles.recipeStats}>
          <View style={styles.statItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.statText}>{recipe.prepTime + recipe.cookTime}m</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={14} color="#6B7280" />
            <Text style={styles.statText}>{recipe.servings}</Text>
          </View>
          <View style={styles.statItem}>
            <ChefHat size={14} color="#6B7280" />
            <Text style={styles.statText}>{recipe.difficulty}</Text>
          </View>
        </View>

        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionText}>{recipe.calories} cal</Text>
          <Text style={styles.nutritionText}>{recipe.carbs}g carbs</Text>
          <Text style={styles.nutritionText}>{recipe.protein}g protein</Text>
        </View>

        <View style={styles.tagsContainer}>
          {recipe.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {recipe.diabeticFriendly && (
            <View style={[styles.tag, styles.diabeticTag]}>
              <Heart size={12} color="#059669" />
              <Text style={[styles.tagText, { color: '#059669' }]}>Diabetic Friendly</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedRecipes = () => {
    const featured = filteredRecipes.slice(0, showAllRecipes ? filteredRecipes.length : 6);
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : 'Diabetic-Friendly Recipes'}
          </Text>
          {!searchQuery && filteredRecipes.length > 6 && (
            <TouchableOpacity
              style={styles.seeMoreButton}
              onPress={() => setShowAllRecipes(!showAllRecipes)}
            >
              <Text style={styles.seeMoreText}>
                {showAllRecipes ? 'Show Less' : 'See More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={featured}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.recipeRow}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderQuickFilters = () => (
    <View style={styles.quickFilters}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            filters.diabeticFriendly && styles.quickFilterButtonActive
          ]}
          onPress={() => setFilters({ ...filters, diabeticFriendly: !filters.diabeticFriendly })}
        >
          <Heart size={16} color={filters.diabeticFriendly ? '#FFFFFF' : '#6B7280'} />
          <Text style={[
            styles.quickFilterText,
            filters.diabeticFriendly && styles.quickFilterTextActive
          ]}>
            Diabetic Friendly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            filters.tags?.includes('low-carb') && styles.quickFilterButtonActive
          ]}
          onPress={() => {
            const newTags = filters.tags?.includes('low-carb')
              ? filters.tags.filter(tag => tag !== 'low-carb')
              : [...(filters.tags || []), 'low-carb'];
            setFilters({ ...filters, tags: newTags });
          }}
        >
          <Text style={[
            styles.quickFilterText,
            filters.tags?.includes('low-carb') && styles.quickFilterTextActive
          ]}>
            Low Carb
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            filters.tags?.includes('high-protein') && styles.quickFilterButtonActive
          ]}
          onPress={() => {
            const newTags = filters.tags?.includes('high-protein')
              ? filters.tags.filter(tag => tag !== 'high-protein')
              : [...(filters.tags || []), 'high-protein'];
            setFilters({ ...filters, tags: newTags });
          }}
        >
          <Text style={[
            styles.quickFilterText,
            filters.tags?.includes('high-protein') && styles.quickFilterTextActive
          ]}>
            High Protein
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            filters.difficulty === 'easy' && styles.quickFilterButtonActive
          ]}
          onPress={() => setFilters({ 
            ...filters, 
            difficulty: filters.difficulty === 'easy' ? undefined : 'easy' 
          })}
        >
          <Text style={[
            styles.quickFilterText,
            filters.difficulty === 'easy' && styles.quickFilterTextActive
          ]}>
            Easy
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderRecipeDetail = () => {
    if (!selectedRecipe) return null;

    return (
      <Modal
        visible={showRecipeDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRecipeDetail(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedRecipe.name}</Text>
            <TouchableOpacity>
              <Star size={24} color="#D97706" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.recipeDetailContent}>
            <Image source={{ uri: selectedRecipe.image }} style={styles.recipeDetailImage} />
            
            <View style={styles.recipeDetailInfo}>
              <Text style={styles.recipeDetailDescription}>
                {selectedRecipe.description}
              </Text>

              <View style={styles.recipeDetailStats}>
                <View style={styles.detailStatItem}>
                  <Clock size={20} color="#2563EB" />
                  <Text style={styles.detailStatLabel}>Total Time</Text>
                  <Text style={styles.detailStatValue}>
                    {selectedRecipe.prepTime + selectedRecipe.cookTime} min
                  </Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Users size={20} color="#2563EB" />
                  <Text style={styles.detailStatLabel}>Servings</Text>
                  <Text style={styles.detailStatValue}>{selectedRecipe.servings}</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <ChefHat size={20} color="#2563EB" />
                  <Text style={styles.detailStatLabel}>Difficulty</Text>
                  <Text style={styles.detailStatValue}>{selectedRecipe.difficulty}</Text>
                </View>
              </View>

              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}>Nutrition Per Serving</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedRecipe.calories}</Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedRecipe.carbs}g</Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedRecipe.protein}g</Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedRecipe.fat}g</Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {selectedRecipe.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={styles.ingredientText}>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((instruction, index) => (
                  <View key={index} style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.diabetesInfo}>
                <Text style={styles.sectionTitle}>Diabetes Information</Text>
                <View style={styles.diabetesInfoItem}>
                  <Text style={styles.diabetesInfoLabel}>Glycemic Load:</Text>
                  <Text style={styles.diabetesInfoValue}>{selectedRecipe.glycemicLoad}</Text>
                </View>
                <View style={styles.diabetesInfoItem}>
                  <Text style={styles.diabetesInfoLabel}>Estimated Insulin:</Text>
                  <Text style={styles.diabetesInfoValue}>
                    {Math.round((selectedRecipe.carbs / 15) * 10) / 10} units (1:15 ratio)
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
        <Text style={styles.subtitle}>Diabetes-friendly recipes for healthy living</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {renderQuickFilters()}

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderFeaturedRecipes()}
      </ScrollView>

      {renderRecipeDetail()}
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
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  filterButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFilters: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickFilterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  quickFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  seeMoreButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seeMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  recipeRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  recipeInfo: {
    padding: 12,
  },
  recipeName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nutritionText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  diabeticTag: {
    backgroundColor: '#ECFDF5',
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
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
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  recipeDetailContent: {
    flex: 1,
  },
  recipeDetailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  recipeDetailInfo: {
    padding: 20,
  },
  recipeDetailDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  recipeDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailStatItem: {
    alignItems: 'center',
    gap: 8,
  },
  detailStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  detailStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  nutritionSection: {
    marginBottom: 24,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  ingredientsSection: {
    marginBottom: 24,
  },
  ingredientItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  instructionsSection: {
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 16,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  diabetesInfo: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  diabetesInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  diabetesInfoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  diabetesInfoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
});