import React from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({ 
  label, 
  error, 
  containerStyle, 
  leftIcon, 
  rightIcon, 
  style, 
  ...props 
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text 
          style={styles.label}
          accessibilityRole="text"
          accessible={true}
          accessibilityLabel={`Input field label: ${label}`}
        >
          {label}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            styles.input, 
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            style
          ]}
          placeholderTextColor="#9CA3AF"
          accessibilityRole="textbox"
          accessible={true}
          accessibilityLabel={label || 'Text input field'}
          accessibilityState={{ invalid: !!error }}
          {...props}
        />
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <Text 
          style={styles.error}
          accessibilityRole="alert"
          accessible={true}
          accessibilityLabel={`Input error: ${error}`}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#DC2626',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
  error: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    marginTop: 4,
  },
});