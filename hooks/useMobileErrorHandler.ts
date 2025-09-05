import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { MobileErrorHandlingService, MobileErrorContext, MobileErrorHandlingOptions } from '@/services/MobileErrorHandlingService';

export function useMobileErrorHandler() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(async (
    error: Error | any,
    context: MobileErrorContext,
    options: MobileErrorHandlingOptions = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await MobileErrorHandlingService.handleMobileError(error, context, options);
      setError(result.userMessage.message);
      return result;
    } catch (handlingError) {
      console.error('Error in mobile error handler:', handlingError);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withMobileErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: MobileErrorContext,
    options?: MobileErrorHandlingOptions
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await fn(...args);
        return result;
      } catch (error) {
        await handleError(error, context, options);
        return null;
      } finally {
        setIsLoading(false);
      }
    };
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    withMobileErrorHandling
  };
}

// Specialized mobile error handlers
export function useCameraErrorHandler() {
  const { handleError, ...rest } = useMobileErrorHandler();

  const handleCameraError = useCallback((error: any, action: string) => {
    return handleError(error, {
      feature: 'camera',
      action,
      screenName: 'FoodCameraScanner'
    });
  }, [handleError]);

  return { ...rest, handleCameraError };
}

export function useNetworkErrorHandler() {
  const { handleError, ...rest } = useMobileErrorHandler();

  const handleNetworkError = useCallback((error: any, action: string) => {
    return handleError(error, {
      feature: 'network',
      action,
      additionalData: { 
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      }
    });
  }, [handleError]);

  return { ...rest, handleNetworkError };
}

export function useMedicalErrorHandler() {
  const { handleError, ...rest } = useMobileErrorHandler();

  const handleMedicalError = useCallback((error: any, feature: string) => {
    return handleError(error, {
      feature: 'medical',
      action: feature,
      additionalData: { criticalError: true }
    }, { 
      silent: false, // Always show medical errors
      hapticFeedback: true 
    });
  }, [handleError]);

  return { ...rest, handleMedicalError };
}

export function useStorageErrorHandler() {
  const { handleError, ...rest } = useMobileErrorHandler();

  const handleStorageError = useCallback((error: any, operation: string) => {
    return handleError(error, {
      feature: 'storage',
      action: operation,
      additionalData: { 
        storageType: 'AsyncStorage',
        operation 
      }
    });
  }, [handleError]);

  return { ...rest, handleStorageError };
}

export function usePermissionErrorHandler() {
  const { handleError, ...rest } = useMobileErrorHandler();

  const handlePermissionError = useCallback((error: any, permissionType: string) => {
    return handleError(error, {
      feature: 'permission',
      action: `request_${permissionType}`,
      additionalData: { 
        permissionType,
        platform: Platform.OS
      }
    });
  }, [handleError]);

  return { ...rest, handlePermissionError };
}