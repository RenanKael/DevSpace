import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { usePostImageEditor } from "../hooks/usePostImageEditor";
import { TAG_OPTIONS, slugifyHashtag } from "../utils/postTags";
import "../style/home.css";
import { createPost, uploadFile } from "../api";
import { avatarInitial, avatarStyle } from "../utils/avatar";
import { languageLabel, wrapCodeFence } from "../utils/codeBlock";
import { DsIcon } from "./icons";
import { Icons } from "./iconKit";

const CODE_LANGS = ["javascript", "typescript", "python", "csharp", "go", "rust", "java", "sql", "html", "css", "bash"];

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
const MAX_ANEXO_BYTES = 12 * 1024 * 1024;
const ALLOWED_ANEXO_EXT = new Set([
  "pdf", "doc", "docx", "txt", "zip", "rar", "ppt", "pptx", "xls", "xlsx", "csv",
  "png", "jpg", "jpeg", "gif", "webp",
]);

function mimeFromName(name = "") {
  const ext = String(name).split(".").pop()?.toLowerCase() || "";
  const map = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    rar: "application/vnd.rar",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext] || "";
}

function isAllowedAnexo(name, tipo) {
  const ext = String(name).split(".").pop()?.toLowerCase() || "";
  return ALLOWED_ANEXO_EXT.has(ext) || String(tipo || "").startsWith("image/") || String(tipo || "") === "application/pdf";
}

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
  const [publicando, setPublicando] = useState(false);
  const [codigoLang, setCodigoLang] = useState("javascript");
  const [codigoTexto, setCodigoTexto] = useState("");
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
    setAnexo((atual) => {
      if (atual?.previewUrl) URL.revokeObjectURL(atual.previewUrl);
      return null;
    });
    setEnqueteOpcoes(["", ""]);
    setTagSelecionada("");
    setTagCustomTexto("");
    setAgendarData("");
    setCodigoLang("javascript");
    setCodigoTexto("");
  }, [resetImage]);

  function handleEscolherEmoji(emoji) {
    setTexto((valor) => valor + emoji);
    setPainelAberto(null);
  }

  function handleAnexoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_ANEXO_BYTES) {
      setErro("O arquivo pode ter no máximo 12 MB.");
      return;
    }

    const tipo = file.type || mimeFromName(file.name);
    if (!isAllowedAnexo(file.name, tipo)) {
      setErro("Use PDF, documento, planilha, zip ou imagem.");
      return;
    }

    setAnexo((atual) => {
      if (atual?.previewUrl) URL.revokeObjectURL(atual.previewUrl);
      return {
        nome: file.name,
        tipo,
        tamanho: file.size,
        file,
        url: "",
        previewUrl: String(tipo).startsWith("image/") ? URL.createObjectURL(file) : "",
      };
    });
    setErro("");
  }

  function removerAnexo() {
    setAnexo((atual) => {
      if (atual?.previewUrl) URL.revokeObjectURL(atual.previewUrl);
      return null;
    });
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
  useOverlayClose(isEditorOpen, closeEditor);

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
      setErro("Adicione pelo menos 2 opções para a enquete.");
      return;
    }

    if (agendarData && new Date(agendarData).getTime() <= Date.now()) {
      setErro("Escolha uma data e hora futura para agendar o post.");
      return;
    }

    const temEnquete = enqueteEmUso && opcoesValidas.length >= 2;

    const codigoLimpo = codigoTexto.trim();
    const textoFinal = [texto.trim(), codigoLimpo ? wrapCodeFence(codigoLang, codigoLimpo) : ""]
      .filter(Boolean)
      .join("\n\n");

    if (!textoFinal && !image && !anexo && !temEnquete) {
      setErro("Escreva algo, adicione código, uma imagem, um anexo ou uma enquete para postar.");
      return;
    }

    const currentUser = getCurrentUser();

    if (publicando) return;
    setPublicando(true);
    try {
      let anexoPayload = null;
      if (anexo?.file) {
        anexoPayload = await uploadFile(anexo.file);
      } else if (anexo?.url) {
        anexoPayload = {
          url: anexo.url,
          tipo: anexo.tipo || mimeFromName(anexo.nome),
          nome: anexo.nome || "arquivo",
          tamanho: anexo.tamanho || null,
        };
      }

      const novoPost = {
        username: currentUser?.username || "Usuário",
        handle: (currentUser?.handle || currentUser?.username || "usuario").replace(/\s+/g, "").toLowerCase(),
        email: currentUser?.email || "",
        fotoPerfil: currentUser?.fotoPerfil || "",
        texto: textoFinal,
        imagem: image || "",
        anexo: anexoPayload,
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
        setErro("Erro: dados do usuário incompletos.");
        return;
      }

      const createdPost = await createPost(novoPost);
      const saved = onPostSaved(createdPost);
      if (saved === false) {
        setErro("Não foi possível salvar o post localmente. Tente remover a imagem ou usar uma imagem menor.");
        return;
      }
      clearForm();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao publicar. Tente novamente mais tarde.");
    } finally {
      setPublicando(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay post-modal-overlay" onClick={handleClose}>
        <div className="popup post-popup" onClick={(e) => e.stopPropagation()}>
          <button
            className="close-btn"
            onClick={handleClose}
            type="button"
            title="Fechar"
          >
            <DsIcon icon={Icons.X} size="action" />
          </button>

          <div className="post-modal-header">
            <div
              className="post-modal-avatar"
              style={
                usuario?.fotoPerfil && usuario?.posPerfil
                  ? {
                      backgroundImage: `url("${usuario.fotoPerfil}")`,
                      backgroundSize: "cover",
                      backgroundPosition: `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%`,
                    }
                  : avatarStyle(usuario?.fotoPerfil, usuario?.handle || usuario?.username)
              }
            >
              {!usuario?.fotoPerfil && avatarInitial(usuario?.username || usuario?.handle)}
            </div>

            <div className="post-modal-user">
              <span>{usuario?.username || "Usuário"}</span>
              <small>@{usuario?.handle || usuario?.username || "usuário"}</small>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="post-textarea"
            placeholder="Compartilhe uma ideia, dúvida, código ou projeto..."
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
                <img src={image} alt="Prévia do post" />
              </div>
              <button className="post-image-remove" type="button" onClick={removeImage} title="Remover imagem">
                ×
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
            accept=".pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx,.csv,application/pdf,image/*"
            onChange={handleAnexoChange}
          />

          {anexo && (
            <div className="post-anexo-preview">
              {anexo.tipo?.startsWith("image/") && (anexo.previewUrl || anexo.url) ? (
                <img src={anexo.previewUrl || anexo.url} alt={anexo.nome} />
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
                ×
              </button>
            </div>
          )}

          {painelAberto === "enquete" && (
            <div className="post-poll-panel">
              {enqueteOpcoes.map((opcao, index) => (
                <div key={index} className="post-poll-opcao-row">
                  <input
                    type="text"
                    placeholder={`Opção ${index + 1}`}
                    value={opcao}
                    maxLength={40}
                    onChange={(e) => atualizarOpcaoEnquete(index, e.target.value)}
                  />
                  {enqueteOpcoes.length > 2 && (
                    <button
                      type="button"
                      className="post-poll-remover"
                      onClick={() => removerOpcaoEnquete(index)}
                      title="Remover opção"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {enqueteOpcoes.length < 4 && (
                <button type="button" className="post-poll-add" onClick={adicionarOpcaoEnquete}>
                  + Adicionar opção
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
                  placeholder="Criar minha própria tag"
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

          {painelAberto === "codigo" && (
            <div className="post-code-panel">
              <label htmlFor="post-code-lang">Linguagem</label>
              <select
                id="post-code-lang"
                value={codigoLang}
                onChange={(e) => setCodigoLang(e.target.value)}
              >
                {CODE_LANGS.map((lang) => (
                  <option key={lang} value={lang}>{languageLabel(lang)}</option>
                ))}
              </select>
              <label htmlFor="post-code-text">Código</label>
              <textarea
                id="post-code-text"
                placeholder="Cole o trecho de código aqui..."
                value={codigoTexto}
                rows={8}
                onChange={(e) => setCodigoTexto(e.target.value)}
              />
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
              aria-label="Anexar arquivo"
              onClick={() => anexoInputRef.current?.click()}
            >
              <DsIcon icon={Icons.Paperclip} size="action" />
            </button>

            <div className="post-emoji-wrapper">
              <button
                type="button"
                className={painelAberto === "emoji" ? "active" : ""}
                title="Emoji"
                onClick={() => togglePainel("emoji")}
              >
                <DsIcon icon={Icons.Smile} size="action" />
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
              className={painelAberto === "codigo" || codigoTexto.trim() ? "active" : ""}
              title="Adicionar código"
              aria-label="Adicionar código"
              onClick={() => togglePainel("codigo")}
            >
              <DsIcon icon={Icons.Code2} size="action" />
            </button>
            <button
              type="button"
              className={painelAberto === "enquete" ? "active" : ""}
              title="Criar enquete"
              aria-label="Criar enquete"
              onClick={() => togglePainel("enquete")}
            >
              <DsIcon icon={Icons.List} size="action" />
            </button>
            <button
              type="button"
              className={painelAberto === "tag" ? "active" : ""}
              title="Marcar assunto"
              aria-label="Marcar assunto"
              onClick={() => togglePainel("tag")}
            >
              <DsIcon icon={Icons.Hash} size="action" />
            </button>
            <button
              type="button"
              className={painelAberto === "agendar" ? "active" : ""}
              title="Agendar publicação"
              aria-label="Agendar publicação"
              onClick={() => togglePainel("agendar")}
            >
              <DsIcon icon={Icons.Calendar} size="action" />
            </button>
          </div>

          {erro && <p className="post-error">{erro}</p>}

          <div className="popup-btns">
            <button type="button" onClick={handleSubmit} disabled={publicando}>
              {publicando ? "Publicando..." : "Postar"}
            </button>
            <button type="button" onClick={handleClose} disabled={publicando}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <div
          className="overlay post-image-editor-overlay"
          onClick={closeEditor}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchMove={moveDrag}
          onTouchEnd={endDrag}
        >
          <div className="popup post-image-editor-popup" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-btn" onClick={closeEditor} title="Fechar" aria-label="Fechar">
              ×
            </button>
            <h2>Editar Imagem</h2>

            <div className="post-modal-header editor-header">
              <div
                className="post-modal-avatar"
                style={{
                  backgroundImage: usuario?.fotoPerfil ? `url("${usuario.fotoPerfil}")` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: usuario?.posPerfil
                    ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%`
                    : "center",
                }}
              />

              <div className="post-modal-user">
                <span>{usuario?.username || "Usuário"}</span>
                <small>@{usuario?.handle || usuario?.username || "usuário"}</small>
              </div>
            </div>

            <textarea
              className="post-textarea post-editor-textarea"
              placeholder="Adicione uma descrição para o post"
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
