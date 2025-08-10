import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CreditCard, Smartphone, Wallet, Check } from 'lucide-react-native';

// Add dynamic export to disable SSR for this component
export const dynamic = 'force-dynamic';

interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'apple_pay' | 'google_pay';
  onMethodSelect: (method: 'card' | 'apple_pay' | 'google_pay') => void;
}

export default function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodSelect 
}: PaymentMethodSelectorProps) {
  const paymentMethods = [
    {
      id: 'card' as const,
      name: 'Credit Card',
      icon: CreditCard,
      available: true,
      description: 'Visa, Mastercard, American Express',
    },
    {
      id: 'apple_pay' as const,
      name: 'Apple Pay',
      icon: Smartphone,
      available: Platform.OS === 'ios',
      description: 'Touch ID or Face ID',
    },
    {
      id: 'google_pay' as const,
      name: 'Google Pay',
      icon: Wallet,
      available: Platform.OS === 'android',
      description: 'Quick and secure',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Method</Text>
      
      <View style={styles.methodsList}>
        {paymentMethods
          .filter(method => method.available)
          .map((method) => {
            const IconComponent = method.icon;
            const isSelected = selectedMethod === method.id;
            
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodItem,
                  isSelected && styles.methodItemSelected
                ]}
                onPress={() => onMethodSelect(method.id)}
              >
                <View style={styles.methodIcon}>
                  <IconComponent 
                    size={20} 
                    color={isSelected ? '#2563EB' : '#6B7280'} 
                  />
                </View>
                
                <View style={styles.methodInfo}>
                  <Text style={[
                    styles.methodName,
                    isSelected && styles.methodNameSelected
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {method.description}
                  </Text>
                </View>
                
                {isSelected && (
                  <View style={styles.checkIcon}>
                    <Check size={16} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  methodsList: {
    gap: 12,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  methodItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  methodIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 2,
  },
  methodNameSelected: {
    color: '#2563EB',
  },
  methodDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  checkIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});