import type { Metadata } from "next";
import { CabecalhoDaPagina } from "../../components/Estados";
import { CHAVE_MAPS_NAVEGADOR } from "../../lib/config";
import { exigirContexto } from "../../lib/contexto";
import BuscaEmpresas from "./components/BuscaEmpresas";

export const metadata: Metadata = { title: "Buscar empresas" };

export default async function PaginaBuscar() {
  const ctx = await exigirContexto();
  return (
    <>
      <CabecalhoDaPagina
        titulo="Buscar empresas"
        descricao="Encontre empresas locais pelo Google Places e salve as oportunidades como leads."
      />
      <BuscaEmpresas
        modo={ctx.modo}
        googleAtivo={ctx.googleAtivo}
        // No modo demo o mapa não carrega: sem login, cada visita gastaria
        // carregamento de mapa na conta de quem publicou.
        chaveMaps={ctx.modo === "real" ? CHAVE_MAPS_NAVEGADOR : ""}
      />
    </>
  );
}
