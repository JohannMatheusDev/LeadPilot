import { chaveGooglePlaces } from "./config";
import type { DetalhesEmpresa, EmpresaEncontrada } from "./tipos";

/**
 * Cliente da Places API (New) do Google. Só roda no servidor: a chave nunca
 * vai para o navegador.
 *
 * Custo: a máscara de campos decide o SKU cobrado, não o endpoint. Telefone,
 * site e avaliação só vêm no nível "Enterprise" do Text Search e do Place
 * Details, que é o mais caro dos três. Pedimos exatamente os campos que a tela
 * mostra; acrescentar um campo aqui pode mudar o preço de toda consulta.
 *
 * Raio: o Text Search só restringe por retângulo; círculo ele aceita apenas
 * como "viés" (`locationBias`), e devolve empresas fora dele. Por isso a
 * distância é calculada aqui e quem passa do raio é retirado — e a tela conta
 * quantos foram retirados, para não parecer que a busca achou menos do que
 * achou.
 */

const BASE = "https://places.googleapis.com/v1";

const CAMPOS_EMPRESA = [
  "id",
  "displayName",
  "primaryTypeDisplayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "location",
];

const MASCARA_BUSCA = [...CAMPOS_EMPRESA.map((c) => `places.${c}`), "nextPageToken"].join(",");
const MASCARA_DETALHES = [...CAMPOS_EMPRESA, "businessStatus", "regularOpeningHours.weekdayDescriptions"].join(",");

export class ErroGoogle extends Error {}

type LugarGoogle = {
  id: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

export type Centro = { latitude: number; longitude: number };

export function distanciaKm(a: Centro, b: Centro): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function converter(l: LugarGoogle, centro: Centro | null): EmpresaEncontrada {
  const lat = l.location?.latitude ?? null;
  const lng = l.location?.longitude ?? null;
  return {
    placeId: l.id,
    nome: l.displayName?.text ?? "Sem nome",
    categoria: l.primaryTypeDisplayName?.text ?? null,
    endereco: l.formattedAddress ?? null,
    telefone: l.nationalPhoneNumber ?? null,
    telefoneInternacional: l.internationalPhoneNumber ?? null,
    site: l.websiteUri ?? null,
    avaliacao: l.rating ?? null,
    totalAvaliacoes: l.userRatingCount ?? null,
    mapsUrl: l.googleMapsUri ?? null,
    latitude: lat,
    longitude: lng,
    distanciaKm:
      centro && lat != null && lng != null
        ? Math.round(distanciaKm(centro, { latitude: lat, longitude: lng }) * 10) / 10
        : null,
  };
}

// O corpo do erro do Google traz a consulta; registramos só o status HTTP.
function erroPorStatus(status: number): ErroGoogle {
  if (status === 400) return new ErroGoogle("O Google recusou a consulta. Revise os termos da busca.");
  if (status === 401 || status === 403) {
    return new ErroGoogle(
      "A chave do Google foi recusada. Confira se a Places API (New) esta ativada, se ha faturamento no projeto e se a restricao da chave permite este servidor.",
    );
  }
  if (status === 429) return new ErroGoogle("A cota do Google foi atingida. Tente mais tarde ou ajuste a cota no Console.");
  return new ErroGoogle("O Google nao respondeu como esperado. Tente novamente em instantes.");
}

async function chamar(url: string, init: RequestInit, mascara: string): Promise<unknown> {
  const chave = chaveGooglePlaces();
  if (!chave) throw new ErroGoogle("Busca real indisponivel: GOOGLE_PLACES_API_KEY nao configurada.");
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask": mascara,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ErroGoogle("Nao foi possivel falar com o Google agora (tempo esgotado ou sem rede).");
  }
  if (!resposta.ok) {
    console.warn(`[places] resposta ${resposta.status}`);
    throw erroPorStatus(resposta.status);
  }
  return resposta.json();
}

export type ParametrosBusca = {
  textQuery: string;
  centro: Centro | null;
  raioKm: number | null;
  pageToken?: string;
};

export async function buscarTexto(p: ParametrosBusca): Promise<{
  empresas: EmpresaEncontrada[];
  proximaPagina: string | null;
  foraDoRaio: number;
}> {
  // Página seguinte precisa repetir exatamente os mesmos parâmetros da
  // primeira, senão o Google rejeita o token.
  const corpo: Record<string, unknown> = {
    textQuery: p.textQuery,
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: 20,
  };
  if (p.centro && p.raioKm) {
    corpo.locationBias = {
      circle: { center: p.centro, radius: Math.min(p.raioKm * 1000, 50_000) },
    };
  }
  if (p.pageToken) corpo.pageToken = p.pageToken;

  const json = (await chamar(`${BASE}/places:searchText`, { method: "POST", body: JSON.stringify(corpo) }, MASCARA_BUSCA)) as {
    places?: LugarGoogle[];
    nextPageToken?: string;
  };

  const todas = (json.places ?? []).map((l) => converter(l, p.centro));
  const dentro = p.centro && p.raioKm ? todas.filter((e) => e.distanciaKm == null || e.distanciaKm <= p.raioKm!) : todas;
  return { empresas: dentro, proximaPagina: json.nextPageToken ?? null, foraDoRaio: todas.length - dentro.length };
}

export async function obterDetalhes(placeId: string): Promise<DetalhesEmpresa> {
  const json = (await chamar(
    `${BASE}/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`,
    { method: "GET" },
    MASCARA_DETALHES,
  )) as LugarGoogle;
  return {
    ...converter(json, null),
    situacao: json.businessStatus ?? null,
    horarios: json.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}
