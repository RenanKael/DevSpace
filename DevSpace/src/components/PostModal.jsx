import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { usePostImageEditor } from "../hooks/usePostImageEditor";
import "../style/home.css";

export default function PostModal({ open, onClose, usuario, onPostSaved }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
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

  const clearForm = useCallback(() => {
    setTexto("");
    resetImage();
    setErro("");
  }, [resetImage]);

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

  function handleSubmit() {
    if (!texto.trim() && !image) {
      setErro("Escreva algo ou adicione uma imagem para postar.");
      return;
    }

    const currentUser = getCurrentUser();

    const novoPost = {
      id: Date.now(),
      username: currentUser?.username || "Usuario",
      handle: (currentUser?.handle || currentUser?.username || "usuario").replace(/\s+/g, "").toLowerCase(),
      email: currentUser?.email || "",
      fotoPerfil: currentUser?.fotoPerfil || "",
      texto: texto.trim(),
      imagem: image || "",
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

    const saved = onPostSaved(novoPost);
    if (saved === false) {
      setErro("Nao foi possivel salvar o post. Tente remover a imagem ou usar uma imagem menor.");
      return;
    }

    clearForm();
  }

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay">
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
            className="post-textarea"
            placeholder="O que esta acontecendo?"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={handlePaste}
          />

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

          <div className="post-toolbar">
            <button type="button">📎</button>
            <button type="button">😊</button>
            <button type="button">☰</button>
            <button type="button">📷</button>
            <button type="button">🚩</button>
            <button type="button">⏶</button>
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
