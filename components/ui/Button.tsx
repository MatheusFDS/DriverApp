// components/ui/Button.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Theme } from '../../constants/Theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  fullWidth?: boolean;
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
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const buttonTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];

  const getLoadingColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return Theme.colors.primary.main;
    }
    return '#ffffff';
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={getLoadingColor()} 
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <Text style={buttonTextStyle}>
          {icon && `${icon} `}{title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  text: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  // Variants - Cores com muito mais contraste
  primary: {
    backgroundColor: '#00695c', // Verde escuro
    borderColor: '#004d40',
    ...Theme.shadows.base,
  },
  secondary: {
    backgroundColor: '#37474f', // Cinza escuro azulado
    borderColor: '#263238',
    ...Theme.shadows.base,
  },
  outline: {
    backgroundColor: Theme.colors.background.paper,
    borderColor: '#00695c',
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  ghost: {
    backgroundColor: '#eceff1', // Cinza bem claro mas visível
    borderColor: '#90a4ae',
    borderWidth: 1,
  },
  danger: {
    backgroundColor: '#c62828', // Vermelho escuro
    borderColor: '#b71c1c',
    ...Theme.shadows.base,
  },
  success: {
    backgroundColor: '#2e7d32', // Verde escuro
    borderColor: '#1b5e20',
    ...Theme.shadows.base,
  },
  
  disabled: {
    backgroundColor: Theme.colors.gray[300],
    borderColor: Theme.colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Text colors - Contraste máximo
  primaryText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  secondaryText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  outlineText: {
    color: '#00695c',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  ghostText: {
    color: '#37474f',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  dangerText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  successText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  disabledText: {
    color: Theme.colors.text.disabled,
  },
  
  // Sizes - Mais conservadores
  smallSize: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    minHeight: 36,
  },
  mediumSize: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    minHeight: 44,
  },
  largeSize: {
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing['2xl'],
    minHeight: 52,
  },
  
  // Text sizes
  smallText: {
    fontSize: Theme.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: Theme.typography.fontSize.base,
  },
  largeText: {
    fontSize: Theme.typography.fontSize.lg,
  },
});

export default Button;