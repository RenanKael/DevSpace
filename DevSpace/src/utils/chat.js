import { salvarImagem, gerarIdImagem } from "./imageStore";

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

// Salva com resiliencia a estouro de cota do localStorage: sem isso, um
// setItem que falha silenciosamente apagava a conversa (ela sumia no dia
// seguinte, pois nunca tinha sido persistida de verdade). Libera espaco
// removendo o cache de posts (refazivel via backend) e, em ultimo caso,
// mantem so as conversas mais recentes.
export function saveConversas(conversas) {
  const salvarTentativa = (dados) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
      return true;
    } catch {
      return false;
    }
  };

  let sucesso = salvarTentativa(conversas);

  if (!sucesso) {
    try {
      localStorage.removeItem("posts");
    } catch {
      // ignora
    }
    sucesso = salvarTentativa(conversas);
  }

  if (!sucesso) {
    const maisRecentes = [...conversas]
      .sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm))
      .slice(0, 20);
    sucesso = salvarTentativa(maisRecentes);
  }

  window.dispatchEvent(new CustomEvent("devspaceConversasUpdated"));
  return sucesso;
}

function toParticipante(user) {
  return {
    handle: normalizeHandle(user.handle || user.username),
    username: user.username || user.handle || "Usuário",
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

/**
 * As imagens vao para o IndexedDB (cota bem maior que o localStorage) e só
 * o `imagemId` fica salvo na mensagem — assim o histórico de conversas
 * continua pequeno no localStorage não importa quantas fotos sejam
 * enviadas, e imagens antigas nunca precisam ser apagadas para abrir espaço.
 */
export async function enviarMensagem(conversaId, autorHandle, texto, imagem) {
  const textoLimpo = (texto || "").trim();
  if (!textoLimpo && !imagem) return null;

  const conversas = loadConversas();
  const index = conversas.findIndex((c) => c.id === conversaId);
  if (index === -1) return null;

  let imagemId = "";
  if (imagem) {
    imagemId = gerarIdImagem();
    try {
      await salvarImagem(imagemId, imagem);
    } catch {
      return null;
    }
  }

  const mensagem = {
    autor: normalizeHandle(autorHandle),
    texto: textoLimpo,
    imagemId,
    criadoEm: new Date().toISOString(),
  };

  const atualizada = {
    ...conversas[index],
    mensagens: [...conversas[index].mensagens, mensagem],
    atualizadoEm: mensagem.criadoEm,
  };

  const restantes = conversas.filter((c) => c.id !== conversaId);
  const sucesso = saveConversas([atualizada, ...restantes]);
  return sucesso ? atualizada : null;
}

export function loadConversasDoUsuario(handle) {
  const meuHandle = normalizeHandle(handle);
  return loadConversas()
    .filter((c) => c.participantes.some((p) => p.handle === meuHandle))
    .sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
}
