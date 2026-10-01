"use client";

import { useState } from "react";
import { Aviso } from "../../../../components/Estados";
import Icone, { type NomeIcone } from "../../../../components/Icone";
import { registrarNota } from "../../../../lib/acoes/leads";
import { dataHora } from "../../../../lib/formato";
import type { Atividade, TipoAtividade } from "../../../../lib/tipos";

const ICONES: Record<TipoAtividade, NomeIcone> = {
  lead_criado: "mais",
  status: "seta",
  nota: "nota",
  edicao: "nota",
  demo_registrada: "globo",
  mensagem_copiada: "copiar",
  whatsapp_aberto: "mensagem",
  mensagem_enviada: "check",
  pagamento: "check",
};

/** Linha do tempo do lead, com o campo para registrar uma observação datada. */
export default function Historico({ leadId, atividades }: { leadId: string; atividades: Atividade[] }) {
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function anotar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const r = await registrarNota(leadId, nota);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setNota("");
  }

  return (
    <section className="cartao p-5" aria-labelledby="historico-titulo">
      <h2 id="historico-titulo" className="mb-3 text-base font-semibold">
        Histórico de atividades
      </h2>
      <form onSubmit={anotar} className="mb-4 space-y-2">
        <label htmlFor="nova-nota" className="sr-only">
          Nova observação
        </label>
        <textarea
          id="nova-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Registrar uma observação…"
          className="campo"
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={salvando || !nota.trim()} className="botao-secundario w-full">
          {salvando ? "Registrando…" : "Registrar observação"}
        </button>
      </form>
      {atividades.length === 0 ? (
        <p className="text-sm text-texto-suave">Sem atividades ainda.</p>
      ) : (
        <ol className="space-y-3">
          {atividades.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-superficie-2 text-texto-suave">
                <Icone nome={ICONES[a.tipo] ?? "info"} className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="break-words">{a.descricao}</p>
                <time dateTime={a.criado_em} className="text-xs text-texto-suave">
                  {dataHora(a.criado_em)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
