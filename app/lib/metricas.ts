import { ETAPAS, type Lead, type Pagamento, type Status } from "./tipos";

/**
 * Números do dashboard, calculados dos leads e pagamentos reais.
 *
 * Cada métrica conta pelo marco da etapa (contatado_em, proposta_em…) dentro
 * do período, não pelo status atual. Assim "propostas enviadas nos últimos 30
 * dias" inclui a proposta que já virou fechamento.
 *
 * Três valores diferentes, que não se somam:
 * - proposto: o que foi oferecido (valor_proposta de quem recebeu proposta);
 * - fechado: o que o cliente aceitou (valor_fechado de quem está fechado);
 * - recebido: o que entrou de fato (pagamentos lançados).
 */

export const PERIODOS = [
  { id: "7", nome: "7 dias", dias: 7 },
  { id: "30", nome: "30 dias", dias: 30 },
  { id: "90", nome: "90 dias", dias: 90 },
  { id: "365", nome: "12 meses", dias: 365 },
  { id: "tudo", nome: "Tudo", dias: null },
] as const;

export type PeriodoId = (typeof PERIODOS)[number]["id"];

export function lerPeriodo(valor: unknown): (typeof PERIODOS)[number] {
  return PERIODOS.find((p) => p.id === valor) ?? PERIODOS[1];
}

export type Barra = { rotulo: string; valor: number; dica: string };

export type Metricas = {
  totalLeads: number;
  leadsNoPeriodo: number;
  contatos: number;
  respostas: number;
  propostas: number;
  fechados: number;
  valorProposto: number;
  valorFechado: number;
  valorRecebido: number;
  fechadosSemValor: number;
  porEtapa: Barra[];
  novosNoTempo: Barra[];
  acompanhamentos: Lead[];
};

export function calcularMetricas(leads: Lead[], pagamentos: Pagamento[], dias: number | null): Metricas {
  const inicio = dias == null ? null : Date.now() - dias * 86_400_000;
  const noPeriodo = (iso: string | null) => iso != null && (inicio == null || Date.parse(iso) >= inicio);
  // Pagamento tem só o dia; comparamos como texto para não escorregar de fuso.
  const inicioDia = inicio == null ? null : new Date(inicio).toISOString().slice(0, 10);

  const comProposta = leads.filter((l) => noPeriodo(l.proposta_em));
  const fechados = leads.filter((l) => l.status === "fechado" && noPeriodo(l.fechado_em));

  const contagemPorEtapa = new Map<Status, number>();
  leads.forEach((l) => contagemPorEtapa.set(l.status, (contagemPorEtapa.get(l.status) ?? 0) + 1));

  // Independe do período: um retorno atrasado de dois meses atrás continua
  // pendente. Ordem crescente põe os atrasados primeiro.
  const acompanhamentos = leads
    .filter((l) => l.proximo_contato && l.status !== "fechado" && l.status !== "perdido")
    .sort((a, b) => a.proximo_contato!.localeCompare(b.proximo_contato!))
    .slice(0, 10);

  return {
    totalLeads: leads.length,
    leadsNoPeriodo: leads.filter((l) => noPeriodo(l.criado_em)).length,
    contatos: leads.filter((l) => noPeriodo(l.contatado_em)).length,
    respostas: leads.filter((l) => noPeriodo(l.respondeu_em)).length,
    propostas: comProposta.length,
    fechados: fechados.length,
    valorProposto: comProposta.reduce((s, l) => s + (l.valor_proposta ?? 0), 0),
    valorFechado: fechados.reduce((s, l) => s + (l.valor_fechado ?? 0), 0),
    valorRecebido: pagamentos
      .filter((p) => inicioDia == null || p.recebido_em >= inicioDia)
      .reduce((s, p) => s + p.valor, 0),
    fechadosSemValor: fechados.filter((l) => l.valor_fechado == null).length,
    porEtapa: ETAPAS.map((e) => {
      const n = contagemPorEtapa.get(e.id) ?? 0;
      return { rotulo: e.nome, valor: n, dica: `${e.nome}: ${n} lead${n === 1 ? "" : "s"}` };
    }),
    novosNoTempo: agruparNoTempo(leads, dias),
    acompanhamentos,
  };
}

/**
 * Leads novos por dia (até 31 dias), por semana (até 90) ou por mês. Mais de
 * ~30 barras deixam de ser legíveis no celular.
 */
function agruparNoTempo(leads: Lead[], dias: number | null): Barra[] {
  const fuso = "America/Sao_Paulo";
  const diaDe = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: fuso });
  const agora = Date.now();
  const maisAntigo = leads.reduce((m, l) => Math.min(m, Date.parse(l.criado_em)), agora);
  const span = dias ?? Math.max(30, Math.ceil((agora - maisAntigo) / 86_400_000));

  const contar = (de: number, ate: number) =>
    leads.filter((l) => {
      const t = Date.parse(l.criado_em);
      return t >= de && t < ate;
    }).length;

  const barras: Barra[] = [];
  if (span <= 31) {
    for (let i = span - 1; i >= 0; i--) {
      const dia = diaDe(agora - i * 86_400_000);
      const n = leads.filter((l) => diaDe(Date.parse(l.criado_em)) === dia).length;
      const rotulo = `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
      barras.push({ rotulo, valor: n, dica: `${rotulo}: ${n} novo${n === 1 ? "" : "s"}` });
    }
  } else if (span <= 90) {
    const semanas = Math.ceil(span / 7);
    for (let i = semanas - 1; i >= 0; i--) {
      const ate = agora - i * 7 * 86_400_000;
      const de = ate - 7 * 86_400_000;
      const n = contar(de, ate + 1);
      const rotulo = diaDe(de).slice(8, 10) + "/" + diaDe(de).slice(5, 7);
      barras.push({ rotulo, valor: n, dica: `Semana de ${rotulo}: ${n} novo${n === 1 ? "" : "s"}` });
    }
  } else {
    const meses = Math.min(24, Math.ceil(span / 30));
    const hoje = new Date();
    for (let i = meses - 1; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
      const n = leads.filter((l) => diaDe(Date.parse(l.criado_em)).startsWith(chave)).length;
      const rotulo = ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      barras.push({ rotulo, valor: n, dica: `${rotulo}/${ref.getFullYear()}: ${n} novo${n === 1 ? "" : "s"}` });
    }
  }
  return barras;
}
