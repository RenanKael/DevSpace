const STORAGE_KEY = "conversas";

export function normalizeHandle(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}

export function getConversaId(handleA, handleB) {
  return [normalizeHandle(handleA), normalizeHandle(handleB)].sort().join("__");
}

export function loadConversas() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveConversas(conversas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversas));
  } catch {
    // localStorage indisponível — ignora
  }
  window.dispatchEvent(new CustomEvent("devspaceConversasUpdated"));
}

function toParticipante(user) {
  return {
    handle: normalizeHandle(user.handle || user.username),
    username: user.username || user.handle || "Usuario",
    fotoPerfil: user.fotoPerfil || "",
  };
}

export function getOrCreateConversa(euUser, outroUser) {
  const meuHandle = normalizeHandle(euUser.handle || euUser.username);
  const outroHandle = normalizeHandle(outroUser.handle || outroUser.username);
  const id = getConversaId(meuHandle, outroHandle);

  const conversas = loadConversas();
  const existente = conversas.find((c) => c.id === id);
  if (existente) return existente;

  const nova = {
    id,
    participantes: [toParticipante(euUser), toParticipante(outroUser)],
    mensagens: [],
    atualizadoEm: new Date().toISOString(),
  };
  saveConversas([nova, ...conversas]);
  return nova;
}

export function enviarMensagem(conversaId, autorHandle, texto) {
  const textoLimpo = texto.trim();
  if (!textoLimpo) return null;

  const conversas = loadConversas();
  const index = conversas.findIndex((c) => c.id === conversaId);
  if (index === -1) return null;

  const mensagem = {
    autor: normalizeHandle(autorHandle),
    texto: textoLimpo,
    criadoEm: new Date().toISOString(),
  };

  const atualizada = {
    ...conversas[index],
    mensagens: [...conversas[index].mensagens, mensagem],
    atualizadoEm: mensagem.criadoEm,
  };

  const restantes = conversas.filter((c) => c.id !== conversaId);
  saveConversas([atualizada, ...restantes]);
  return atualizada;
}

export function loadConversasDoUsuario(handle) {
  const meuHandle = normalizeHandle(handle);
  return loadConversas()
    .filter((c) => c.participantes.some((p) => p.handle === meuHandle))
    .sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
}
