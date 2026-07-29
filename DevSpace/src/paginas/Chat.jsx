import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/chat.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import {
  loadConversasDoUsuario,
  getOrCreateConversa,
  enviarMensagem,
  normalizeHandle,
} from "../utils/chat";
import { resizeImageForChat } from "../utils/image";
import { carregarImagem } from "../utils/imageStore";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

const EMOJIS = [
  "😀", "😂", "😍", "😎", "🥳", "😅", "😭", "😡", "😮", "🤔",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🔥", "🎉", "❤️",
  "💔", "⭐", "✅", "❌", "😴", "🤯", "😱", "🥺", "😉", "🙌",
];

export default function Chat({
  irHome,
  irPerfil,
  irExplorar,
  onOpenPost,
  onOpenUserProfile,
  chatAlvo,
  onChatAlvoConsumido,
  logado,
  onRequireAuth,
}) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [usuarioLogado] = useState(
    () =>
      JSON.parse(localStorage.getItem("usuarioLogado")) ||
      JSON.parse(sessionStorage.getItem("usuarioLogado"))
  );
  const [conversas, setConversas] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [texto, setTexto] = useState("");
  const [imagemSelecionada, setImagemSelecionada] = useState("");
  const [emojiAberto, setEmojiAberto] = useState(false);
  const arquivoInputRef = useRef(null);
  const textoInputRef = useRef(null);
  const idsEmBuscaRef = useRef(new Set());
  const [imagensCache, setImagensCache] = useState({});

  const meuHandle = normalizeHandle(usuarioLogado?.handle || usuarioLogado?.username);

  function resolverImagemMensagem(mensagem) {
    if (mensagem.imagem) return mensagem.imagem;
    if (mensagem.imagemId) return imagensCache[mensagem.imagemId] || "";
    return "";
  }

  function recarregarConversas() {
    if (!usuarioLogado) return [];
    const lista = loadConversasDoUsuario(meuHandle);
    setConversas(lista);
    return lista;
  }

  useEffect(() => {
    const lista = recarregarConversas();
    if (!conversaAtivaId && lista.length > 0) {
      setConversaAtivaId(lista[0].id);
    }

    const onUpdate = () => recarregarConversas();
    window.addEventListener("devspaceConversasUpdated", onUpdate);
    return () => window.removeEventListener("devspaceConversasUpdated", onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chatAlvo || !usuarioLogado) return;
    const conversa = getOrCreateConversa(usuarioLogado, chatAlvo);
    setConversaAtivaId(conversa.id);
    recarregarConversas();
    onChatAlvoConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatAlvo]);

  useEffect(() => {
    const idsFaltando = [];
    conversas.forEach((c) => {
      c.mensagens.forEach((m) => {
        if (m.imagemId && !imagensCache[m.imagemId] && !idsEmBuscaRef.current.has(m.imagemId)) {
          idsFaltando.push(m.imagemId);
        }
      });
    });
    if (idsFaltando.length === 0) return;

    idsFaltando.forEach((id) => idsEmBuscaRef.current.add(id));

    let cancelado = false;
    Promise.all(idsFaltando.map((id) => carregarImagem(id).then((url) => [id, url]))).then((pares) => {
      if (cancelado) return;
      setImagensCache((atual) => {
        const novo = { ...atual };
        pares.forEach(([id, url]) => {
          if (url) novo[id] = url;
        });
        return novo;
      });
    });

    return () => {
      cancelado = true;
    };
  }, [conversas, imagensCache]);

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) || null;
  const outroParticipante =
    conversaAtiva?.participantes.find((p) => p.handle !== meuHandle) || null;

  async function enviar() {
    if (!conversaAtiva || (!texto.trim() && !imagemSelecionada)) return;

    const enviada = await enviarMensagem(conversaAtiva.id, meuHandle, texto, imagemSelecionada);
    if (!enviada) return;

    setTexto("");
    setImagemSelecionada("");
    setEmojiAberto(false);
    recarregarConversas();
  }

  function handleEnviar(e) {
    e.preventDefault();
    enviar();
  }

  function handleFormKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    enviar();
  }

  async function handleSelecionarImagem(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const dataUrl = await resizeImageForChat(file);
    if (!dataUrl) return;

    setImagemSelecionada(dataUrl);
    textoInputRef.current?.focus();
  }

  function handleEscolherEmoji(emoji) {
    setTexto((valor) => valor + emoji);
    setEmojiAberto(false);
  }

  return (
    <div className="home">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={irHome}
        irPerfil={irPerfil}
        irExplorar={irExplorar}
        irChat={() => {}}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
      />

      <div className={`chat-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <div className="chat-list">
          <div className="chat-list-header">
            <h2>Mensagens</h2>
          </div>

          {conversas.length === 0 && (
            <p className="chat-empty">
              Nenhuma conversa ainda. Visite o perfil de alguem e clique em "Contatar".
            </p>
          )}

          {conversas.map((c) => {
            const outro = c.participantes.find((p) => p.handle !== meuHandle) || c.participantes[0];
            const ultimaMsg = c.mensagens[c.mensagens.length - 1];
            return (
              <button
                key={c.id}
                type="button"
                className={`chat-list-item${c.id === conversaAtivaId ? " active" : ""}`}
                onClick={() => setConversaAtivaId(c.id)}
              >
                <div
                  className="chat-avatar"
                  style={{ backgroundImage: `url(${outro.fotoPerfil || fallbackAvatar(outro.handle)})` }}
                />
                <div className="chat-list-item-info">
                  <strong>{outro.username}</strong>
                  <span>
                    {!ultimaMsg
                      ? "Diga oi!"
                      : ultimaMsg.texto || (ultimaMsg.imagem || ultimaMsg.imagemId ? "📷 Imagem" : "")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="chat-thread">
          {!conversaAtiva && (
            <div className="chat-empty-state">
              <p>Selecione uma conversa para comecar.</p>
            </div>
          )}

          {conversaAtiva && outroParticipante && (
            <>
              <div className="chat-thread-header">
                <button
                  type="button"
                  className="chat-thread-user"
                  onClick={() => onOpenUserProfile?.(outroParticipante)}
                >
                  <div
                    className="chat-avatar"
                    style={{
                      backgroundImage: `url(${outroParticipante.fotoPerfil || fallbackAvatar(outroParticipante.handle)})`,
                    }}
                  />
                  <strong>{outroParticipante.username}</strong>
                </button>
              </div>

              <div className="chat-messages">
                {conversaAtiva.mensagens.length === 0 && (
                  <p className="chat-empty">Envie a primeira mensagem para {outroParticipante.username}.</p>
                )}
                {conversaAtiva.mensagens.map((m, i) => {
                  const imgSrc = resolverImagemMensagem(m);
                  return (
                    <div key={i} className={`chat-bubble${m.autor === meuHandle ? " own" : ""}`}>
                      {imgSrc && <img className="chat-bubble-imagem" src={imgSrc} alt="Imagem enviada" />}
                      {m.texto && <span>{m.texto}</span>}
                    </div>
                  );
                })}
              </div>

              <form className="chat-input-row" onSubmit={handleEnviar} onKeyDown={handleFormKeyDown}>
                {imagemSelecionada && (
                  <div className="chat-imagem-preview">
                    <img src={imagemSelecionada} alt="Preview da imagem" />
                    <button
                      type="button"
                      className="chat-imagem-remover"
                      onClick={() => setImagemSelecionada("")}
                      aria-label="Remover imagem"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <div className="chat-input-controls">
                  <input
                    type="file"
                    accept="image/*"
                    ref={arquivoInputRef}
                    hidden
                    onChange={handleSelecionarImagem}
                  />

                  <button
                    type="button"
                    className="chat-icon-btn"
                    title="Enviar imagem"
                    onClick={() => arquivoInputRef.current?.click()}
                  >
                    🖼️
                  </button>

                  <div className="chat-emoji-wrapper">
                    <button
                      type="button"
                      className="chat-icon-btn"
                      title="Emojis"
                      onClick={() => setEmojiAberto((aberto) => !aberto)}
                    >
                      😊
                    </button>

                    {emojiAberto && (
                      <div className="chat-emoji-picker">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="chat-emoji-opcao"
                            onClick={() => handleEscolherEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    ref={textoInputRef}
                    placeholder={`Mensagem para ${outroParticipante.username}`}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="chat-enviar-btn"
                    disabled={!texto.trim() && !imagemSelecionada}
                    aria-label="Enviar"
                    title="Enviar"
                  >
                    ➤
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
