export const TAG_OPTIONS = [
  { id: "ia", label: "IA na programação", hashtag: "IA" },
  { id: "web", label: "Desenvolvimento web moderno", hashtag: "DevWeb" },
  { id: "backend", label: "Backend de alta performance", hashtag: "Backend" },
  { id: "cloud", label: "Cloud computing e DevOps", hashtag: "CloudDevOps" },
  { id: "mobile", label: "Desenvolvimento mobile", hashtag: "Mobile" },
];

export function tagLabel(id) {
  return TAG_OPTIONS.find((tag) => tag.id === id)?.label || "";
}

// Converte um texto livre em algo com cara de hashtag: sem espaco, sem "#",
// palavras com inicial maiuscula (ex.: "meu assunto legal" -> "MeuAssuntoLegal").
export function slugifyHashtag(text) {
  return String(text || "")
    .trim()
    .replace(/^#+/, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// Texto exibido apos o "#": usa o hashtag pronto se for uma tag preset,
// senao usa a propria tag (tag customizada) como esta guardada.
export function displayHashtag(tag) {
  if (!tag) return "";
  const preset = TAG_OPTIONS.find((t) => t.id === tag);
  return preset ? preset.hashtag : tag;
}
