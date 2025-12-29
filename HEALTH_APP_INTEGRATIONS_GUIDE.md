# Health App Integrations Guide

## Overview

The Health App Integrations system provides seamless bi-directional data synchronization between your app and major health platforms including Apple Health, Google Fit, MyFitnessPal, and Cronometer.

## Supported Platforms

### ✅ Apple Health / HealthKit (iOS)

**Features:**
- ✅ Export meal data (nutrition information)
- ✅ Sync activity data (steps, calories, heart rate)
- ✅ Real-time data updates
- ✅ Automatic background sync

**Supported Data Types:**
- **Export:** Calories, Carbs, Protein, Fat, Fiber, Sugar, Water intake
- **Import:** Steps, Active calories, Basal calories, Heart rate, Weight

### ✅ Google Fit (Android)

**Features:**
- ✅ Export meal data to Google Fit
- ✅ Import activity data (steps, calories burned)
- ✅ Sync workout sessions
- ✅ Distance and location tracking
- ✅ Heart rate monitoring

**Supported Data Types:**
- **Export:** Nutrition data (calories, macros)
- **Import:** Steps, Calories burned, Distance, Heart rate, Weight, Activities

### 🔄 MyFitnessPal / Cronometer (Coming Soon)

**Planned Features:**
- Bi-directional nutrition sync
- Unified food database
- Automatic meal logging
- Recipe synchronization

## Architecture

### Database Schema

The system uses 9 specialized tables:

1. **health_app_connections** - Tracks user connections to external apps
2. **sync_configurations** - User-specific sync preferences
3. **health_sync_history** - Logs all sync operations
4. **exported_health_data** - Tracks exported data
5. **imported_health_data** - Tracks imported data
6. **health_data_mappings** - Maps data types between systems
7. **health_sync_queue** - Manages scheduled syncs
8. **health_sync_conflicts** - Handles data conflicts
9. **health_app_permissions** - Manages app permissions

### Key Enums

```typescript
health_app_provider: 'apple_health' | 'google_fit' | 'myfitnesspal' | 'cronometer' | 'other'
health_sync_status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' | 'cancelled'
health_data_type: 'meal' | 'nutrition' | 'glucose' | 'exercise' | 'weight' | 'sleep' | 'heart_rate' | 'blood_pressure' | 'steps' | 'calories_burned' | 'water_intake' | 'medication' | 'other'
sync_direction: 'export_only' | 'import_only' | 'bidirectional'
```

## Implementation Guide

### 1. Setup Apple Health Integration

```typescript
import { AppleHealthIntegrationService } from '@/services/AppleHealthIntegrationService';

// Connect to HealthKit
const connected = await AppleHealthIntegrationService.connectHealthKit(userId);

if (connected) {
  console.log('HealthKit connected successfully');
}
```

### 2. Export Meal to Apple Health

```typescript
const mealData = {
  foodName: 'Grilled Chicken Salad',
  calories: 350,
  carbs: 25,
  protein: 40,
  fat: 12,
  fiber: 5,
  sugar: 3,
  timestamp: new Date(),
};

const success = await AppleHealthIntegrationService.exportMealToHealthKit(
  userId,
  mealData
);
```

### 3. Setup Google Fit Integration

```typescript
import { GoogleFitIntegrationService } from '@/services/GoogleFitIntegrationService';

// Connect to Google Fit
const connected = await GoogleFitIntegrationService.connectGoogleFit(userId);

if (connected) {
  console.log('Google Fit connected successfully');
}
```

### 4. Sync Activity Data

```typescript
const activityData = await GoogleFitIntegrationService.syncActivityData(userId);

console.log('Activity Summary:', {
  steps: activityData.steps,
  calories: activityData.calories,
  distance: activityData.distance,
});
```

### 5. Unified Health Sync Service

```typescript
import { UnifiedHealthSyncService } from '@/services/UnifiedHealthSyncService';

// Auto-connect to platform-specific health app
const connected = await UnifiedHealthSyncService.autoConnectHealthApp(userId);

// Export meal to all connected apps
const result = await UnifiedHealthSyncService.exportMealToHealthApps(userId, mealData);

// Get activity summary from all sources
const activity = await UnifiedHealthSyncService.getActivitySummary(userId);

// Sync all active connections
await UnifiedHealthSyncService.syncAllActiveConnections(userId);
```

## Data Flow

### Export Flow (Meal Data)

```
User Logs Meal
    ↓
Unified Health Sync Service
    ↓
┌─────────────┬─────────────┐
│             │             │
Apple Health  Google Fit   MyFitnessPal
    ↓             ↓             ↓
Export Tracking Table
    ↓
Sync History
```

### Import Flow (Activity Data)

```
External Health App
    ↓
Platform-Specific Service
    ↓
Data Validation & Deduplication
    ↓
Import Tracking Table
    ↓
Local Database (exercise_logs)
    ↓
Sync History
```

## Sync Configurations

### Default Sync Settings

- **Apple Health:**
  - Export: Nutrition data (meals)
  - Import: Activity data
  - Frequency: Every 60 minutes
  - Auto-sync: Enabled

- **Google Fit:**
  - Export: Nutrition data (meals)
  - Import: Activity data, Calories burned
  - Frequency: Every 60 minutes
  - Auto-sync: Enabled

### Customizing Sync Configs

```typescript
// Get all sync configs
const configs = await UnifiedHealthSyncService.getSyncConfigs(userId);

// Update a specific config
await UnifiedHealthSyncService.updateSyncConfig(configId, {
  isEnabled: true,
  syncFrequencyMinutes: 30,
  syncDirection: 'bidirectional',
});
```

## Conflict Resolution

When data conflicts occur (same data from multiple sources), the system uses these strategies:

1. **newest_wins** (default) - Most recent timestamp wins
2. **external_wins** - External app data takes precedence
3. **local_wins** - Local app data takes precedence
4. **manual** - User must resolve manually

```typescript
// Get unresolved conflicts
const conflicts = await UnifiedHealthSyncService.getConflicts(userId);

// Resolve a conflict
await UnifiedHealthSyncService.resolveConflict(
  conflictId,
  'local', // or 'external'
  { reason: 'User verified local data is correct' }
);
```

## Error Handling

### Common Error Types

1. **Permission Denied** - User hasn't granted necessary permissions
2. **Connection Failed** - Network or API issues
3. **Data Validation Error** - Invalid data format
4. **Duplicate Data** - Data already exists
5. **Rate Limit** - Too many requests

### Error Recovery

```typescript
// Get recent sync errors
const errors = await UnifiedHealthSyncService.getRecentSyncErrors(userId);

// Clear error count
await UnifiedHealthSyncService.clearSyncErrors(userId);

// Retry failed sync
await UnifiedHealthSyncService.syncConnection(userId, 'apple_health');
```

## Sync History & Analytics

```typescript
// Get sync history
const history = await UnifiedHealthSyncService.getSyncHistory(userId, 50);

// Analyze sync stats
const stats = {
  totalSyncs: history.length,
  successfulSyncs: history.filter(h => h.status === 'completed').length,
  failedSyncs: history.filter(h => h.status === 'failed').length,
  averageRecordsPerSync: history.reduce((sum, h) => sum + h.records_processed, 0) / history.length,
};
```

## Background Sync

### Scheduling Automatic Syncs

```typescript
// Schedule a sync job
await UnifiedHealthSyncService.scheduleSyncJob(
  userId,
  connectionId,
  syncConfigId,
  5 // priority (1-10)
);

// Get pending syncs
const pendingSyncs = await UnifiedHealthSyncService.getPendingSyncs(userId);
```

## Best Practices

### 1. Permission Management

- Request only necessary permissions
- Explain why each permission is needed
- Gracefully handle permission denials

### 2. Data Privacy

- All health data is encrypted at rest
- Sync only with user's explicit consent
- Allow users to disconnect at any time
- Provide data export/deletion options

### 3. Performance

- Batch sync operations when possible
- Use background sync for non-urgent data
- Implement exponential backoff for retries
- Cache frequently accessed data

### 4. User Experience

- Show clear sync status indicators
- Provide detailed sync history
- Handle errors gracefully with user-friendly messages
- Allow manual sync override

## API Reference

### AppleHealthIntegrationService

```typescript
// Connection
connectHealthKit(userId: string): Promise<boolean>
checkAvailability(): Promise<boolean>

// Export
exportMealToHealthKit(userId: string, mealData: MealData): Promise<boolean>

// Import
syncActivityData(userId: string): Promise<any>
```

### GoogleFitIntegrationService

```typescript
// Connection
connectGoogleFit(userId: string): Promise<boolean>
disconnectGoogleFit(userId: string): Promise<boolean>

// Export
exportNutritionData(userId: string, mealData: MealData): Promise<boolean>
recordWorkout(userId: string, workout: WorkoutData): Promise<boolean>

// Import
syncActivityData(userId: string, startDate?: Date, endDate?: Date): Promise<any>
getStepsToday(userId: string): Promise<number>
getCaloriesBurnedToday(userId: string): Promise<number>
getHeartRateSamples(userId: string, startDate: Date, endDate: Date): Promise<any[]>
getWeightSamples(userId: string, startDate: Date, endDate: Date): Promise<any[]>
```

### UnifiedHealthSyncService

```typescript
// Connection Management
autoConnectHealthApp(userId: string): Promise<boolean>
getAllConnections(userId: string): Promise<HealthConnection[]>
getActiveConnections(userId: string): Promise<HealthConnection[]>
toggleConnection(connectionId: string, isActive: boolean): Promise<boolean>
deleteConnection(connectionId: string): Promise<boolean>

// Sync Operations
syncAllActiveConnections(userId: string): Promise<void>
syncConnection(userId: string, provider: string): Promise<boolean>
exportMealToHealthApps(userId: string, mealData: MealData): Promise<ExportResult>
getActivitySummary(userId: string): Promise<ActivitySummary>

// Configuration
getSyncConfigs(userId: string): Promise<SyncConfig[]>
updateSyncConfig(configId: string, updates: Partial<SyncConfig>): Promise<boolean>

// History & Analytics
getSyncHistory(userId: string, limit?: number): Promise<any[]>
getRecentSyncErrors(userId: string, limit?: number): Promise<any[]>
clearSyncErrors(userId: string): Promise<boolean>

// Conflict Resolution
getConflicts(userId: string): Promise<any[]>
resolveConflict(conflictId: string, resolution: 'local' | 'external', resolutionData?: any): Promise<boolean>

// Queue Management
scheduleSyncJob(userId: string, connectionId: string, syncConfigId: string, priority?: number): Promise<boolean>
getPendingSyncs(userId: string): Promise<any[]>
```

## Troubleshooting

### iOS HealthKit Issues

**Problem:** HealthKit not available
**Solution:** Check if device supports HealthKit (iPhone 5s or later, iOS 8+)

**Problem:** Permission denied
**Solution:** Check Info.plist for required usage descriptions

**Problem:** No data imported
**Solution:** Verify data exists in Health app and date range is correct

### Android Google Fit Issues

**Problem:** Authorization failed
**Solution:** Check Google Play Services are installed and up to date

**Problem:** No activity data
**Solution:** Verify Google Fit app is installed and tracking is enabled

**Problem:** Sync stuck in progress
**Solution:** Clear app data and reconnect

## Security Considerations

1. **Data Encryption:** All health data is encrypted in transit and at rest
2. **Token Security:** OAuth tokens are stored securely and refreshed automatically
3. **Permission Scoping:** Only request minimum required permissions
4. **Audit Trail:** All sync operations are logged with timestamps
5. **User Control:** Users can disconnect and delete data at any time

## Future Enhancements

- [ ] MyFitnessPal bi-directional sync
- [ ] Cronometer integration
- [ ] Samsung Health support
- [ ] Fitbit integration
- [ ] Garmin Connect sync
- [ ] Strava workout import
- [ ] Webhooks for real-time updates
- [ ] Advanced conflict resolution UI
- [ ] Sync analytics dashboard
- [ ] Custom data mapping rules

## Support

For issues or questions about health app integrations:
- Check the troubleshooting section above
- Review sync history for error details
- Contact support with sync history ID for assistance
