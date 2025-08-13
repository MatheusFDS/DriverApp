// components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
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
      activeOpacity={isDisabled ? 1 : 0.7}
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
    ...Theme.shadows.sm,
  },
  
  text: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  
  fullWidth: {
    width: '100%',
  },
  
  // Variants
  primary: {
    backgroundColor: Theme.colors.primary.main,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary.main,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.primary.main,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Theme.colors.status.error,
  },
  success: {
    backgroundColor: Theme.colors.status.success,
  },
  
  disabled: {
    backgroundColor: Theme.colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Text colors
  primaryText: {
    color: Theme.colors.primary.contrastText,
  },
  secondaryText: {
    color: Theme.colors.secondary.contrastText,
  },
  outlineText: {
    color: Theme.colors.primary.main,
  },
  ghostText: {
    color: Theme.colors.primary.main,
  },
  dangerText: {
    color: '#ffffff',
  },
  successText: {
    color: '#ffffff',
  },
  
  disabledText: {
    color: Theme.colors.text.disabled,
  },
  
  // Sizes
  smallSize: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    minHeight: 36,
  },
  mediumSize: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    minHeight: 44,
  },
  largeSize: {
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
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