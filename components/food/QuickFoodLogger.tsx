import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Clock, Heart, RefreshCw, Search, Plus, ChevronRight } from 'lucide-react-native';
import { FoodFavoritesService, FoodFavorite, RecentMeal, FoodSuggestion } from '@/services/FoodFavoritesService';
import { useAuth } from '@/contexts/AuthContext';

interface QuickFoodLoggerProps {
  onFoodLogged?: () => void;
  mealType?: string;
}

export function QuickFoodLogger({ onFoodLogged, mealType }: QuickFoodLoggerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'favorites' | 'recent'>('suggestions');
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loggingId, setLoggingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, mealType]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [suggestionsData, favoritesData, recentData] = await Promise.all([
        FoodFavoritesService.getTimeBasedSuggestions(user.id, 8),
        FoodFavoritesService.getFavorites(user.id, mealType),
        FoodFavoritesService.getFrequentMeals(user.id, 10),
      ]);

      setSuggestions(suggestionsData);
      setFavorites(favoritesData);
      setRecentMeals(recentData);
    } catch (error) {
      console.error('Error loading quick food data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogFavorite = async (favorite: FoodFavorite) => {
    if (!user?.id) return;
    setLoggingId(favorite.id);

    try {
      const success = await FoodFavoritesService.logFavoriteFood(user.id, favorite);
      if (success) {
        onFoodLogged?.();
        loadData();
      }
    } catch (error) {
      console.error('Error logging favorite:', error);
    } finally {
      setLoggingId(null);
    }
  };

  const handleRepeatMeal = async (meal: RecentMeal) => {
    if (!user?.id) return;
    setLoggingId(meal.id);

    try {
      const success = await FoodFavoritesService.repeatMeal(user.id, meal.id);
      if (success) {
        onFoodLogged?.();
        loadData();
      }
    } catch (error) {
      console.error('Error repeating meal:', error);
    } finally {
      setLoggingId(null);
    }
  };

  const filteredFavorites = favorites.filter(f =>
    f.food_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecentMeals = recentMeals.filter(m =>
    m.meal_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your foods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your foods..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Clock size={16} color={activeTab === 'suggestions' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'suggestions' && styles.activeTabText]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Heart size={16} color={activeTab === 'favorites' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
            Favorites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <RefreshCw size={16} color={activeTab === 'recent' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
            Eat Again
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'suggestions' && (
          <View>
            <Text style={styles.sectionTitle}>Suggested for you</Text>
            {suggestions.length === 0 ? (
              <Text style={styles.emptyText}>
                Log more meals to get personalized suggestions
              </Text>
            ) : (
              suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.food_identifier}
                  style={styles.foodItem}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{suggestion.food_name}</Text>
                    <Text style={styles.foodMeta}>
                      Logged {suggestion.usage_count} time{suggestion.usage_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'favorites' && (
          <View>
            <Text style={styles.sectionTitle}>
              {filteredFavorites.length} Favorite{filteredFavorites.length !== 1 ? 's' : ''}
            </Text>
            {filteredFavorites.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery ? 'No favorites match your search' : 'No favorites yet. Tap the heart on foods to save them.'}
              </Text>
            ) : (
              filteredFavorites.map((favorite) => (
                <TouchableOpacity
                  key={favorite.id}
                  style={styles.foodItem}
                  onPress={() => handleLogFavorite(favorite)}
                  disabled={loggingId === favorite.id}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{favorite.food_name}</Text>
                    <Text style={styles.foodMeta}>
                      {favorite.nutrition_data.calories} cal | {favorite.nutrition_data.carbs}g carbs
                    </Text>
                  </View>
                  {loggingId === favorite.id ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <TouchableOpacity
                      style={styles.logButton}
                      onPress={() => handleLogFavorite(favorite)}
                    >
                      <Plus size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'recent' && (
          <View>
            <Text style={styles.sectionTitle}>Frequently eaten meals</Text>
            {filteredRecentMeals.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery ? 'No meals match your search' : 'Eat meals multiple times to see them here'}
              </Text>
            ) : (
              filteredRecentMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.foodItem}
                  onPress={() => handleRepeatMeal(meal)}
                  disabled={loggingId === meal.id}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{meal.meal_name}</Text>
                    <Text style={styles.foodMeta}>
                      {meal.total_nutrition.calories} cal | Eaten {meal.times_repeated}x
                    </Text>
                  </View>
                  {loggingId === meal.id ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <TouchableOpacity
                      style={styles.repeatButton}
                      onPress={() => handleRepeatMeal(meal)}
                    >
                      <RefreshCw size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  foodMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  logButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
