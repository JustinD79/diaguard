import { Platform } from 'react-native';

export class ErrorHandlingService {
  private static errorLog: ErrorLogEntry[] = [];
  private static maxLogSize = 1000;
  private static retryAttempts = new Map<string, number>();
  private static maxRetries = 3;

  // Error types for classification
  static readonly ErrorTypes = {
    NETWORK: 'network',
    API: 'api',
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    PERMISSION: 'permission',
    MEDICAL: 'medical',
    CAMERA: 'camera',
    STORAGE: 'storage',
    UNKNOWN: 'unknown'
  } as const;

  // Severity levels
  static readonly Severity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const;

  /**
   * Main error handling method
   */
  static async handleError(
    error: Error | any,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ): Promise<ErrorHandlingResult> {
    const errorInfo = this.classifyError(error, context);
    const userMessage = this.generateUserMessage(errorInfo);
    
    // Log the error
    await this.logError(errorInfo);
    
    // Determine if retry is appropriate
    const shouldRetry = this.shouldRetry(errorInfo, options);
    
    // Handle based on error type
    const handlingStrategy = this.getHandlingStrategy(errorInfo);
    
    // Execute recovery actions
    const recoveryResult = await this.executeRecovery(errorInfo, handlingStrategy);
    
    return {
      errorInfo,
      userMessage,
      shouldRetry,
      recoveryResult,
      fallbackData: handlingStrategy.fallbackData
    };
  }

  /**
   * Classify error type and severity
   */
  private static classifyError(error: any, context: ErrorContext): ErrorInfo {
    let type = this.ErrorTypes.UNKNOWN;
    let severity = this.Severity.MEDIUM;
    let isRecoverable = true;
    let requiresUserAction = false;

    // Network errors
    if (this.isNetworkError(error)) {
      type = this.ErrorTypes.NETWORK;
      severity = this.Severity.MEDIUM;
      isRecoverable = true;
    }
    // API errors
    else if (this.isAPIError(error)) {
      type = this.ErrorTypes.API;
      severity = error.status >= 500 ? this.Severity.HIGH : this.Severity.MEDIUM;
      isRecoverable = error.status < 500;
      requiresUserAction = error.status === 401 || error.status === 403;
    }
    // Validation errors
    else if (this.isValidationError(error)) {
      type = this.ErrorTypes.VALIDATION;
      severity = this.Severity.LOW;
      isRecoverable = true;
      requiresUserAction = true;
    }
    // Medical/insulin related errors (critical)
    else if (context.feature === 'insulin_calculation' || context.feature === 'medical_analysis') {
      type = this.ErrorTypes.MEDICAL;
      severity = this.Severity.CRITICAL;
      isRecoverable = false;
      requiresUserAction = true;
    }
    // Camera/scanning errors
    else if (context.feature === 'camera' || context.feature === 'food_scanning') {
      type = this.ErrorTypes.CAMERA;
      severity = this.Severity.MEDIUM;
      isRecoverable = true;
    }

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
      originalError: error
    };
  }

  /**
   * Generate user-friendly error messages
   */
  private static generateUserMessage(errorInfo: ErrorInfo): UserErrorMessage {
    const messages = {
      [this.ErrorTypes.NETWORK]: {
        title: 'Connection Issue',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        action: 'Retry',
        icon: '📡'
      },
      [this.ErrorTypes.API]: {
        title: 'Service Temporarily Unavailable',
        message: 'Our servers are experiencing issues. Your data is safe and we\'re working to resolve this.',
        action: 'Try Again Later',
        icon: '⚠️'
      },
      [this.ErrorTypes.VALIDATION]: {
        title: 'Invalid Information',
        message: 'Please check your input and try again.',
        action: 'Correct Input',
        icon: '✏️'
      },
      [this.ErrorTypes.MEDICAL]: {
        title: '🏥 Medical Safety Alert',
        message: 'We encountered an issue with medical calculations. For your safety, please consult your healthcare provider for insulin dosing.',
        action: 'Contact Provider',
        icon: '🚨'
      },
      [this.ErrorTypes.CAMERA]: {
        title: 'Camera Issue',
        message: 'Unable to access camera or process the image. Please try again or enter food information manually.',
        action: 'Try Manual Entry',
        icon: '📷'
      },
      [this.ErrorTypes.AUTHENTICATION]: {
        title: 'Sign In Required',
        message: 'Please sign in to continue using the app.',
        action: 'Sign In',
        icon: '🔐'
      }
    };

    const defaultMessage = {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      action: 'Retry',
      icon: '❌'
    };

    return messages[errorInfo.type] || defaultMessage;
  }

  /**
   * Determine error handling strategy
   */
  private static getHandlingStrategy(errorInfo: ErrorInfo): ErrorHandlingStrategy {
    const strategies: Record<string, ErrorHandlingStrategy> = {
      [this.ErrorTypes.NETWORK]: {
        enableRetry: true,
        retryDelay: 2000,
        maxRetries: 3,
        fallbackData: this.getOfflineData(errorInfo.context),
        recoveryActions: ['checkConnectivity', 'enableOfflineMode']
      },
      [this.ErrorTypes.API]: {
        enableRetry: errorInfo.originalError?.status >= 500,
        retryDelay: 5000,
        maxRetries: 2,
        fallbackData: this.getCachedData(errorInfo.context),
        recoveryActions: ['useCachedData', 'showOfflineMode']
      },
      [this.ErrorTypes.VALIDATION]: {
        enableRetry: false,
        fallbackData: null,
        recoveryActions: ['highlightErrors', 'showValidationHelp']
      },
      [this.ErrorTypes.MEDICAL]: {
        enableRetry: false,
        fallbackData: null,
        recoveryActions: ['showMedicalDisclaimer', 'redirectToProvider', 'logCriticalEvent']
      },
      [this.ErrorTypes.CAMERA]: {
        enableRetry: true,
        retryDelay: 1000,
        maxRetries: 2,
        fallbackData: null,
        recoveryActions: ['requestPermissions', 'showManualEntry']
      }
    };

    return strategies[errorInfo.type] || {
      enableRetry: true,
      retryDelay: 3000,
      maxRetries: 1,
      fallbackData: null,
      recoveryActions: ['showGenericError']
    };
  }

  /**
   * Execute recovery actions
   */
  private static async executeRecovery(
    errorInfo: ErrorInfo,
    strategy: ErrorHandlingStrategy
  ): Promise<RecoveryResult> {
    const results: RecoveryActionResult[] = [];

    for (const action of strategy.recoveryActions) {
      try {
        const result = await this.executeRecoveryAction(action, errorInfo);
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
   * Execute individual recovery action
   */
  private static async executeRecoveryAction(
    action: string,
    errorInfo: ErrorInfo
  ): Promise<RecoveryActionResult> {
    switch (action) {
      case 'checkConnectivity':
        const isOnline = await this.checkNetworkConnectivity();
        return { action, success: isOnline };

      case 'enableOfflineMode':
        await this.enableOfflineMode();
        return { action, success: true };

      case 'useCachedData':
        const cachedData = await this.getCachedData(errorInfo.context);
        return { action, success: !!cachedData, data: cachedData };

      case 'requestPermissions':
        const hasPermission = await this.requestCameraPermission();
        return { action, success: hasPermission };

      case 'showMedicalDisclaimer':
        await this.showMedicalDisclaimer();
        return { action, success: true };

      case 'logCriticalEvent':
        await this.logCriticalMedicalEvent(errorInfo);
        return { action, success: true };

      default:
        return { action, success: false, error: 'Unknown recovery action' };
    }
  }

  /**
   * Check if should retry based on error and attempt count
   */
  private static shouldRetry(errorInfo: ErrorInfo, options: ErrorHandlingOptions): boolean {
    const key = `${errorInfo.context.feature}_${errorInfo.type}`;
    const attempts = this.retryAttempts.get(key) || 0;
    
    if (attempts >= this.maxRetries) {
      return false;
    }

    // Don't retry validation or medical errors
    if (errorInfo.type === this.ErrorTypes.VALIDATION || 
        errorInfo.type === this.ErrorTypes.MEDICAL) {
      return false;
    }

    // Don't retry if explicitly disabled
    if (options.disableRetry) {
      return false;
    }

    return errorInfo.isRecoverable;
  }

  /**
   * Log error for debugging and analytics
   */
  private static async logError(errorInfo: ErrorInfo): Promise<void> {
    const logEntry: ErrorLogEntry = {
      ...errorInfo,
      userAgent: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'unknown',
      userId: await this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      deviceInfo: this.getDeviceInfo()
    };

    // Add to local log
    this.errorLog.unshift(logEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Send to remote logging service (if online)
    try {
      await this.sendToRemoteLogging(logEntry);
    } catch (loggingError) {
      console.warn('Failed to send error to remote logging:', loggingError);
    }

    // Store in local storage for offline sync
    await this.storeErrorLocally(logEntry);
  }

  /**
   * Network connectivity check
   */
  private static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Error type detection methods
   */
  private static isNetworkError(error: any): boolean {
    return error.name === 'NetworkError' || 
           error.code === 'NETWORK_ERROR' ||
           error.message?.includes('fetch') ||
           error.message?.includes('network') ||
           !navigator.onLine;
  }

  private static isAPIError(error: any): boolean {
    return error.status && typeof error.status === 'number';
  }

  private static isValidationError(error: any): boolean {
    return error.name === 'ValidationError' ||
           error.code === 'VALIDATION_ERROR' ||
           error.message?.includes('validation');
  }

  /**
   * Utility methods
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async getCurrentUserId(): Promise<string | null> {
    // Implementation depends on your auth system
    return 'user_123'; // Placeholder
  }

  private static getSessionId(): string {
    return Platform.OS === 'web' && typeof sessionStorage !== 'undefined' 
      ? sessionStorage.getItem('sessionId') || 'unknown'
      : 'unknown';
  }

  private static getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.platform : Platform.OS,
      userAgent: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      cookieEnabled: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
      onLine: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.onLine : true
    };
  }

  private static async getOfflineData(context: ErrorContext): Promise<any> {
    // Return cached data for offline functionality
    return null; // Implement based on your caching strategy
  }

  private static async getCachedData(context: ErrorContext): Promise<any> {
    // Return cached API responses
    return null; // Implement based on your caching strategy
  }

  private static async enableOfflineMode(): Promise<void> {
    // Enable offline functionality
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem('offlineMode', 'true');
    }
  }

  private static async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private static async showMedicalDisclaimer(): Promise<void> {
    // Show medical safety disclaimer
    console.log('Medical disclaimer shown');
  }

  private static async logCriticalMedicalEvent(errorInfo: ErrorInfo): Promise<void> {
    // Log critical medical events for compliance
    console.log('Critical medical event logged:', errorInfo.id);
  }

  private static async sendToRemoteLogging(logEntry: ErrorLogEntry): Promise<void> {
    // Send to your logging service (Sentry, LogRocket, etc.)
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine) {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    }
  }

  private static async storeErrorLocally(logEntry: ErrorLogEntry): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const errors = JSON.parse(localStorage.getItem('errorLog') || '[]');
      errors.unshift(logEntry);
      localStorage.setItem('errorLog', JSON.stringify(errors.slice(0, 100)));
    }
  }

  /**
   * Public methods for getting error information
   */
  static getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  static clearErrorLog(): void {
    this.errorLog = [];
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('errorLog');
    }
  }

  static getErrorStats(): ErrorStats {
    const total = this.errorLog.length;
    const byType = this.errorLog.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byType, bySeverity };
  }
}

// Type definitions
export interface ErrorContext {
  feature: string;
  action: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorHandlingOptions {
  disableRetry?: boolean;
  customMessage?: string;
  silent?: boolean;
}

export interface ErrorInfo {
  id: string;
  type: string;
  severity: string;
  message: string;
  stack?: string;
  timestamp: string;
  context: ErrorContext;
  isRecoverable: boolean;
  requiresUserAction: boolean;
  originalError: any;
}

export interface UserErrorMessage {
  title: string;
  message: string;
  action: string;
  icon: string;
}

export interface ErrorHandlingStrategy {
  enableRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackData?: any;
  recoveryActions: string[];
}

export interface RecoveryResult {
  success: boolean;
  actions: RecoveryActionResult[];
  fallbackAvailable: boolean;
}

export interface RecoveryActionResult {
  action: string;
  success: boolean;
  error?: string;
  data?: any;
}

export interface ErrorHandlingResult {
  errorInfo: ErrorInfo;
  userMessage: UserErrorMessage;
  shouldRetry: boolean;
  recoveryResult: RecoveryResult;
  fallbackData?: any;
}

export interface ErrorLogEntry extends ErrorInfo {
  userAgent: string;
  url: string;
  userId: string | null;
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

export interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}