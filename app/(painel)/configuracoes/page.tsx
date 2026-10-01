import type { Metadata } from "next";
import { CabecalhoDaPagina } from "../../components/Estados";
import Icone from "../../components/Icone";
import {
  CHAVE_MAPS_NAVEGADOR,
  emailsPermitidos,
  LIMITE_CONSULTAS_POR_DIA,
  LIMITE_CONSULTAS_POR_MINUTO,
  supabaseConfigurado,
} from "../../lib/config";
import { exigirContexto } from "../../lib/contexto";
import FormularioPerfil from "./components/FormularioPerfil";

export const metadata: Metadata = { title: "Configurações" };

function Integracao({ nome, ativa, children }: { nome: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${ativa ? "bg-verde/15 text-verde" : "bg-alerta/15 text-alerta"}`}
      >
        <Icone nome={ativa ? "check" : "info"} className="size-3.5" />
      </span>
      <div className="text-sm">
        <p className="font-medium">
          {nome} <span className="sr-only">{ativa ? "configurado" : "não configurado"}</span>
          <span aria-hidden="true" className={`ml-1 text-xs ${ativa ? "text-verde" : "text-alerta"}`}>
            {ativa ? "Configurado" : "Não configurado"}
          </span>
        </p>
        <p className="mt-0.5 text-texto-suave">{children}</p>
      </div>
    </li>
  );
}

export default async function PaginaConfiguracoes() {
  const ctx = await exigirContexto();
  const perfil = await ctx.repo.obterPerfil();
  // Nenhum valor de chave chega até aqui: a página mostra só se existe.
  const restricaoEmails = emailsPermitidos().length > 0;

  return (
    <>
      <CabecalhoDaPagina titulo="Configurações" descricao="Seu perfil comercial e o estado das integrações." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <FormularioPerfil perfil={perfil} />
        <section className="cartao h-fit p-5" aria-labelledby="integracoes-titulo">
          <h2 id="integracoes-titulo" className="text-base font-semibold">
            Integrações
          </h2>
          <ul className="divide-y divide-borda">
            <Integracao nome="Supabase (banco e login)" ativa={supabaseConfigurado}>
              {supabaseConfigurado
                ? "Dados salvos no seu Postgres, protegidos por RLS."
                : "Sem ele, a aplicação roda em modo demonstração, com dados fictícios em memória."}
            </Integracao>
            <Integracao nome="Google Places API" ativa={ctx.googleAtivo}>
              {ctx.googleAtivo
                ? `Limite: ${LIMITE_CONSULTAS_POR_MINUTO} consultas/min e ${LIMITE_CONSULTAS_POR_DIA} por 24 h.`
                : ctx.modo === "demo"
                  ? "Desligada no modo demonstração, mesmo com chave: sem login, qualquer visitante gastaria a sua cota."
                  : "Configure GOOGLE_PLACES_API_KEY no servidor para buscar empresas reais."}
            </Integracao>
            <Integracao nome="Mapa (Maps JavaScript API)" ativa={Boolean(CHAVE_MAPS_NAVEGADOR) && ctx.modo === "real"}>
              {CHAVE_MAPS_NAVEGADOR
                ? "Chave do navegador presente. Mantenha-a restrita ao seu domínio."
                : "Opcional. Sem ela, o centro da busca vem da sua localização."}
            </Integracao>
            {ctx.modo === "real" && (
              <Integracao nome="Lista de e-mails permitidos" ativa={restricaoEmails}>
                {restricaoEmails
                  ? "Só os e-mails de EMAILS_PERMITIDOS conseguem entrar."
                  : "Vazia: qualquer usuário do projeto Supabase entra. Desligue o cadastro público no Supabase."}
              </Integracao>
            )}
          </ul>
          <p className="mt-3 text-xs text-texto-suave">O passo a passo está no README do projeto.</p>
        </section>
      </div>
    </>
  );
}
