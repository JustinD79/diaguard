import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Search,
  MapPin,
  ChevronRight,
  X,
  Plus,
  Filter,
  Leaf,
  AlertTriangle,
} from 'lucide-react-native';
import {
  RestaurantDatabaseService,
  RestaurantChain,
  RestaurantMenuItem,
} from '@/services/RestaurantDatabaseService';
import { useAuth } from '@/contexts/AuthContext';

interface RestaurantBrowserProps {
  onItemLogged?: () => void;
  mealType?: string;
}

export function RestaurantBrowser({ onItemLogged, mealType }: RestaurantBrowserProps) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<RestaurantChain[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantChain | null>(null);
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RestaurantMenuItem | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [maxCarbs, setMaxCarbs] = useState<number | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const data = await RestaurantDatabaseService.getPopularRestaurants(50);
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadRestaurants();
      return;
    }

    setLoading(true);
    try {
      const data = await RestaurantDatabaseService.searchRestaurants(searchQuery, 30);
      setRestaurants(data);
    } catch (error) {
      console.error('Error searching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = async (restaurant: RestaurantChain) => {
    setSelectedRestaurant(restaurant);
    setLoadingMenu(true);
    setSelectedCategory(null);

    try {
      const [menu, cats] = await Promise.all([
        RestaurantDatabaseService.getRestaurantMenu(restaurant.id),
        RestaurantDatabaseService.getMenuCategories(restaurant.id),
      ]);
      setMenuItems(menu);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleCategorySelect = async (category: string | null) => {
    setSelectedCategory(category);
    if (!selectedRestaurant) return;

    setLoadingMenu(true);
    try {
      let items: RestaurantMenuItem[];

      if (maxCarbs) {
        items = await RestaurantDatabaseService.getLowCarbOptions(
          selectedRestaurant.id,
          maxCarbs
        );
      } else {
        items = await RestaurantDatabaseService.getRestaurantMenu(
          selectedRestaurant.id,
          category || undefined
        );
      }
      setMenuItems(items);
    } catch (error) {
      console.error('Error filtering menu:', error);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleLogItem = async (item: RestaurantMenuItem) => {
    if (!user?.id || !selectedRestaurant) return;
    setLoggingId(item.id);

    try {
      const success = await RestaurantDatabaseService.logMenuItem(
        user.id,
        selectedRestaurant.chain_name,
        item,
        mealType
      );
      if (success) {
        setSelectedItem(null);
        onItemLogged?.();
      }
    } catch (error) {
      console.error('Error logging menu item:', error);
    } finally {
      setLoggingId(null);
    }
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    handleCategorySelect(selectedCategory);
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !selectedRestaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!selectedRestaurant ? (
        <>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Popular Restaurant Chains</Text>
            {restaurants.length === 0 ? (
              <Text style={styles.emptyText}>No restaurants found</Text>
            ) : (
              restaurants.map((restaurant) => (
                <TouchableOpacity
                  key={restaurant.id}
                  style={styles.restaurantItem}
                  onPress={() => handleSelectRestaurant(restaurant)}
                >
                  <View style={styles.restaurantInfo}>
                    <Text style={styles.restaurantName}>{restaurant.chain_name}</Text>
                    <View style={styles.cuisineContainer}>
                      {restaurant.cuisine_type?.slice(0, 2).map((cuisine, index) => (
                        <Text key={index} style={styles.cuisineTag}>
                          {cuisine}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedRestaurant(null);
                setMenuItems([]);
                setCategories([]);
                setSearchQuery('');
              }}
            >
              <X size={20} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedRestaurant.chain_name}</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(true)}
            >
              <Filter size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.activeCategoryChip,
                ]}
                onPress={() => handleCategorySelect(null)}
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
                  onPress={() => handleCategorySelect(category)}
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
          )}

          {loadingMenu ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {filteredMenuItems.length === 0 ? (
                <Text style={styles.emptyText}>No menu items found</Text>
              ) : (
                filteredMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => setSelectedItem(item)}
                  >
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName}>{item.item_name}</Text>
                      <Text style={styles.menuItemNutrition}>
                        {item.calories} cal | {item.net_carbs}g net carbs
                      </Text>
                      {item.dietary_tags && item.dietary_tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {item.dietary_tags.slice(0, 3).map((tag, index) => (
                            <View key={index} style={styles.dietaryTag}>
                              <Leaf size={10} color="#059669" />
                              <Text style={styles.dietaryTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleLogItem(item)}
                      disabled={loggingId === item.id}
                    >
                      {loggingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Plus size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      <Modal
        visible={selectedItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem?.item_name}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <X size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody}>
                {selectedItem.description && (
                  <Text style={styles.itemDescription}>{selectedItem.description}</Text>
                )}

                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.calories}</Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.total_carbs}g</Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.net_carbs}g</Text>
                    <Text style={styles.nutritionLabel}>Net Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.protein}g</Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.total_fat}g</Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedItem.dietary_fiber || 0}g</Text>
                    <Text style={styles.nutritionLabel}>Fiber</Text>
                  </View>
                </View>

                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <View style={styles.allergensSection}>
                    <View style={styles.allergenHeader}>
                      <AlertTriangle size={16} color="#dc2626" />
                      <Text style={styles.allergensTitle}>Allergens</Text>
                    </View>
                    <Text style={styles.allergensText}>
                      {selectedItem.allergens.join(', ')}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.logItemButton}
                  onPress={() => handleLogItem(selectedItem)}
                  disabled={loggingId === selectedItem.id}
                >
                  {loggingId === selectedItem.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Plus size={20} color="#fff" />
                      <Text style={styles.logItemButtonText}>Log This Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Menu</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Max Net Carbs</Text>
              <View style={styles.carbsOptions}>
                {[null, 10, 20, 30, 50].map((value) => (
                  <TouchableOpacity
                    key={value ?? 'all'}
                    style={[
                      styles.carbOption,
                      maxCarbs === value && styles.activeCarbOption,
                    ]}
                    onPress={() => setMaxCarbs(value)}
                  >
                    <Text
                      style={[
                        styles.carbOptionText,
                        maxCarbs === value && styles.activeCarbOptionText,
                      ]}
                    >
                      {value === null ? 'All' : `${value}g`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterButton: {
    padding: 8,
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
  restaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cuisineContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  cuisineTag: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeCategoryChip: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  menuItemNutrition: {
    fontSize: 13,
    color: '#6b7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  dietaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dietaryTagText: {
    fontSize: 10,
    color: '#059669',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  allergensSection: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  allergensTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  allergensText: {
    fontSize: 13,
    color: '#991b1b',
  },
  logItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  logItemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  carbsOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  carbOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  activeCarbOption: {
    backgroundColor: '#2563eb',
  },
  carbOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeCarbOptionText: {
    color: '#fff',
  },
  applyFiltersButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
