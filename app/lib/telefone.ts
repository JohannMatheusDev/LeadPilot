/**
 * Telefone e WhatsApp.
 *
 * Nada aqui afirma que um número tem WhatsApp. O Google lista o telefone que a
 * empresa cadastrou, que pode ser fixo, de recepção ou desatualizado. O máximo
 * que dá para dizer pelo formato é "parece celular", e a tela diz exatamente
 * isso até o usuário confirmar.
 */

/** Dígitos no formato que o wa.me espera (DDI + DDD + número), ou null. */
export function numeroParaWhatsapp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  // Tira só UM zero, e só quando ele é o prefixo de longa distância ("0 42
  // 99999-0000"). Remover todos os zeros transformava o DDD 00 dos dados
  // fictícios num número curto e o botão do WhatsApp sumia na demonstração.
  if ((digitos.length === 11 || digitos.length === 12) && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 13) return null;
  return digitos;
}

/** Celular brasileiro: 11 dígitos nacionais com 9 depois do DDD. */
export function pareceCelular(telefone: string | null | undefined): boolean {
  const n = numeroParaWhatsapp(telefone);
  if (!n || !n.startsWith("55")) return false;
  const nacional = n.slice(2);
  return nacional.length === 11 && nacional[2] === "9";
}

export function linkWhatsapp(telefone: string | null | undefined, texto: string): string | null {
  const numero = numeroParaWhatsapp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
