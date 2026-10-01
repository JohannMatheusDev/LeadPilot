import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDaPagina, EstadoVazio, EtiquetaStatus } from "../../components/Estados";
import Icone from "../../components/Icone";
import { exigirContexto } from "../../lib/contexto";
import { dataCurta, dinheiro, hojeIso } from "../../lib/formato";
import { calcularMetricas, lerPeriodo, PERIODOS } from "../../lib/metricas";
import { nomeDaEtapa } from "../../lib/tipos";
import { GraficoBarras, GraficoColunas } from "./components/Graficos";

export const metadata: Metadata = { title: "Dashboard" };

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className="cartao p-4 sm:p-5">
      <dt className="text-xs font-medium text-texto-suave">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</dd>
      {detalhe && <dd className="mt-0.5 text-xs text-texto-suave">{detalhe}</dd>}
    </div>
  );
}

/**
 * Dashboard. O período vem na URL (?periodo=30) e o filtro é feito de links:
 * a página continua sendo Server Component, sem JS para trocar de período, e
 * o período escolhido sobrevive a recarregar ou compartilhar o endereço.
 */
export default async function PaginaDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const periodo = lerPeriodo((await searchParams).periodo);
  const { repo } = await exigirContexto();
  const [leads, pagamentos] = await Promise.all([repo.listarLeads(), repo.listarPagamentos()]);
  const m = calcularMetricas(leads, pagamentos, periodo.dias);
  const hoje = hojeIso();
  const sufixo = periodo.dias ? `nos últimos ${periodo.nome}` : "desde o início";

  return (
    <>
      <CabecalhoDaPagina titulo="Dashboard" descricao={`Números calculados a partir dos seus leads, ${sufixo}.`}>
        <nav aria-label="Período" className="flex flex-wrap rounded-xl border border-borda bg-superficie p-1">
          {PERIODOS.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard?periodo=${p.id}`}
              aria-current={p.id === periodo.id ? "true" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                p.id === periodo.id ? "bg-verde/15 font-medium text-verde" : "text-texto-suave hover:text-texto"
              }`}
            >
              {p.nome}
            </Link>
          ))}
        </nav>
      </CabecalhoDaPagina>

      {leads.length === 0 ? (
        <EstadoVazio icone="painel" titulo="Ainda não há dados">
          <p>Os números aparecem quando você salvar os primeiros leads.</p>
          <Link href="/buscar" className="botao-primario mt-4">
            Buscar empresas
          </Link>
        </EstadoVazio>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Numero rotulo="Leads novos" valor={m.leadsNoPeriodo} detalhe={`${m.totalLeads} no total`} />
            <Numero rotulo="Contatos realizados" valor={m.contatos} />
            <Numero rotulo="Respostas recebidas" valor={m.respostas} />
            <Numero rotulo="Propostas enviadas" valor={m.propostas} />
            <Numero rotulo="Projetos fechados" valor={m.fechados} />
            <Numero rotulo="Valor proposto" valor={dinheiro(m.valorProposto)} detalhe="Das propostas do período" />
            <Numero
              rotulo="Valor fechado"
              valor={dinheiro(m.valorFechado)}
              detalhe={m.fechadosSemValor > 0 ? `${m.fechadosSemValor} fechado(s) sem valor informado` : "Aceito pelos clientes"}
            />
            <Numero rotulo="Valor recebido" valor={dinheiro(m.valorRecebido)} detalhe="Pagamentos lançados" />
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoColunas titulo="Leads novos no período" barras={m.novosNoTempo} />
            <GraficoBarras titulo="Leads por etapa (hoje)" barras={m.porEtapa} />
          </div>

          <section className="cartao p-5" aria-labelledby="acompanhamentos-titulo">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="acompanhamentos-titulo" className="text-base font-semibold">
                Próximos acompanhamentos
              </h2>
              <Link href="/leads" className="text-sm text-verde hover:underline">
                Ver leads
              </Link>
            </div>
            {m.acompanhamentos.length === 0 ? (
              <p className="text-sm text-texto-suave">
                Nenhum próximo contato agendado. Defina a data no detalhe de cada lead.
              </p>
            ) : (
              <ul className="divide-y divide-borda">
                {m.acompanhamentos.map((l) => {
                  const atrasado = l.proximo_contato! < hoje;
                  const ehHoje = l.proximo_contato === hoje;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/leads/${l.id}`}
                        className="flex flex-col gap-1 py-3 hover:text-verde sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium">{l.nome}</span>
                        <span className="flex items-center gap-2">
                          <EtiquetaStatus status={l.status} nome={nomeDaEtapa(l.status)} />
                          <span className={atrasado ? "etiqueta-alerta" : ehHoje ? "etiqueta-verde" : "etiqueta-neutra"}>
                            <Icone nome="calendario" className="size-3.5" />
                            {atrasado ? "Atrasado · " : ehHoje ? "Hoje · " : ""}
                            {dataCurta(l.proximo_contato)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
