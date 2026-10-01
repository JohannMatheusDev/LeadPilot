/**
 * Leitura das variáveis de ambiente num lugar só.
 *
 * Cada integração tem um "está configurada?" explícito porque a aplicação
 * precisa rodar sem elas: sem Supabase cai no modo demonstração, sem a chave do
 * Places a busca real fica indisponível (e diz isso), sem a chave do Maps no
 * navegador o centro da busca é escolhido por coordenada. Nenhuma ausência
 * derruba a subida.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// O Supabase renomeou a "anon key" para "publishable key". Aceitamos as duas
// para não quebrar projetos criados antes da troca.
export const SUPABASE_CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_CHAVE_PUBLICA);

export function chaveGooglePlaces(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

/**
 * Chave do Maps JavaScript API, que vai para o navegador por natureza. Tem de
 * ser outra chave, restrita por referenciador HTTP e só ao Maps JavaScript API;
 * reaproveitar a chave do Places aqui exporia a chave paga do servidor.
 */
export const CHAVE_MAPS_NAVEGADOR = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";

function inteiro(valor: string | undefined, padrao: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

// Padrões baixos de propósito: cada página da busca é uma requisição do SKU
// Text Search Enterprise (telefone e site só vêm nele). Dez por minuto já
// atende quem pesquisa à mão; um loop acidental na tela para em segundos.
export const LIMITE_CONSULTAS_POR_MINUTO = inteiro(process.env.PLACES_LIMITE_POR_MINUTO, 10);
export const LIMITE_CONSULTAS_POR_DIA = inteiro(process.env.PLACES_LIMITE_POR_DIA, 150);

/**
 * Lista de e-mails que podem entrar. Vazia aceita qualquer usuário do projeto
 * Supabase — por isso o README pede para desligar o cadastro público lá. As
 * duas travas juntas evitam que alguém crie conta e gaste a cota do Google.
 */
export function emailsPermitidos(): string[] {
  return (process.env.EMAILS_PERMITIDOS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function podeEntrar(email: string | null | undefined): boolean {
  const lista = emailsPermitidos();
  if (lista.length === 0) return true;
  return Boolean(email && lista.includes(email.toLowerCase()));
}
