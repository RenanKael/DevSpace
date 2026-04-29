import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "../style/home.css";

export default function PostModal({ open, onClose, usuario, onPostSaved }) {
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) {
      setTexto("");
      setPreview(null);
      setErro("");
    }
  }, [open]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!texto.trim() && !preview) {
      setErro("Escreva algo ou adicione uma imagem para postar.");
      return;
    }

    const novoPost = {
      id: Date.now(),
      username: usuario?.username || "Usuário",
      handle: usuario?.handle || usuario?.username?.replace(/\s+/g, "").toLowerCase() || "",
      email: usuario?.email || "",
      fotoPerfil: usuario?.fotoPerfil || "",
      texto: texto.trim(),
      imagem: preview,
      criadoEm: new Date().toISOString(),
    };

    onPostSaved(novoPost);
  }

  if (!open) return null;

  return createPortal(
    <div className="overlay">
      <div className="popup post-popup">
        <button className="close-btn" onClick={onClose}>✕</button>

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

        {preview && (
          <div className="post-image-preview">
            <img src={preview} alt="Prévia do post" />
          </div>
        )}

        <label className="post-file-label">
          <span>Adicionar imagem</span>
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
          <button onClick={handleSubmit}>Postar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
