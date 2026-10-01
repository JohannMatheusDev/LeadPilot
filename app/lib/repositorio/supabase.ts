import type { SupabaseClient } from "@supabase/supabase-js";
import { PERFIL_VAZIO, type Lead, type Pagamento } from "../tipos";
import type { Repositorio } from "./tipo";

/**
 * Persistência real no Postgres do Supabase.
 *
 * O cliente vem autenticado com o cookie do usuário e a chave pública, então a
 * RLS do banco é quem garante o isolamento. O filtro por user_id nas escritas
 * repete a regra de propósito: se alguém um dia trocar a chave por service
 * role, as escritas continuam presas ao dono.
 */

export class ErroDeBanco extends Error {
  constructor(public operacao: string, public codigo: string | undefined) {
    super(`Falha no banco (${operacao}).`);
  }
}

// Só operação e código. A mensagem do PostgREST costuma trazer os valores da
// linha ("Key (user_id, place_id)=(...)"), e isso não deve ir para o log.
function falhar(operacao: string, erro: { code?: string } | null): never {
  throw new ErroDeBanco(operacao, erro?.code);
}

// numeric chega como string pelo PostgREST quando passa de certa precisão.
function lead(linha: Record<string, unknown>): Lead {
  return {
    ...(linha as Lead),
    valor_proposta: linha.valor_proposta == null ? null : Number(linha.valor_proposta),
    valor_fechado: linha.valor_fechado == null ? null : Number(linha.valor_fechado),
  };
}

function pagamento(linha: Record<string, unknown>): Pagamento {
  return { ...(linha as Pagamento), valor: Number(linha.valor) };
}

export function repositorioSupabase(db: SupabaseClient, userId: string): Repositorio {
  return {
    async obterPerfil() {
      const { data, error } = await db
        .from("perfis")
        .select("nome, empresa, servicos, apresentacao, mensagem_padrao")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) falhar("obterPerfil", error);
      return data ? { ...PERFIL_VAZIO, ...data } : PERFIL_VAZIO;
    },

    async salvarPerfil(perfil) {
      const { error } = await db.from("perfis").upsert({ user_id: userId, ...perfil });
      if (error) falhar("salvarPerfil", error);
    },

    async listarLeads() {
      const { data, error } = await db
        .from("leads")
        .select("*")
        .eq("user_id", userId)
        .order("atualizado_em", { ascending: false });
      if (error) falhar("listarLeads", error);
      return (data ?? []).map(lead);
    },

    async obterLead(id) {
      const { data, error } = await db.from("leads").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
      if (error) falhar("obterLead", error);
      return data ? lead(data) : null;
    },

    async leadsPorPlaceIds(placeIds) {
      if (placeIds.length === 0) return [];
      const { data, error } = await db
        .from("leads")
        .select("id, place_id, favorito")
        .eq("user_id", userId)
        .in("place_id", placeIds);
      if (error) falhar("leadsPorPlaceIds", error);
      return data ?? [];
    },

    async inserirLead(dados) {
      const { data, error } = await db
        .from("leads")
        .insert({ ...dados, user_id: userId })
        .select("*")
        .single();
      if (!error) return { lead: lead(data), jaExistia: false };
      // 23505: violação da unique (user_id, place_id). Dois cliques rápidos em
      // "Salvar" ou duas abas chegam aqui; devolvemos o lead que já existe em
      // vez de erro, que é o que a pessoa queria.
      if (error.code === "23505" && dados.place_id) {
        const { data: existente, error: erroBusca } = await db
          .from("leads")
          .select("*")
          .eq("user_id", userId)
          .eq("place_id", dados.place_id)
          .single();
        if (erroBusca) falhar("inserirLead/existente", erroBusca);
        return { lead: lead(existente), jaExistia: true };
      }
      falhar("inserirLead", error);
    },

    async atualizarLead(id, campos) {
      const { data, error } = await db
        .from("leads")
        .update(campos)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();
      if (error) falhar("atualizarLead", error);
      return data ? lead(data) : null;
    },

    async excluirLead(id) {
      const { error } = await db.from("leads").delete().eq("id", id).eq("user_id", userId);
      if (error) falhar("excluirLead", error);
    },

    async listarAtividades(leadId) {
      const { data, error } = await db
        .from("atividades")
        .select("id, lead_id, tipo, descricao, de_status, para_status, criado_em")
        .eq("lead_id", leadId)
        .eq("user_id", userId)
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) falhar("listarAtividades", error);
      return data ?? [];
    },

    async inserirAtividade(atividade) {
      const { error } = await db.from("atividades").insert({ ...atividade, user_id: userId });
      if (error) falhar("inserirAtividade", error);
    },

    async listarPagamentos(leadId) {
      let consulta = db
        .from("pagamentos")
        .select("id, lead_id, valor, recebido_em, descricao, criado_em")
        .eq("user_id", userId)
        .order("recebido_em", { ascending: false });
      if (leadId) consulta = consulta.eq("lead_id", leadId);
      const { data, error } = await consulta;
      if (error) falhar("listarPagamentos", error);
      return (data ?? []).map(pagamento);
    },

    async inserirPagamento(dados) {
      const { error } = await db.from("pagamentos").insert({ ...dados, user_id: userId });
      if (error) falhar("inserirPagamento", error);
    },

    async excluirPagamento(id) {
      const { error } = await db.from("pagamentos").delete().eq("id", id).eq("user_id", userId);
      if (error) falhar("excluirPagamento", error);
    },

    async contarConsultas(desde) {
      const { count, error } = await db
        .from("consultas_api")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("criado_em", desde.toISOString());
      if (error) falhar("contarConsultas", error);
      return count ?? 0;
    },

    async registrarConsulta(tipo) {
      const { error } = await db.from("consultas_api").insert({ tipo, user_id: userId });
      if (error) falhar("registrarConsulta", error);
    },
  };
}
