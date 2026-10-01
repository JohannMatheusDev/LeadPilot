/** Esqueleto enquanto a página consulta o banco. Mantém o leiaute para a tela não pular ao carregar. */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-56 rounded-lg bg-superficie-2" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-superficie" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-superficie" />
    </div>
  );
}
