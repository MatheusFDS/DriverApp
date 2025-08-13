// constants/Theme.ts
import { StyleSheet } from 'react-native';

// Paleta de cores baseada no design web
export const Colors = {
  // Cores principais (mesmo padrão do web)
  primary: {
    main: '#00695c',      // Teal escuro
    light: '#439889',     // Teal claro
    dark: '#004c40',      // Teal mais escuro
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#ff6f00',      // Laranja vibrante
    light: '#ff9800',     // Laranja claro
    dark: '#e65100',      // Laranja escuro
    contrastText: '#ffffff'
  },
  
  // Backgrounds
  background: {
    default: '#f7f8fa',   // Cinza muito claro (mesmo do web)
    paper: '#ffffff',     // Branco para cards
    surface: '#fafbfc'    // Cinza ultra claro
  },
  
  // Textos
  text: {
    primary: '#2e3440',   // Cinza escuro (mesmo do web)
    secondary: '#5e6b73', // Cinza médio
    disabled: '#9ea7ad',  // Cinza claro
    hint: '#bcc1c6'       // Cinza muito claro
  },
  
  // Status colors
  status: {
    success: '#2e7d32',
    successLight: '#4caf50',
    warning: '#ed6c02', 
    warningLight: '#ff9800',
    error: '#d32f2f',
    errorLight: '#ef5350',
    info: '#0288d1',
    infoLight: '#03a9f4'
  },
  
  // Grays (escala do web)
  gray: {
    50: '#fafbfc',
    100: '#f1f3f4',
    200: '#e8ebef',
    300: '#dadee3',
    400: '#bcc1c6',
    500: '#9ea7ad',
    600: '#7c858d',
    700: '#5e6b73',
    800: '#434a54',
    900: '#2e3440'
  },
  
  // Utility colors
  divider: '#e0e4e7',
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent'
};

// Tipografia baseada no web
export const Typography = {
  fontFamily: {
    regular: 'System', // React Native usa System como padrão
    medium: 'System',
    semiBold: 'System',
    bold: 'System'
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32
  },
  
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  }
};

// Espaçamentos (sistema 4px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64
};

// Border radius (mesmo padrão do web)
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999
};

// Sombras (adaptadas para mobile)
export const Shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  }
};

// Tema completo consolidado
export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows
};

// Estilos comuns reutilizáveis
export const CommonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: Colors.background.default
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background.default
  },
  
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg
  },
  
  // Cards
  card: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.base
  },
  
  cardCompact: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    ...Shadows.sm
  },
  
  // Textos
  heading1: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight
  },
  
  heading2: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight
  },
  
  heading3: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.primary,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight
  },
  
  bodyLarge: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.primary,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.normal
  },
  
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.primary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal
  },
  
  bodySmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.secondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal
  },
  
  caption: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.secondary,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal
  },
  
  // Layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  column: {
    flexDirection: 'column'
  },
  
  // Divisores
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md
  },
  
  // Estados de loading/erro
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.xl
  },
  
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.xl
  },
  
  // Espaçamentos comuns
  marginVerticalSm: { marginVertical: Spacing.sm },
  marginVerticalMd: { marginVertical: Spacing.md },
  marginVerticalLg: { marginVertical: Spacing.lg },
  
  paddingHorizontalSm: { paddingHorizontal: Spacing.sm },
  paddingHorizontalMd: { paddingHorizontal: Spacing.md },
  paddingHorizontalLg: { paddingHorizontal: Spacing.lg },
  
  // Inputs
  inputContainer: {
    marginBottom: Spacing.lg
  },
  
  input: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    backgroundColor: Colors.background.surface,
    color: Colors.text.primary
  },
  
  inputFocused: {
    borderColor: Colors.primary.main,
    borderWidth: 2
  },
  
  inputError: {
    borderColor: Colors.status.error
  }
});

export default Theme;