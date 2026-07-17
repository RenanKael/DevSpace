import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/chat.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import {
  loadConversasDoUsuario,
  getOrCreateConversa,
  enviarMensagem,
  normalizeHandle,
} from "../utils/chat";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

export default function Chat({
  irHome,
  irPerfil,
  irExplorar,
  onOpenPost,
  onOpenUserProfile,
  chatAlvo,
  onChatAlvoConsumido,
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

  const meuHandle = normalizeHandle(usuarioLogado?.handle || usuarioLogado?.username);

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

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) || null;
  const outroParticipante =
    conversaAtiva?.participantes.find((p) => p.handle !== meuHandle) || null;

  function handleEnviar(e) {
    e.preventDefault();
    if (!conversaAtiva || !texto.trim()) return;
    enviarMensagem(conversaAtiva.id, meuHandle, texto);
    setTexto("");
    recarregarConversas();
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
                  <span>{ultimaMsg ? ultimaMsg.texto : "Diga oi!"}</span>
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
                {conversaAtiva.mensagens.map((m, i) => (
                  <div key={i} className={`chat-bubble${m.autor === meuHandle ? " own" : ""}`}>
                    {m.texto}
                  </div>
                ))}
              </div>

              <form className="chat-input-row" onSubmit={handleEnviar}>
                <input
                  type="text"
                  placeholder={`Mensagem para ${outroParticipante.username}`}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <button type="submit" disabled={!texto.trim()}>
                  Enviar
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
