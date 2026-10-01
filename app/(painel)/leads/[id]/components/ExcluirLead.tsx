"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Dialogo from "../../../../components/Dialogo";
import { Aviso } from "../../../../components/Estados";
import Icone from "../../../../components/Icone";
import { excluirLead } from "../../../../lib/acoes/leads";

/** Exclusão com confirmação: apaga junto histórico e pagamentos, e não volta. */
export default function ExcluirLead({ leadId, nome }: { leadId: string; nome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    const r = await excluirLead(leadId);
    setExcluindo(false);
    if (!r.ok) return setErro(r.erro);
    router.push("/leads");
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="botao-fantasma text-perigo">
        <Icone nome="lixeira" className="size-4" />
        Excluir
      </button>
      <Dialogo aberto={aberto} onFechar={() => setAberto(false)} titulo="Excluir lead?">
        <p className="mb-4 text-sm text-texto-suave">
          <strong className="text-texto">{nome}</strong> será excluído com todo o histórico e os pagamentos lançados.
          Não dá para desfazer.
        </p>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setAberto(false)} className="botao-fantasma">
            Cancelar
          </button>
          <button type="button" onClick={excluir} disabled={excluindo} className="botao-perigo">
            {excluindo ? "Excluindo…" : "Excluir definitivamente"}
          </button>
        </div>
      </Dialogo>
    </>
  );
}
