"use client";

import { useState } from "react";
import { Aviso } from "../../../../components/Estados";
import { atualizarLead } from "../../../../lib/acoes/leads";
import { lerDinheiro, valorParaCampo } from "../../../../lib/formato";
import { pareceCelular } from "../../../../lib/telefone";
import { ETAPAS, type Lead } from "../../../../lib/tipos";

/**
 * Edição dos dados próprios do lead.
 *
 * O estado nasce do lead recebido e a página remonta este componente (pela
 * `key`) quando chega uma versão nova do servidor. Valores em dinheiro ficam
 * como texto enquanto se digita, para "1.500," não virar 1.5 no meio da
 * digitação.
 */
export default function FormularioDoLead({
  lead,
  servicos,
  onSalvo,
}: {
  lead: Lead;
  servicos: string[];
  /** O aviso de sucesso mora no pai: este formulário remonta logo após salvar e perderia o próprio estado. */
  onSalvo: () => void;
}) {
  const [f, setF] = useState({
    nome: lead.nome,
    telefone: lead.telefone ?? "",
    whatsapp_confirmado: lead.whatsapp_confirmado,
    cidade: lead.cidade ?? "",
    status: lead.status as string,
    servico: lead.servico ?? "",
    demo_url: lead.demo_url ?? "",
    valor_proposta: valorParaCampo(lead.valor_proposta),
    valor_fechado: valorParaCampo(lead.valor_fechado),
    proximo_contato: lead.proximo_contato ?? "",
    fatos_verificados: lead.fatos_verificados,
    observacoes: lead.observacoes,
    favorito: lead.favorito,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudar = <K extends keyof typeof f>(campo: K, valor: (typeof f)[K]) => {
    setF((atual) => ({ ...atual, [campo]: valor }));
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const proposta = f.valor_proposta.trim() ? lerDinheiro(f.valor_proposta) : null;
    const fechado = f.valor_fechado.trim() ? lerDinheiro(f.valor_fechado) : null;
    if ((f.valor_proposta.trim() && proposta == null) || (f.valor_fechado.trim() && fechado == null)) {
      return setErro("Valor em formato inválido. Use, por exemplo, 1.500,00.");
    }
    setSalvando(true);
    setErro(null);
    const r = await atualizarLead(lead.id, { ...f, valor_proposta: proposta, valor_fechado: fechado });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    onSalvo();
  }

  const ganhaDemo = !lead.demo_url && f.demo_url.trim() && (lead.status === "novo" || lead.status === "em_analise");

  return (
    <form onSubmit={salvar} className="cartao space-y-5 p-5 sm:p-6" aria-labelledby="form-lead-titulo">
      <h2 id="form-lead-titulo" className="text-lg font-semibold">
        Dados do lead
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nome" className="rotulo">
            Nome da empresa
          </label>
          <input id="nome" value={f.nome} onChange={(e) => mudar("nome", e.target.value)} required maxLength={200} className="campo" />
        </div>
        <div>
          <label htmlFor="status" className="rotulo">
            Status da negociação
          </label>
          <select id="status" value={f.status} onChange={(e) => mudar("status", e.target.value)} className="campo">
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="telefone" className="rotulo">
            Telefone
          </label>
          <input
            id="telefone"
            type="tel"
            value={f.telefone}
            onChange={(e) => mudar("telefone", e.target.value)}
            maxLength={30}
            aria-describedby="telefone-ajuda"
            className="campo"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.whatsapp_confirmado}
              onChange={(e) => mudar("whatsapp_confirmado", e.target.checked)}
              className="accent-verde-forte"
            />
            Confirmei que este número tem WhatsApp
          </label>
          <p id="telefone-ajuda" className="ajuda">
            {f.telefone && !pareceCelular(f.telefone) ? "Pelo formato, parece telefone fixo. " : ""}
            Telefone do Google não garante WhatsApp.
          </p>
        </div>
        <div>
          <label htmlFor="cidade" className="rotulo">
            Cidade
          </label>
          <input id="cidade" value={f.cidade} onChange={(e) => mudar("cidade", e.target.value)} maxLength={80} className="campo" />
        </div>
        <div>
          <label htmlFor="servico" className="rotulo">
            Serviço a oferecer
          </label>
          <input
            id="servico"
            list="servicos-sugeridos"
            value={f.servico}
            onChange={(e) => mudar("servico", e.target.value)}
            placeholder="ex.: landing page com WhatsApp"
            maxLength={120}
            className="campo"
          />
          <datalist id="servicos-sugeridos">
            {servicos.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="proximo" className="rotulo">
            Próximo contato
          </label>
          <input
            id="proximo"
            type="date"
            value={f.proximo_contato}
            onChange={(e) => mudar("proximo_contato", e.target.value)}
            className="campo [color-scheme:dark]"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="demo" className="rotulo">
            Link da demonstração
          </label>
          <input
            id="demo"
            type="url"
            inputMode="url"
            value={f.demo_url}
            onChange={(e) => mudar("demo_url", e.target.value)}
            placeholder="https://"
            maxLength={500}
            aria-describedby="demo-ajuda"
            className="campo"
          />
          <p id="demo-ajuda" className="ajuda">
            Só com este link o gerador menciona que uma prévia foi criada.
            {ganhaDemo && " Ao salvar, o lead passa para “Demonstração pronta”."}
          </p>
        </div>
        <div>
          <label htmlFor="proposta" className="rotulo">
            Valor da proposta (R$)
          </label>
          <input
            id="proposta"
            inputMode="decimal"
            value={f.valor_proposta}
            onChange={(e) => mudar("valor_proposta", e.target.value)}
            placeholder="0,00"
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="fechado" className="rotulo">
            Valor fechado (R$)
          </label>
          <input
            id="fechado"
            inputMode="decimal"
            value={f.valor_fechado}
            onChange={(e) => mudar("valor_fechado", e.target.value)}
            placeholder="0,00"
            aria-describedby="fechado-ajuda"
            className="campo"
          />
          <p id="fechado-ajuda" className="ajuda">
            O que o cliente aceitou. O recebido é lançado em Pagamentos.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="fatos" className="rotulo">
            Observação verificada para a abordagem
          </label>
          <input
            id="fatos"
            value={f.fatos_verificados}
            onChange={(e) => mudar("fatos_verificados", e.target.value)}
            placeholder="ex.: Vi que vocês atendem também aos sábados."
            maxLength={500}
            aria-describedby="fatos-ajuda"
            className="campo"
          />
          <p id="fatos-ajuda" className="ajuda">
            Uma frase completa, sobre algo que você conferiu. Entra na mensagem exatamente como escrita.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="observacoes" className="rotulo">
            Observações internas
          </label>
          <textarea
            id="observacoes"
            value={f.observacoes}
            onChange={(e) => mudar("observacoes", e.target.value)}
            rows={4}
            maxLength={5000}
            className="campo"
          />
          <p className="ajuda">Só para você. Nunca entra na mensagem.</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.favorito} onChange={(e) => mudar("favorito", e.target.checked)} className="accent-verde-forte" />
        Favorito
      </label>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="flex justify-end">
        <button type="submit" disabled={salvando} className="botao-primario">
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
