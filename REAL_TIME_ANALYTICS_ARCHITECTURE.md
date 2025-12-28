# Real-Time Analytics Architecture

## Overview

This document describes the real-time analytics system that replaces all static placeholder numbers with live data from the Supabase database. The system provides instant updates when users perform actions within the app.

## Architecture Components

### 1. Real-Time Data Hook (`useRealTimeAnalytics`)

**Location:** `/hooks/useRealTimeAnalytics.ts`

**Purpose:** Central hook for fetching and subscribing to real-time analytics data.

**Features:**
- Fetches daily statistics (carbs, protein, fat, calories, meals, exercise, hydration)
- Tracks weekly trends with 7-day historical data
- Manages user goals and targets
- Sets up Supabase real-time subscriptions for instant updates
- Provides loading and error states
- Offers manual refresh capability

**Data Structures:**

```typescript
interface DailyStats {
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalCalories: number;
  mealsLogged: number;
  exerciseMinutes: number;
  waterIntake: number;
  currentStreak: number;
}

interface WeeklyTrend {
  date: string;
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
  meals: number;
}

interface UserGoals {
  dailyCarbGoal: number;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyFatGoal: number;
  dailyWaterGoal: number;
  weeklyExerciseGoal: number;
}
```

**Usage:**

```typescript
const { dailyStats, weeklyTrends, userGoals, loading, error, refreshData } = useRealTimeAnalytics();
```

### 2. User Action Tracking Service

**Location:** `/services/UserActionTrackingService.ts`

**Purpose:** Records all user interactions and updates database statistics.

**Tracked Actions:**
- Food logging
- Food scanning (AI, barcode, manual)
- Exercise logging
- Hydration logging
- Screen views
- Feature usage
- Goal updates
- Achievement unlocking
- Session start/end

**Key Methods:**

```typescript
// Track food logging
UserActionTrackingService.trackFoodLog(userId, {
  foodName: 'Grilled Chicken',
  carbs: 0,
  protein: 35,
  fat: 5,
  calories: 180,
  mealType: 'lunch'
});

// Track food scan
UserActionTrackingService.trackFoodScan(userId, {
  scanType: 'ai_food',
  success: true,
  processingTime: 1250
});

// Track exercise
UserActionTrackingService.trackExerciseLog(userId, {
  exerciseType: 'running',
  duration: 30,
  intensity: 'moderate'
});

// Track screen view
UserActionTrackingService.trackScreenView(userId, 'home_dashboard', 45000);

// Update streak
UserActionTrackingService.updateStreak(userId);
```

### 3. Live Metrics Widget Component

**Location:** `/components/ui/LiveMetricsWidget.tsx`

**Purpose:** Reusable component for displaying live metrics with animations.

**Features:**
- Animated value updates with fade and scale effects
- Trend indicators (up, down, stable)
- Progress bars for goal tracking
- Customizable colors and icons
- Responsive design

**Usage:**

```typescript
<LiveMetricsWidget
  label="Carbs Today"
  value={dailyStats.totalCarbs}
  unit={`/${userGoals.dailyCarbGoal}g`}
  trend="up"
  color="#059669"
  icon={Utensils}
  targetValue={userGoals.dailyCarbGoal}
  showProgress={true}
/>
```

## Real-Time Data Flow

### 1. Initial Load

```
User Opens App
     ↓
useRealTimeAnalytics Hook Initializes
     ↓
Fetch Daily Stats from Supabase
     ↓
Fetch Weekly Trends from Supabase
     ↓
Fetch User Goals from Supabase
     ↓
Display Live Data on Dashboard
```

### 2. Real-Time Updates

```
User Logs Meal in App
     ↓
UserActionTrackingService.trackFoodLog()
     ↓
Data Saved to meal_logs Table
     ↓
Supabase Real-Time Subscription Triggers
     ↓
useRealTimeAnalytics Refetches Data
     ↓
Dashboard Updates Automatically
     ↓
LiveMetricsWidget Animates New Values
```

### 3. Supabase Real-Time Subscriptions

The system sets up three real-time channels:

**Meal Logs Channel:**
```typescript
supabase
  .channel('meal_logs_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'meal_logs',
    filter: `user_id=eq.${user.id}`
  }, () => {
    fetchDailyStats();
    fetchWeeklyTrends();
  })
  .subscribe();
```

**Exercise Logs Channel:**
```typescript
supabase
  .channel('exercise_logs_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'exercise_logs',
    filter: `user_id=eq.${user.id}`
  }, () => {
    fetchDailyStats();
  })
  .subscribe();
```

**Hydration Logs Channel:**
```typescript
supabase
  .channel('hydration_logs_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'hydration_logs',
    filter: `user_id=eq.${user.id}`
  }, () => {
    fetchDailyStats();
  })
  .subscribe();
```

## Database Tables Used

### Primary Tables:
- `meal_logs` - Food consumption records
- `exercise_logs` - Exercise activity records
- `hydration_logs` - Water intake records
- `user_stats` - Aggregate user statistics
- `scan_usage_log` - Food scan tracking
- `daily_hydration_goals` - User hydration goals

### Key Columns:

**meal_logs:**
- user_id, food_name, carbs, protein, fat, calories, meal_type, logged_at

**exercise_logs:**
- user_id, exercise_type, intensity, duration_minutes, calories_burned, exercise_time

**hydration_logs:**
- user_id, amount_ml, beverage_type, logged_time

**user_stats:**
- user_id, current_streak_days, longest_streak_days, total_meals_logged, total_scans, total_exercise_minutes

## Performance Optimizations

### 1. Efficient Queries
- Use date range filters to limit data retrieval
- Aggregate calculations done in memory after fetch
- Single queries for multiple metrics

### 2. Caching Strategy
- React state management for live data
- No unnecessary re-fetches
- Manual refresh available via pull-to-refresh

### 3. Real-Time Connection Management
- Channels properly cleaned up on unmount
- User-specific filters prevent unnecessary updates
- Debounced updates for rapid changes

### 4. Loading States
- Initial loading spinner for first data fetch
- Pull-to-refresh for manual updates
- Skeleton loaders for individual widgets

## Integration Guide

### Step 1: Import the Hook

```typescript
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
```

### Step 2: Use in Component

```typescript
export default function DashboardScreen() {
  const { dailyStats, weeklyTrends, userGoals, loading, error, refreshData } = useRealTimeAnalytics();

  // Display live data
  return (
    <View>
      <Text>Carbs Today: {dailyStats.totalCarbs}g</Text>
      <Text>Meals Logged: {dailyStats.mealsLogged}</Text>
      <Text>Current Streak: {dailyStats.currentStreak} days</Text>
    </View>
  );
}
```

### Step 3: Track User Actions

```typescript
import { UserActionTrackingService } from '@/services/UserActionTrackingService';

// When user logs food
await UserActionTrackingService.trackFoodLog(user.id, foodData);

// When user scans food
await UserActionTrackingService.trackFoodScan(user.id, scanData);

// When user exercises
await UserActionTrackingService.trackExerciseLog(user.id, exerciseData);
```

### Step 4: Add Pull-to-Refresh

```typescript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await refreshData();
  setRefreshing(false);
};

return (
  <ScrollView
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
  >
    {/* Content */}
  </ScrollView>
);
```

## Testing Strategy

### 1. Unit Tests
- Test data aggregation calculations
- Verify date range filtering
- Test streak calculation logic

### 2. Integration Tests
- Test real-time subscription setup
- Verify data flow from action to display
- Test error handling and retry logic

### 3. End-to-End Tests
- Log meal → verify dashboard updates
- Scan food → verify scan count increments
- Exercise log → verify exercise minutes update
- Multiple actions → verify aggregate statistics

### 4. Performance Tests
- Measure initial load time
- Test with large datasets (100+ meals)
- Verify memory usage with long sessions
- Test real-time update latency

## Monitoring and Analytics

### Tracked Metrics:
- Action completion rates
- Screen view duration
- Feature usage frequency
- Error rates
- Data load times
- Real-time subscription stability

### Action Log Format:
```typescript
{
  userId: string,
  actionType: string,
  actionData: any,
  timestamp: string,
  sessionId?: string
}
```

## Security Considerations

### 1. Row Level Security (RLS)
All database tables have RLS policies ensuring users can only access their own data.

### 2. User ID Filtering
All queries include user_id filter to prevent data leakage.

### 3. Real-Time Subscriptions
Subscriptions are filtered by user_id at the database level.

### 4. Data Privacy
Action logs stored locally in AsyncStorage, not synced to server.

## Future Enhancements

### 1. Advanced Analytics
- Predictive insights using ML
- Pattern recognition for habits
- Anomaly detection

### 2. Social Features
- Compare stats with friends
- Leaderboards
- Challenges

### 3. Advanced Visualizations
- Interactive charts
- Heat maps
- Trend predictions

### 4. Offline Support
- Queue actions when offline
- Sync when connection restored
- Optimistic UI updates

## Troubleshooting

### Issue: Data Not Updating
**Solution:** Check Supabase real-time subscription status and RLS policies.

### Issue: Slow Initial Load
**Solution:** Optimize queries, add indexes, implement pagination.

### Issue: Incorrect Calculations
**Solution:** Verify date range filters and timezone handling.

### Issue: Memory Leaks
**Solution:** Ensure real-time channels are properly cleaned up on unmount.

## Support

For questions or issues, refer to:
- Supabase Real-Time Documentation: https://supabase.com/docs/guides/realtime
- React Native Performance: https://reactnative.dev/docs/performance
