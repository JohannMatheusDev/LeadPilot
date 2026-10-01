"use client";

import { useEffect, useState } from "react";
import { Aviso } from "../../../../components/Estados";
import { consultarDetalhes } from "../../../../lib/acoes/busca";
import type { DetalhesEmpresa, Lead, Perfil } from "../../../../lib/tipos";
import FormularioDoLead from "./FormularioDoLead";
import GeradorDeAbordagem from "./GeradorDeAbordagem";
import PainelGoogle from "./PainelGoogle";

export type EstadoGoogle =
  | { fase: "indisponivel" }
  | { fase: "carregando" }
  | { fase: "erro"; erro: string }
  | { fase: "ok"; dados: DetalhesEmpresa & { ficticio: boolean } };

/**
 * Junta formulário, gerador e dados do Google de um lead.
 *
 * Os dados do Google são consultados uma vez, ao abrir a tela, e ficam neste
 * componente — que não remonta quando o lead é salvo. Se ficassem no
 * formulário (que remonta a cada versão nova do lead), cada "Salvar" faria uma
 * nova consulta paga ao Google.
 */
// Consulta em andamento ou recém-terminada por place_id. O Strict Mode do
// React roda o efeito duas vezes em desenvolvimento, e voltar para o lead logo
// depois de sair dele repetiria a consulta; as duas seriam cobradas. Vive só
// na memória da aba e expira rápido, então não é armazenamento dos dados.
const consultas = new Map<string, { quando: number; promessa: ReturnType<typeof consultarDetalhes> }>();
const VALIDADE_MS = 5 * 60_000;

function consultarUmaVez(placeId: string) {
  const atual = consultas.get(placeId);
  if (atual && Date.now() - atual.quando < VALIDADE_MS) return atual.promessa;
  const promessa = consultarDetalhes(placeId);
  consultas.set(placeId, { quando: Date.now(), promessa });
  // Falha não fica guardada: a próxima abertura tenta de novo.
  promessa.then((r) => !r.ok && consultas.delete(placeId));
  return promessa;
}

export default function DetalheDoLead({
  lead,
  perfil,
  consultarGoogle,
  lateral,
}: {
  lead: Lead;
  perfil: Perfil;
  consultarGoogle: boolean;
  lateral: React.ReactNode;
}) {
  const [google, setGoogle] = useState<EstadoGoogle>(consultarGoogle ? { fase: "carregando" } : { fase: "indisponivel" });
  const placeId = lead.place_id;
  const [salvoEm, setSalvoEm] = useState<number | null>(null);

  useEffect(() => {
    if (!consultarGoogle || !placeId) return;
    let ativo = true;
    consultarUmaVez(placeId).then((r) => {
      if (!ativo) return;
      setGoogle(r.ok ? { fase: "ok", dados: r.dados } : { fase: "erro", erro: r.erro });
    });
    return () => {
      ativo = false;
    };
  }, [consultarGoogle, placeId]);

  // undefined = não sabemos (sem consulta ou falhou); null = o Google respondeu sem site.
  const siteNoGoogle = google.fase === "ok" ? google.dados.site : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {salvoEm && <Aviso tipo="ok">Alterações salvas.</Aviso>}
        <FormularioDoLead
          key={lead.atualizado_em}
          lead={lead}
          servicos={perfil.servicos}
          onSalvo={() => setSalvoEm(Date.now())}
        />
        <GeradorDeAbordagem lead={lead} perfil={perfil} siteNoGoogle={siteNoGoogle} />
      </div>
      <div className="space-y-6">
        <PainelGoogle estado={google} manual={!lead.place_id} />
        {lateral}
      </div>
    </div>
  );
}
