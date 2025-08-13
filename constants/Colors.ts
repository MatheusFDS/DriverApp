// constants/Colors.ts
/**
 * Cores padronizadas baseadas no design web
 * Mantendo compatibilidade com o sistema anterior mas usando as cores corretas
 */

// Cores principais (baseadas no ThemeProvider.tsx do web)
const tintColorLight = '#00695c';  // Primary main do web
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    text: '#2e3440',           // Text primary do web
    background: '#f7f8fa',     // Background default do web
    tint: tintColorLight,      // Primary main
    icon: '#5e6b73',           // Text secondary do web
    tabIconDefault: '#9ea7ad', // Gray 500 do web
    tabIconSelected: tintColorLight,
    
    // Adicionando as cores completas do sistema web
    primary: '#00695c',
    primaryLight: '#439889',
    primaryDark: '#004c40',
    secondary: '#ff6f00',
    secondaryLight: '#ff9800',
    secondaryDark: '#e65100',
    
    surface: '#ffffff',        // Background paper do web
    surfaceVariant: '#fafbfc', // Gray 50 do web
    
    success: '#2e7d32',
    successLight: '#4caf50',
    warning: '#ed6c02',
    warningLight: '#ff9800',
    error: '#d32f2f',
    errorLight: '#ef5350',
    info: '#0288d1',
    infoLight: '#03a9f4',
    
    outline: '#e0e4e7',        // Divider do web
    outlineVariant: '#dadee3',  // Gray 300 do web
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Para modo escuro (futuro)
    primary: '#439889',        // Primary light para contraste
    primaryLight: '#66bb6a',
    primaryDark: '#2e7d32',
    secondary: '#ff9800',      // Secondary light
    secondaryLight: '#ffb74d',
    secondaryDark: '#f57c00',
    
    surface: '#1e1e1e',
    surfaceVariant: '#2a2a2a',
    
    success: '#4caf50',
    successLight: '#66bb6a',
    warning: '#ff9800',
    warningLight: '#ffb74d',
    error: '#ef5350',
    errorLight: '#e57373',
    info: '#03a9f4',
    infoLight: '#29b6f6',
    
    outline: '#424242',
    outlineVariant: '#616161',
  },
};

// Exportação para compatibilidade com código existente
export default Colors;