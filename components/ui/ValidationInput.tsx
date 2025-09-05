import React, { useState, useEffect } from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Check, X } from 'lucide-react-native';

interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

interface ValidationInputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  validationRules?: ValidationRule[];
  showValidationIcon?: boolean;
  validateOnChange?: boolean;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export default function ValidationInput({ 
  label, 
  containerStyle, 
  leftIcon, 
  rightIcon, 
  style,
  validationRules = [],
  showValidationIcon = true,
  validateOnChange = true,
  onValidationChange,
  value = '',
  onChangeText,
  ...props 
}: ValidationInputProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  useEffect(() => {
    if (validateOnChange && hasBeenTouched) {
      validateInput(value);
    }
  }, [value, validateOnChange, hasBeenTouched]);

  const validateInput = (inputValue: string) => {
    const newErrors: string[] = [];
    
    validationRules.forEach(rule => {
      if (!rule.test(inputValue)) {
        newErrors.push(rule.message);
      }
    });

    const valid = newErrors.length === 0;
    setErrors(newErrors);
    setIsValid(valid);
    onValidationChange?.(valid, newErrors);
  };

  const handleChangeText = (text: string) => {
    onChangeText?.(text);
    if (!hasBeenTouched) {
      setHasBeenTouched(true);
    }
  };

  const handleBlur = () => {
    setHasBeenTouched(true);
    validateInput(value);
  };

  const showErrors = hasBeenTouched && errors.length > 0;
  const showSuccess = hasBeenTouched && isValid && value.length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer, 
        showErrors && styles.inputContainerError,
        showSuccess && styles.inputContainerSuccess
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            styles.input, 
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || showValidationIcon) && styles.inputWithRightIcon,
            style
          ]}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          {...props}
        />
        {showValidationIcon && hasBeenTouched && (
          <View style={styles.validationIcon}>
            {isValid && value.length > 0 ? (
              <Check size={16} color="#059669" />
            ) : errors.length > 0 ? (
              <X size={16} color="#DC2626" />
            ) : null}
          </View>
        )}
        {rightIcon && !showValidationIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      {showErrors && (
        <View style={styles.errorsContainer}>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => value.trim().length > 0,
    message
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => value.length <= max,
    message: message || `Must be no more than ${max} characters`
  }),
  
  numeric: (message = 'Must be a valid number'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)) && value.trim() !== '',
    message
  }),
  
  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)) && Number(value) > 0,
    message
  }),
  
  range: (min: number, max: number, message?: string): ValidationRule => ({
    test: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    message: message || `Must be between ${min} and ${max}`
  }),
  
  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    test: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, '')),
    message
  }),
  
  password: (message = 'Password must be at least 8 characters with uppercase, lowercase, and number'): ValidationRule => ({
    test: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value),
    message
  })
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#DC2626',
  },
  inputContainerSuccess: {
    borderColor: '#059669',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 12,
  },
  rightIcon: {
    paddingRight: 12,
  },
  validationIcon: {
    paddingRight: 12,
  },
  errorsContainer: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    marginTop: 2,
  },
});