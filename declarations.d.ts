declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

// Opcional: Adicione outros formatos de imagem se necessário
declare module '*.jpg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.jpeg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}