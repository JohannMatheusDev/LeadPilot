"use client";

import { useState } from "react";
import { Aviso } from "../../../components/Estados";
import { salvarPerfil } from "../../../lib/acoes/perfil";
import { MARCADORES } from "../../../lib/mensagens";
import type { Perfil } from "../../../lib/tipos";

/** Perfil comercial: é daqui que o gerador tira nome, serviços e a mensagem padrão. */
export default function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const [nome, setNome] = useState(perfil.nome);
  const [empresa, setEmpresa] = useState(perfil.empresa);
  const [servicos, setServicos] = useState(perfil.servicos.join("\n"));
  const [apresentacao, setApresentacao] = useState(perfil.apresentacao);
  const [mensagem, setMensagem] = useState(perfil.mensagem_padrao);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setResultado(null);
    const r = await salvarPerfil({
      nome,
      empresa,
      servicos: servicos.split("\n").map((s) => s.trim()).filter(Boolean),
      apresentacao,
      mensagem_padrao: mensagem,
    });
    setSalvando(false);
    setResultado(r.ok ? { tipo: "ok", texto: "Configurações salvas." } : { tipo: "erro", texto: r.erro });
  }

  return (
    <form onSubmit={salvar} className="cartao space-y-5 p-5 sm:p-6" aria-labelledby="perfil-titulo">
      <h2 id="perfil-titulo" className="text-lg font-semibold">
        Perfil comercial
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="perfil-nome" className="rotulo">
            Seu nome
          </label>
          <input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name" className="campo" />
          <p className="ajuda">Assina as mensagens de abordagem.</p>
        </div>
        <div>
          <label htmlFor="perfil-empresa" className="rotulo">
            Sua empresa (opcional)
          </label>
          <input id="perfil-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={120} autoComplete="organization" className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="perfil-servicos" className="rotulo">
          Serviços oferecidos
        </label>
        <textarea
          id="perfil-servicos"
          value={servicos}
          onChange={(e) => setServicos(e.target.value)}
          rows={4}
          placeholder={"criação de sites\nlanding pages com WhatsApp"}
          aria-describedby="servicos-ajuda"
          className="campo"
        />
        <p id="servicos-ajuda" className="ajuda">
          Um por linha, escrito para completar a frase “trabalho com …”. O primeiro é o padrão do gerador.
        </p>
      </div>
      <div>
        <label htmlFor="perfil-apresentacao" className="rotulo">
          Apresentação comercial
        </label>
        <textarea
          id="perfil-apresentacao"
          value={apresentacao}
          onChange={(e) => setApresentacao(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Como você descreve o seu trabalho para um cliente."
          className="campo"
        />
        <p className="ajuda">Referência para você ao conversar com o cliente.</p>
      </div>
      <div>
        <label htmlFor="perfil-mensagem" className="rotulo">
          Mensagem padrão
        </label>
        <textarea
          id="perfil-mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Oi, tudo bem? Sou {meu_nome} e trabalho com {servico}. Montei uma prévia para a {empresa}: {link_demo}"
          aria-describedby="mensagem-ajuda"
          className="campo"
        />
        <p id="mensagem-ajuda" className="ajuda">
          Aparece como estilo “Minha mensagem padrão” no gerador. Marcadores: {MARCADORES.join(", ")}. Se usar{" "}
          {"{link_demo}"}, a mensagem só é gerada para leads com demonstração cadastrada.
        </p>
      </div>
      {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
      <div className="flex justify-end">
        <button type="submit" disabled={salvando} className="botao-primario">
          {salvando ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
