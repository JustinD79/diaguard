import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { Alert } from 'react-native';
import { ErrorHandlingService, ErrorContext, ErrorHandlingOptions } from '@/services/ErrorHandlingService';

export function useErrorHandler() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(async (
    error: Error | any,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ErrorHandlingService.handleError(error, context, options);
      
      // Show user-friendly error message
      if (!options.silent) {
        Alert.alert(
          result.userMessage.title,
          result.userMessage.message,
          [
            { text: 'OK', style: 'default' },
            ...(result.shouldRetry ? [{
              text: result.userMessage.action,
              onPress: () => {
                // Retry logic would be handled by the calling component
                console.log('Retry requested');
              }
            }] : [])
          ]
        );
      }

      setError(result.userMessage.message);
      return result;
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    options?: ErrorHandlingOptions
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
    withErrorHandling
  };
}

// Specialized hooks for common error scenarios
export function useNetworkErrorHandler() {
  const { handleError, ...rest } = useErrorHandler();

  const handleNetworkError = useCallback((error: any, action: string) => {
    return handleError(error, {
      feature: 'network',
      action,
      additionalData: { 
        networkStatus: Platform.OS === 'web' && typeof navigator !== 'undefined' 
          ? navigator.onLine 
          : true 
      }
    });
  }, [handleError]);

  return { ...rest, handleNetworkError };
}

export function useAPIErrorHandler() {
  const { handleError, ...rest } = useErrorHandler();

  const handleAPIError = useCallback((error: any, endpoint: string, method: string = 'GET') => {
    return handleError(error, {
      feature: 'api',
      action: `${method} ${endpoint}`,
      additionalData: { 
        status: error.status,
        endpoint,
        method
      }
    });
  }, [handleError]);

  return { ...rest, handleAPIError };
}

export function useValidationErrorHandler() {
  const { handleError, ...rest } = useErrorHandler();

  const handleValidationError = useCallback((error: any, formName: string, field?: string) => {
    return handleError(error, {
      feature: 'validation',
      action: `validate_${formName}`,
      additionalData: { field }
    }, { silent: true }); // Validation errors are usually shown inline
  }, [handleError]);

  return { ...rest, handleValidationError };
}

export function useMedicalErrorHandler() {
  const { handleError, ...rest } = useErrorHandler();

  const handleMedicalError = useCallback((error: any, feature: string) => {
    return handleError(error, {
      feature: 'medical',
      action: feature,
      additionalData: { criticalError: true }
    });
  }, [handleError]);

  return { ...rest, handleMedicalError };
}