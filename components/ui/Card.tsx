// components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Theme } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'elevated' | 'outlined' | 'primary' | 'secondary';
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  disabled = false,
  activeOpacity = 0.8,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    disabled && styles.disabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  default: {
    padding: Theme.spacing.lg,
    ...Theme.shadows.base,
  },
  
  compact: {
    padding: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  
  elevated: {
    padding: Theme.spacing.lg,
    ...Theme.shadows.lg,
    borderColor: Theme.colors.gray[100],
  },
  
  outlined: {
    padding: Theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[300],
    backgroundColor: Theme.colors.background.surface,
    // Sem sombra para outlined
  },
  
  // Variantes com cores do tema
  primary: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.green[50],
    borderColor: Theme.colors.green[200],
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
    ...Theme.shadows.sm,
  },
  
  secondary: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.gray[50],
    borderColor: Theme.colors.gray[300],
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.secondary.main,
    ...Theme.shadows.sm,
  },
  
  disabled: {
    opacity: 0.6,
    backgroundColor: Theme.colors.gray[100],
  },
});

export default Card;