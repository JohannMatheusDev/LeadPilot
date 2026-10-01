"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import Dialogo from "../../../components/Dialogo";
import { Aviso, EstadoVazio } from "../../../components/Estados";
import Icone from "../../../components/Icone";
import { moverStatus } from "../../../lib/acoes/leads";
import { dataCurta, dinheiro, hojeIso, lerDinheiro, valorParaCampo } from "../../../lib/formato";
import { ETAPAS, nomeDaEtapa, type Lead, type Status } from "../../../lib/tipos";

/**
 * Quadro de negociações.
 *
 * Arrastar usa a API nativa de drag and drop do HTML, que não funciona em
 * toque nem com teclado. Por isso todo card tem também o seletor "Mover para"
 * — no celular é o único jeito de mover, e no desktop é o caminho acessível.
 *
 * Fechar e perder abrem uma confirmação: fechar pede o valor fechado (sem ele
 * o dashboard somaria zero) e perder aceita um motivo, que vai para o
 * histórico.
 */

type Pendente = { lead: Lead; para: Status } | null;

export default function QuadroKanban({ leads }: { leads: Lead[] }) {
  const [otimistas, aplicar] = useOptimistic(leads, (atual, m: { id: string; para: Status }) =>
    atual.map((l) => (l.id === m.id ? { ...l, status: m.para } : l)),
  );
  const [, iniciar] = useTransition();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);
  const [pendente, setPendente] = useState<Pendente>(null);
  const [valorFechado, setValorFechado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <EstadoVazio icone="quadro" titulo="Nenhuma negociação ainda">
        <p>Os leads salvos aparecem aqui, na etapa em que estão.</p>
        <Link href="/buscar" className="botao-primario mt-4">
          Buscar empresas
        </Link>
      </EstadoVazio>
    );
  }

  function mover(lead: Lead, para: Status, opcoes: { valorFechado?: number | null; motivo?: string } = {}) {
    if (lead.status === para) return;
    setErro(null);
    iniciar(async () => {
      aplicar({ id: lead.id, para });
      const r = await moverStatus(lead.id, para, opcoes);
      if (!r.ok) setErro(`${lead.nome}: ${r.erro}`);
    });
  }

  function pedirMover(lead: Lead, para: Status) {
    if (lead.status === para) return;
    if (para === "fechado" || para === "perdido") {
      setValorFechado(valorParaCampo(lead.valor_fechado ?? lead.valor_proposta));
      setMotivo("");
      setPendente({ lead, para });
      return;
    }
    mover(lead, para);
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!pendente) return;
    if (pendente.para === "fechado") {
      const v = valorFechado.trim() ? lerDinheiro(valorFechado) : null;
      if (valorFechado.trim() && v == null) return setErro("Valor fechado em formato inválido.");
      mover(pendente.lead, "fechado", { valorFechado: v });
    } else {
      mover(pendente.lead, "perdido", { motivo: motivo.trim() ? `Motivo: ${motivo.trim()}` : "" });
    }
    setPendente(null);
  }

  const hoje = hojeIso();

  return (
    <div className="space-y-4">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {/* `relative` prende aqui os rótulos sr-only (position: absolute) dos
          cards. Sem ele, os das colunas fora da tela escapavam da rolagem e
          alargavam a página inteira no celular, tirando a barra de navegação
          inferior da vista. */}
      <div className="relative -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ol className="flex snap-x snap-mandatory gap-4" aria-label="Etapas da negociação">
          {ETAPAS.map((etapa) => {
            const daEtapa = otimistas.filter((l) => l.status === etapa.id);
            const total = daEtapa.reduce((s, l) => s + (l.valor_fechado ?? l.valor_proposta ?? 0), 0);
            return (
              <li
                key={etapa.id}
                aria-labelledby={`etapa-${etapa.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSobre(etapa.id);
                }}
                onDragLeave={() => setSobre((s) => (s === etapa.id ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setSobre(null);
                  const lead = otimistas.find((l) => l.id === e.dataTransfer.getData("text/plain"));
                  if (lead) pedirMover(lead, etapa.id);
                }}
                className={`flex w-[82vw] max-w-72 shrink-0 snap-start flex-col rounded-2xl border bg-superficie/60 sm:w-72 ${
                  sobre === etapa.id ? "border-verde" : "border-borda"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-4">
                  <h2 id={`etapa-${etapa.id}`} className="text-sm font-semibold">
                    {etapa.nome}
                  </h2>
                  <span className="text-xs text-texto-suave">
                    {daEtapa.length}
                    {total > 0 && ` · ${dinheiro(total)}`}
                  </span>
                </div>
                <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                  {daEtapa.map((l) => {
                    const atrasado = l.proximo_contato && l.proximo_contato < hoje && etapa.id !== "fechado" && etapa.id !== "perdido";
                    return (
                      <li
                        key={l.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", l.id);
                          e.dataTransfer.effectAllowed = "move";
                          setArrastando(l.id);
                        }}
                        onDragEnd={() => setArrastando(null)}
                        className={`cartao cursor-grab space-y-2 p-3 active:cursor-grabbing ${arrastando === l.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/leads/${l.id}`} className="font-medium leading-snug hover:text-verde focus-visible:outline-2 focus-visible:outline-verde">
                            {l.nome}
                          </Link>
                          {l.favorito && <Icone nome="estrela" preenchido className="size-4 shrink-0 text-alerta" />}
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {l.servico && <span className="etiqueta-neutra">{l.servico}</span>}
                          {l.demo_url && <span className="etiqueta-verde">Demo</span>}
                          {(l.valor_fechado ?? l.valor_proposta) != null && (
                            <span className="etiqueta-neutra">{dinheiro(l.valor_fechado ?? l.valor_proposta)}</span>
                          )}
                          {l.proximo_contato && etapa.id !== "fechado" && etapa.id !== "perdido" && (
                            <span className={atrasado ? "etiqueta-alerta" : "etiqueta-neutra"}>
                              <Icone nome="calendario" className="size-3" />
                              {dataCurta(l.proximo_contato)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`mover-${l.id}`} className="sr-only">
                            Mover {l.nome} para
                          </label>
                          <select
                            id={`mover-${l.id}`}
                            value={l.status}
                            onChange={(e) => pedirMover(l, e.target.value as Status)}
                            className="campo min-h-9 py-1 text-xs"
                          >
                            {ETAPAS.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.id === l.status ? `Em: ${e.nome}` : `Mover para: ${e.nome}`}
                              </option>
                            ))}
                          </select>
                          <Link href={`/leads/${l.id}`} className="botao-icone size-9 shrink-0" aria-label={`Editar ${l.nome}`}>
                            <Icone nome="nota" className="size-4" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>

      <Dialogo
        aberto={Boolean(pendente)}
        onFechar={() => setPendente(null)}
        titulo={pendente ? `Mover para ${nomeDaEtapa(pendente.para)}` : ""}
      >
        <form onSubmit={confirmar} className="space-y-4">
          <p className="text-sm text-texto-suave">{pendente?.lead.nome}</p>
          {pendente?.para === "fechado" ? (
            <div>
              <label htmlFor="valor-fechado" className="rotulo">
                Valor fechado (R$)
              </label>
              <input
                id="valor-fechado"
                inputMode="decimal"
                value={valorFechado}
                onChange={(e) => setValorFechado(e.target.value)}
                placeholder="0,00"
                className="campo"
              />
              <p className="ajuda">Preenchido com o valor da proposta, se houver. Ajuste para o valor aceito.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="motivo" className="rotulo">
                Motivo (opcional)
              </label>
              <input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} className="campo" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPendente(null)} className="botao-fantasma">
              Cancelar
            </button>
            <button type="submit" className="botao-primario">
              Confirmar
            </button>
          </div>
        </form>
      </Dialogo>
    </div>
  );
}
