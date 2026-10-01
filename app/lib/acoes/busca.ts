"use server";

import { reservarConsulta } from "../limite";
import { buscarTexto, obterDetalhes, type Centro } from "../places";
import { buscaFicticia } from "../repositorio/demo";
import { RAIOS_KM, SEGMENTOS, UFS } from "../segmentos";
import type { DetalhesEmpresa, EmpresaEncontrada, Resultado } from "../tipos";
import * as v from "../validacao";
import { executar } from "./executar";

/**
 * Busca de empresas. A consulta ao Google acontece só aqui, no servidor.
 *
 * Nada do que o Google devolve é gravado: o resultado volta para a tela e vive
 * na memória do navegador. Só quando a pessoa salva um lead é que o place_id
 * (e o nome/telefone que ela confirma) vão para o banco.
 */

export type PedidoBusca = {
  segmento: string;
  termo: string;
  cidade: string;
  uf: string;
  centro: Centro | null;
  raioKm: number | null;
  pageToken?: string;
};

export type RespostaBusca = {
  empresas: EmpresaEncontrada[];
  proximaPagina: string | null;
  foraDoRaio: number;
  salvos: Record<string, { id: string; favorito: boolean }>;
  /** Verdadeiro quando os dados são inventados. A tela mostra isso em destaque. */
  ficticio: boolean;
  /** Pode virar lead? Falso para exemplo fictício dentro do modo real. */
  podeSalvar: boolean;
  consulta: string;
};

function validarPedido(p: PedidoBusca) {
  const segmento = SEGMENTOS.find((s) => s.id === p?.segmento);
  if (!segmento) throw new v.EntradaInvalida("Escolha um segmento.");
  const termo = segmento.id === "livre" ? v.texto(p.termo, "o termo da busca", 80, true) : segmento.termo;
  const cidade = v.texto(p.cidade, "a cidade", 80);
  const uf = p.uf ? v.texto(p.uf, "o estado", 2) : "";
  if (uf && !(UFS as readonly string[]).includes(uf)) throw new v.EntradaInvalida("Estado invalido.");

  let centro: Centro | null = null;
  if (p.centro) {
    centro = {
      latitude: v.numero(p.centro.latitude, "Latitude", -90, 90),
      longitude: v.numero(p.centro.longitude, "Longitude", -180, 180),
    };
  }
  if (!cidade && !centro) throw new v.EntradaInvalida("Informe a cidade ou marque o centro da busca no mapa.");

  let raioKm: number | null = null;
  if (p.raioKm != null) {
    if (!(RAIOS_KM as readonly number[]).includes(p.raioKm)) throw new v.EntradaInvalida("Raio invalido.");
    // Raio sem centro não tem de onde medir; ignorar em silêncio esconderia
    // que o filtro não foi aplicado.
    if (!centro) throw new v.EntradaInvalida("Para usar o raio, marque o centro da busca no mapa.");
    raioKm = p.raioKm;
  }
  const pageToken = p.pageToken ? v.texto(p.pageToken, "a pagina", 2000) : undefined;
  const local = cidade ? ` em ${cidade}${uf ? ` - ${uf}` : ""}` : "";
  return { segmento, textQuery: `${termo}${local}`, centro, raioKm, pageToken };
}

async function marcarSalvos(
  repo: { leadsPorPlaceIds: (ids: string[]) => Promise<{ id: string; place_id: string | null; favorito: boolean }[]> },
  empresas: EmpresaEncontrada[],
) {
  const linhas = await repo.leadsPorPlaceIds(empresas.map((e) => e.placeId));
  return Object.fromEntries(linhas.map((l) => [l.place_id!, { id: l.id, favorito: l.favorito }]));
}

export async function buscarEmpresas(pedido: PedidoBusca): Promise<Resultado<RespostaBusca>> {
  return executar(async ({ repo, modo, googleAtivo }) => {
    const p = validarPedido(pedido);

    if (modo === "demo") {
      const empresas = p.pageToken ? [] : buscaFicticia(p.segmento.id, p.centro);
      return {
        empresas,
        proximaPagina: null,
        foraDoRaio: 0,
        salvos: await marcarSalvos(repo, empresas),
        ficticio: true,
        podeSalvar: true,
        consulta: p.textQuery,
      };
    }
    if (!googleAtivo) {
      throw new v.EntradaInvalida("Busca real indisponivel: configure GOOGLE_PLACES_API_KEY no servidor.");
    }

    await reservarConsulta(repo, "busca");
    const r = await buscarTexto(p);
    return {
      ...r,
      salvos: await marcarSalvos(repo, r.empresas),
      ficticio: false,
      podeSalvar: true,
      consulta: p.textQuery,
    };
  });
}

/**
 * Exemplo para quem está no modo real sem chave do Google: mostra como a tela
 * fica, sem consultar ninguém e sem permitir salvar — fictício não pode
 * misturar com os leads reais.
 */
export async function exemploFicticio(pedido: PedidoBusca): Promise<Resultado<RespostaBusca>> {
  return executar(async () => {
    const segmento = SEGMENTOS.find((s) => s.id === pedido?.segmento)?.id ?? "odonto";
    return {
      empresas: buscaFicticia(segmento, null),
      proximaPagina: null,
      foraDoRaio: 0,
      salvos: {},
      ficticio: true,
      podeSalvar: false,
      consulta: "exemplo fictício",
    };
  });
}

export async function consultarDetalhes(id: string): Promise<Resultado<DetalhesEmpresa & { ficticio: boolean }>> {
  return executar(async ({ repo, modo, googleAtivo }) => {
    const placeId = v.placeId(id);
    if (placeId.startsWith("demo-")) {
      const [seg] = placeId.slice(5).split("-");
      const achada = buscaFicticia(seg, null).find((e) => e.placeId === placeId);
      if (achada) return { ...achada, situacao: null, horarios: [], ficticio: true };
      // Leads semeados do modo demo não estão no catálogo de busca; devolvemos
      // um registro vazio em vez de emprestar os dados de outra empresa.
      return {
        placeId,
        nome: "Empresa fictícia",
        categoria: "Exemplo fictício",
        endereco: null,
        telefone: null,
        telefoneInternacional: null,
        site: null,
        avaliacao: null,
        totalAvaliacoes: null,
        mapsUrl: null,
        latitude: null,
        longitude: null,
        distanciaKm: null,
        situacao: null,
        horarios: [],
        ficticio: true,
      };
    }
    if (modo === "demo" || !googleAtivo) {
      throw new v.EntradaInvalida("Consulta ao Google indisponivel neste modo.");
    }
    await reservarConsulta(repo, "detalhes");
    return { ...(await obterDetalhes(placeId)), ficticio: false };
  });
}
