import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { chaveGooglePlaces, podeEntrar, supabaseConfigurado } from "./config";
import { repositorioDemo } from "./repositorio/demo";
import { repositorioSupabase } from "./repositorio/supabase";
import type { Repositorio } from "./repositorio/tipo";
import { criarClienteSupabase } from "./supabase/servidor";

/**
 * Quem está usando e com qual persistência.
 *
 * É a única porta para o repositório: página e Server Action pedem o contexto,
 * e é aqui que se decide sessão, lista de e-mails permitidos e modo. O proxy
 * também redireciona quem não tem sessão, mas ele é só a checagem otimista —
 * Server Action recebe POST direto, sem passar por navegação, então a
 * verificação de verdade é esta.
 *
 * `cache` do React deduplica dentro da mesma requisição: layout e página pedem
 * o contexto e o Supabase Auth é consultado uma vez só.
 */

export type Contexto = {
  modo: "real" | "demo";
  repo: Repositorio;
  email: string | null;
  /** Busca real no Google. Desligada no modo demo mesmo com chave: sem login, qualquer visitante gastaria a cota. */
  googleAtivo: boolean;
};

export const obterContexto = cache(async (): Promise<Contexto | null> => {
  // Sem isto, no modo demo (que não lê cookie) o Next pré-renderizava as
  // telas no build e os leads ficavam congelados no estado da compilação.
  await connection();
  if (!supabaseConfigurado) {
    return { modo: "demo", repo: repositorioDemo, email: null, googleAtivo: false };
  }
  const db = await criarClienteSupabase();
  // getUser valida o token no servidor do Supabase. getSession só lê o cookie
  // e aceitaria um cookie forjado.
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  if (!podeEntrar(data.user.email)) return null;
  return {
    modo: "real",
    repo: repositorioSupabase(db, data.user.id),
    email: data.user.email ?? null,
    googleAtivo: Boolean(chaveGooglePlaces()),
  };
});

/** Para páginas: sem sessão, vai para o login. */
export async function exigirContexto(): Promise<Contexto> {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");
  return ctx;
}
