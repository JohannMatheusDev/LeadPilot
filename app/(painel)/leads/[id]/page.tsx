import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EtiquetaStatus } from "../../../components/Estados";
import Icone from "../../../components/Icone";
import { exigirContexto } from "../../../lib/contexto";
import { nomeDaEtapa } from "../../../lib/tipos";
import DetalheDoLead from "./components/DetalheDoLead";
import ExcluirLead from "./components/ExcluirLead";
import Historico from "./components/Historico";
import Pagamentos from "./components/Pagamentos";

export const metadata: Metadata = { title: "Lead" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaDoLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { repo, googleAtivo } = await exigirContexto();
  const lead = await repo.obterLead(id);
  if (!lead) notFound();
  const [atividades, pagamentos, perfil] = await Promise.all([
    repo.listarAtividades(lead.id),
    repo.listarPagamentos(lead.id),
    repo.obterPerfil(),
  ]);

  return (
    <>
      <div className="mb-6">
        <Link href="/leads" className="mb-3 inline-flex items-center gap-1 text-sm text-texto-suave hover:text-texto">
          <Icone nome="seta" className="size-4 rotate-180" />
          Meus leads
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.nome}</h1>
            <EtiquetaStatus status={lead.status} nome={nomeDaEtapa(lead.status)} />
          </div>
          <ExcluirLead leadId={lead.id} nome={lead.nome} />
        </div>
      </div>

      <DetalheDoLead
        lead={lead}
        perfil={perfil}
        consultarGoogle={Boolean(lead.place_id) && (googleAtivo || lead.place_id!.startsWith("demo-"))}
        lateral={
          <>
            <Pagamentos leadId={lead.id} pagamentos={pagamentos} valorFechado={lead.valor_fechado} />
            <Historico leadId={lead.id} atividades={atividades} />
          </>
        }
      />
    </>
  );
}
