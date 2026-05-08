import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { useImageEditorPreview } from "../hooks/useImageEditorPreview";
import "../style/home.css";

export default function PostModal({ open, onClose, usuario, onPostSaved }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const {
    preview,
    draftPreview,
    isEditingImage,
    editPos,
    zoom,
    handleFileChange,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setEditPos,
    setZoom,
    imageStyle,
    saveImageEdit,
    cancelImageEdit,
    removeImage,
    reset,
  } = useImageEditorPreview(null);

  const clearForm = useCallback(() => {
    setTexto("");
    reset();
    setErro("");
  }, [reset]);

  const handleClose = useCallback(() => {
    clearForm();
    onClose();
  }, [clearForm, onClose]);

  // Fechar modal com ESC
  useOverlayClose(open, handleClose);

  function handleSubmit() {
    if (!texto.trim() && !preview) {
      setErro("Escreva algo ou adicione uma imagem para postar.");
      return;
    }

    const novoPost = {
      id: Date.now(),
      username: usuario?.username || "Usuário",
      handle: (usuario?.handle || usuario?.username || "").replace(/\s+/g, "").toLowerCase(),
      email: usuario?.email || "",
      fotoPerfil: usuario?.fotoPerfil || "",
      texto: texto.trim(),
      imagem: preview || "",
      criadoEm: new Date().toISOString(),
      comments: 0,
      commentsList: [],
      isSeedFake: false,
      shares: 0,
      likes: 0,
      bookmarks: 0,
      downloads: 0,
    };

    // Validação: garantir que pelo menos um campo de identificação existe
    if (!novoPost.email && !novoPost.username && !novoPost.handle) {
      setErro("Erro: Dados do usuário incompletos.");
      return;
    }

    clearForm();
    onPostSaved(novoPost);
  }

  if (!open) return null;

  return createPortal(
    <div className="overlay">
      <div className="popup post-popup" onClick={(e) => e.stopPropagation()}>
        <button 
          className="close-btn" 
          onClick={handleClose}
          type="button"
          title="Fechar"
        >
          ✕
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
            <span>{usuario?.username || "Usuário"}</span>
            <small>@{usuario?.username || "usuario"}</small>
          </div>
        </div>

        <textarea
          className="post-textarea"
          placeholder="O que está acontecendo?"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        {isEditingImage && draftPreview && (
          <>
            <div
              className="post-image-preview"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={draftPreview}
                alt="Prévia do post"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                draggable={false}
                style={imageStyle}
              />
            </div>
            <div className="post-image-adjuster">
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
            </div>
            <div className="post-image-edit-actions">
              <button type="button" onClick={saveImageEdit}>Salvar imagem</button>
              <button type="button" onClick={cancelImageEdit}>Cancelar</button>
            </div>
          </>
        )}

        {!isEditingImage && preview && (
          <div className="post-image-preview">
            <img src={preview} alt="Previa do post" />
            <button className="post-image-remove" type="button" onClick={removeImage} title="Remover imagem">
              x
            </button>
          </div>
        )}

        <label className="post-file-label">
          <span>{preview ? "Trocar imagem" : "Adicionar imagem"}</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <div className="post-toolbar">
          <button type="button">📎</button>
          <button type="button">😊</button>
          <button type="button">☰</button>
          <button type="button">📷</button>
          <button type="button">🚩</button>
          <button type="button">⛶</button>
        </div>

        {erro && <p className="post-error">{erro}</p>}

        <div className="popup-btns">
          <button onClick={handleSubmit} disabled={isEditingImage}>Postar</button>
          <button onClick={handleClose}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
