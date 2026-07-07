/**
 * Utilitários de CPF — usados no login (identidade), no convite de usuário e
 * na recuperação de senha. CPF é armazenado normalizado (11 dígitos, sem
 * pontuação) na coluna `profiles.cpf`.
 */

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Normaliza para 11 dígitos; retorna null se não tiver 11 dígitos. */
export function normalizeCpf(value: string): string | null {
  const digits = onlyDigits(value);
  return digits.length === 11 ? digits : null;
}

/** Máscara visual: 000.000.000-00 (aceita entrada parcial). */
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)];
  let out = parts[0];
  if (parts[1]) out += `.${parts[1]}`;
  if (parts[2]) out += `.${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}

/**
 * Valida CPF pelos dígitos verificadores (algoritmo oficial da Receita).
 * Rejeita comprimento errado e sequências repetidas (000..., 111..., etc).
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (sliceLen: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) {
      sum += Number(cpf[i]) * (sliceLen + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
