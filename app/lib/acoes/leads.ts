"use server";

import { refresh } from "next/cache";
import type { Contexto } from "../contexto";
import { antesDoContato, descreverMudancas, moverLead } from "../leads";
import type { Repositorio } from "../repositorio/tipo";
import { SEGMENTOS } from "../segmentos";
import { ehStatus, type CamposEditaveis, type Lead, type Resultado, type Status } from "../tipos";
import * as v from "../validacao";
import { executar } from "./executar";

/**
 * Mutações de lead. Toda ação termina com `refresh()` para a página atual
 * voltar com os dados do servidor — a tela nunca fica confiando numa cópia
 * local depois de gravar.
 */

/** O mínimo que a busca manda para virar lead. */
export type EmpresaParaSalvar = {
  placeId: string;
  nome: string;
  telefone: string | null;
  cidade: string;
  segmento: string;
};

async function carregar(repo: Repositorio, leadId: unknown): Promise<Lead> {
  const lead = await repo.obterLead(v.id(leadId));
  if (!lead) throw new v.EntradaInvalida("Lead nao encontrado.");
  return lead;
}

async function garantirLead(ctx: Contexto, e: EmpresaParaSalvar): Promise<{ lead: Lead; jaExistia: boolean }> {
  const placeId = v.placeId(e?.placeId);
  // Fictício nunca entra no banco real; é o que mantém os dois mundos separados.
  if (ctx.modo === "real" && placeId.startsWith("demo-")) {
    throw new v.EntradaInvalida("Empresas do exemplo ficticio nao podem ser salvas como lead real.");
  }
  const segmento = SEGMENTOS.find((s) => s.id === e.segmento);
  const resultado = await ctx.repo.inserirLead({
    place_id: placeId,
    nome: v.texto(e.nome, "o nome", 200, true),
    telefone: v.telefone(e.telefone),
    cidade: v.textoOuNulo(e.cidade, "Cidade", 80),
    segmento: segmento && segmento.id !== "livre" ? segmento.nome : null,
  });
  if (!resultado.jaExistia) {
    await ctx.repo.inserirAtividade({
      lead_id: resultado.lead.id,
      tipo: "lead_criado",
      descricao: ctx.modo === "demo" ? "Lead salvo da busca (dados fictícios)." : "Lead salvo a partir da busca no Google.",
      para_status: "novo",
    });
  }
  return resultado;
}

export async function salvarLeadDaBusca(e: EmpresaParaSalvar): Promise<Resultado<{ id: string; jaExistia: boolean }>> {
  return executar(async (ctx) => {
    const { lead, jaExistia } = await garantirLead(ctx, e);
    refresh();
    return { id: lead.id, jaExistia };
  });
}

export async function favoritarDaBusca(
  e: EmpresaParaSalvar,
  favorito: boolean,
): Promise<Resultado<{ id: string; favorito: boolean; criado: boolean }>> {
  return executar(async (ctx) => {
    const { lead, jaExistia } = await garantirLead(ctx, e);
    await ctx.repo.atualizarLead(lead.id, { favorito: Boolean(favorito) });
    refresh();
    return { id: lead.id, favorito: Boolean(favorito), criado: !jaExistia };
  });
}

export async function anotarDaBusca(e: EmpresaParaSalvar, nota: string): Promise<Resultado<{ id: string; criado: boolean }>> {
  return executar(async (ctx) => {
    const texto = v.texto(nota, "a observacao", 2000, true);
    const { lead, jaExistia } = await garantirLead(ctx, e);
    await ctx.repo.inserirAtividade({ lead_id: lead.id, tipo: "nota", descricao: texto });
    refresh();
    return { id: lead.id, criado: !jaExistia };
  });
}

export async function criarLeadManual(dados: { nome: string; telefone: string; cidade: string }): Promise<Resultado<{ id: string }>> {
  return executar(async ({ repo }) => {
    const { lead } = await repo.inserirLead({
      place_id: null,
      nome: v.texto(dados?.nome, "o nome da empresa", 200, true),
      telefone: v.telefone(dados?.telefone),
      cidade: v.textoOuNulo(dados?.cidade, "Cidade", 80),
      segmento: null,
    });
    await repo.inserirAtividade({ lead_id: lead.id, tipo: "lead_criado", descricao: "Lead cadastrado manualmente.", para_status: "novo" });
    refresh();
    return { id: lead.id };
  });
}

export type EdicaoDoLead = {
  nome: string;
  telefone: string;
  whatsapp_confirmado: boolean;
  cidade: string;
  status: string;
  servico: string;
  demo_url: string;
  valor_proposta: number | null;
  valor_fechado: number | null;
  proximo_contato: string;
  fatos_verificados: string;
  observacoes: string;
  favorito: boolean;
};

export async function atualizarLead(leadId: string, dados: EdicaoDoLead): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const antes = await carregar(repo, leadId);
    if (!ehStatus(dados?.status)) throw new v.EntradaInvalida("Status invalido.");
    const campos: CamposEditaveis = {
      nome: v.texto(dados.nome, "o nome", 200, true),
      telefone: v.telefone(dados.telefone),
      whatsapp_confirmado: Boolean(dados.whatsapp_confirmado),
      cidade: v.textoOuNulo(dados.cidade, "Cidade", 80),
      servico: v.textoOuNulo(dados.servico, "Servico", 120),
      demo_url: v.url(dados.demo_url, "Link da demonstracao"),
      valor_proposta: v.dinheiro(dados.valor_proposta, "Valor da proposta"),
      valor_fechado: v.dinheiro(dados.valor_fechado, "Valor fechado"),
      proximo_contato: v.dia(dados.proximo_contato, "Proximo contato"),
      fatos_verificados: v.texto(dados.fatos_verificados, "Fatos verificados", 500),
      observacoes: v.texto(dados.observacoes, "Observacoes", 5000),
      favorito: Boolean(dados.favorito),
    };

    const mudancas = descreverMudancas(antes, campos);
    const atual = (await repo.atualizarLead(antes.id, campos)) ?? antes;
    if (mudancas) await repo.inserirAtividade({ lead_id: antes.id, tipo: "edicao", descricao: mudancas });

    let destino: Status = dados.status;
    if (!antes.demo_url && campos.demo_url) {
      await repo.inserirAtividade({ lead_id: antes.id, tipo: "demo_registrada", descricao: `Demonstração cadastrada: ${campos.demo_url}` });
      // Cadastrar a demo é o que define a etapa "Demonstração pronta"; só
      // avança quem ainda está antes dela e não teve o status mudado à mão
      // nesta mesma edição.
      if (dados.status === antes.status && (antes.status === "novo" || antes.status === "em_analise")) {
        destino = "demo_pronta";
      }
    }
    if (destino !== atual.status) await moverLead(repo, atual, destino);
    refresh();
    return undefined;
  });
}

export async function moverStatus(
  leadId: string,
  status: string,
  opcoes: { valorFechado?: number | null; motivo?: string } = {},
): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    if (!ehStatus(status)) throw new v.EntradaInvalida("Status invalido.");
    const extras: CamposEditaveis = {};
    if (status === "fechado" && opcoes.valorFechado !== undefined) {
      extras.valor_fechado = v.dinheiro(opcoes.valorFechado, "Valor fechado");
    }
    await moverLead(repo, lead, status, extras, v.texto(opcoes.motivo, "O motivo", 300));
    refresh();
    return undefined;
  });
}

export async function registrarNota(leadId: string, texto: string): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    await repo.inserirAtividade({ lead_id: lead.id, tipo: "nota", descricao: v.texto(texto, "a observacao", 2000, true) });
    refresh();
    return undefined;
  });
}

/**
 * Copiar a mensagem e abrir o WhatsApp ficam no histórico como o que são: um
 * rascunho preparado. Nenhum dos dois muda status nem conta como contato —
 * abrir o wa.me não garante que a pessoa apertou enviar.
 */
export async function registrarPreparo(leadId: string, tipo: "mensagem_copiada" | "whatsapp_aberto", estilo: string): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    const nomeEstilo = v.texto(estilo, "o estilo", 40);
    await repo.inserirAtividade({
      lead_id: lead.id,
      tipo,
      descricao:
        tipo === "whatsapp_aberto"
          ? `Conversa aberta no WhatsApp com mensagem (${nomeEstilo}) preenchida. Envio não confirmado.`
          : `Mensagem (${nomeEstilo}) copiada.`,
    });
    refresh();
    return undefined;
  });
}

/** Só a pessoa confirma o envio. Aí sim vira contato e, se ela quiser, avança a etapa. */
export async function registrarEnvio(leadId: string, avancar: boolean): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    await repo.inserirAtividade({ lead_id: lead.id, tipo: "mensagem_enviada", descricao: "Mensagem enviada (confirmado por você)." });
    if (avancar && antesDoContato(lead.status)) {
      await moverLead(repo, lead, "contato_realizado");
    } else if (!lead.contatado_em) {
      await repo.atualizarLead(lead.id, { contatado_em: new Date().toISOString() });
    }
    refresh();
    return undefined;
  });
}

export async function excluirLead(leadId: string): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    await repo.excluirLead(lead.id);
    return undefined;
  });
}

export async function adicionarPagamento(
  leadId: string,
  dados: { valor: number | null; recebido_em: string; descricao: string },
): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const lead = await carregar(repo, leadId);
    const valor = v.dinheiro(dados?.valor, "Valor");
    if (!valor) throw new v.EntradaInvalida("Informe um valor maior que zero.");
    const recebido = v.dia(dados.recebido_em, "Data do recebimento");
    if (!recebido) throw new v.EntradaInvalida("Informe a data do recebimento.");
    await repo.inserirPagamento({ lead_id: lead.id, valor, recebido_em: recebido, descricao: v.texto(dados.descricao, "A descricao", 200) });
    await repo.inserirAtividade({ lead_id: lead.id, tipo: "pagamento", descricao: `Pagamento recebido registrado.` });
    refresh();
    return undefined;
  });
}

export async function excluirPagamento(pagamentoId: string): Promise<Resultado> {
  return executar(async ({ repo, modo }) => {
    // No modo demo os ids semeados não são UUID; lá não há o que proteger.
    const id = modo === "demo" ? v.texto(pagamentoId, "o pagamento", 60, true) : v.id(pagamentoId);
    await repo.excluirPagamento(id);
    refresh();
    return undefined;
  });
}
