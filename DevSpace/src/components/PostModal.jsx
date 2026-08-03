import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { usePostImageEditor } from "../hooks/usePostImageEditor";
import { TAG_OPTIONS, slugifyHashtag } from "../utils/postTags";
import "../style/home.css";
import { createPost } from "../api";

const EMOJIS = [
  "😀", "😂", "😍", "😎", "🥳", "😅", "😭", "😡", "😮", "🤔",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🔥", "🎉", "❤️",
  "💔", "⭐", "✅", "❌", "😴", "🤯", "😱", "🥺", "😉", "🙌",
];

function formatarTamanho(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LIMITE_PALAVRAS = 300;

function contarPalavras(texto) {
  const limpo = texto.trim();
  return limpo ? limpo.split(/\s+/).length : 0;
}

export default function PostModal({ open, onClose, usuario, onPostSaved }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [painelAberto, setPainelAberto] = useState(null); // null | "emoji" | "enquete" | "tag" | "agendar"
  const [anexo, setAnexo] = useState(null);
  const [enqueteOpcoes, setEnqueteOpcoes] = useState(["", ""]);
  const [tagSelecionada, setTagSelecionada] = useState("");
  const [tagCustomTexto, setTagCustomTexto] = useState("");
  const [agendarData, setAgendarData] = useState("");
  const anexoInputRef = useRef(null);
  const textareaRef = useRef(null);

  function togglePainel(nome) {
    setPainelAberto((atual) => (atual === nome ? null : nome));
  }

  function autoResizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }

  const {
    image,
    setImage,
    editingImage,
    isEditorOpen,
    editPos,
    zoom,
    imageStyle,
    openImageEditor,
    beginDrag,
    moveDrag,
    endDrag,
    setEditPos,
    setZoom,
    saveImage,
    closeEditor,
    removeImage,
    resetImage,
  } = usePostImageEditor();

  useEffect(() => {
    autoResizeTextarea();
  }, [texto, image, anexo]);

  const clearForm = useCallback(() => {
    setTexto("");
    resetImage();
    setErro("");
    setPainelAberto(null);
    setAnexo(null);
    setEnqueteOpcoes(["", ""]);
    setTagSelecionada("");
    setTagCustomTexto("");
    setAgendarData("");
  }, [resetImage]);

  function handleEscolherEmoji(emoji) {
    setTexto((valor) => valor + emoji);
    setPainelAberto(null);
  }

  function handleAnexoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setErro("");
      setAnexo({ nome: file.name, tipo: file.type, url: ev.target.result, tamanho: file.size });
    };
    reader.readAsDataURL(file);
  }

  function removerAnexo() {
    setAnexo(null);
  }

  function confirmarTagCustom() {
    const slug = slugifyHashtag(tagCustomTexto);
    if (!slug) return;
    setTagSelecionada(slug);
    setTagCustomTexto("");
  }

  function atualizarOpcaoEnquete(index, value) {
    setEnqueteOpcoes((prev) => prev.map((op, i) => (i === index ? value : op)));
  }

  function adicionarOpcaoEnquete() {
    setEnqueteOpcoes((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  }

  function removerOpcaoEnquete(index) {
    setEnqueteOpcoes((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  const handleClose = useCallback(() => {
    clearForm();
    onClose();
  }, [clearForm, onClose]);

  useOverlayClose(open && !isEditorOpen, handleClose);

  const handlePaste = (event) => {
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            setErro("");
            setImage(loadEvent.target.result);
          };
          reader.readAsDataURL(file);
          event.preventDefault();
          return;
        }
      }
    }
  };

  function getCurrentUser() {
    try {
      return (
        usuario ||
        JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
        JSON.parse(sessionStorage.getItem("usuarioLogado") || "null")
      );
    } catch {
      return usuario || null;
    }
  }

  async function handleSubmit() {
    const enqueteEmUso = enqueteOpcoes.some((opcao) => opcao.trim());
    const opcoesValidas = enqueteEmUso
      ? enqueteOpcoes.map((opcao) => opcao.trim()).filter(Boolean)
      : [];

    if (enqueteEmUso && opcoesValidas.length < 2) {
      setErro("Adicione pelo menos 2 opcoes para a enquete.");
      return;
    }

    if (agendarData && new Date(agendarData).getTime() <= Date.now()) {
      setErro("Escolha uma data e hora futura para agendar o post.");
      return;
    }

    const temEnquete = enqueteEmUso && opcoesValidas.length >= 2;

    if (!texto.trim() && !image && !anexo && !temEnquete) {
      setErro("Escreva algo, adicione uma imagem, um anexo ou uma enquete para postar.");
      return;
    }

    const currentUser = getCurrentUser();

    const novoPost = {
      username: currentUser?.username || "Usuario",
      handle: (currentUser?.handle || currentUser?.username || "usuario").replace(/\s+/g, "").toLowerCase(),
      email: currentUser?.email || "",
      fotoPerfil: currentUser?.fotoPerfil || "",
      texto: texto.trim(),
      imagem: image || "",
      anexo: anexo || null,
      poll: temEnquete ? { options: opcoesValidas, optionVoters: opcoesValidas.map(() => []) } : null,
      tag: tagSelecionada || "",
      agendadoPara: agendarData ? new Date(agendarData).toISOString() : "",
      criadoEm: new Date().toISOString(),
      comments: 0,
      commentsList: [],
      isSeedFake: false,
      shares: 0,
      likes: 0,
      bookmarks: 0,
      likedBy: [],
      savedBy: [],
      repostedBy: [],
    };

    if (!novoPost.email && !novoPost.username && !novoPost.handle) {
      setErro("Erro: Dados do usuario incompletos.");
      return;
    }

    try {
      const createdPost = await createPost(novoPost);
      const saved = onPostSaved(createdPost);
      if (saved === false) {
        setErro("Nao foi possivel salvar o post localmente. Tente remover a imagem ou usar uma imagem menor.");
        return;
      }
      clearForm();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao publicar. Tente novamente mais tarde.");
    }
  }

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay post-modal-overlay">
        <div className="popup post-popup" onClick={(e) => e.stopPropagation()}>
          <button
            className="close-btn"
            onClick={handleClose}
            type="button"
            title="Fechar"
          >
            x
          </button>

          <div className="post-modal-header">
            <div
              className="post-modal-avatar"
              style={{
                backgroundImage: usuario?.fotoPerfil ? `url(${usuario.fotoPerfil})` : "none",
                backgroundSize: "cover",
                backgroundPosition: usuario?.posPerfil
                  ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%`
                  : "center",
              }}
            />

            <div className="post-modal-user">
              <span>{usuario?.username || "Usuario"}</span>
              <small>@{usuario?.username || "usuario"}</small>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="post-textarea"
            placeholder="O que esta acontecendo?"
            value={texto}
            rows={1}
            onChange={(e) => {
              const novoValor = e.target.value;
              if (contarPalavras(novoValor) > LIMITE_PALAVRAS) return;
              setTexto(novoValor);
            }}
            onPaste={handlePaste}
          />

          <small className={`post-word-count${contarPalavras(texto) >= LIMITE_PALAVRAS ? " limite" : ""}`}>
            {contarPalavras(texto)} / {LIMITE_PALAVRAS} palavras
          </small>

          {image && (
            <div className="post-card-window post-compose-window">
              <div className="post-card-window-top">
                <span className="window-dot red" />
                <span className="window-dot yellow" />
                <span className="window-dot green" />
              </div>
              <div className="post-card-window-body">
                <img src={image} alt="Previa do post" />
              </div>
              <button className="post-image-remove" type="button" onClick={removeImage} title="Remover imagem">
                x
              </button>
            </div>
          )}

          <label className="post-file-label">
            <span>{image ? "Trocar imagem" : "Adicionar imagem"}</span>
            <input type="file" accept="image/*" onChange={openImageEditor} />
          </label>

          <input
            type="file"
            ref={anexoInputRef}
            hidden
            onChange={handleAnexoChange}
          />

          {anexo && (
            <div className="post-anexo-preview">
              {anexo.tipo.startsWith("image/") ? (
                <img src={anexo.url} alt={anexo.nome} />
              ) : (
                <div className="post-anexo-file">
                  <span className="post-anexo-file-icon">📄</span>
                  <div className="post-anexo-file-info">
                    <strong>{anexo.nome}</strong>
                    <small>{formatarTamanho(anexo.tamanho)}</small>
                  </div>
                </div>
              )}
              <button type="button" className="post-anexo-remove" onClick={removerAnexo} title="Remover anexo">
                x
              </button>
            </div>
          )}

          {painelAberto === "enquete" && (
            <div className="post-poll-panel">
              {enqueteOpcoes.map((opcao, index) => (
                <div key={index} className="post-poll-opcao-row">
                  <input
                    type="text"
                    placeholder={`Opcao ${index + 1}`}
                    value={opcao}
                    maxLength={40}
                    onChange={(e) => atualizarOpcaoEnquete(index, e.target.value)}
                  />
                  {enqueteOpcoes.length > 2 && (
                    <button
                      type="button"
                      className="post-poll-remover"
                      onClick={() => removerOpcaoEnquete(index)}
                      title="Remover opcao"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              {enqueteOpcoes.length < 4 && (
                <button type="button" className="post-poll-add" onClick={adicionarOpcaoEnquete}>
                  + Adicionar opcao
                </button>
              )}
            </div>
          )}

          {painelAberto === "tag" && (
            <div className="post-tag-panel">
              <div className="post-tag-chips">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    title={tag.label}
                    className={tagSelecionada === tag.id ? "post-tag-chip active" : "post-tag-chip"}
                    onClick={() => setTagSelecionada((atual) => (atual === tag.id ? "" : tag.id))}
                  >
                    #{tag.hashtag}
                  </button>
                ))}
                {tagSelecionada && !TAG_OPTIONS.some((tag) => tag.id === tagSelecionada) && (
                  <button
                    type="button"
                    className="post-tag-chip active"
                    onClick={() => setTagSelecionada("")}
                  >
                    #{tagSelecionada}
                  </button>
                )}
              </div>
              <div className="post-tag-custom">
                <input
                  type="text"
                  placeholder="Criar minha propria tag"
                  value={tagCustomTexto}
                  onChange={(e) => setTagCustomTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmarTagCustom();
                    }
                  }}
                />
                <button type="button" onClick={confirmarTagCustom}>
                  Usar
                </button>
              </div>
            </div>
          )}

          {painelAberto === "agendar" && (
            <div className="post-schedule-panel">
              <label htmlFor="post-schedule-input">Publicar em:</label>
              <input
                id="post-schedule-input"
                type="datetime-local"
                value={agendarData}
                onChange={(e) => setAgendarData(e.target.value)}
              />
            </div>
          )}

          <div className="post-toolbar">
            <button
              type="button"
              className={anexo ? "active" : ""}
              title="Anexar arquivo"
              onClick={() => anexoInputRef.current?.click()}
            >
              📎
            </button>

            <div className="post-emoji-wrapper">
              <button
                type="button"
                className={painelAberto === "emoji" ? "active" : ""}
                title="Emoji"
                onClick={() => togglePainel("emoji")}
              >
                😊
              </button>

              {painelAberto === "emoji" && (
                <div className="post-emoji-picker">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="post-emoji-opcao"
                      onClick={() => handleEscolherEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={painelAberto === "enquete" ? "active" : ""}
              title="Criar enquete"
              onClick={() => togglePainel("enquete")}
            >
              ☰
            </button>
            <button
              type="button"
              className={painelAberto === "tag" ? "active" : ""}
              title="Marcar assunto"
              onClick={() => togglePainel("tag")}
            >
              🚩
            </button>
            <button
              type="button"
              className={painelAberto === "agendar" ? "active" : ""}
              title="Agendar publicacao"
              onClick={() => togglePainel("agendar")}
            >
              ⏶
            </button>
          </div>

          {erro && <p className="post-error">{erro}</p>}

          <div className="popup-btns">
            <button onClick={handleSubmit}>Postar</button>
            <button onClick={handleClose}>Cancelar</button>
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <div
          className="overlay post-image-editor-overlay"
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchMove={moveDrag}
          onTouchEnd={endDrag}
        >
          <div className="popup post-image-editor-popup" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Imagem</h2>

            <div className="post-modal-header editor-header">
              <div
                className="post-modal-avatar"
                style={{
                  backgroundImage: usuario?.fotoPerfil ? `url(${usuario.fotoPerfil})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: usuario?.posPerfil
                    ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%`
                    : "center",
                }}
              />

              <div className="post-modal-user">
                <span>{usuario?.username || "Usuario"}</span>
                <small>@{usuario?.username || "usuario"}</small>
              </div>
            </div>

            <textarea
              className="post-textarea post-editor-textarea"
              placeholder="Adicione uma descricao para o post"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            <div className="post-card-window post-editor-window">
              <div className="post-card-window-top">
                <span className="window-dot red" />
                <span className="window-dot yellow" />
                <span className="window-dot green" />
              </div>
              <div className="post-card-window-body post-editor-preview-box">
                <img
                  src={editingImage}
                  alt="Editar imagem do post"
                  className="post-editor-preview-img"
                  onMouseDown={beginDrag}
                  onTouchStart={beginDrag}
                  draggable={false}
                  style={imageStyle}
                />
              </div>
            </div>

            <label>Horizontal</label>
            <input
              type="range"
              min="0"
              max="100"
              value={editPos.x}
              onChange={(e) => setEditPos({ ...editPos, x: Number(e.target.value) })}
            />

            <label>Vertical</label>
            <input
              type="range"
              min="0"
              max="100"
              value={editPos.y}
              onChange={(e) => setEditPos({ ...editPos, y: Number(e.target.value) })}
            />

            <label>Zoom</label>
            <input
              type="range"
              min="100"
              max="220"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />

            <div className="popup-btns">
              <button type="button" onClick={saveImage}>Salvar Imagem</button>
              <button type="button" onClick={closeEditor}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
