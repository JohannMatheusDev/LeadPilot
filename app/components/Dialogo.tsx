"use client";

import { useEffect, useRef } from "react";
import Icone from "./Icone";

/**
 * Modal sobre o <dialog> nativo.
 *
 * `showModal()` já entrega o que um modal acessível precisa — foco preso
 * dentro, Esc fecha, o resto da página fica inerte para o leitor de tela — sem
 * biblioteca. O componente só sincroniza o `aberto` do React com o estado do
 * elemento; fechar por Esc ou pelo fundo avisa o pai via `onFechar`.
 */
export default function Dialogo({
  aberto,
  onFechar,
  titulo,
  children,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  largura?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => {
        // Clique no fundo (fora da caixa) fecha; o alvo é o próprio <dialog>.
        if (e.target === ref.current) onFechar();
      }}
      aria-labelledby="dialogo-titulo"
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-2xl border border-borda bg-superficie p-0 text-texto shadow-2xl`}
    >
      {aberto && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="dialogo-titulo" className="text-lg font-semibold">
              {titulo}
            </h2>
            <button type="button" className="botao-icone -mr-2 -mt-2" onClick={onFechar} aria-label="Fechar">
              <Icone nome="fechar" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
