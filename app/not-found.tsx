import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-verde">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-texto-suave">O endereço não existe ou o lead foi excluído.</p>
        <Link href="/dashboard" className="botao-primario mt-6">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
