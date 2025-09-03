// utils/formatters.ts

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * @param value - Valor numérico para formatar
 * @returns String formatada como moeda (ex: "R$ 1.234,56")
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
};

/**
 * Formata uma data para o padrão brasileiro
 * @param dateString - String da data para formatar
 * @param options - Opções adicionais de formatação
 * @returns String formatada da data
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    ...options
  };
  
  return new Date(dateString).toLocaleDateString('pt-BR', defaultOptions);
};

/**
 * Formata um CPF com máscara
 * @param cpf - CPF sem formatação (apenas números)
 * @returns CPF formatado (ex: "123.456.789-00")
 */
export const formatCpf = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

/**
 * Formata uma placa de veículo
 * @param plate - Placa sem formatação
 * @returns Placa formatada em maiúsculas (ex: "ABC1234")
 */
export const formatPlate = (plate: string): string => {
  const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length <= 7) return cleaned;
  return cleaned.slice(0, 7);
};
