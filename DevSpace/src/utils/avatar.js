/**
 * Descarta um fotoPerfil salvo se ele for um link do antigo gerador externo
 * (api.dicebear.com). Esses links foram persistidos no localStorage/backend
 * de contas fake/seed em sessoes anteriores e, sem rede (ou com a API fora),
 * falham silenciosamente -- o avatar so fica em branco, sem cair no gerador
 * local novo, porque "existe um valor salvo" tinha prioridade sobre gerar de
 * novo. Fotos reais (base64) e os data URIs do gerador local nunca caem aqui.
 */
export function usableFotoPerfil(value) {
  return typeof value === "string" && value && !value.includes("dicebear.com") ? value : "";
}

export function avatarInitial(seed = "") {
  const text = String(seed || "?").replace(/^@+/, "").trim();
  return (text[0] || "?").toUpperCase();
}

function seedHue(seed) {
  const text = String(seed || "?").replace(/^@+/, "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function avatarStyle(photo, seed = "") {
  if (photo) {
    return {
      // Aspas sao obrigatorias aqui: o SVG gerado localmente usa hsl(...) na
      // cor, e sem aspas os parenteses do hsl() fecham o url() prematuramente
      // -- o navegador descarta a propriedade inteira (avatar fica em branco,
      // sem erro nenhum no console). Fotos reais (base64) tambem sao seguras
      // entre aspas, entao isso vale sempre.
      backgroundImage: `url("${photo}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  const hue = seedHue(seed);
  return {
    backgroundImage: `linear-gradient(145deg, hsl(${hue} 42% 34%), hsl(${(hue + 52) % 360} 48% 16%))`,
  };
}

// Cache por seed: evita recriar/recodificar a mesma SVG varias vezes quando o
// mesmo usuario aparece repetido numa lista (feed, chat, notificacoes...).
const placeholderCache = new Map();

/**
 * Avatar padrao gerado localmente (gradiente + inicial), como data URI SVG.
 * Substitui o antigo fallback que buscava uma imagem em api.dicebear.com a
 * cada render sem foto de perfil -- isso era uma chamada de rede externa,
 * sem cache, repetida em toda lista (feed, chat, notificacoes), e era a
 * principal causa do "flash"/demora do avatar padrao. Gerar localmente e
 * instantaneo e nunca depende de rede.
 */
export function placeholderAvatarUri(seed = "usuario") {
  const key = String(seed || "usuario");
  if (placeholderCache.has(key)) return placeholderCache.get(key);

  const initial = avatarInitial(key);
  const hue = seedHue(key);
  const c1 = `hsl(${hue} 42% 34%)`;
  const c2 = `hsl(${(hue + 52) % 360} 48% 16%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="43" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  placeholderCache.set(key, uri);
  return uri;
}
