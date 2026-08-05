import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import CameraIcon from "../components/CameraIcon";
import "../style/chat.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import {
  normalizeHandle,
  loadConversasDoUsuario,
  getOrCreateConversa as getOrCreateConversaLocal,
  enviarMensagem as enviarMensagemLocal,
} from "../utils/chat";
import { resizeImageForChat } from "../utils/image";
import { carregarImagem } from "../utils/imageStore";
import { fetchConversas, getOrCreateConversaApi, enviarMensagemApi, markConversaAsRead } from "../api";

// Conversas com "bots" (perfis de demonstracao, sem conta real no backend)
// sao 100% locais e sempre "aceitas" na hora -- o id delas e string
// (ex: "handleA__handleB"), nunca colide com o id numerico do backend.
function isBotConversaId(id) {
  return typeof id === "string";
}

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
  contactRequests,
  onAcceptContact,
  onDeclineContact,
  unreadConversas,
  onOpenUnreadConversa,
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
  const idsEmBuscaRef = useRef(new Set()); // evita buscar a mesma imagem de bot mais de uma vez em paralelo
  const [imagensCache, setImagensCache] = useState({}); // mapa imagemId -> dataURL ja carregado (so conversas com bot)

  const meuHandle = normalizeHandle(usuarioLogado?.handle || usuarioLogado?.username);

  // Mensagens reais (backend) ja vem com a imagem embutida; mensagens de bot
  // (locais) guardam so um imagemId, buscado do IndexedDB via imagensCache.
  function resolverImagemMensagem(mensagem) {
    if (mensagem.imagem) return mensagem.imagem;
    if (mensagem.imagemId) return imagensCache[mensagem.imagemId] || "";
    return "";
  }

  // Recarrega conversas reais (backend) + conversas locais com bots, e
  // combina as duas listas ordenadas pela mensagem mais recente.
  async function recarregarConversas() {
    const botConversas = usuarioLogado ? loadConversasDoUsuario(meuHandle) : [];

    let reais = [];
    if (usuarioLogado?.id) {
      try {
        reais = await fetchConversas(usuarioLogado.id);
        if (!Array.isArray(reais)) reais = [];
      } catch {
        reais = [];
      }
    }

    const combinadas = [...reais, ...botConversas].sort(
      (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
    );
    setConversas(combinadas);
    return combinadas;
  }

  // No mount: carrega as conversas (reais + bots) e seleciona a primeira como ativa
  useEffect(() => {
    recarregarConversas().then((lista) => {
      if (!conversaAtivaId && lista.length > 0) {
        setConversaAtivaId(lista[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca em lote as imagens de bot ainda faltando no cache (mensagens reais
  // ja trazem a imagem embutida, entao isso so afeta conversas locais)
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

  // Quando a pagina recebe um "chatAlvo" (ex: veio do botao "Contatar" de um
  // perfil), abre a conversa com essa pessoa. Bots (sem id real) sempre
  // "aceitam" na hora, via uma conversa 100% local; usuarios reais ja chegam
  // aqui com a conversa criada (o pedido de contato ja foi aceito antes).
  useEffect(() => {
    if (!chatAlvo || !usuarioLogado) return;

    // Veio de uma notificacao de mensagem nova: o id da conversa ja e
    // conhecido, so precisa abrir ela.
    if (chatAlvo.conversaId) {
      recarregarConversas().then(() => {
        setConversaAtivaId(chatAlvo.conversaId);
        onChatAlvoConsumido?.();
      });
      return;
    }

    if (!chatAlvo.id) {
      const conversa = getOrCreateConversaLocal(usuarioLogado, chatAlvo);
      recarregarConversas().then(() => {
        setConversaAtivaId(conversa.id);
        onChatAlvoConsumido?.();
      });
      return;
    }

    if (!usuarioLogado.id) return;

    getOrCreateConversaApi(usuarioLogado.id, chatAlvo.id).then((conversa) => {
      recarregarConversas().then(() => {
        setConversaAtivaId(conversa.id);
        onChatAlvoConsumido?.();
      });
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

  // Marca a conversa como lida no backend assim que ela e aberta (conversas
  // com bot sao locais e nao tem conceito de "lida" no servidor).
  useEffect(() => {
    if (!conversaAtivaId || isBotConversaId(conversaAtivaId) || !usuarioLogado?.id) return;
    markConversaAsRead(conversaAtivaId, usuarioLogado.id).catch(() => {
      // backend indisponivel; sem problema, so afeta o contador de notificacao
    });
  }, [conversaAtivaId, usuarioLogado?.id]);

  // Envia a mensagem (texto e/ou imagem) da conversa ativa e limpa o formulario
  async function enviar() {
    if (!conversaAtiva || !usuarioLogado || (!texto.trim() && !imagemSelecionada)) return;

    if (isBotConversaId(conversaAtiva.id)) {
      const enviada = await enviarMensagemLocal(conversaAtiva.id, meuHandle, texto, imagemSelecionada);
      if (!enviada) return;
      await recarregarConversas();
      setTexto("");
      setImagemSelecionada("");
      setEmojiAberto(false);
      return;
    }

    if (!usuarioLogado.id) return;

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
        contactRequests={contactRequests}
        onAcceptContact={onAcceptContact}
        onDeclineContact={onDeclineContact}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={onOpenUnreadConversa}
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
                  <span className="chat-list-item-preview">
                    {!ultimaMsg ? (
                      "Diga oi!"
                    ) : ultimaMsg.texto ? (
                      ultimaMsg.texto
                    ) : ultimaMsg.imagem || ultimaMsg.imagemId ? (
                      <>
                        <CameraIcon size={14} /> Imagem
                      </>
                    ) : (
                      ""
                    )}
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
                    <CameraIcon size={19} />
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
