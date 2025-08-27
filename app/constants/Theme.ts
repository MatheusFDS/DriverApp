// constants/Theme.ts
import { StyleSheet } from 'react-native';

// Paleta de cores empresarial com verde corporativo
export const Colors = {
  // Cores principais - verde empresarial
  primary: {
    main: '#00695c',      // Verde teal original (mais empresarial)
    light: '#4db6ac',     // Verde claro
    dark: '#004d40',      // Verde escuro
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#37474f',      // Cinza azulado corporativo
    light: '#62727b',     // Cinza claro
    dark: '#263238',      // Cinza escuro
    contrastText: '#ffffff'
  },
  
  // Backgrounds
  background: {
    default: '#f8f9fa',   // Cinza muito claro neutro
    primary: '#f8f9fa',   // Alias para compatibilidade
    paper: '#ffffff',     // Branco para cards
    surface: '#fcfcfc'    // Branco quase puro
  },
  
  // Cores básicas
  white: '#ffffff',
  black: '#000000',
  
  // Textos
  text: {
    primary: '#263238',   // Cinza escuro com tom azulado
    secondary: '#546e7a', // Cinza médio azulado
    disabled: '#90a4ae',  // Cinza claro
    hint: '#cfd8dc'       // Cinza muito claro
  },
  
  // Status colors empresariais
  status: {
    success: '#2e7d32',   // Verde escuro
    successLight: '#66bb6a',
    warning: '#f57c00',   // Laranja corporativo
    warningLight: '#ffb74d',
    error: '#c62828',     // Vermelho corporativo
    errorLight: '#ef5350',
    info: '#1565c0',      // Azul corporativo
    infoLight: '#42a5f5'
  },
  
  // Grays (escala azulada empresarial)
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  },
  
  // Cores específicas do verde empresarial
  green: {
    50: '#e0f2f1',
    100: '#b2dfdb',
    200: '#80cbc4',
    300: '#4db6ac',
    400: '#26a69a',
    500: '#009688',
    600: '#00897b',
    700: '#00796b',
    800: '#00695c',
    900: '#004d40'
  },
  
  // Utility colors
  divider: '#e0e0e0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent'
};

// Tipografia empresarial
export const Typography = {
  fontFamily: {
    regular: 'System',
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

// Espaçamentos empresariais
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

// Border radius empresarial - mais reto
export const BorderRadius = {
  none: 0,
  sm: 2,
  base: 4,
  lg: 6,
  xl: 8,
  '2xl': 10,
  full: 999
};

// Sombras sutis e profissionais
export const Shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6
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

// Estilos comuns empresariais
export const CommonStyles = StyleSheet.create({
  // Containers com safe area
  container: {
    flex: 1,
    backgroundColor: Colors.background.default
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingTop: 0
  },
  
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg
  },
  
  // Cards empresariais com bordas definidas
  card: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.base,
    padding: Spacing.lg,
    ...Shadows.base,
    borderWidth: 1,
    borderColor: Colors.gray[200]
  },
  
  cardCompact: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.gray[200]
  },
  
  // Card com destaque verde
  cardPrimary: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.base,
    padding: Spacing.lg,
    ...Shadows.base,
    borderWidth: 1,
    borderColor: Colors.primary.light + '30',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main
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
  
  // Divisores empresariais
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md
  },
  
  dividerThick: {
    height: 2,
    backgroundColor: Colors.gray[300],
    marginVertical: Spacing.lg
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
  
  // Inputs empresariais
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
    backgroundColor: Colors.background.paper,
    color: Colors.text.primary
  },
  
  inputFocused: {
    borderColor: Colors.primary.main,
    borderWidth: 2
  },
  
  inputError: {
    borderColor: Colors.status.error
  },
  
  // Botões empresariais
  buttonPrimary: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm
  },
  
  buttonSecondary: {
    backgroundColor: Colors.background.paper,
    borderWidth: 1,
    borderColor: Colors.primary.main,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Headers empresariais
  headerContainer: {
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm
  },
  
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.contrastText
  }
});

export default Theme;