import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "../config";

/**
 * Cliente Supabase para Server Components e Server Actions.
 *
 * A sessão mora em cookie httpOnly gravado pelo @supabase/ssr; o navegador
 * nunca recebe um cliente Supabase, então nenhuma consulta ao banco sai do
 * front. O `try` no setAll é necessário porque Server Component não pode
 * gravar cookie — quem renova o token nesse caso é o `proxy.ts`.
 */
export async function criarClienteSupabase() {
  const loja = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Chamado de um Server Component; o proxy cuida da renovação.
        }
      },
    },
  });
}
