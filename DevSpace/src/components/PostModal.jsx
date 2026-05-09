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

  function handleSubmit() {
    if (!texto.trim() && !image) {
      setErro("Escreva algo ou adicione uma imagem para postar.");
      return;
    }

    const novoPost = {
      id: Date.now(),
      username: usuario?.username || "Usuario",
      handle: (usuario?.handle || usuario?.username || "").replace(/\s+/g, "").toLowerCase(),
      email: usuario?.email || "",
      fotoPerfil: usuario?.fotoPerfil || "",
      texto: texto.trim(),
      imagem: image || "",
      criadoEm: new Date().toISOString(),
      comments: 0,
      commentsList: [],
      isSeedFake: false,
      shares: 0,
      likes: 0,
      bookmarks: 0,
      downloads: 0,
      likedBy: [],
      savedBy: [],
      repostedBy: [],
      downloadedBy: [],
    };

    if (!novoPost.email && !novoPost.username && !novoPost.handle) {
      setErro("Erro: Dados do usuario incompletos.");
      return;
    }

    onPostSaved(novoPost);
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
          />

          {image && (
            <div className="post-image-preview">
              <img src={image} alt="Previa do post" />
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

            <div className="post-editor-preview-box">
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
