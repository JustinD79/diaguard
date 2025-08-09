import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Camera, Scan, Search, Info } from 'lucide-react-native';
import { FoodAPIService, Product, DiabetesInsights } from '@/services/FoodAPIService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface FoodScannerProps {
  onFoodScanned: (product: Product, insights: DiabetesInsights) => void;
}

export default function FoodScanner({ onFoodScanned }: FoodScannerProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a valid barcode');
      return;
    }

    setLoading(true);
    try {
      const response = await FoodAPIService.scanBarcode(barcode.trim());
      
      if (response.success && response.product) {
        const insights = FoodAPIService.generateDiabetesInsights(response.product.nutrition);
        onFoodScanned(response.product, insights);
        
        Alert.alert(
          'Product Found!',
          `${response.product.name} by ${response.product.brand}\n\n${FoodAPIService.formatNutritionLabel(response.product.nutrition)}\n\nDiabetes-friendly: ${insights.isDiabetesFriendly ? 'Yes' : 'No'}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Product Not Found',
          'This barcode was not found in our database. Try searching manually or scanning a different product.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      Alert.alert(
        'Scan Error',
        'Failed to scan barcode. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 characters to search');
      return;
    }

    setLoading(true);
    try {
      const response = await FoodAPIService.searchProducts(searchQuery.trim());
      
      if (response.success) {
        setSearchResults(response.results);
        
        if (response.results.length === 0) {
          Alert.alert(
            'No Results',
            'No products found matching your search. Try different keywords.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert(
        'Search Error',
        'Failed to search products. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    const insights = FoodAPIService.generateDiabetesInsights(product.nutrition);
    
    Alert.alert(
      'Product Details',
      `${product.name} by ${product.brand}\n\n${FoodAPIService.formatNutritionLabel(product.nutrition)}\n\nDiabetes Insights:\n• ${insights.isDiabetesFriendly ? 'Diabetes-friendly' : 'Monitor carefully'}\n• Estimated insulin: ${insights.estimatedInsulinUnits} units\n• Blood sugar impact: ${insights.bloodSugarImpact}\n\nWould you like to log this food?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Food', 
          onPress: () => onFoodScanned(product, insights)
        }
      ]
    );
  };

  const simulateBarcodeInput = () => {
    Alert.prompt(
      'Enter Barcode',
      'Enter the barcode number manually:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Scan', 
          onPress: (barcode) => barcode && handleBarcodeInput(barcode)
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.scannerCard}>
        <Text style={styles.title}>Food Scanner</Text>
        <Text style={styles.subtitle}>Scan barcodes or search for food products</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={simulateBarcodeInput}
            disabled={loading}
          >
            <Scan size={24} color={loading ? '#9CA3AF' : '#2563EB'} />
            <Text style={[styles.actionButtonText, loading && styles.disabledText]}>
              Enter Barcode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={() => Alert.alert('Camera Scanner', 'Camera scanning would be implemented here with expo-camera')}
            disabled={loading}
          >
            <Camera size={24} color={loading ? '#9CA3AF' : '#2563EB'} />
            <Text style={[styles.actionButtonText, loading && styles.disabledText]}>
              Camera Scan
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <Input
            label="Search Products"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Enter food name..."
            style={styles.searchInput}
          />
          <Button
            title={loading ? 'Searching...' : 'Search'}
            onPress={handleSearch}
            disabled={loading || !searchQuery.trim()}
            style={styles.searchButton}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </Card>

      {searchResults.length > 0 && (
        <Card style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Search Results ({searchResults.length})</Text>
          
          {searchResults.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productItem}
              onPress={() => handleProductSelect(product)}
            >
              {product.imageUrl && (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <Text style={styles.productNutrition}>
                  {FoodAPIService.formatNutritionLabel(product.nutrition)}
                </Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productSource}>Source: {product.source}</Text>
                  {product.verified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ Verified</Text>
                    </View>
                  )}
                </View>
              </View>
              <Info size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerCard: {
    margin: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  searchSection: {
    gap: 12,
  },
  searchInput: {
    marginBottom: 0,
  },
  searchButton: {
    marginTop: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  resultsCard: {
    margin: 20,
    marginTop: 0,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  productBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  productNutrition: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productSource: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
});