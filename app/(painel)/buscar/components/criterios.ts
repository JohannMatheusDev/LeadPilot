import type { EmpresaEncontrada } from "../../../lib/tipos";

/**
 * Critério de oportunidade, escrito para ser lido por quem usa.
 *
 * São só dois fatos observáveis no retorno do Google: não há site informado e
 * há telefone. Não existe pontuação nem "chance de fechar" — avaliar qualidade
 * de site ou interesse da empresa exigiria dado que não temos, e um número
 * inventado pareceria diagnóstico.
 */
export const CRITERIO_OPORTUNIDADE = "Sem site informado no Google e com telefone disponível.";

export function ehOportunidade(e: EmpresaEncontrada): boolean {
  return !e.site && Boolean(e.telefone);
}

/** Link oficial de busca do Google Maps por place_id, para quando o retorno não traz googleMapsUri. */
export function linkMaps(e: EmpresaEncontrada): string | null {
  if (e.placeId.startsWith("demo-")) return null;
  if (e.mapsUrl) return e.mapsUrl;
  const p = new URLSearchParams({ api: "1", query: e.nome, query_place_id: e.placeId });
  return `https://www.google.com/maps/search/?${p}`;
}
