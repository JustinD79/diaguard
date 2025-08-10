import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, Tag, Check, Crown, Star, Smartphone, Wallet } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { products } from '@/src/stripe-config';

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPlan?: string;
}

interface PromoCode {
  code: string;
  description: string;
  discount: number;
  discountType: 'fixed' | 'percentage';
}

export default function CheckoutModal({ visible, onClose, selectedPlan }: CheckoutModalProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');

  const plan = products.find(p => p.priceId === selectedPlan) || products[0];
  const basePrice = 15.00;
  
  const calculateDiscount = (promo: PromoCode | null) => {
    if (!promo) return 0;
    if (promo.discountType === 'percentage') {
      return basePrice * (promo.discount / 100);
    }
    return promo.discount;
  };

  const discount = calculateDiscount(appliedPromo);
  const finalPrice = Math.max(0, basePrice - discount);

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setLoading(true);
    setPromoError('');

    try {
      const response = await fetch('/validate-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setAppliedPromo(result.promoCode);
        setPromoError('');
        Alert.alert('Promo Code Applied!', `${result.promoCode.description} has been applied to your order.`);
      } else {
        setPromoError(result.error || 'Invalid promo code');
      }
    } catch (error) {
      setPromoError('Failed to validate promo code');
    } finally {
      setLoading(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError('');
  };

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch('/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          promoCode: appliedPromo?.code,
          paymentMethod: selectedPaymentMethod,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // In production, redirect to Stripe checkout
        Alert.alert(
          'Checkout Ready',
          `Payment method: ${selectedPaymentMethod}\nTotal: $${finalPrice.toFixed(2)}\n\nIn production, you would be redirected to secure checkout.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              onPress: () => {
                console.log('Checkout URL:', result.url);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethods = () => (
    <View style={styles.paymentMethodsSection}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      <View style={styles.paymentMethods}>
        <TouchableOpacity
          style={[
            styles.paymentMethod,
            selectedPaymentMethod === 'card' && styles.paymentMethodSelected
          ]}
          onPress={() => setSelectedPaymentMethod('card')}
        >
          <CreditCard size={20} color={selectedPaymentMethod === 'card' ? '#2563EB' : '#6B7280'} />
          <Text style={[
            styles.paymentMethodText,
            selectedPaymentMethod === 'card' && styles.paymentMethodTextSelected
          ]}>
            Credit Card
          </Text>
          {selectedPaymentMethod === 'card' && (
            <Check size={16} color="#2563EB" />
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedPaymentMethod === 'apple_pay' && styles.paymentMethodSelected
            ]}
            onPress={() => setSelectedPaymentMethod('apple_pay')}
          >
            <Smartphone size={20} color={selectedPaymentMethod === 'apple_pay' ? '#2563EB' : '#6B7280'} />
            <Text style={[
              styles.paymentMethodText,
              selectedPaymentMethod === 'apple_pay' && styles.paymentMethodTextSelected
            ]}>
              Apple Pay
            </Text>
            {selectedPaymentMethod === 'apple_pay' && (
              <Check size={16} color="#2563EB" />
            )}
          </TouchableOpacity>
        )}

        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedPaymentMethod === 'google_pay' && styles.paymentMethodSelected
            ]}
            onPress={() => setSelectedPaymentMethod('google_pay')}
          >
            <Wallet size={20} color={selectedPaymentMethod === 'google_pay' ? '#2563EB' : '#6B7280'} />
            <Text style={[
              styles.paymentMethodText,
              selectedPaymentMethod === 'google_pay' && styles.paymentMethodTextSelected
            ]}>
              Google Pay
            </Text>
            {selectedPaymentMethod === 'google_pay' && (
              <Check size={16} color="#2563EB" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Purchase</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Plan Summary */}
          <View style={styles.planSummary}>
            <View style={styles.planIcon}>
              <Crown size={24} color="#2563EB" />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription} numberOfLines={2}>
                Premium diabetes management with AI-powered insights
              </Text>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>What's Included</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>Unlimited AI food scanning</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>Advanced insulin calculator</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>Personalized health reports</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>Recipe recommendations</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>24/7 emergency support</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#059669" />
                <Text style={styles.featureText}>Medication tracking</Text>
              </View>
            </View>
          </View>

          {/* Promo Code Section */}
          <View style={styles.promoSection}>
            <Text style={styles.sectionTitle}>Promo Code</Text>
            
            {!appliedPromo ? (
              <View style={styles.promoInputContainer}>
                <Input
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder="Enter promo code"
                  autoCapitalize="characters"
                  leftIcon={<Tag size={20} color="#6B7280" />}
                  containerStyle={styles.promoInput}
                  error={promoError}
                />
                <Button
                  title={loading ? 'Validating...' : 'Apply'}
                  onPress={validatePromoCode}
                  disabled={loading || !promoCode.trim()}
                  size="small"
                  style={styles.applyButton}
                />
              </View>
            ) : (
              <View style={styles.promoApplied}>
                <View style={styles.promoAppliedContent}>
                  <Check size={20} color="#059669" />
                  <View style={styles.promoAppliedText}>
                    <Text style={styles.promoCodeText}>Code: {appliedPromo.code}</Text>
                    <Text style={styles.promoSavings}>
                      {appliedPromo.description}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={removePromoCode}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sampleCodes}>
              <Text style={styles.sampleCodesTitle}>Try these demo codes:</Text>
              <View style={styles.sampleCodesList}>
                <TouchableOpacity 
                  style={styles.sampleCode}
                  onPress={() => setPromoCode('SAVE20')}
                >
                  <Text style={styles.sampleCodeText}>SAVE20</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sampleCode}
                  onPress={() => setPromoCode('WELCOME')}
                >
                  <Text style={styles.sampleCodeText}>WELCOME</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sampleCode}
                  onPress={() => setPromoCode('HEALTH50')}
                >
                  <Text style={styles.sampleCodeText}>HEALTH50</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Payment Methods */}
          {renderPaymentMethods()}

          {/* Price Summary */}
          <View style={styles.priceSection}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{plan.name} (Monthly)</Text>
              <Text style={styles.priceValue}>${basePrice.toFixed(2)}</Text>
            </View>
            
            {appliedPromo && discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>
                  Promo discount ({appliedPromo.code})
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -{appliedPromo.discountType === 'percentage' ? `${appliedPromo.discount}%` : `$${discount.toFixed(2)}`}
                </Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${finalPrice.toFixed(2)}/month</Text>
            </View>
          </View>

          {/* Payment Button */}
          <View style={styles.checkoutSection}>
            <Button
              title={loading ? 'Processing...' : getPaymentButtonText()}
              onPress={handleCheckout}
              disabled={loading}
              style={[
                styles.checkoutButton,
                selectedPaymentMethod === 'apple_pay' && styles.applePayButton,
                selectedPaymentMethod === 'google_pay' && styles.googlePayButton
              ]}
            />
            
            <Text style={styles.secureText}>
              🔒 Secure checkout powered by Stripe
            </Text>
            
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy. 
              You can cancel anytime.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  function getPaymentButtonText(): string {
    switch (selectedPaymentMethod) {
      case 'apple_pay':
        return `Pay with Apple Pay - $${finalPrice.toFixed(2)}`;
      case 'google_pay':
        return `Pay with Google Pay - $${finalPrice.toFixed(2)}`;
      default:
        return `Continue to Payment - $${finalPrice.toFixed(2)}`;
    }
  }
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
  planSummary: {
    flexDirection: 'row',
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
  planIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF4FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  featuresSection: {
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  promoSection: {
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
  promoInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  promoInput: {
    flex: 1,
    marginBottom: 0,
  },
  applyButton: {
    marginBottom: 16,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  promoAppliedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoAppliedText: {
    gap: 2,
  },
  promoCodeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  promoSavings: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
  },
  sampleCodes: {
    marginTop: 8,
  },
  sampleCodesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  sampleCodesList: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleCode: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sampleCodeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  paymentMethodsSection: {
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
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    gap: 12,
  },
  paymentMethodSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  paymentMethodTextSelected: {
    color: '#2563EB',
  },
  priceSection: {
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  priceValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  discountLabel: {
    color: '#059669',
  },
  discountValue: {
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  checkoutSection: {
    gap: 12,
  },
  checkoutButton: {
    marginBottom: 8,
  },
  applePayButton: {
    backgroundColor: '#000000',
  },
  googlePayButton: {
    backgroundColor: '#4285F4',
  },
  secureText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});