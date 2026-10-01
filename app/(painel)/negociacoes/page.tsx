import type { Metadata } from "next";
import { CabecalhoDaPagina } from "../../components/Estados";
import { exigirContexto } from "../../lib/contexto";
import QuadroKanban from "./components/QuadroKanban";

export const metadata: Metadata = { title: "Negociações" };

export default async function PaginaNegociacoes() {
  const { repo } = await exigirContexto();
  const leads = await repo.listarLeads();
  return (
    <>
      <CabecalhoDaPagina
        titulo="Negociações"
        descricao="Arraste os cards entre as etapas ou use “Mover para”. Cada mudança entra no histórico do lead."
      />
      <QuadroKanban leads={leads} />
    </>
  );
}
