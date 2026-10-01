"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import Dialogo from "../../../components/Dialogo";
import { Aviso, EstadoVazio } from "../../../components/Estados";
import Icone from "../../../components/Icone";
import {
  buscarEmpresas,
  consultarDetalhes,
  exemploFicticio,
  type PedidoBusca,
  type RespostaBusca,
} from "../../../lib/acoes/busca";
import { anotarDaBusca, favoritarDaBusca, salvarLeadDaBusca, type EmpresaParaSalvar } from "../../../lib/acoes/leads";
import type { Centro } from "../../../lib/places";
import { RAIOS_KM, SEGMENTOS, UFS } from "../../../lib/segmentos";
import type { DetalhesEmpresa, EmpresaEncontrada } from "../../../lib/tipos";
import AcoesEmpresa, { type Salvo } from "./AcoesEmpresa";
import { CRITERIO_OPORTUNIDADE, ehOportunidade } from "./criterios";
import MapaCentro from "./MapaCentro";
import SinaisDaEmpresa from "./SinaisDaEmpresa";

/**
 * Busca de empresas e qualificação dos resultados.
 *
 * Os resultados ficam só no estado desta tela (os termos do Google não
 * permitem guardar o conteúdo). Os filtros de telefone e site rodam sobre o que
 * já veio, sem nova consulta: cada consulta é cobrada, filtrar não deveria ser.
 */

type FiltroSite = "todos" | "com" | "sem";
type Ordem = "relevancia" | "oportunidade" | "avaliacao" | "distancia";

const SITUACAO: Record<string, string> = {
  OPERATIONAL: "Em funcionamento",
  CLOSED_TEMPORARILY: "Fechada temporariamente",
  CLOSED_PERMANENTLY: "Fechada permanentemente",
};

function Avaliacao({ e }: { e: EmpresaEncontrada }) {
  if (e.avaliacao == null) return <span className="text-texto-suave">Sem avaliações</span>;
  return (
    <span>
      <Icone nome="estrela" preenchido className="mr-1 inline size-3.5 -translate-y-px text-alerta" />
      {e.avaliacao.toFixed(1).replace(".", ",")}{" "}
      <span className="text-texto-suave">({e.totalAvaliacoes ?? 0} avaliações)</span>
    </span>
  );
}

export default function BuscaEmpresas({
  modo,
  googleAtivo,
  chaveMaps,
}: {
  modo: "real" | "demo";
  googleAtivo: boolean;
  /** Vazia quando não há chave do navegador ou no modo demo; aí o centro vem por geolocalização. */
  chaveMaps: string;
}) {
  const [segmento, setSegmento] = useState<string>(SEGMENTOS[0].id);
  const [termo, setTermo] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [centro, setCentro] = useState<Centro | null>(null);
  const [raioKm, setRaioKm] = useState<number | null>(null);

  const [resposta, setResposta] = useState<RespostaBusca | null>(null);
  const [pedidoAtual, setPedidoAtual] = useState<PedidoBusca | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<Record<string, Salvo>>({});
  const [ocupados, setOcupados] = useState<Record<string, boolean>>({});

  const [comTelefone, setComTelefone] = useState(false);
  const [filtroSite, setFiltroSite] = useState<FiltroSite>("todos");
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [visao, setVisao] = useState<"cards" | "tabela">("cards");

  const [detalhes, setDetalhes] = useState<{ empresa: EmpresaEncontrada; dados: (DetalhesEmpresa & { ficticio: boolean }) | null; erro: string | null } | null>(null);
  const [anotando, setAnotando] = useState<EmpresaEncontrada | null>(null);
  const [nota, setNota] = useState("");
  const [localizando, setLocalizando] = useState(false);

  const escolherCentro = useCallback((c: Centro) => setCentro(c), []);

  function montarPedido(): PedidoBusca {
    return { segmento, termo, cidade, uf, centro, raioKm: centro ? raioKm : null };
  }

  async function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    const pedido = montarPedido();
    setBuscando(true);
    setErro(null);
    setAviso(null);
    const r = await buscarEmpresas(pedido);
    setBuscando(false);
    if (!r.ok) return setErro(r.erro);
    setPedidoAtual(pedido);
    setResposta(r.dados);
    setSalvos(r.dados.salvos);
  }

  async function verExemplo() {
    setBuscando(true);
    setErro(null);
    const r = await exemploFicticio(montarPedido());
    setBuscando(false);
    if (!r.ok) return setErro(r.erro);
    setPedidoAtual(null);
    setResposta(r.dados);
    setSalvos({});
  }

  async function carregarMais() {
    if (!resposta?.proximaPagina || !pedidoAtual) return;
    setBuscando(true);
    setErro(null);
    const r = await buscarEmpresas({ ...pedidoAtual, pageToken: resposta.proximaPagina });
    setBuscando(false);
    if (!r.ok) return setErro(r.erro);
    const conhecidos = new Set(resposta.empresas.map((e) => e.placeId));
    setResposta({
      ...r.dados,
      empresas: [...resposta.empresas, ...r.dados.empresas.filter((e) => !conhecidos.has(e.placeId))],
      foraDoRaio: resposta.foraDoRaio + r.dados.foraDoRaio,
    });
    setSalvos((s) => ({ ...s, ...r.dados.salvos }));
  }

  function paraSalvar(e: EmpresaEncontrada): EmpresaParaSalvar {
    return {
      placeId: e.placeId,
      nome: e.nome,
      telefone: e.telefone ?? e.telefoneInternacional,
      cidade: pedidoAtual?.cidade ?? "",
      segmento: pedidoAtual?.segmento ?? "",
    };
  }

  async function comTrava(placeId: string, trabalho: () => Promise<void>) {
    setOcupados((o) => ({ ...o, [placeId]: true }));
    setErro(null);
    setAviso(null);
    await trabalho();
    setOcupados((o) => ({ ...o, [placeId]: false }));
  }

  const salvar = (e: EmpresaEncontrada) =>
    comTrava(e.placeId, async () => {
      const r = await salvarLeadDaBusca(paraSalvar(e));
      if (!r.ok) return setErro(r.erro);
      setSalvos((s) => ({ ...s, [e.placeId]: { id: r.dados.id, favorito: s[e.placeId]?.favorito ?? false } }));
      setAviso(r.dados.jaExistia ? `${e.nome} já era um lead.` : `${e.nome} salvo como lead.`);
    });

  const favoritar = (e: EmpresaEncontrada) =>
    comTrava(e.placeId, async () => {
      const r = await favoritarDaBusca(paraSalvar(e), !salvos[e.placeId]?.favorito);
      if (!r.ok) return setErro(r.erro);
      setSalvos((s) => ({ ...s, [e.placeId]: { id: r.dados.id, favorito: r.dados.favorito } }));
      setAviso(
        r.dados.criado
          ? `${e.nome} salvo como lead e marcado como favorito.`
          : r.dados.favorito
            ? `${e.nome} marcado como favorito.`
            : `${e.nome} removido dos favoritos.`,
      );
    });

  async function salvarNota(evento: React.FormEvent) {
    evento.preventDefault();
    const e = anotando;
    if (!e) return;
    await comTrava(e.placeId, async () => {
      const r = await anotarDaBusca(paraSalvar(e), nota);
      if (!r.ok) return setErro(r.erro);
      setSalvos((s) => ({ ...s, [e.placeId]: { id: r.dados.id, favorito: s[e.placeId]?.favorito ?? false } }));
      setAviso(r.dados.criado ? `${e.nome} salvo como lead, com a observação.` : "Observação registrada no histórico do lead.");
      setAnotando(null);
      setNota("");
    });
  }

  async function abrirDetalhes(e: EmpresaEncontrada) {
    setDetalhes({ empresa: e, dados: null, erro: null });
    const r = await consultarDetalhes(e.placeId);
    setDetalhes((d) => (d?.empresa.placeId === e.placeId ? { empresa: e, dados: r.ok ? r.dados : null, erro: r.ok ? null : r.erro } : d));
  }

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) return setErro("Este navegador não informa a localização.");
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocalizando(false);
        setCentro({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      },
      () => {
        setLocalizando(false);
        setErro("Não foi possível obter sua localização. Verifique a permissão do navegador.");
      },
      { timeout: 10_000 },
    );
  }

  const visiveis = (resposta?.empresas ?? [])
    .filter((e) => !comTelefone || e.telefone)
    .filter((e) => (filtroSite === "com" ? e.site : filtroSite === "sem" ? !e.site : true))
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (ordem === "oportunidade") return Number(ehOportunidade(b.e)) - Number(ehOportunidade(a.e)) || a.i - b.i;
      if (ordem === "avaliacao") return (b.e.avaliacao ?? -1) - (a.e.avaliacao ?? -1) || a.i - b.i;
      if (ordem === "distancia") return (a.e.distanciaKm ?? Infinity) - (b.e.distanciaKm ?? Infinity) || a.i - b.i;
      return a.i - b.i;
    })
    .map(({ e }) => e);

  const buscaRealIndisponivel = modo === "real" && !googleAtivo;
  const segmentoLivre = segmento === "livre";

  const acoes = (e: EmpresaEncontrada, compacto = false) => (
    <AcoesEmpresa
      empresa={e}
      salvo={salvos[e.placeId]}
      podeSalvar={Boolean(resposta?.podeSalvar)}
      ocupado={Boolean(ocupados[e.placeId])}
      compacto={compacto}
      onDetalhes={() => abrirDetalhes(e)}
      onSalvar={() => salvar(e)}
      onFavoritar={() => favoritar(e)}
      onAnotar={() => {
        setNota("");
        setAnotando(e);
      }}
    />
  );

  return (
    <div className="space-y-6">
      {buscaRealIndisponivel && (
        <Aviso tipo="info">
          <strong className="text-texto">Busca real indisponível.</strong> A chave <code>GOOGLE_PLACES_API_KEY</code>{" "}
          não está configurada no servidor, então nenhuma empresa real pode ser consultada. Veja em{" "}
          <Link href="/configuracoes" className="text-verde underline">
            Configurações
          </Link>{" "}
          o que é necessário. Enquanto isso, você pode ver um exemplo com dados fictícios.
        </Aviso>
      )}

      <form onSubmit={buscar} className="cartao space-y-5 p-5 sm:p-6" aria-describedby="busca-ajuda">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="segmento" className="rotulo">
              Segmento
            </label>
            <select id="segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} className="campo">
              {SEGMENTOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          {segmentoLivre && (
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="termo" className="rotulo">
                O que buscar
              </label>
              <input
                id="termo"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="ex.: pet shop, escritório de contabilidade"
                maxLength={80}
                required
                className="campo"
              />
            </div>
          )}
          <div>
            <label htmlFor="cidade" className="rotulo">
              Cidade
            </label>
            <input
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="ex.: Guarapuava"
              maxLength={80}
              autoComplete="address-level2"
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="uf" className="rotulo">
              Estado
            </label>
            <select id="uf" value={uf} onChange={(e) => setUf(e.target.value)} className="campo">
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="raio" className="rotulo">
              Raio a partir do centro
            </label>
            <select
              id="raio"
              value={raioKm ?? ""}
              onChange={(e) => setRaioKm(e.target.value ? Number(e.target.value) : null)}
              disabled={!centro}
              aria-describedby="raio-ajuda"
              className="campo"
            >
              <option value="">Sem limite</option>
              {RAIOS_KM.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
            {!centro && (
              <p id="raio-ajuda" className="ajuda">
                Marque o centro para usar o raio.
              </p>
            )}
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="rotulo">Centro da busca (opcional)</legend>
          {chaveMaps ? (
            <MapaCentro chave={chaveMaps} centro={centro} raioKm={raioKm} onEscolher={escolherCentro} />
          ) : (
            <p className="text-sm text-texto-suave">
              {modo === "demo"
                ? "No modo demonstração o mapa não é carregado."
                : "Mapa indisponível: configure NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY para escolher o centro com um clique."}{" "}
              Você pode usar sua localização atual como centro.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={usarMinhaLocalizacao} disabled={localizando} className="botao-secundario">
              <Icone nome="alvo" className="size-4" />
              {localizando ? "Localizando…" : "Usar minha localização"}
            </button>
            {centro && (
              <>
                <span className="text-sm text-texto-suave">
                  Centro: {centro.latitude.toFixed(4)}, {centro.longitude.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCentro(null);
                    setRaioKm(null);
                  }}
                  className="botao-fantasma"
                >
                  Limpar centro
                </button>
              </>
            )}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="busca-ajuda" className="text-xs text-texto-suave">
            Cada busca (e cada “carregar mais”) é uma consulta paga ao Google, até 20 empresas por vez.
          </p>
          <div className="flex flex-wrap gap-2">
            {buscaRealIndisponivel && (
              <button type="button" onClick={verExemplo} disabled={buscando} className="botao-secundario">
                Ver exemplo fictício
              </button>
            )}
            <button type="submit" disabled={buscando || buscaRealIndisponivel} className="botao-primario">
              <Icone nome="busca" className="size-4" />
              {buscando ? "Buscando…" : modo === "demo" ? "Buscar (fictício)" : "Buscar empresas"}
            </button>
          </div>
        </div>
      </form>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}

      {resposta && (
        <section aria-labelledby="resultados-titulo" className="space-y-4">
          {resposta.ficticio && (
            <div role="note" className="rounded-xl border-2 border-dashed border-alerta/60 bg-alerta/10 p-4 text-sm text-alerta">
              <strong>Resultados fictícios.</strong> Nenhuma empresa real foi consultada; nomes, telefones e sites
              abaixo são inventados.
              {!resposta.podeSalvar && " Eles não podem ser salvos como leads."}
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="resultados-titulo" className="text-lg font-semibold">
                {visiveis.length} de {resposta.empresas.length} empresa{resposta.empresas.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs text-texto-suave">
                Consulta: “{resposta.consulta}”
                {resposta.foraDoRaio > 0 &&
                  ` · ${resposta.foraDoRaio} resultado${resposta.foraDoRaio === 1 ? "" : "s"} fora do raio ocultado${resposta.foraDoRaio === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-borda px-3 text-sm">
                <input type="checkbox" checked={comTelefone} onChange={(e) => setComTelefone(e.target.checked)} className="accent-verde-forte" />
                Com telefone
              </label>
              <label className="sr-only" htmlFor="filtro-site">
                Filtrar por site
              </label>
              <select id="filtro-site" value={filtroSite} onChange={(e) => setFiltroSite(e.target.value as FiltroSite)} className="campo w-auto">
                <option value="todos">Site: todos</option>
                <option value="com">Com site informado</option>
                <option value="sem">Sem site informado no Google</option>
              </select>
              <label className="sr-only" htmlFor="ordem">
                Ordenar
              </label>
              <select id="ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="campo w-auto">
                <option value="relevancia">Relevância do Google</option>
                <option value="oportunidade">Oportunidades primeiro</option>
                <option value="avaliacao">Melhor avaliação</option>
                {resposta.empresas.some((e) => e.distanciaKm != null) && <option value="distancia">Mais perto</option>}
              </select>
              <div role="group" aria-label="Modo de exibição" className="flex rounded-xl border border-borda p-0.5">
                <button
                  type="button"
                  aria-pressed={visao === "cards"}
                  onClick={() => setVisao("cards")}
                  className={`botao-icone size-9 ${visao === "cards" ? "bg-superficie-2 text-verde" : ""}`}
                >
                  <Icone nome="grade" className="size-4" />
                  <span className="sr-only">Cards</span>
                </button>
                <button
                  type="button"
                  aria-pressed={visao === "tabela"}
                  onClick={() => setVisao("tabela")}
                  className={`botao-icone size-9 ${visao === "tabela" ? "bg-superficie-2 text-verde" : ""}`}
                >
                  <Icone nome="lista" className="size-4" />
                  <span className="sr-only">Tabela</span>
                </button>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-texto-suave">
            <Icone nome="info" className="mt-px size-4 shrink-0" />
            <span>
              “Oportunidade” = {CRITERIO_OPORTUNIDADE.toLowerCase()} Não avalia a qualidade de sites nem o interesse da
              empresa. A ausência de site no Google não comprova que a empresa não tenha site.
            </span>
          </p>

          {visiveis.length === 0 ? (
            <EstadoVazio icone="busca" titulo="Nenhuma empresa com esses filtros">
              {resposta.empresas.length === 0
                ? "O Google não retornou empresas para esta consulta. Tente outro termo, cidade ou um raio maior."
                : "Afrouxe os filtros de telefone e site para ver as demais."}
            </EstadoVazio>
          ) : visao === "cards" ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visiveis.map((e) => (
                <li key={e.placeId} className={`cartao flex flex-col gap-3 p-5 ${ehOportunidade(e) ? "border-verde/40" : ""}`}>
                  <div>
                    <h3 className="font-semibold leading-snug">{e.nome}</h3>
                    <p className="text-sm text-texto-suave">
                      {e.categoria ?? "Categoria não informada"}
                      {e.distanciaKm != null && ` · ${e.distanciaKm.toString().replace(".", ",")} km`}
                    </p>
                  </div>
                  <SinaisDaEmpresa empresa={e} />
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="sr-only">Endereço</dt>
                      <Icone nome="mapa" className="mt-0.5 size-4 shrink-0 text-texto-suave" />
                      <dd>{e.endereco ?? "Endereço não informado"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Telefone</dt>
                      <Icone nome="telefone" className="mt-0.5 size-4 shrink-0 text-texto-suave" />
                      <dd>{e.telefone ?? "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Site</dt>
                      <Icone nome="globo" className="mt-0.5 size-4 shrink-0 text-texto-suave" />
                      <dd className="min-w-0 truncate">{e.site ? e.site.replace(/^https?:\/\//, "") : "Sem site informado no Google"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Avaliação</dt>
                      <Icone nome="estrela" className="mt-0.5 size-4 shrink-0 text-texto-suave" />
                      <dd>
                        <Avaliacao e={e} />
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto border-t border-borda pt-3">{acoes(e)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cartao relative overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Empresas encontradas</caption>
                <thead className="border-b border-borda text-xs uppercase tracking-wide text-texto-suave">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                    <th scope="col" className="px-4 py-3 font-medium">Telefone</th>
                    <th scope="col" className="px-4 py-3 font-medium">Site</th>
                    <th scope="col" className="px-4 py-3 font-medium">Avaliação</th>
                    <th scope="col" className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {visiveis.map((e) => (
                    <tr key={e.placeId} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.nome}</div>
                        <div className="text-xs text-texto-suave">{e.categoria ?? "—"}</div>
                        {ehOportunidade(e) && <span className="etiqueta-verde mt-1">Oportunidade</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.telefone ?? "—"}</td>
                      <td className="max-w-48 px-4 py-3">
                        {e.site ? (
                          <span className="block truncate">{e.site.replace(/^https?:\/\//, "")}</span>
                        ) : (
                          <span className="text-alerta">Sem site informado no Google</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Avaliacao e={e} />
                      </td>
                      <td className="px-4 py-3">{acoes(e, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resposta.proximaPagina && (
            <div className="flex justify-center">
              <button type="button" onClick={carregarMais} disabled={buscando} className="botao-secundario">
                {buscando ? "Carregando…" : "Carregar mais 20 (nova consulta paga)"}
              </button>
            </div>
          )}

          {!resposta.ficticio && (
            <p className="text-right text-xs text-texto-suave">
              Dados de empresas: <span className="font-medium text-texto">Google Maps</span>
            </p>
          )}
        </section>
      )}

      <Dialogo aberto={Boolean(detalhes)} onFechar={() => setDetalhes(null)} titulo={detalhes?.empresa.nome ?? "Detalhes"}>
        {detalhes && !detalhes.dados && !detalhes.erro && <p className="text-sm text-texto-suave">Consultando o Google…</p>}
        {detalhes?.erro && <Aviso tipo="erro">{detalhes.erro}</Aviso>}
        {detalhes?.dados && (
          <div className="space-y-4 text-sm">
            <SinaisDaEmpresa empresa={detalhes.dados} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-texto-suave">Categoria</dt>
              <dd>{detalhes.dados.categoria ?? "—"}</dd>
              <dt className="text-texto-suave">Situação</dt>
              <dd>{detalhes.dados.situacao ? (SITUACAO[detalhes.dados.situacao] ?? detalhes.dados.situacao) : "—"}</dd>
              <dt className="text-texto-suave">Endereço</dt>
              <dd>{detalhes.dados.endereco ?? "—"}</dd>
              <dt className="text-texto-suave">Telefone</dt>
              <dd>
                {detalhes.dados.telefone ?? "—"}
                {detalhes.dados.telefone && <span className="block text-xs text-texto-suave">WhatsApp não confirmado</span>}
              </dd>
              <dt className="text-texto-suave">Site</dt>
              <dd className="break-all">{detalhes.dados.site ?? "Sem site informado no Google"}</dd>
              <dt className="text-texto-suave">Avaliação</dt>
              <dd>
                <Avaliacao e={detalhes.dados} />
              </dd>
            </dl>
            {detalhes.dados.horarios.length > 0 && (
              <div>
                <h3 className="mb-1 font-medium">Horário de funcionamento</h3>
                <ul className="space-y-0.5 text-texto-suave">
                  {detalhes.dados.horarios.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-borda pt-4">{acoes(detalhes.empresa)}</div>
            {!detalhes.dados.ficticio && <p className="text-right text-xs text-texto-suave">Fonte: Google Maps</p>}
          </div>
        )}
      </Dialogo>

      <Dialogo aberto={Boolean(anotando)} onFechar={() => setAnotando(null)} titulo="Registrar observação">
        <form onSubmit={salvarNota} className="space-y-4">
          <p className="text-sm text-texto-suave">
            {anotando && salvos[anotando.placeId]
              ? "A observação entra no histórico do lead."
              : "A empresa será salva como lead para guardar a observação."}
          </p>
          <div>
            <label htmlFor="nota" className="rotulo">
              Observação sobre {anotando?.nome}
            </label>
            <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={4} maxLength={2000} required className="campo" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAnotando(null)} className="botao-fantasma">
              Cancelar
            </button>
            <button type="submit" disabled={!nota.trim() || Boolean(anotando && ocupados[anotando.placeId])} className="botao-primario">
              Salvar observação
            </button>
          </div>
        </form>
      </Dialogo>
    </div>
  );
}
