import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  accessibilityRole?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

export default function Card({ 
  children, 
  style, 
  padding = 16, 
  accessibilityRole,
  accessible,
  accessibilityLabel 
}: CardProps) {
  return (
    <View 
      style={[styles.card, { padding }, style]}
      accessibilityRole={accessibilityRole}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});