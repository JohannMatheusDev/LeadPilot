/**
 * Validação de entrada das Server Actions.
 *
 * Server Action é endpoint público: qualquer um com a sessão pode chamá-la com
 * POST montado à mão, sem passar pelo formulário. Por isso todo valor que chega
 * do cliente passa por aqui antes de tocar no banco ou no Google, inclusive os
 * que a tela já validou.
 */

export class EntradaInvalida extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function id(valor: unknown): string {
  if (typeof valor !== "string" || !UUID.test(valor)) throw new EntradaInvalida("Identificador invalido.");
  return valor;
}

// IDs do Places são base64url longos. Lead de demonstração usa prefixo "demo-".
const PLACE_ID = /^[A-Za-z0-9_-]{6,400}$/;

export function placeId(valor: unknown): string {
  if (typeof valor !== "string" || !PLACE_ID.test(valor)) throw new EntradaInvalida("Empresa invalida.");
  return valor;
}

export function texto(valor: unknown, campo: string, max: number, obrigatorio = false): string {
  const t = typeof valor === "string" ? valor.trim() : "";
  if (obrigatorio && !t) throw new EntradaInvalida(`Informe ${campo}.`);
  if (t.length > max) throw new EntradaInvalida(`${campo} passa de ${max} caracteres.`);
  return t;
}

export function textoOuNulo(valor: unknown, campo: string, max: number): string | null {
  return texto(valor, campo, max) || null;
}

export function url(valor: unknown, campo: string): string | null {
  const t = texto(valor, campo, 500);
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new EntradaInvalida(`${campo}: use um endereco completo, comecando com https://`);
  }
  // Só http(s): o link vira <a href> e botão de mensagem; "javascript:" aqui
  // seria script rodando com a sessão aberta.
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new EntradaInvalida(`${campo}: use um endereco http ou https.`);
  }
  return u.toString();
}

export function dinheiro(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number.NaN;
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new EntradaInvalida(`${campo} invalido.`);
  return Math.round(n * 100) / 100;
}

export function dia(valor: unknown, campo: string): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new EntradaInvalida(`${campo}: data invalida.`);
  }
  const [a, m, d] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) throw new EntradaInvalida(`${campo}: data invalida.`);
  return valor;
}

export function telefone(valor: unknown): string | null {
  const t = texto(valor, "Telefone", 30);
  if (!t) return null;
  const digitos = t.replace(/\D/g, "");
  if (digitos.length < 8 || digitos.length > 15) throw new EntradaInvalida("Telefone invalido.");
  return t;
}

export function numero(valor: unknown, campo: string, min: number, max: number): number {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) {
    throw new EntradaInvalida(`${campo} invalido.`);
  }
  return valor;
}
