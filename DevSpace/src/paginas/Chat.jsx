import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/chat.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import { normalizeHandle } from "../utils/chat";
import { resizeImageForChat } from "../utils/image";
import { fetchConversas, getOrCreateConversaApi, enviarMensagemApi } from "../api";

// Gera um avatar padrao (via DiceBear) quando o usuario nao tem foto de perfil
function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

// Lista fixa de emojis exibida no seletor do input de mensagem
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
  // Le o usuario logado direto do storage (local ou sessao) apenas uma vez, no mount
  const [usuarioLogado] = useState(
    () =>
      JSON.parse(localStorage.getItem("usuarioLogado")) ||
      JSON.parse(sessionStorage.getItem("usuarioLogado"))
  );
  const [conversas, setConversas] = useState([]); // todas as conversas do usuario logado
  const [conversaAtivaId, setConversaAtivaId] = useState(null); // id da conversa aberta na coluna direita
  const [texto, setTexto] = useState(""); // conteudo do input de mensagem
  const [imagemSelecionada, setImagemSelecionada] = useState(""); // dataURL da imagem escolhida, antes de enviar
  const [emojiAberto, setEmojiAberto] = useState(false); // controla se o seletor de emojis esta visivel
  const arquivoInputRef = useRef(null); // input file oculto, disparado pelo botao de imagem
  const textoInputRef = useRef(null); // usado para devolver o foco ao campo de texto
  const mensagensFimRef = useRef(null); // sentinela no fim da lista, usado para rolar ate a ultima mensagem
  const conversaAnteriorIdRef = useRef(null); // guarda o id da conversa anterior, para saber se houve troca de conversa

  const meuHandle = normalizeHandle(usuarioLogado?.handle || usuarioLogado?.username);

  // Imagem ja vem embutida (base64) na mensagem retornada pelo backend
  function resolverImagemMensagem(mensagem) {
    return mensagem.imagem || "";
  }

  // Recarrega a lista de conversas do usuario logado a partir do backend e atualiza o estado
  async function recarregarConversas() {
    if (!usuarioLogado?.id) return [];
    try {
      const lista = await fetchConversas(usuarioLogado.id);
      setConversas(Array.isArray(lista) ? lista : []);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  // No mount: carrega as conversas do backend e seleciona a primeira como ativa
  useEffect(() => {
    recarregarConversas().then((lista) => {
      if (!conversaAtivaId && lista.length > 0) {
        setConversaAtivaId(lista[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando a pagina recebe um "chatAlvo" (ex: veio do botao "Contatar" de um perfil),
  // busca ou cria a conversa com essa pessoa e a abre automaticamente
  useEffect(() => {
    if (!chatAlvo || !usuarioLogado?.id || !chatAlvo.id) return;
    getOrCreateConversaApi(usuarioLogado.id, chatAlvo.id).then((conversa) => {
      setConversaAtivaId(conversa.id);
      recarregarConversas();
      onChatAlvoConsumido?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatAlvo]);

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) || null;

  // Rola automaticamente para a ultima mensagem sempre que a conversa muda
  // ou uma nova mensagem chega/e enviada, para ela nunca ficar escondida.
  // Ao abrir/trocar de conversa o salto e instantaneo (ja entra mostrando a
  // ultima mensagem); para mensagens novas na conversa ja aberta, rola suave.
  useEffect(() => {
    const trocouDeConversa = conversaAnteriorIdRef.current !== conversaAtivaId;
    conversaAnteriorIdRef.current = conversaAtivaId;
    mensagensFimRef.current?.scrollIntoView({
      behavior: trocouDeConversa ? "auto" : "smooth",
      block: "end",
    });
  }, [conversaAtivaId, conversaAtiva?.mensagens.length]);
  // O "outro" participante da conversa ativa, ou seja, com quem estou conversando
  const outroParticipante =
    conversaAtiva?.participantes.find((p) => p.handle !== meuHandle) || null;

  // Envia a mensagem (texto e/ou imagem) da conversa ativa e limpa o formulario
  async function enviar() {
    if (!conversaAtiva || !usuarioLogado?.id || (!texto.trim() && !imagemSelecionada)) return;

    try {
      const conversaAtualizada = await enviarMensagemApi(
        conversaAtiva.id,
        usuarioLogado.id,
        texto,
        imagemSelecionada
      );
      setConversas((prev) => prev.map((c) => (c.id === conversaAtualizada.id ? conversaAtualizada : c)));
      setTexto("");
      setImagemSelecionada("");
      setEmojiAberto(false);
    } catch {
      // falha ao enviar; mantem o texto/imagem no formulario para o usuario tentar de novo
    }
  }

  // Submit do formulario (clique no botao enviar)
  function handleEnviar(e) {
    e.preventDefault();
    enviar();
  }

  // Permite enviar a mensagem apertando Enter no formulario
  function handleFormKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    enviar();
  }

  // Le o arquivo escolhido no input de imagem, redimensiona (para nao pesar
  // o storage/chat) e guarda como preview antes do envio
  async function handleSelecionarImagem(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const dataUrl = await resizeImageForChat(file);
    if (!dataUrl) return;

    setImagemSelecionada(dataUrl);
    textoInputRef.current?.focus();
  }

  // Insere o emoji clicado no fim do texto e fecha o seletor
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
        {/* Coluna esquerda: lista de conversas do usuario */}
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

        {/* Coluna direita: cabecalho + mensagens + formulario da conversa selecionada */}
        <div className="chat-thread">
          {!conversaAtiva && (
            <div className="chat-empty-state">
              <p>Selecione uma conversa para comecar.</p>
            </div>
          )}

          {conversaAtiva && outroParticipante && (
            <>
              {/* Cabecalho com avatar/nome do outro participante; clicavel para abrir o perfil dele */}
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

              {/* Historico de mensagens da conversa, com bolha diferenciada para as minhas ("own") */}
              <div className="chat-messages">
                {conversaAtiva.mensagens.length === 0 && (
                  <p className="chat-empty">Envie a primeira mensagem para {outroParticipante.username}.</p>
                )}
                {conversaAtiva.mensagens.map((m, i) => {
                  const imgSrc = resolverImagemMensagem(m);
                  return (
                    <div key={m.id ?? i} className={`chat-bubble${m.autor === meuHandle ? " own" : ""}`}>
                      {imgSrc && <img className="chat-bubble-imagem" src={imgSrc} alt="Imagem enviada" />}
                      {m.texto && <span>{m.texto}</span>}
                    </div>
                  );
                })}
                <div ref={mensagensFimRef} />
              </div>

              {/* Formulario de envio: preview de imagem + botoes (imagem/emoji) + texto + enviar */}
              <form className="chat-input-row" onSubmit={handleEnviar} onKeyDown={handleFormKeyDown}>
                {imagemSelecionada && (
                  // Preview da imagem escolhida antes de enviar, com botao para remover
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
                  {/* Input de arquivo escondido; acionado pelo botao de imagem abaixo */}
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

                  {/* Botao + painel do seletor de emojis (lista EMOJIS definida no topo do arquivo) */}
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
