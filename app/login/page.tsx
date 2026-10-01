import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "../components/Icone";
import { supabaseConfigurado } from "../lib/config";
import { obterContexto } from "../lib/contexto";
import FormularioLogin from "./FormularioLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  if (supabaseConfigurado && (await obterContexto())) redirect("/dashboard");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-verde-forte text-fundo">
            <Icone nome="alvo" className="size-6" />
          </span>
          <span className="text-2xl font-semibold tracking-tight">LeadPilot</span>
        </div>
        <div className="cartao p-6">
          {supabaseConfigurado ? (
            <>
              <h1 className="mb-1 text-lg font-semibold">Entrar</h1>
              <p className="mb-6 text-sm text-texto-suave">Acesso restrito. O usuário é criado no painel do Supabase.</p>
              <FormularioLogin />
            </>
          ) : (
            <>
              <h1 className="mb-2 text-lg font-semibold">Modo demonstração</h1>
              <p className="mb-6 text-sm text-texto-suave">
                O Supabase não está configurado, então não há login nem dados reais. Você pode conhecer a ferramenta com
                dados fictícios.
              </p>
              <Link href="/dashboard" className="botao-primario w-full">
                Abrir demonstração
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
