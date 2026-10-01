/**
 * Gerador de abordagem por templates locais.
 *
 * A regra que manda aqui: a mensagem só afirma o que o sistema sabe. Cada
 * frase depende de um dado concreto —
 * - "não encontrei site" só aparece quando o Google não informa site para a
 *   empresa E o usuário marcou para mencionar (a ausência no Google não prova
 *   que não exista site, por isso a frase cita a fonte);
 * - "montei uma prévia" só aparece com link de demonstração cadastrado;
 * - observação só entra se o usuário escreveu no campo de fatos verificados.
 * Nada de "vi seu Instagram", "passei aí na frente" ou elogio genérico: nada
 * disso está nos dados, e mensagem inventada queima o contato.
 *
 * Template em vez de IA nesta versão porque o texto sai previsível e auditável.
 * O resultado vai para um campo editável; quem envia é a pessoa.
 */

export const ESTILOS = [
  { id: "casual", nome: "Casual" },
  { id: "direto", nome: "Direto" },
  { id: "consultivo", nome: "Consultivo" },
  { id: "padrao", nome: "Minha mensagem padrão" },
] as const;

export type Estilo = (typeof ESTILOS)[number]["id"];

export type EntradaMensagem = {
  estilo: Estilo;
  meuNome: string;
  minhaEmpresa: string;
  empresa: string;
  servico: string;
  fatos: string;
  mencionarSemSite: boolean;
  demoUrl: string | null;
  incluirLink: boolean;
  mensagemPadrao: string;
};

export const MARCADORES = ["{empresa}", "{meu_nome}", "{minha_empresa}", "{servico}", "{link_demo}"] as const;

function frase(texto: string): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const comMaiuscula = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(comMaiuscula) ? comMaiuscula : `${comMaiuscula}.`;
}

/**
 * O serviço entra no meio da frase ("trabalho com …"), então "Site
 * institucional" vira "site institucional". Só mexe quando a primeira palavra
 * é maiúscula apenas na inicial: "WordPress" e "SEO" ficam como estão.
 */
function noMeioDaFrase(servico: string): string {
  const primeira = servico.split(" ")[0];
  if (/^\p{Lu}[\p{Ll}]+$/u.test(primeira)) return servico[0].toLowerCase() + servico.slice(1);
  return servico;
}

function juntar(partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function gerarMensagem(e: EntradaMensagem): { texto: string } | { erro: string } {
  const nome = e.meuNome.trim();
  const empresa = e.empresa.trim();
  if (!empresa) return { erro: "O lead precisa de um nome de empresa." };
  if (!nome) return { erro: "Configure seu nome em Configurações para assinar a mensagem." };
  const servico = noMeioDaFrase(e.servico.trim()) || "criação de sites";
  const fatos = frase(e.fatos);
  const demo = e.demoUrl?.trim() || null;

  if (e.estilo === "padrao") {
    const modelo = e.mensagemPadrao.trim();
    if (!modelo) return { erro: "Você ainda não escreveu uma mensagem padrão em Configurações." };
    if (modelo.includes("{link_demo}") && !demo) {
      return { erro: "Sua mensagem padrão usa {link_demo}, mas este lead não tem demonstração cadastrada." };
    }
    return {
      texto: modelo
        .replaceAll("{empresa}", empresa)
        .replaceAll("{meu_nome}", nome)
        .replaceAll("{minha_empresa}", e.minhaEmpresa.trim())
        .replaceAll("{servico}", servico)
        .replaceAll("{link_demo}", demo ?? ""),
    };
  }

  if (e.estilo === "casual") {
    return {
      texto: juntar([
        "Oi, tudo bem?",
        e.mencionarSemSite &&
          `Estava procurando conhecer um pouco mais sobre ${empresa} e não encontrei um site informado no perfil de vocês no Google.`,
        `Sou ${nome}, desenvolvedor, e trabalho com ${servico}.`,
        fatos,
        demo
          ? `Tive uma ideia de como apresentar os serviços de vocês em uma página com contato direto pelo WhatsApp e montei uma prévia para mostrar. ${
              e.incluirLink ? `Dá uma olhada: ${demo}` : "Posso te mandar o link?"
            }`
          : "Tenho uma ideia de como apresentar os serviços de vocês em uma página com contato direto pelo WhatsApp. Posso te contar como seria?",
      ]),
    };
  }

  if (e.estilo === "direto") {
    return {
      texto: juntar([
        `Olá! Sou ${nome}, desenvolvedor, e trabalho com ${servico}.`,
        e.mencionarSemSite && `Não encontrei um site informado no Google para ${empresa}.`,
        fatos,
        demo
          ? e.incluirLink
            ? `Preparei uma demonstração de página para ${empresa}: ${demo}`
            : `Preparei uma demonstração de página para ${empresa}. Posso enviar o link?`
          : "Posso te enviar uma proposta de página com contato direto pelo WhatsApp?",
        "Se não for o momento, é só me avisar.",
      ]),
    };
  }

  return {
    texto: juntar([
      `Olá, tudo bem? Meu nome é ${nome}, sou desenvolvedor e trabalho com ${servico} para empresas locais.`,
      e.mencionarSemSite && `Consultando o perfil de ${empresa} no Google, não encontrei um site informado.`,
      fatos,
      "Uma página própria pode reunir os serviços, o endereço e um botão de contato direto pelo WhatsApp, num endereço que vocês controlam.",
      demo
        ? `Preparei uma demonstração para vocês avaliarem, sem compromisso. ${
            e.incluirLink ? `O link é este: ${demo}` : "Posso te enviar o link?"
          }`
        : "Se fizer sentido, posso explicar como funcionaria. Qual o melhor horário para conversarmos?",
    ]),
  };
}
