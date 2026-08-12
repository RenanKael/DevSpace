import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { DsIcon } from "../components/icons";
import { Icons } from "../components/iconKit";
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
  unreadConversas = [],
  onOpenUnreadConversa,
  activityNotifications,
  onOpenActivityNotification,
  onConversaVisualizada,
  irNotificacoes,
  irConfiguracoes,
  blockedUsers = [],
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
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [buscaConversas, setBuscaConversas] = useState("");
  const arquivoInputRef = useRef(null); // input file oculto, disparado pelo botao de imagem
  const textoInputRef = useRef(null); // usado para devolver o foco ao campo de texto
  const mensagensFimRef = useRef(null); // sentinela no fim da lista, usado para rolar ate a ultima mensagem
  const conversaAnteriorIdRef = useRef(null); // guarda o id da conversa anterior, para saber se houve troca de conversa
  const idsEmBuscaRef = useRef(new Set()); // evita buscar a mesma imagem de bot mais de uma vez em paralelo
  const [imagensCache, setImagensCache] = useState({}); // mapa imagemId -> dataURL ja carregado (so conversas com bot)

  const meuHandle = normalizeHandle(usuarioLogado?.handle || usuarioLogado?.username);
  useOverlayClose(emojiAberto, () => setEmojiAberto(false));
  const blockedHandles = new Set(blockedUsers.map((u) => (u.handle || "").toLowerCase()));

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

    const combinadas = [...reais, ...botConversas]
      .filter((c) => !c.participantes.some((p) => p.handle !== meuHandle && blockedHandles.has(p.handle)))
      .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
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

  // Sem websocket, entao "quase tempo real" e um polling curto: busca
  // mensagens novas a cada poucos segundos enquanto a tela de chat estiver
  // aberta (tanto a lista quanto a conversa ativa vem no mesmo fetch).
  useEffect(() => {
    if (!usuarioLogado?.id) return;
    const intervalo = window.setInterval(recarregarConversas, 3000);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogado?.id]);

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
  // com bot sao locais e nao tem conceito de "lida" no servidor). Uma
  // mensagem gera duas notificacoes distintas (badge de Mensagens + aviso
  // "mensagem" no sino) -- ler a conversa precisa consumir as duas.
  useEffect(() => {
    if (!conversaAtivaId || isBotConversaId(conversaAtivaId) || !usuarioLogado?.id) return;
    markConversaAsRead(conversaAtivaId, usuarioLogado.id).catch(() => {
      // backend indisponivel; sem problema, so afeta o contador de notificacao
    });
    onConversaVisualizada?.(conversaAtivaId, outroParticipante);
  }, [conversaAtivaId, usuarioLogado?.id, outroParticipante?.handle]);

  // Envia a mensagem (texto e/ou imagem) da conversa ativa e limpa o formulario
  async function enviar() {
    if (!conversaAtiva || !usuarioLogado || (!texto.trim() && !imagemSelecionada) || enviando) return;

    if (isBotConversaId(conversaAtiva.id)) {
      const enviada = await enviarMensagemLocal(conversaAtiva.id, meuHandle, texto, imagemSelecionada);
      if (!enviada) return;
      await recarregarConversas();
      setTexto("");
      setImagemSelecionada("");
      setEmojiAberto(false);
      setErroEnvio("");
      return;
    }

    if (!usuarioLogado.id) return;

    setEnviando(true);
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
      setErroEnvio("");
    } catch {
      setErroEnvio("Não foi possível enviar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  // Submit do formulario (clique no botao enviar)
  function handleEnviar(e) {
    e.preventDefault();
    enviar();
  }

  function handleFormKeyDown(e) {
    if (e.key !== "Enter" || e.shiftKey) return;
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

  const conversasFiltradas = conversas.filter((c) => {
    const q = buscaConversas.trim().toLowerCase();
    if (!q) return true;
    const outro = c.participantes.find((p) => p.handle !== meuHandle) || c.participantes[0];
    return (
      String(outro?.username || "").toLowerCase().includes(q) ||
      String(outro?.handle || "").toLowerCase().includes(q)
    );
  });

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
        activityNotifications={activityNotifications}
        onOpenActivityNotification={onOpenActivityNotification}
        irNotificacoes={irNotificacoes}
        irConfiguracoes={irConfiguracoes}
      />

      <div id="conteudo-principal" className={`chat-page${sidebarOpen ? "" : " sidebar-closed"}${conversaAtivaId ? " has-thread" : ""}`}>
        {/* Coluna esquerda: lista de conversas do usuario */}
        <div className="chat-list">
          <div className="chat-list-header">
            <span className="chat-kicker">Inbox</span>
            <h2>Mensagens</h2>
            <p className="chat-list-sub">Conversas com a comunidade DevSpace.</p>
            {conversas.length > 0 && (
              <input
                className="chat-search"
                type="search"
                placeholder="Buscar nome ou @"
                value={buscaConversas}
                onChange={(e) => setBuscaConversas(e.target.value)}
              />
            )}
          </div>

          {conversas.length === 0 && (
            <div className="chat-empty-card">
              <strong>Suas conversas aparecerão aqui</strong>
              <p>Explore perfis e inicie uma conversa.</p>
              <button type="button" className="chat-empty-cta" onClick={irExplorar}>
                Explorar perfis
              </button>
            </div>
          )}

          {conversas.length > 0 && conversasFiltradas.length === 0 && (
            <div className="chat-empty-card">
              <strong>Nenhuma conversa encontrada</strong>
              <p>Tente outro nome ou @.</p>
            </div>
          )}

          {conversasFiltradas.map((c) => {
            const outro = c.participantes.find((p) => p.handle !== meuHandle) || c.participantes[0];
            const ultimaMsg = c.mensagens[c.mensagens.length - 1];
            const naoLidas = unreadConversas.find((u) => u.conversaId === c.id)?.naoLidas || 0;
            return (
              <button
                key={c.id}
                type="button"
                className={`chat-list-item${c.id === conversaAtivaId ? " active" : ""}`}
                onClick={() => setConversaAtivaId(c.id)}
              >
                <div className="chat-avatar-wrap">
                  <div
                    className="chat-avatar"
                    style={{ backgroundImage: `url(${outro.fotoPerfil || fallbackAvatar(outro.handle)})` }}
                  />
                  {naoLidas > 0 && (
                    <span className="sidebar-notif-badge chat-avatar-badge">
                      {naoLidas > 99 ? "99+" : naoLidas}
                    </span>
                  )}
                </div>
                <div className="chat-list-item-info">
                  <strong>{outro.username}</strong>
                  <span className="chat-list-item-preview">
                    {!ultimaMsg ? (
                      "Diga oi!"
                    ) : ultimaMsg.texto ? (
                      ultimaMsg.texto
                    ) : ultimaMsg.imagem || ultimaMsg.imagemId ? (
                      <>
                        <DsIcon icon={Icons.Image} size="small" /> Imagem
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
              <div className="chat-empty-card chat-empty-card--center">
                <strong>Suas conversas aparecerão aqui</strong>
                <p>Escolha uma conversa ao lado ou visite um perfil para começar.</p>
                <button type="button" className="chat-empty-cta" onClick={irExplorar}>
                  Explorar perfis
                </button>
              </div>
            </div>
          )}

          {conversaAtiva && outroParticipante && (
            <>
              {/* Cabecalho com avatar/nome do outro participante; clicavel para abrir o perfil dele */}
              <div className="chat-thread-header">
                <button
                  type="button"
                  className="chat-thread-back"
                  onClick={() => setConversaAtivaId(null)}
                  title="Voltar"
                  aria-label="Voltar à lista de conversas"
                >
                  <DsIcon icon={Icons.ArrowLeft} size="action" />
                </button>
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
                    <DsIcon icon={Icons.Image} size="action" />
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

                  <textarea
                    ref={textoInputRef}
                    rows={1}
                    placeholder={`Mensagem para ${outroParticipante.username}`}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="chat-enviar-btn"
                    disabled={enviando || (!texto.trim() && !imagemSelecionada)}
                    aria-label="Enviar"
                    title="Enviar"
                  >
                    <DsIcon icon={Icons.Send} size="action" />
                  </button>
                </div>
                <p className="chat-composer-hint">Enter envia · Shift+Enter quebra linha</p>
                {erroEnvio && <p className="chat-erro-envio">{erroEnvio}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
