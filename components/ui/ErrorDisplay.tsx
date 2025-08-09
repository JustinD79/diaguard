import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TriangleAlert as AlertTriangle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react-native';

interface ErrorDisplayProps {
  error: string | null;
  type?: 'network' | 'api' | 'validation' | 'medical' | 'general';
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  isOffline?: boolean;
}

export default function ErrorDisplay({
  error,
  type = 'general',
  onRetry,
  onDismiss,
  showRetry = true,
  isOffline = false
}: ErrorDisplayProps) {
  if (!error) return null;

  const getErrorStyle = () => {
    switch (type) {
      case 'medical':
        return styles.medicalError;
      case 'network':
        return styles.networkError;
      case 'validation':
        return styles.validationError;
      default:
        return styles.generalError;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'network':
        return isOffline ? <WifiOff size={20} color="#DC2626" /> : <Wifi size={20} color="#DC2626" />;
      case 'medical':
        return <AlertTriangle size={20} color="#DC2626" />;
      default:
        return <AlertTriangle size={20} color="#DC2626" />;
    }
  };

  return (
    <View style={[styles.container, getErrorStyle()]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <Text style={styles.errorText}>{error}</Text>
        
        <View style={styles.actions}>
          {showRetry && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <RefreshCw size={16} color="#2563EB" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
  },
  generalError: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  networkError: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#D97706',
  },
  validationError: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  medicalError: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  retryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  dismissButton: {
    padding: 4,
  },
});