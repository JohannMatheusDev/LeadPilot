"use server";

import { redirect } from "next/navigation";
import { podeEntrar, supabaseConfigurado } from "../config";
import { criarClienteSupabase } from "../supabase/servidor";

/**
 * Entrada e saída. Só login por e-mail e senha; não existe cadastro pela
 * aplicação — o usuário é criado no painel do Supabase. Uma tela de cadastro
 * aqui seria a porta para qualquer um gastar a cota do Google.
 */

export async function entrar(_anterior: { erro: string } | null, form: FormData): Promise<{ erro: string } | null> {
  if (!supabaseConfigurado) redirect("/dashboard");
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const db = await criarClienteSupabase();
  const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
  // Mesma mensagem para e-mail inexistente e senha errada: não dizemos a quem
  // tenta adivinhar qual dos dois acertou.
  if (error || !data.user) return { erro: "E-mail ou senha incorretos." };
  if (!podeEntrar(data.user.email)) {
    await db.auth.signOut();
    return { erro: "Este e-mail nao tem acesso a esta instalacao." };
  }
  redirect("/dashboard");
}

export async function sair() {
  if (supabaseConfigurado) {
    const db = await criarClienteSupabase();
    await db.auth.signOut();
  }
  redirect("/login");
}
