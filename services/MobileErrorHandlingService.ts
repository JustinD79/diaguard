import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';

export class MobileErrorHandlingService {
  private static errorLog: MobileErrorLogEntry[] = [];
  private static maxLogSize = 500; // Reduced for mobile storage
  private static retryAttempts = new Map<string, number>();
  private static maxRetries = 3;

  // Mobile-specific error types
  static readonly MobileErrorTypes = {
    NETWORK: 'network',
    API: 'api',
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    PERMISSION: 'permission',
    MEDICAL: 'medical',
    CAMERA: 'camera',
    STORAGE: 'storage',
    BIOMETRIC: 'biometric',
    LOCATION: 'location',
    NOTIFICATION: 'notification',
    BACKGROUND_TASK: 'background_task',
    UNKNOWN: 'unknown'
  } as const;

  // Mobile-appropriate severity levels
  static readonly Severity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const;

  /**
   * Main mobile error handling method
   */
  static async handleMobileError(
    error: Error | any,
    context: MobileErrorContext,
    options: MobileErrorHandlingOptions = {}
  ): Promise<MobileErrorHandlingResult> {
    const errorInfo = await this.classifyMobileError(error, context);
    const userMessage = this.generateMobileUserMessage(errorInfo);
    
    // Log the error with mobile-specific data
    await this.logMobileError(errorInfo);
    
    // Determine if retry is appropriate for mobile
    const shouldRetry = this.shouldRetryOnMobile(errorInfo, options);
    
    // Handle based on error type with mobile strategies
    const handlingStrategy = this.getMobileHandlingStrategy(errorInfo);
    
    // Execute mobile-specific recovery actions
    const recoveryResult = await this.executeMobileRecovery(errorInfo, handlingStrategy);
    
    // Show mobile-appropriate user feedback
    if (!options.silent) {
      await this.showMobileErrorFeedback(userMessage, shouldRetry, options);
    }
    
    return {
      errorInfo,
      userMessage,
      shouldRetry,
      recoveryResult,
      fallbackData: handlingStrategy.fallbackData
    };
  }

  /**
   * Classify error type and severity for mobile context
   */
  private static async classifyMobileError(error: any, context: MobileErrorContext): Promise<MobileErrorInfo> {
    let type = this.MobileErrorTypes.UNKNOWN;
    let severity = this.Severity.MEDIUM;
    let isRecoverable = true;
    let requiresUserAction = false;

    // Network errors (common on mobile)
    if (await this.isMobileNetworkError(error)) {
      type = this.MobileErrorTypes.NETWORK;
      severity = this.Severity.MEDIUM;
      isRecoverable = true;
    }
    // API errors
    else if (this.isAPIError(error)) {
      type = this.MobileErrorTypes.API;
      severity = error.status >= 500 ? this.Severity.HIGH : this.Severity.MEDIUM;
      isRecoverable = error.status < 500;
      requiresUserAction = error.status === 401 || error.status === 403;
    }
    // Camera/permission errors (mobile-specific)
    else if (this.isCameraError(error)) {
      type = this.MobileErrorTypes.CAMERA;
      severity = this.Severity.MEDIUM;
      isRecoverable = true;
      requiresUserAction = true;
    }
    // Storage errors (mobile-specific)
    else if (this.isStorageError(error)) {
      type = this.MobileErrorTypes.STORAGE;
      severity = this.Severity.HIGH;
      isRecoverable = true;
    }
    // Medical/insulin related errors (critical)
    else if (context.feature === 'insulin_calculation' || context.feature === 'medical_analysis') {
      type = this.MobileErrorTypes.MEDICAL;
      severity = this.Severity.CRITICAL;
      isRecoverable = false;
      requiresUserAction = true;
    }
    // Biometric authentication errors
    else if (this.isBiometricError(error)) {
      type = this.MobileErrorTypes.BIOMETRIC;
      severity = this.Severity.MEDIUM;
      isRecoverable = true;
      requiresUserAction = true;
    }
    // Background task errors
    else if (context.feature === 'background_sync' || context.feature === 'notifications') {
      type = this.MobileErrorTypes.BACKGROUND_TASK;
      severity = this.Severity.LOW;
      isRecoverable = true;
    }

    const deviceInfo = await this.getMobileDeviceInfo();
    const networkInfo = await this.getNetworkInfo();

    return {
      id: this.generateErrorId(),
      type,
      severity,
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      isRecoverable,
      requiresUserAction,
      originalError: error,
      deviceInfo,
      networkInfo,
      appState: await this.getAppState()
    };
  }

  /**
   * Generate mobile-appropriate user messages
   */
  private static generateMobileUserMessage(errorInfo: MobileErrorInfo): MobileUserErrorMessage {
    const messages = {
      [this.MobileErrorTypes.NETWORK]: {
        title: 'Connection Issue',
        message: 'Please check your internet connection and try again.',
        actionText: 'Retry',
        icon: '📶',
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.API]: {
        title: 'Service Unavailable',
        message: 'Our servers are temporarily unavailable. Your data is safe.',
        actionText: 'Try Again',
        icon: '⚠️',
        hapticFeedback: 'warning'
      },
      [this.MobileErrorTypes.CAMERA]: {
        title: 'Camera Access Needed',
        message: 'Please allow camera access in your device settings to scan food.',
        actionText: 'Open Settings',
        icon: '📷',
        hapticFeedback: 'warning'
      },
      [this.MobileErrorTypes.STORAGE]: {
        title: 'Storage Issue',
        message: 'Unable to save data. Please free up storage space on your device.',
        actionText: 'Check Storage',
        icon: '💾',
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.MEDICAL]: {
        title: '🏥 Medical Safety Alert',
        message: 'Unable to calculate insulin dosage. Please consult your healthcare provider.',
        actionText: 'Contact Provider',
        icon: '🚨',
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.BIOMETRIC]: {
        title: 'Authentication Failed',
        message: 'Biometric authentication failed. Please try again or use your password.',
        actionText: 'Use Password',
        icon: '🔐',
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.NOTIFICATION]: {
        title: 'Notification Settings',
        message: 'Enable notifications to receive medication reminders and health alerts.',
        actionText: 'Enable',
        icon: '🔔',
        hapticFeedback: 'warning'
      }
    };

    const defaultMessage = {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      actionText: 'Retry',
      icon: '❌',
      hapticFeedback: 'error' as const
    };

    return messages[errorInfo.type] || defaultMessage;
  }

  /**
   * Mobile-specific error handling strategies
   */
  private static getMobileHandlingStrategy(errorInfo: MobileErrorInfo): MobileErrorHandlingStrategy {
    const strategies: Record<string, MobileErrorHandlingStrategy> = {
      [this.MobileErrorTypes.NETWORK]: {
        enableRetry: true,
        retryDelay: 2000,
        maxRetries: 3,
        fallbackData: this.getOfflineData(errorInfo.context),
        recoveryActions: ['checkNetworkStatus', 'enableOfflineMode', 'showNetworkSettings'],
        showToast: true,
        hapticFeedback: 'warning'
      },
      [this.MobileErrorTypes.CAMERA]: {
        enableRetry: false,
        fallbackData: null,
        recoveryActions: ['requestCameraPermission', 'showPermissionSettings', 'showManualEntry'],
        showToast: false,
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.STORAGE]: {
        enableRetry: true,
        retryDelay: 1000,
        maxRetries: 2,
        fallbackData: null,
        recoveryActions: ['clearCache', 'showStorageSettings', 'compressData'],
        showToast: true,
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.MEDICAL]: {
        enableRetry: false,
        fallbackData: null,
        recoveryActions: ['showMedicalDisclaimer', 'logCriticalEvent', 'contactEmergency'],
        showToast: false,
        hapticFeedback: 'error'
      },
      [this.MobileErrorTypes.BIOMETRIC]: {
        enableRetry: true,
        retryDelay: 500,
        maxRetries: 2,
        fallbackData: null,
        recoveryActions: ['fallbackToPassword', 'showBiometricSettings'],
        showToast: false,
        hapticFeedback: 'error'
      }
    };

    return strategies[errorInfo.type] || {
      enableRetry: true,
      retryDelay: 3000,
      maxRetries: 1,
      fallbackData: null,
      recoveryActions: ['showGenericError'],
      showToast: true,
      hapticFeedback: 'error'
    };
  }

  /**
   * Execute mobile-specific recovery actions
   */
  private static async executeMobileRecovery(
    errorInfo: MobileErrorInfo,
    strategy: MobileErrorHandlingStrategy
  ): Promise<MobileRecoveryResult> {
    const results: MobileRecoveryActionResult[] = [];

    for (const action of strategy.recoveryActions) {
      try {
        const result = await this.executeMobileRecoveryAction(action, errorInfo);
        results.push(result);
      } catch (recoveryError) {
        results.push({
          action,
          success: false,
          error: recoveryError.message
        });
      }
    }

    return {
      success: results.some(r => r.success),
      actions: results,
      fallbackAvailable: !!strategy.fallbackData
    };
  }

  /**
   * Execute individual mobile recovery actions
   */
  private static async executeMobileRecoveryAction(
    action: string,
    errorInfo: MobileErrorInfo
  ): Promise<MobileRecoveryActionResult> {
    switch (action) {
      case 'checkNetworkStatus':
        const networkState = await Network.getNetworkStateAsync();
        return { 
          action, 
          success: networkState.isConnected || false,
          data: networkState
        };

      case 'enableOfflineMode':
        await AsyncStorage.setItem('offlineMode', 'true');
        return { action, success: true };

      case 'requestCameraPermission':
        // This would integrate with expo-camera permissions
        return { action, success: true, message: 'Permission request initiated' };

      case 'clearCache':
        try {
          const keys = await AsyncStorage.getAllKeys();
          const cacheKeys = keys.filter(key => key.startsWith('cache_'));
          await AsyncStorage.multiRemove(cacheKeys);
          return { action, success: true, message: 'Cache cleared successfully' };
        } catch {
          return { action, success: false, error: 'Failed to clear cache' };
        }

      case 'showMedicalDisclaimer':
        // Log critical medical event
        await this.logCriticalMedicalEvent(errorInfo);
        return { action, success: true };

      case 'logCriticalEvent':
        await this.logCriticalEvent(errorInfo);
        return { action, success: true };

      case 'fallbackToPassword':
        await AsyncStorage.setItem('biometric_fallback', 'true');
        return { action, success: true };

      default:
        return { action, success: false, error: 'Unknown recovery action' };
    }
  }

  /**
   * Show mobile-appropriate error feedback
   */
  private static async showMobileErrorFeedback(
    userMessage: MobileUserErrorMessage,
    shouldRetry: boolean,
    options: MobileErrorHandlingOptions
  ): Promise<void> {
    // Trigger haptic feedback if available
    if (Platform.OS !== 'web' && userMessage.hapticFeedback) {
      try {
        const { Haptics } = await import('expo-haptics');
        switch (userMessage.hapticFeedback) {
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        }
      } catch {
        // Haptics not available, continue without feedback
      }
    }

    // Show appropriate mobile alert
    const buttons = [{ text: 'OK', style: 'default' as const }];
    
    if (shouldRetry && !options.disableRetry) {
      buttons.unshift({
        text: userMessage.actionText,
        onPress: () => {
          // Retry logic would be handled by the calling component
          console.log('Retry requested for mobile error');
        }
      });
    }

    Alert.alert(
      userMessage.title,
      userMessage.message,
      buttons,
      { cancelable: true }
    );
  }

  /**
   * Mobile-specific error detection methods
   */
  private static async isMobileNetworkError(error: any): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return !networkState.isConnected || 
             error.name === 'NetworkError' || 
             error.code === 'NETWORK_ERROR' ||
             error.message?.includes('fetch') ||
             error.message?.includes('network');
    } catch {
      return error.name === 'NetworkError' || error.message?.includes('network');
    }
  }

  private static isAPIError(error: any): boolean {
    return error.status && typeof error.status === 'number';
  }

  private static isCameraError(error: any): boolean {
    return error.code === 'E_CAMERA_UNAVAILABLE' ||
           error.code === 'E_CAMERA_BAD_VIEWFINDER' ||
           error.message?.includes('camera') ||
           error.message?.includes('permission');
  }

  private static isStorageError(error: any): boolean {
    return error.code === 'E_STORAGE_FULL' ||
           error.message?.includes('storage') ||
           error.message?.includes('AsyncStorage') ||
           error.message?.includes('disk space');
  }

  private static isBiometricError(error: any): boolean {
    return error.code === 'E_BIOMETRIC_UNAVAILABLE' ||
           error.code === 'E_BIOMETRIC_AUTHENTICATION_FAILED' ||
           error.message?.includes('biometric') ||
           error.message?.includes('fingerprint') ||
           error.message?.includes('face');
  }

  /**
   * Get mobile device information
   */
  private static async getMobileDeviceInfo(): Promise<MobileDeviceInfo> {
    try {
      return {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        deviceName: Device.deviceName || 'Unknown',
        deviceType: Device.deviceType || Device.DeviceType.UNKNOWN,
        brand: Device.brand || 'Unknown',
        modelName: Device.modelName || 'Unknown',
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'Unknown',
        totalMemory: Device.totalMemory || 0,
        isDevice: Device.isDevice,
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        buildVersion: Application.nativeBuildVersion || '1'
      };
    } catch {
      return {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        deviceName: 'Unknown',
        deviceType: Device.DeviceType.UNKNOWN,
        brand: 'Unknown',
        modelName: 'Unknown',
        osName: Platform.OS,
        osVersion: 'Unknown',
        totalMemory: 0,
        isDevice: true,
        appVersion: '1.0.0',
        buildVersion: '1'
      };
    }
  }

  /**
   * Get network information
   */
  private static async getNetworkInfo(): Promise<MobileNetworkInfo> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return {
        isConnected: networkState.isConnected || false,
        type: networkState.type || Network.NetworkStateType.UNKNOWN,
        isInternetReachable: networkState.isInternetReachable || false
      };
    } catch {
      return {
        isConnected: false,
        type: Network.NetworkStateType.UNKNOWN,
        isInternetReachable: false
      };
    }
  }

  /**
   * Get current app state
   */
  private static async getAppState(): Promise<MobileAppState> {
    try {
      const { AppState } = await import('react-native');
      return {
        currentState: AppState.currentState,
        memoryUsage: await this.getMemoryUsage(),
        storageUsage: await this.getStorageUsage(),
        batteryLevel: await this.getBatteryLevel()
      };
    } catch {
      return {
        currentState: 'unknown',
        memoryUsage: 0,
        storageUsage: 0,
        batteryLevel: 0
      };
    }
  }

  /**
   * Log error with mobile-specific data
   */
  private static async logMobileError(errorInfo: MobileErrorInfo): Promise<void> {
    const logEntry: MobileErrorLogEntry = {
      ...errorInfo,
      userId: await this.getCurrentUserId(),
      sessionId: await this.getSessionId()
    };

    // Add to local log (limited size for mobile)
    this.errorLog.unshift(logEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Store in AsyncStorage for offline sync
    await this.storeErrorLocally(logEntry);

    // Send to Supabase if online
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        await this.sendToSupabaseLogging(logEntry);
      }
    } catch (loggingError) {
      console.warn('Failed to send error to remote logging:', loggingError);
    }
  }

  /**
   * Store error locally for offline sync
   */
  private static async storeErrorLocally(logEntry: MobileErrorLogEntry): Promise<void> {
    try {
      const existingErrors = await AsyncStorage.getItem('mobile_error_log');
      const errors = existingErrors ? JSON.parse(existingErrors) : [];
      errors.unshift(logEntry);
      
      // Keep only last 100 errors to manage storage
      const trimmedErrors = errors.slice(0, 100);
      await AsyncStorage.setItem('mobile_error_log', JSON.stringify(trimmedErrors));
    } catch {
      // Ignore storage errors when logging errors
    }
  }

  /**
   * Send error to Supabase for remote logging
   */
  private static async sendToSupabaseLogging(logEntry: MobileErrorLogEntry): Promise<void> {
    try {
      await supabase.from('mobile_error_logs').insert({
        error_id: logEntry.id,
        user_id: logEntry.userId,
        error_type: logEntry.type,
        severity: logEntry.severity,
        message: logEntry.message,
        context: logEntry.context,
        device_info: logEntry.deviceInfo,
        network_info: logEntry.networkInfo,
        app_state: logEntry.appState,
        timestamp: logEntry.timestamp
      });
    } catch {
      // Ignore logging errors
    }
  }

  /**
   * Utility methods for mobile-specific data
   */
  private static async getMemoryUsage(): Promise<number> {
    // This would require a native module or estimation
    return 0;
  }

  private static async getStorageUsage(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      return Math.round(totalSize / (1024 * 1024)); // Convert to MB
    } catch {
      return 0;
    }
  }

  private static async getBatteryLevel(): Promise<number> {
    try {
      const { Battery } = await import('expo-battery');
      return await Battery.getBatteryLevelAsync();
    } catch {
      return 0;
    }
  }

  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  private static async getSessionId(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem('mobile_session_id');
      if (!sessionId) {
        sessionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('mobile_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return 'unknown_session';
    }
  }

  private static generateErrorId(): string {
    return `mobile_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static shouldRetryOnMobile(
    errorInfo: MobileErrorInfo, 
    options: MobileErrorHandlingOptions
  ): boolean {
    const key = `${errorInfo.context.feature}_${errorInfo.type}`;
    const attempts = this.retryAttempts.get(key) || 0;
    
    if (attempts >= this.maxRetries) {
      return false;
    }

    // Don't retry validation, medical, or permission errors
    if ([
      this.MobileErrorTypes.VALIDATION,
      this.MobileErrorTypes.MEDICAL,
      this.MobileErrorTypes.PERMISSION,
      this.MobileErrorTypes.BIOMETRIC
    ].includes(errorInfo.type as any)) {
      return false;
    }

    if (options.disableRetry) {
      return false;
    }

    return errorInfo.isRecoverable;
  }

  private static async getOfflineData(context: MobileErrorContext): Promise<any> {
    try {
      const offlineData = await AsyncStorage.getItem(`offline_${context.feature}`);
      return offlineData ? JSON.parse(offlineData) : null;
    } catch {
      return null;
    }
  }

  private static async logCriticalMedicalEvent(errorInfo: MobileErrorInfo): Promise<void> {
    try {
      await supabase.from('medical_audit_logs').insert({
        user_id: await this.getCurrentUserId(),
        action_type: 'critical_error',
        action_data: {
          error_id: errorInfo.id,
          error_type: errorInfo.type,
          context: errorInfo.context
        },
        medical_significance: 'critical'
      });
    } catch {
      // Store locally if can't send to server
      await AsyncStorage.setItem('pending_medical_log', JSON.stringify({
        timestamp: new Date().toISOString(),
        errorId: errorInfo.id,
        type: 'critical_medical_error'
      }));
    }
  }

  private static async logCriticalEvent(errorInfo: MobileErrorInfo): Promise<void> {
    await AsyncStorage.setItem('last_critical_error', JSON.stringify({
      id: errorInfo.id,
      timestamp: errorInfo.timestamp,
      type: errorInfo.type,
      severity: errorInfo.severity
    }));
  }

  /**
   * Public methods for mobile error management
   */
  static async getMobileErrorLog(): Promise<MobileErrorLogEntry[]> {
    try {
      const stored = await AsyncStorage.getItem('mobile_error_log');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static async clearMobileErrorLog(): Promise<void> {
    try {
      await AsyncStorage.removeItem('mobile_error_log');
      this.errorLog = [];
    } catch {
      // Ignore cleanup errors
    }
  }

  static async getMobileErrorStats(): Promise<MobileErrorStats> {
    const logs = await this.getMobileErrorLog();
    const total = logs.length;
    
    const byType = logs.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = logs.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byType, bySeverity };
  }

  static async syncErrorsToServer(): Promise<void> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) return;

      const pendingErrors = await AsyncStorage.getItem('mobile_error_log');
      if (pendingErrors) {
        const errors = JSON.parse(pendingErrors);
        for (const error of errors) {
          await this.sendToSupabaseLogging(error);
        }
        // Clear synced errors
        await AsyncStorage.removeItem('mobile_error_log');
      }
    } catch (error) {
      console.warn('Failed to sync errors to server:', error);
    }
  }
}

// Mobile-specific type definitions
export interface MobileErrorContext {
  feature: string;
  action: string;
  userId?: string;
  screenName?: string;
  additionalData?: Record<string, any>;
}

export interface MobileErrorHandlingOptions {
  disableRetry?: boolean;
  customMessage?: string;
  silent?: boolean;
  showToast?: boolean;
  hapticFeedback?: boolean;
}

export interface MobileErrorInfo {
  id: string;
  type: string;
  severity: string;
  message: string;
  stack?: string;
  timestamp: string;
  context: MobileErrorContext;
  isRecoverable: boolean;
  requiresUserAction: boolean;
  originalError: any;
  deviceInfo: MobileDeviceInfo;
  networkInfo: MobileNetworkInfo;
  appState: MobileAppState;
}

export interface MobileUserErrorMessage {
  title: string;
  message: string;
  actionText: string;
  icon: string;
  hapticFeedback: 'error' | 'warning' | 'success';
}

export interface MobileErrorHandlingStrategy {
  enableRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackData?: any;
  recoveryActions: string[];
  showToast: boolean;
  hapticFeedback: 'error' | 'warning' | 'success';
}

export interface MobileRecoveryResult {
  success: boolean;
  actions: MobileRecoveryActionResult[];
  fallbackAvailable: boolean;
}

export interface MobileRecoveryActionResult {
  action: string;
  success: boolean;
  error?: string;
  data?: any;
  message?: string;
}

export interface MobileErrorHandlingResult {
  errorInfo: MobileErrorInfo;
  userMessage: MobileUserErrorMessage;
  shouldRetry: boolean;
  recoveryResult: MobileRecoveryResult;
  fallbackData?: any;
}

export interface MobileDeviceInfo {
  platform: string;
  version: string;
  deviceName: string;
  deviceType: number;
  brand: string;
  modelName: string;
  osName: string;
  osVersion: string;
  totalMemory: number;
  isDevice: boolean;
  appVersion: string;
  buildVersion: string;
}

export interface MobileNetworkInfo {
  isConnected: boolean;
  type: any;
  isInternetReachable: boolean;
}

export interface MobileAppState {
  currentState: string;
  memoryUsage: number;
  storageUsage: number;
  batteryLevel: number;
}

export interface MobileErrorLogEntry extends MobileErrorInfo {
  userId: string | null;
  sessionId: string;
}

export interface MobileErrorStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}