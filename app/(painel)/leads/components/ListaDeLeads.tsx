"use client";

import Link from "next/link";
import { useState } from "react";
import { EstadoVazio, EtiquetaStatus } from "../../../components/Estados";
import Icone from "../../../components/Icone";
import { dataCurta, dinheiro, hojeIso } from "../../../lib/formato";
import { ETAPAS, nomeDaEtapa, type Lead } from "../../../lib/tipos";

/**
 * Lista pesquisável dos leads. Filtra na memória: a página já traz todos os
 * leads do usuário (ver `listarLeads`), e filtrar aqui responde a cada tecla
 * sem ida ao servidor.
 */

type Ordem = "recentes" | "proximo" | "nome" | "valor";

function semAcento(t: string) {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function ListaDeLeads({ leads }: { leads: Lead[] }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [soAtrasados, setSoAtrasados] = useState(false);
  const [soComDemo, setSoComDemo] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  if (leads.length === 0) {
    return (
      <EstadoVazio icone="leads" titulo="Nenhum lead ainda">
        <p>Busque empresas e salve as que interessam, ou cadastre um lead manualmente.</p>
        <Link href="/buscar" className="botao-primario mt-4">
          Buscar empresas
        </Link>
      </EstadoVazio>
    );
  }

  const hoje = hojeIso();
  const termo = semAcento(busca.trim());
  const ativo = (l: Lead) => l.status !== "fechado" && l.status !== "perdido";
  const atrasado = (l: Lead) => ativo(l) && Boolean(l.proximo_contato && l.proximo_contato < hoje);

  const visiveis = leads
    .filter((l) => !status || l.status === status)
    .filter((l) => !soFavoritos || l.favorito)
    .filter((l) => !soAtrasados || atrasado(l))
    .filter((l) => !soComDemo || l.demo_url)
    .filter(
      (l) =>
        !termo ||
        [l.nome, l.telefone, l.cidade, l.servico, l.segmento, l.observacoes].some((c) => c && semAcento(c).includes(termo)),
    )
    .sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "valor") return (b.valor_fechado ?? b.valor_proposta ?? 0) - (a.valor_fechado ?? a.valor_proposta ?? 0);
      if (ordem === "proximo") return (a.proximo_contato ?? "9999").localeCompare(b.proximo_contato ?? "9999");
      return b.atualizado_em.localeCompare(a.atualizado_em);
    });

  return (
    <div className="space-y-4">
      <div className="cartao grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
        <div>
          <label htmlFor="busca-leads" className="sr-only">
            Pesquisar leads
          </label>
          <input
            id="busca-leads"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome, telefone, cidade, serviço…"
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="filtro-status" className="sr-only">
            Status
          </label>
          <select id="filtro-status" value={status} onChange={(e) => setStatus(e.target.value)} className="campo">
            <option value="">Todos os status</option>
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ordem-leads" className="sr-only">
            Ordenar
          </label>
          <select id="ordem-leads" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="campo">
            <option value="recentes">Atualizados recentemente</option>
            <option value="proximo">Próximo contato</option>
            <option value="nome">Nome</option>
            <option value="valor">Maior valor</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          {[
            { rotulo: "Favoritos", valor: soFavoritos, mudar: setSoFavoritos },
            { rotulo: "Contato atrasado", valor: soAtrasados, mudar: setSoAtrasados },
            { rotulo: "Com demonstração", valor: soComDemo, mudar: setSoComDemo },
          ].map((f) => (
            <label key={f.rotulo} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 text-sm">
              <input type="checkbox" checked={f.valor} onChange={(e) => f.mudar(e.target.checked)} className="accent-verde-forte" />
              {f.rotulo}
            </label>
          ))}
        </div>
      </div>

      <p className="text-sm text-texto-suave" aria-live="polite">
        {visiveis.length} de {leads.length} lead{leads.length === 1 ? "" : "s"}
      </p>

      {visiveis.length === 0 ? (
        <EstadoVazio icone="busca" titulo="Nenhum lead com esses filtros" />
      ) : (
        <ul className="grid gap-3">
          {visiveis.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leads/${l.id}`}
                className="cartao flex flex-col gap-3 p-4 transition-colors hover:border-verde/50 focus-visible:outline-2 focus-visible:outline-verde sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {l.favorito && (
                      <Icone nome="estrela" preenchido className="size-4 shrink-0 text-alerta" />
                    )}
                    <span className="truncate font-semibold">{l.nome}</span>
                    {l.favorito && <span className="sr-only">(favorito)</span>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-texto-suave">
                    {[l.servico, l.cidade, l.telefone].filter(Boolean).join(" · ") || "Sem detalhes ainda"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {l.demo_url && <span className="etiqueta-verde">Demo</span>}
                  {l.proximo_contato && ativo(l) && (
                    <span className={atrasado(l) ? "etiqueta-alerta" : "etiqueta-neutra"}>
                      <Icone nome="calendario" className="size-3.5" />
                      {atrasado(l) ? "Atrasado: " : ""}
                      {dataCurta(l.proximo_contato)}
                    </span>
                  )}
                  {(l.valor_fechado ?? l.valor_proposta) != null && (
                    <span className="text-texto-suave">{dinheiro(l.valor_fechado ?? l.valor_proposta)}</span>
                  )}
                  <EtiquetaStatus status={l.status} nome={nomeDaEtapa(l.status)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
