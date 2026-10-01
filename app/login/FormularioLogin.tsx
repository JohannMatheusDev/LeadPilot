"use client";

import { useActionState } from "react";
import { Aviso } from "../components/Estados";
import { entrar } from "../lib/acoes/sessao";

export default function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, null);

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">
          Senha
        </label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button type="submit" className="botao-primario w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
