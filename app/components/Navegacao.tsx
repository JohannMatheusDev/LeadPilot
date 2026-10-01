"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "../lib/acoes/sessao";
import Icone, { type NomeIcone } from "./Icone";

/**
 * Menu lateral no desktop, barra de abas fixa embaixo no celular.
 *
 * No celular são cinco destinos, que cabem numa barra inferior ao alcance do
 * polegar — um menu hambúrguer esconderia a navegação atrás de um toque a
 * mais em todo uso. Os rótulos ficam visíveis nas duas versões; ícone sozinho
 * obrigaria a adivinhar o que é "Negociações".
 */

const ITENS: { href: string; nome: string; curto: string; icone: NomeIcone }[] = [
  { href: "/dashboard", nome: "Dashboard", curto: "Início", icone: "painel" },
  { href: "/buscar", nome: "Buscar empresas", curto: "Buscar", icone: "busca" },
  { href: "/leads", nome: "Meus leads", curto: "Leads", icone: "leads" },
  { href: "/negociacoes", nome: "Negociações", curto: "Funil", icone: "quadro" },
  { href: "/configuracoes", nome: "Configurações", curto: "Ajustes", icone: "config" },
];

export default function Navegacao({ email, modo }: { email: string | null; modo: "real" | "demo" }) {
  const caminho = usePathname();
  const ativo = (href: string) => caminho === href || caminho.startsWith(`${href}/`);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-borda bg-superficie lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-verde-forte text-fundo">
            <Icone nome="alvo" className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">LeadPilot</span>
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-1 px-3 py-4">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo(item.href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                ativo(item.href)
                  ? "bg-verde/10 text-verde"
                  : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
              }`}
            >
              <Icone nome={item.icone} />
              {item.nome}
            </Link>
          ))}
        </nav>
        <div className="border-t border-borda p-4">
          {modo === "demo" ? (
            <p className="text-xs text-alerta">Modo demonstração, sem login.</p>
          ) : (
            <form action={sair} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-texto-suave" title={email ?? undefined}>
                {email}
              </span>
              <button type="submit" className="botao-icone shrink-0" aria-label="Sair">
                <Icone nome="sair" />
              </button>
            </form>
          )}
        </div>
      </aside>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITENS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo(item.href) ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  ativo(item.href) ? "text-verde" : "text-texto-suave"
                }`}
              >
                <Icone nome={item.icone} />
                {item.curto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
