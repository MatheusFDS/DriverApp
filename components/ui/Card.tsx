// components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Theme } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'elevated' | 'outlined';
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
  activeOpacity = 0.7,
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
    borderRadius: Theme.borderRadius.lg,
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
  },
  
  outlined: {
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.divider,
    // Sem sombra para outlined
  },
  
  disabled: {
    opacity: 0.6,
  },
});

export default Card;