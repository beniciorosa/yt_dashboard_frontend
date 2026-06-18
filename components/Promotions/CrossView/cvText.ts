// Coage qualquer valor (string, número, array, objeto) para um texto seguro de renderizar.
// A IA às vezes devolve um objeto onde esperávamos string (ex.: publico_alvo = {quem, nivel, dores}).
// Renderizar um objeto direto no JSX dispara o React error #31 e derruba a página — isto evita isso.
export const txt = (v: any): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(txt).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.values(v).map(txt).filter(Boolean).join(' · ');
  return String(v);
};
