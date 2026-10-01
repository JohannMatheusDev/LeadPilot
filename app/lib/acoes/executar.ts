import { obterContexto, type Contexto } from "../contexto";
import { LimiteExcedido } from "../limite";
import { ErroGoogle } from "../places";
import { ErroDeBanco } from "../repositorio/supabase";
import type { Resultado } from "../tipos";
import { EntradaInvalida } from "../validacao";

/**
 * Moldura comum das Server Actions.
 *
 * Garante três coisas em todas: sessão conferida antes de qualquer trabalho,
 * resposta `{ ok, erro }` em vez de exceção (em produção o Next troca a
 * mensagem de exceção por um texto genérico e a tela não teria o que mostrar)
 * e log sem dado pessoal — só o tipo do erro e, do banco, o código.
 */
export async function executar<T>(trabalho: (ctx: Contexto) => Promise<T>): Promise<Resultado<T>> {
  const ctx = await obterContexto();
  if (!ctx) return { ok: false, erro: "Sua sessao expirou. Entre novamente." };
  try {
    return { ok: true, dados: await trabalho(ctx) };
  } catch (e) {
    if (e instanceof EntradaInvalida || e instanceof LimiteExcedido || e instanceof ErroGoogle) {
      return { ok: false, erro: e.message };
    }
    if (e instanceof ErroDeBanco) {
      console.error(`[acao] banco: ${e.operacao} codigo=${e.codigo ?? "?"}`);
      return { ok: false, erro: "Nao foi possivel salvar agora. Tente novamente." };
    }
    console.error(`[acao] falha inesperada: ${e instanceof Error ? e.name : typeof e}`);
    return { ok: false, erro: "Algo deu errado. Tente novamente." };
  }
}
