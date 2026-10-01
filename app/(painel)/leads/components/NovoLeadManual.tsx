"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Dialogo from "../../../components/Dialogo";
import { Aviso } from "../../../components/Estados";
import Icone from "../../../components/Icone";
import { criarLeadManual } from "../../../lib/acoes/leads";

/** Lead que não veio do Google: indicação, empresa vista na rua, contato antigo. */
export default function NovoLeadManual() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const r = await criarLeadManual({ nome, telefone, cidade });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setAberto(false);
    router.push(`/leads/${r.dados.id}`);
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="botao-secundario">
        <Icone nome="mais" className="size-4" />
        Lead manual
      </button>
      <Dialogo aberto={aberto} onFechar={() => setAberto(false)} titulo="Novo lead manual">
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label htmlFor="manual-nome" className="rotulo">
              Nome da empresa
            </label>
            <input id="manual-nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={200} className="campo" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="manual-telefone" className="rotulo">
                Telefone
              </label>
              <input
                id="manual-telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(42) 99999-0000"
                maxLength={30}
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="manual-cidade" className="rotulo">
                Cidade
              </label>
              <input id="manual-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} className="campo" />
            </div>
          </div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAberto(false)} className="botao-fantasma">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="botao-primario">
              {salvando ? "Salvando…" : "Criar lead"}
            </button>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
