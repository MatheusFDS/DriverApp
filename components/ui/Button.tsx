// components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[`${size}Size`],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={[
        styles.text, 
        styles[`${variant}Text`], 
        styles[`${size}Text`], 
        textStyle
      ]}>
        {icon && `${icon} `}{loading ? 'Carregando...' : title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
  
  // Variants
  primary: {
    backgroundColor: '#2196F3',
  },
  secondary: {
    backgroundColor: '#6c757d',
  },
  danger: {
    backgroundColor: '#f44336',
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  disabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  
  // Text colors
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  dangerText: {
    color: 'white',
  },
  successText: {
    color: 'white',
  },
  
  // Sizes
  smallSize: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumSize: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  largeSize: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  
  // Text sizes
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});

export default Button;