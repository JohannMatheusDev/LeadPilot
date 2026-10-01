/**
 * Segmentos pré-definidos da busca e o termo que vai para o Google.
 *
 * O termo é o singular que as pessoas digitam no Maps ("academia", não
 * "academias"); no Text Search o singular traz resultados mais certeiros.
 */
export const SEGMENTOS = [
  { id: "odonto", nome: "Clínicas odontológicas", termo: "clínica odontológica" },
  { id: "estetica", nome: "Clínicas de estética", termo: "clínica de estética" },
  { id: "academia", nome: "Academias", termo: "academia" },
  { id: "restaurante", nome: "Restaurantes", termo: "restaurante" },
  { id: "oficina", nome: "Oficinas mecânicas", termo: "oficina mecânica" },
  { id: "loja", nome: "Lojas", termo: "loja" },
  { id: "livre", nome: "Busca livre", termo: "" },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const RAIOS_KM = [1, 2, 5, 10, 20, 50] as const;
