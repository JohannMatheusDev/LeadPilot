import type { Repositorio } from "./repositorio/tipo";
import { nomeDaEtapa, type CamposDoLead, type Lead, type Status } from "./tipos";

/**
 * Regras do ciclo de vida do lead, comuns ao modo real e ao de demonstração.
 *
 * Toda mudança de status passa por `moverLead`, de qualquer tela (quadro,
 * detalhe, confirmação de envio). Antes de centralizar, cada tela gravaria o
 * status do seu jeito e o histórico e os marcos do dashboard divergiriam.
 */

// Posição no funil. "Perdido" fica fora: é saída, não etapa.
const ORDEM: Partial<Record<Status, number>> = {
  novo: 0,
  em_analise: 1,
  demo_pronta: 2,
  contato_realizado: 3,
  cliente_respondeu: 4,
  proposta_enviada: 5,
  fechado: 6,
};

/**
 * Marcos gravados ao entrar numa etapa.
 *
 * Contato, resposta e proposta são marcos: uma vez alcançados (ou pulados —
 * fechar direto conta como contato e proposta), ficam. Fechado e perdido são
 * estado: reabrir o lead apaga a data, senão o projeto continuaria somando no
 * "valor fechado" do dashboard depois de desfeito.
 */
export function marcosAoMover(lead: Lead, para: Status, agora: string): CamposDoLead {
  const campos: CamposDoLead = { status: para };
  const posicao = ORDEM[para];
  if (posicao !== undefined) {
    if (posicao >= 3 && !lead.contatado_em) campos.contatado_em = agora;
    if (posicao >= 4 && !lead.respondeu_em) campos.respondeu_em = agora;
    if (posicao >= 5 && !lead.proposta_em) campos.proposta_em = agora;
  }
  if (para === "fechado") campos.fechado_em = agora;
  else if (lead.fechado_em) campos.fechado_em = null;
  if (para === "perdido") campos.perdido_em = agora;
  else if (lead.perdido_em) campos.perdido_em = null;
  return campos;
}

export async function moverLead(
  repo: Repositorio,
  lead: Lead,
  para: Status,
  extras: CamposDoLead = {},
  motivo = "",
): Promise<Lead | null> {
  if (lead.status === para && Object.keys(extras).length === 0) return lead;
  const agora = new Date().toISOString();
  const atualizado = await repo.atualizarLead(lead.id, { ...extras, ...marcosAoMover(lead, para, agora) });
  if (lead.status !== para) {
    await repo.inserirAtividade({
      lead_id: lead.id,
      tipo: "status",
      descricao: `${nomeDaEtapa(lead.status)} → ${nomeDaEtapa(para)}${motivo ? `. ${motivo}` : ""}`,
      de_status: lead.status,
      para_status: para,
    });
  }
  return atualizado;
}

/** Etapas anteriores ao primeiro contato: as que "registrar envio" pode avançar. */
export function antesDoContato(status: Status): boolean {
  return status === "novo" || status === "em_analise" || status === "demo_pronta";
}

const ROTULOS: Partial<Record<keyof CamposDoLead, string>> = {
  nome: "nome",
  telefone: "telefone",
  whatsapp_confirmado: "WhatsApp confirmado",
  servico: "serviço",
  demo_url: "link da demonstração",
  valor_proposta: "valor da proposta",
  valor_fechado: "valor fechado",
  proximo_contato: "próximo contato",
  fatos_verificados: "fatos verificados",
  observacoes: "observações",
  favorito: "favorito",
  cidade: "cidade",
};

/** Descrição curta do que mudou, para o histórico. Não copia o conteúdo, só o nome do campo. */
export function descreverMudancas(antes: Lead, campos: CamposDoLead): string | null {
  const mudados = (Object.keys(campos) as (keyof CamposDoLead)[]).filter(
    (k) => k in ROTULOS && antes[k as keyof Lead] !== campos[k],
  );
  if (mudados.length === 0) return null;
  return `Alterou ${mudados.map((k) => ROTULOS[k]).join(", ")}.`;
}
