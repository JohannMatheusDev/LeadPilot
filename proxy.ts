import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, supabaseConfigurado } from "./app/lib/config";

/**
 * Renova o token do Supabase a cada navegação e manda para o login quem não
 * tem sessão.
 *
 * É a checagem otimista; a que vale está em `obterContexto`, que toda página e
 * Server Action chama. O proxy existe principalmente por causa da renovação:
 * Server Component não consegue gravar cookie, e sem este passo o token
 * vencia no meio do uso e a pessoa caía no login sem motivo aparente.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigurado) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const db = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await db.auth.getUser();

  const naLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !naLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
