/**
 * Formatação e conversão de valores para pt-BR.
 *
 * Datas "só dia" (próximo contato, recebimento) são strings AAAA-MM-DD e são
 * tratadas como texto. Passar por `new Date("2026-10-01")` interpreta como
 * meia-noite UTC, e em Brasília isso vira 30/09 — o lembrete aparecia um dia
 * antes do combinado.
 */

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const dinheiro = (v: number | null | undefined) => (v == null ? "—" : moeda.format(v));

export function dataCurta(diaIso: string | null | undefined): string {
  if (!diaIso) return "—";
  const [a, m, d] = diaIso.slice(0, 10).split("-");
  if (!a || !m || !d) return "—";
  return `${d}/${m}/${a}`;
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hoje no fuso de São Paulo, como AAAA-MM-DD. */
export function hojeIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Aceita "1.500,00", "1500,5", "1500.50" e "R$ 2.000". Ponto seguido de três
 * dígitos é milhar; caso contrário é decimal.
 */
export function lerDinheiro(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;
  let normal = limpo;
  if (normal.includes(",")) {
    normal = normal.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}$/.test(normal)) {
    normal = normal.replace(/\./g, "");
  }
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function valorParaCampo(v: number | null): string {
  return v == null ? "" : v.toFixed(2).replace(".", ",");
}
