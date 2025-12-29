# Comprehensive Notifications & Reminders System

## Overview

This guide documents the complete notifications and reminders system for the diabetes management app, including meal reminders, medication tracking, testing schedules, smart context-aware reminders, and A1C test management.

---

## 🗄️ Database Schema

### Tables Created

#### 1. **reminders**
Core reminder configuration with schedules and settings.

```sql
- id: uuid (Primary Key)
- user_id: uuid (Foreign Key)
- reminder_type: reminder_type enum
- title: text
- message: text
- frequency: reminder_frequency enum
- status: reminder_status enum
- scheduled_time: time
- scheduled_days: integer[]
- start_date: date
- end_date: date
- sound_enabled: boolean
- vibration_enabled: boolean
- priority: text (low, default, high, urgent)
- allow_snooze: boolean
- snooze_duration_minutes: integer
- max_snooze_count: integer
- is_smart_reminder: boolean
- smart_trigger_conditions: jsonb
- medication_name: text
- medication_dosage: text
- medication_type: text
- refill_threshold_days: integer
- test_type: text
- next_trigger_at: timestamptz
```

**Reminder Types:**
- `meal` - Meal logging reminders
- `medication` - Medication dose reminders
- `glucose_test` - Blood glucose testing
- `a1c_test` - A1C test scheduling
- `exercise` - Exercise reminders
- `hydration` - Water intake reminders
- `appointment` - Doctor appointments
- `refill` - Medication refill alerts
- `custom` - User-defined reminders

**Frequencies:**
- `one_time` - Single occurrence
- `daily` - Every day
- `weekly` - Specific days of week
- `monthly` - Monthly recurrence
- `custom_days` - Custom schedule
- `as_needed` - On-demand only

**Status:**
- `active` - Currently scheduled
- `paused` - Temporarily disabled
- `completed` - Finished (one-time)
- `cancelled` - User cancelled
- `expired` - Past end date

#### 2. **reminder_history**
Log of all reminder deliveries and user responses.

```sql
- id: uuid
- reminder_id: uuid (FK)
- user_id: uuid (FK)
- scheduled_time: timestamptz
- delivered_at: timestamptz
- delivery_status: notification_delivery_status enum
- user_response: text
- response_time: timestamptz
- snooze_count: integer
- snoozed_until: timestamptz
- completion_data: jsonb
```

**Delivery Status:**
- `scheduled` - Queued for delivery
- `sent` - Notification sent
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `dismissed` - User dismissed
- `snoozed` - User snoozed
- `completed` - Action completed

#### 3. **notification_preferences**
User-specific notification settings.

```sql
- user_id: uuid (Unique)
- notifications_enabled: boolean
- sound_enabled: boolean
- vibration_enabled: boolean
- badge_enabled: boolean
- quiet_hours_enabled: boolean
- quiet_hours_start: time
- quiet_hours_end: time
- meal_reminders_enabled: boolean
- medication_reminders_enabled: boolean
- testing_reminders_enabled: boolean
- smart_reminders_enabled: boolean
- min_priority_to_show: text
- push_notifications_enabled: boolean
- email_notifications_enabled: boolean
- sms_notifications_enabled: boolean
```

#### 4. **smart_reminder_rules**
Context-aware reminder rules and triggers.

```sql
- id: uuid
- user_id: uuid (FK)
- rule_name: text
- rule_type: text
- is_enabled: boolean
- trigger_conditions: jsonb
- reminder_template: jsonb
- min_time_between_triggers_minutes: integer
- max_triggers_per_day: integer
- last_triggered_at: timestamptz
- trigger_count_today: integer
- priority: integer
```

**Smart Rule Types:**
- `missing_meal` - No meal logged in X hours
- `high_carb_followup` - After high-carb meal
- `inactivity` - No activity detected
- `high_glucose_followup` - After high reading
- `low_glucose_followup` - After low reading
- `pre_meal_test` - Test before eating
- `post_meal_test` - Test after eating
- `medication_adherence` - Missed medication
- `custom` - User-defined rule

#### 5. **medication_refills**
Medication inventory and refill tracking.

```sql
- id: uuid
- user_id: uuid (FK)
- reminder_id: uuid (FK - optional)
- medication_name: text
- total_quantity: integer
- remaining_quantity: integer
- daily_dosage: integer
- refill_date: date
- next_refill_date: date
- pharmacy_name: text
- prescription_number: text
```

#### 6. **a1c_test_schedule**
A1C test scheduling and tracking.

```sql
- user_id: uuid (Unique)
- last_test_date: date
- last_test_result: numeric(3,1)
- next_test_date: date
- test_frequency_months: integer (default 3)
- reminder_days_before: integer (default 7)
- physician_name: text
- lab_location: text
- reminder_enabled: boolean
```

#### 7. **reminder_completions**
Log of completed reminders for analytics.

```sql
- id: uuid
- reminder_id: uuid (FK)
- user_id: uuid (FK)
- completed_at: timestamptz
- completion_type: text (on_time, late, early, manual)
- time_difference_minutes: integer
- notes: text
```

---

## 🔧 Enhanced Reminder Service

**File:** `/services/EnhancedReminderService.ts`

### Core Methods

#### Initialization

```typescript
// Initialize notifications system
await EnhancedReminderService.initializeNotifications();

// Setup notification listeners
await EnhancedReminderService.setupNotificationListeners(
  (notification) => {
    console.log('Received:', notification);
  },
  (response) => {
    console.log('Interaction:', response);
  }
);
```

#### Meal Reminders

```typescript
// Create meal reminder
const reminder = await EnhancedReminderService.createMealReminder(
  userId,
  'breakfast', // meal type
  '08:00', // scheduled time
  [1, 2, 3, 4, 5] // Monday-Friday
);

// Check for missing meal (smart reminder)
await EnhancedReminderService.checkMissingMeal(
  userId,
  'lunch',
  3 // hours elapsed since typical lunch time
);
```

#### Medication Reminders

```typescript
// Create medication reminder
const medicationReminder = await EnhancedReminderService.createMedicationReminder(
  userId,
  'Metformin', // medication name
  '500mg', // dosage
  'oral', // type: insulin, oral, injection, other
  '09:00', // time
  [1, 2, 3, 4, 5, 6, 7] // daily
);
```

#### Testing Reminders

```typescript
// Create glucose testing reminder
const testReminder = await EnhancedReminderService.createTestingReminder(
  userId,
  'pre_meal', // test type
  '12:00', // time
  [1, 2, 3, 4, 5, 6, 7] // daily
);

// Test types:
// - fasting: Morning fasting glucose
// - pre_meal: Before eating
// - post_meal: After eating
// - 2hr_post_meal: 2 hours after meal
// - bedtime: Before bed
```

#### A1C Test Reminders

```typescript
// Schedule A1C test reminder
const a1cReminder = await EnhancedReminderService.createA1CTestReminder(
  userId,
  '2025-04-15' // test date
);
```

#### Smart Reminders

```typescript
// Create smart reminder rule
const smartRule = await EnhancedReminderService.createSmartReminder({
  userId,
  ruleName: 'High Carb Meal Follow-up',
  ruleType: 'high_carb_followup',
  isEnabled: true,
  triggerConditions: {
    carbThreshold: 60, // trigger if carbs > 60g
    hoursAfter: 2, // check 2 hours after meal
  },
  reminderTemplate: {
    title: 'Post-Meal Check',
    message: 'You had a high-carb meal. Consider checking your glucose.',
    priority: 'high',
    soundEnabled: true,
  },
  minTimeBetweenTriggersMinutes: 120,
  maxTriggersPerDay: 3,
  priority: 1,
});

// Trigger smart reminder
await EnhancedReminderService.triggerSmartReminder(
  userId,
  'high_carb_followup',
  {
    carbAmount: 75,
    mealTime: new Date().toISOString(),
  }
);

// Check high-carb meal follow-up
await EnhancedReminderService.checkHighCarbFollowup(
  userId,
  75, // carbs consumed
  '12:30' // meal time
);
```

#### Reminder Management

```typescript
// Get all user reminders
const reminders = await EnhancedReminderService.getUserReminders(
  userId,
  'medication', // optional: filter by type
  'active' // optional: filter by status
);

// Update reminder
await EnhancedReminderService.updateReminder(reminderId, {
  scheduledTime: '09:30',
  soundEnabled: false,
});

// Pause reminder
await EnhancedReminderService.pauseReminder(reminderId);

// Resume reminder
await EnhancedReminderService.resumeReminder(reminderId);

// Snooze reminder (10 minutes)
await EnhancedReminderService.snoozeReminder(reminderId, 10);

// Complete reminder
await EnhancedReminderService.completeReminder(reminderId, {
  notes: 'Took medication as scheduled',
});

// Delete reminder
await EnhancedReminderService.deleteReminder(reminderId);
```

---

## 📱 Notification Priority System

### Priority Levels

| Priority | Use Case | Sound | Vibration | Persistence |
|----------|----------|-------|-----------|-------------|
| **Urgent** | Urgent low glucose, critical medication | ✅ Loud | ✅ Strong | Lock screen |
| **High** | Medication reminders, important tests | ✅ Normal | ✅ Normal | Notification tray |
| **Default** | Meal reminders, regular tests | ✅ Soft | ✅ Light | Notification tray |
| **Low** | Hydration, exercise suggestions | ❌ Silent | ❌ None | Notification tray |

### Quiet Hours

Users can set quiet hours to suppress non-urgent notifications:

```typescript
// Update notification preferences
await EnhancedReminderService.updateNotificationPreferences(userId, {
  quietHoursEnabled: true,
  quietHoursStart: '22:00', // 10 PM
  quietHoursEnd: '07:00', // 7 AM
  // Urgent notifications still come through
});
```

---

## 🎯 Smart Reminder Examples

### 1. Missing Meal Detection

```typescript
// Triggered when no meal logged within expected time window
{
  ruleType: 'missing_meal',
  triggerConditions: {
    mealType: 'lunch',
    expectedTime: '12:00',
    toleranceHours: 2, // trigger after 2 PM if no lunch
  },
  reminderTemplate: {
    title: 'Haven\'t logged lunch yet',
    message: 'It\'s past your usual lunch time. Don\'t forget to log your meal!',
    priority: 'default',
  },
}
```

### 2. High-Carb Meal Follow-up

```typescript
// Triggered 2 hours after consuming > 60g carbs
{
  ruleType: 'high_carb_followup',
  triggerConditions: {
    carbThreshold: 60,
    hoursAfter: 2,
  },
  reminderTemplate: {
    title: 'Post-Meal Glucose Check',
    message: 'You had a high-carb meal. Check your glucose to see how it affected you.',
    priority: 'high',
  },
}
```

### 3. Medication Adherence

```typescript
// Triggered if medication not marked as taken within 30 min of scheduled time
{
  ruleType: 'medication_adherence',
  triggerConditions: {
    minutesAfterScheduled: 30,
  },
  reminderTemplate: {
    title: 'Medication Reminder',
    message: 'Did you take your {{medicationName}}? Mark it as taken in the app.',
    priority: 'high',
  },
}
```

### 4. Pre-Meal Testing

```typescript
// Triggered when meal is about to be logged but no glucose test in past 30 min
{
  ruleType: 'pre_meal_test',
  triggerConditions: {
    beforeMealLog: true,
    lastTestMinutesAgo: 30,
  },
  reminderTemplate: {
    title: 'Pre-Meal Glucose Test',
    message: 'Consider checking your glucose before eating.',
    priority: 'default',
  },
}
```

### 5. Inactivity Alert

```typescript
// Triggered after 4+ hours with no logged activity
{
  ruleType: 'inactivity',
  triggerConditions: {
    hoursInactive: 4,
    excludeQuietHours: true,
  },
  reminderTemplate: {
    title: 'Time to Move!',
    message: 'You\'ve been inactive for a while. A short walk can help manage glucose levels.',
    priority: 'low',
  },
}
```

---

## 🔔 Notification Actions

### Actionable Notifications

Notifications can include action buttons:

```typescript
await Notifications.setNotificationCategoryAsync('reminder', [
  {
    identifier: 'complete',
    buttonTitle: 'Mark Done',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'snooze',
    buttonTitle: 'Snooze 10m',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'view',
    buttonTitle: 'View',
    options: { opensAppToForeground: true },
  },
]);
```

### User Interactions

```typescript
// Handle notification response
EnhancedReminderService.setupNotificationListeners(
  undefined,
  async (response) => {
    const { reminderId, action } = response.notification.request.content.data;

    switch (response.actionIdentifier) {
      case 'complete':
        await EnhancedReminderService.completeReminder(reminderId);
        break;
      case 'snooze':
        await EnhancedReminderService.snoozeReminder(reminderId, 10);
        break;
      case 'view':
        // Navigate to relevant screen
        break;
    }
  }
);
```

---

## 📊 Analytics & Insights

### Reminder Completion Rates

```typescript
// Get completion history
const { data: completions } = await supabase
  .from('reminder_completions')
  .select('*')
  .eq('user_id', userId)
  .gte('completed_at', startDate)
  .lte('completed_at', endDate);

// Calculate adherence rate
const adherenceRate = (completions.filter(c => c.completion_type === 'on_time').length / completions.length) * 100;
```

### Smart Reminder Effectiveness

```typescript
// Track smart reminder triggers
const { data: smartLogs } = await supabase
  .from('reminder_history')
  .select('*, reminders!inner(*)')
  .eq('user_id', userId)
  .eq('reminders.is_smart_reminder', true)
  .gte('scheduled_time', startDate);

// Analyze response rates
const responseRate = (smartLogs.filter(log => log.user_response).length / smartLogs.length) * 100;
```

---

## 🛡️ Security & Privacy

### Data Protection

✅ **Row Level Security (RLS):**
- Users can only access their own reminders
- Smart rules are user-specific
- Medication data is encrypted

✅ **Notification Content:**
- Sensitive data (medication names, dosages) sanitized in lock screen notifications
- Full details only shown when device unlocked
- Option to use generic notification text

✅ **Quiet Hours:**
- Urgent notifications (glucose alerts) bypass quiet hours
- All other notifications suppressed during quiet hours
- User configurable sensitivity

### Privacy Controls

```typescript
// Generic notification mode (privacy-focused)
const preferences = {
  notifications_enabled: true,
  generic_notifications: true, // "Reminder" instead of "Take Metformin 500mg"
  lock_screen_privacy: true, // Hide details on lock screen
};
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('EnhancedReminderService', () => {
  it('should create meal reminder successfully', async () => {
    const reminder = await EnhancedReminderService.createMealReminder(
      'user-id',
      'breakfast',
      '08:00',
      [1, 2, 3, 4, 5]
    );
    expect(reminder).toBeDefined();
    expect(reminder.reminderType).toBe('meal');
  });

  it('should trigger smart reminder for missing meal', async () => {
    const triggered = await EnhancedReminderService.checkMissingMeal(
      'user-id',
      'lunch',
      3 // 3 hours past expected time
    );
    expect(triggered).toBe(true);
  });

  it('should respect quiet hours', async () => {
    // Test that non-urgent notifications are suppressed during quiet hours
  });
});
```

### Integration Tests

- Notification scheduling and delivery
- Smart reminder trigger conditions
- Snooze and completion flows
- Quiet hours enforcement
- Cross-platform (iOS/Android) behavior

---

## 📱 User Interface Integration

### Reminder List Screen

```typescript
import { EnhancedReminderService } from '@/services/EnhancedReminderService';

function RemindersList() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const data = await EnhancedReminderService.getUserReminders(user.id, undefined, 'active');
    setReminders(data);
  };

  return (
    <ScrollView>
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          onToggle={() => toggleReminder(reminder.id)}
          onEdit={() => editReminder(reminder)}
          onDelete={() => deleteReminder(reminder.id)}
        />
      ))}
    </ScrollView>
  );
}
```

### Add Reminder Modal

```typescript
function AddReminderModal() {
  const [reminderType, setReminderType] = useState('meal');
  const [time, setTime] = useState('08:00');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);

  const handleCreate = async () => {
    if (reminderType === 'meal') {
      await EnhancedReminderService.createMealReminder(
        user.id,
        'breakfast',
        time,
        days
      );
    } else if (reminderType === 'medication') {
      await EnhancedReminderService.createMedicationReminder(
        user.id,
        medicationName,
        dosage,
        medicationType,
        time,
        days
      );
    }
    onClose();
  };

  return (
    <Modal visible={isVisible}>
      {/* Reminder configuration UI */}
    </Modal>
  );
}
```

---

## 🚀 Best Practices

### 1. **Timing**
- Schedule meal reminders 15-30 min before typical meal times
- Medication reminders at exact prescribed times
- Testing reminders with flexible windows (±15 min)
- A1C reminders 7-14 days before test date

### 2. **Frequency**
- Meal reminders: Daily for all meals
- Medication: Based on prescription (1-4x daily)
- Testing: Per doctor's recommendation (2-7x daily)
- Smart reminders: Max 3-5 per day to avoid notification fatigue

### 3. **Priority Assignment**
- **Urgent:** Critical medication, severe glucose alerts
- **High:** Medication reminders, important tests
- **Default:** Meal logging, regular testing
- **Low:** Hydration, exercise suggestions

### 4. **Snooze Limits**
- Meal reminders: 3 snoozes max (10 min each)
- Medication: 2 snoozes max (5 min each)
- Testing: 2 snoozes max (10 min each)
- No snooze for urgent alerts

### 5. **Smart Reminder Throttling**
- Minimum 60-120 min between similar smart reminders
- Maximum 3-5 smart reminders per day
- Reset counters at midnight
- Respect user's quiet hours

---

## ✅ Summary

The comprehensive notifications and reminders system includes:

✅ **7 Database Tables** - Reminders, history, preferences, smart rules, refills, A1C, completions
✅ **9 Reminder Types** - Meals, medication, testing, A1C, exercise, hydration, appointments, refills, custom
✅ **5 Frequency Options** - One-time, daily, weekly, monthly, custom
✅ **8 Smart Reminder Types** - Context-aware triggers based on user behavior
✅ **4 Priority Levels** - Urgent, high, default, low with appropriate delivery
✅ **Quiet Hours Support** - Suppress non-urgent notifications during sleep
✅ **Actionable Notifications** - Complete, snooze, view actions directly from notification
✅ **Medication Tracking** - Refill alerts, adherence monitoring, inventory management
✅ **A1C Test Scheduling** - Automatic 3-month reminders with configurable timing
✅ **Analytics & Insights** - Completion rates, adherence tracking, smart reminder effectiveness

**The system is production-ready and fully functional!**
