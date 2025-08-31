// components/ui/StatusBadge.tsx
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Theme } from '../../constants/Theme';

type StatusVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'neutral';

interface StatusBadgeProps {
  text: string;
  icon?: string;
  variant: StatusVariant;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  text,
  icon,
  variant,
  size = 'medium',
  style,
  textStyle,
}) => {
  const badgeStyle = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    style,
  ];

  const badgeTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <View style={badgeStyle}>
      <Text style={badgeTextStyle}>
        {icon && `${icon} `}{text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  text: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  // Variants - Cores empresariais
  primary: {
    backgroundColor: Theme.colors.primary.main,
    borderColor: Theme.colors.primary.dark,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary.main,
    borderColor: Theme.colors.secondary.dark,
  },
  success: {
    backgroundColor: Theme.colors.status.success,
    borderColor: Theme.colors.green[700],
  },
  warning: {
    backgroundColor: Theme.colors.status.warning,
    borderColor: '#ef6c00',
  },
  error: {
    backgroundColor: Theme.colors.status.error,
    borderColor: '#b71c1c',
  },
  info: {
    backgroundColor: Theme.colors.status.info,
    borderColor: '#0d47a1',
  },
  neutral: {
    backgroundColor: Theme.colors.gray[500],
    borderColor: Theme.colors.gray[600],
  },
  
  // Text colors
  primaryText: {
    color: Theme.colors.primary.contrastText,
  },
  secondaryText: {
    color: Theme.colors.secondary.contrastText,
  },
  successText: {
    color: '#ffffff',
  },
  warningText: {
    color: '#ffffff',
  },
  errorText: {
    color: '#ffffff',
  },
  infoText: {
    color: '#ffffff',
  },
  neutralText: {
    color: '#ffffff',
  },
  
  // Sizes - Mais conservadores
  smallSize: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    minWidth: 50,
  },
  mediumSize: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    minWidth: 70,
  },
  largeSize: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    minWidth: 90,
  },
  
  // Text sizes
  smallText: {
    fontSize: Theme.typography.fontSize.xs,
  },
  mediumText: {
    fontSize: Theme.typography.fontSize.sm,
  },
  largeText: {
    fontSize: Theme.typography.fontSize.base,
  },
});

// Helper para mapear status de pedidos para variantes do badge
export const getOrderStatusVariant = (status: string): StatusVariant => {
  switch (status.toUpperCase()) {
    case 'SEM_ROTA':
      return 'neutral';
    case 'EM_ROTA_AGUARDANDO_LIBERACAO':
      return 'warning';
    case 'EM_ROTA':
    case 'EM_ENTREGA':
      return 'primary';
    case 'ENTREGUE':
      return 'success';
    case 'NAO_ENTREGUE':
      return 'error';
    default:
      return 'neutral';
  }
};

// Helper para mapear status de roteiros para variantes do badge
export const getRouteStatusVariant = (status: string): StatusVariant => {
  switch (status.toUpperCase()) {
    case 'PENDENTE':
      return 'neutral';
    case 'INICIADO':
      return 'primary';
    case 'CONCLUIDO':
      return 'success';
    case 'CANCELADO':
      return 'error';
    default:
      return 'neutral';
  }
};

export default StatusBadge;