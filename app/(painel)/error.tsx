"use client";

import { EstadoVazio } from "../components/Estados";

/**
 * Falha ao montar uma página interna (banco fora do ar, por exemplo). A
 * mensagem é genérica de propósito: o erro real pode conter dados da consulta
 * e fica só no log do servidor.
 */
export default function ErroDoPainel({ reset }: { error: Error; reset: () => void }) {
  return (
    <EstadoVazio icone="info" titulo="Não foi possível carregar esta tela">
      <p>Verifique a conexão com o banco e tente de novo.</p>
      <button type="button" onClick={reset} className="botao-secundario mt-4">
        Tentar novamente
      </button>
    </EstadoVazio>
  );
}
