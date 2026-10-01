"use client";

import { useState } from "react";
import { Aviso } from "../../../../components/Estados";
import Icone from "../../../../components/Icone";
import { adicionarPagamento, excluirPagamento } from "../../../../lib/acoes/leads";
import { dataCurta, dinheiro, hojeIso, lerDinheiro } from "../../../../lib/formato";
import type { Pagamento } from "../../../../lib/tipos";

/**
 * Pagamentos recebidos do projeto. É o que separa "valor fechado" (o
 * combinado) de "valor recebido" (o que entrou) no dashboard.
 */
export default function Pagamentos({
  leadId,
  pagamentos,
  valorFechado,
}: {
  leadId: string;
  pagamentos: Pagamento[];
  valorFechado: number | null;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeIso());
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const recebido = pagamentos.reduce((s, p) => s + p.valor, 0);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const v = lerDinheiro(valor);
    if (!v || v <= 0) return setErro("Informe um valor maior que zero.");
    setSalvando(true);
    setErro(null);
    const r = await adicionarPagamento(leadId, { valor: v, recebido_em: data, descricao });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setValor("");
    setDescricao("");
  }

  async function remover(id: string) {
    if (!confirm("Remover este pagamento?")) return;
    const r = await excluirPagamento(id);
    if (!r.ok) setErro(r.erro);
  }

  return (
    <section className="cartao p-5" aria-labelledby="pagamentos-titulo">
      <h2 id="pagamentos-titulo" className="text-base font-semibold">
        Pagamentos recebidos
      </h2>
      <p className="mb-3 mt-1 text-sm text-texto-suave">
        Recebido {dinheiro(recebido)}
        {valorFechado != null && ` de ${dinheiro(valorFechado)} fechado`}
      </p>
      {pagamentos.length > 0 && (
        <ul className="mb-4 divide-y divide-borda text-sm">
          {pagamentos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <span className="font-medium">{dinheiro(p.valor)}</span>{" "}
                <span className="text-texto-suave">
                  {dataCurta(p.recebido_em)}
                  {p.descricao && ` · ${p.descricao}`}
                </span>
              </div>
              <button type="button" onClick={() => remover(p.id)} className="botao-icone size-8" aria-label={`Remover pagamento de ${dinheiro(p.valor)}`}>
                <Icone nome="lixeira" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={adicionar} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="pg-valor" className="sr-only">
              Valor recebido
            </label>
            <input id="pg-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (R$)" className="campo" />
          </div>
          <div>
            <label htmlFor="pg-data" className="sr-only">
              Data do recebimento
            </label>
            <input id="pg-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo [color-scheme:dark]" />
          </div>
        </div>
        <label htmlFor="pg-desc" className="sr-only">
          Descrição
        </label>
        <input id="pg-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (ex.: entrada)" maxLength={200} className="campo" />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={salvando} className="botao-secundario w-full">
          {salvando ? "Registrando…" : "Registrar pagamento"}
        </button>
      </form>
    </section>
  );
}
