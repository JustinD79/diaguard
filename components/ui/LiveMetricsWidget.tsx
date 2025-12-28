import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface LiveMetricsWidgetProps {
  label: string;
  value: number | string;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  icon?: any;
  targetValue?: number;
  showProgress?: boolean;
}

export default function LiveMetricsWidget({
  label,
  value,
  unit,
  trend = 'stable',
  color = '#2563EB',
  icon: Icon,
  targetValue,
  showProgress = false,
}: LiveMetricsWidgetProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} color={color} />;
      case 'down':
        return <TrendingDown size={16} color={color} />;
      default:
        return <Minus size={16} color="#6B7280" />;
    }
  };

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const progressPercentage =
    showProgress && targetValue && targetValue > 0
      ? Math.min((numericValue / targetValue) * 100, 100)
      : 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {Icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Icon size={20} color={color} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.valueRow}>
          <Text style={[styles.value, { color }]}>{value}</Text>
          <Text style={styles.unit}>{unit}</Text>
          {trend && <View style={styles.trendIcon}>{getTrendIcon()}</View>}
        </View>

        {showProgress && targetValue && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercentage.toFixed(0)}% of goal
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginRight: 4,
  },
  unit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 8,
  },
  trendIcon: {
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});
