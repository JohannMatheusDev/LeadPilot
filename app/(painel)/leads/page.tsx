import type { Metadata } from "next";
import { CabecalhoDaPagina } from "../../components/Estados";
import { exigirContexto } from "../../lib/contexto";
import ListaDeLeads from "./components/ListaDeLeads";
import NovoLeadManual from "./components/NovoLeadManual";

export const metadata: Metadata = { title: "Meus leads" };

export default async function PaginaLeads() {
  const { repo } = await exigirContexto();
  const leads = await repo.listarLeads();
  return (
    <>
      <CabecalhoDaPagina titulo="Meus leads" descricao="Oportunidades salvas, com status, proposta e próximo contato.">
        <NovoLeadManual />
      </CabecalhoDaPagina>
      <ListaDeLeads leads={leads} />
    </>
  );
}
