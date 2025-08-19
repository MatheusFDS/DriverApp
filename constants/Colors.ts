// constants/Colors.ts
/**
 * Cores padronizadas harmonizadas com o tema verde empresarial
 * Mantendo compatibilidade mas alinhado com o novo Theme.ts
 */

// Cores principais baseadas no tema verde empresarial
const tintColorLight = '#00695c';  // Primary main do tema

export const Colors = {
  light: {
    text: '#263238',           // Text primary empresarial
    background: '#f8f9fa',     // Background default empresarial
    tint: tintColorLight,      // Primary main verde
    icon: '#546e7a',           // Text secondary empresarial
    tabIconDefault: '#90a4ae', // Gray claro empresarial
    tabIconSelected: tintColorLight,
    
    // Cores principais harmonizadas
    primary: '#00695c',        // Verde empresarial principal
    primaryLight: '#4db6ac',   // Verde claro
    primaryDark: '#004d40',    // Verde escuro
    secondary: '#37474f',      // Cinza azulado empresarial
    secondaryLight: '#62727b', // Cinza claro
    secondaryDark: '#263238',  // Cinza escuro
    
    surface: '#ffffff',        // Background paper
    surfaceVariant: '#fcfcfc', // Surface empresarial
    
    // Status harmonizados
    success: '#2e7d32',        // Verde escuro para sucesso
    successLight: '#66bb6a',   // Verde claro
    warning: '#f57c00',        // Laranja empresarial
    warningLight: '#ffb74d',   // Laranja claro
    error: '#c62828',          // Vermelho empresarial
    errorLight: '#ef5350',     // Vermelho claro
    info: '#1565c0',           // Azul empresarial
    infoLight: '#42a5f5',      // Azul claro
    
    // Outlines empresariais
    outline: '#e0e0e0',        // Divider neutro
    outlineVariant: '#bdbdbd', // Gray médio
    
    // Tons de verde para harmonia
    greenLight: '#e0f2f1',     // Verde muito claro
    greenMedium: '#80cbc4',    // Verde médio
    greenDark: '#00796b',      // Verde escuro
  },
  dark: {
    text: '#e0f2f1',           // Verde muito claro para texto
    background: '#263238',     // Cinza escuro empresarial
    tint: '#4db6ac',           // Verde claro para contraste
    icon: '#80cbc4',           // Verde médio
    tabIconDefault: '#546e7a', // Cinza médio
    tabIconSelected: '#4db6ac', // Verde claro
    
    // Modo escuro harmonizado
    primary: '#4db6ac',        // Verde claro para contraste
    primaryLight: '#80cbc4',   // Verde ainda mais claro
    primaryDark: '#26a69a',    // Verde médio
    secondary: '#62727b',      // Cinza claro para contraste
    secondaryLight: '#90a4ae', // Cinza mais claro
    secondaryDark: '#455a64',  // Cinza médio
    
    surface: '#37474f',        // Cinza médio
    surfaceVariant: '#455a64', // Cinza claro
    
    success: '#66bb6a',        // Verde claro
    successLight: '#81c784',   // Verde mais claro
    warning: '#ffb74d',        // Laranja claro
    warningLight: '#ffcc02',   // Laranja mais claro
    error: '#ef5350',          // Vermelho claro
    errorLight: '#e57373',     // Vermelho mais claro
    info: '#42a5f5',           // Azul claro
    infoLight: '#64b5f6',      // Azul mais claro
    
    outline: '#546e7a',        // Cinza médio
    outlineVariant: '#62727b', // Cinza claro
    
    // Tons de verde para modo escuro
    greenLight: '#80cbc4',     // Verde claro
    greenMedium: '#4db6ac',    // Verde médio
    greenDark: '#26a69a',      // Verde escuro
  },
};

// Exportação para compatibilidade
export default Colors;