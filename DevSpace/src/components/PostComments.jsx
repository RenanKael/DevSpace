import { useRef, useState } from "react";

export default function PostComments({
  postId,
  isExpanded,
  comments,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  usuario,
  onOpenUserProfile,
  onRequireAuth,
}) {
  const [novoComentario, setNovoComentario] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [image, setImage] = useState(null);
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);
  const storedUser =
    usuario ||
    JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
    JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");

  const usuarioEmail = (storedUser?.email || "").toLowerCase();
  const usuarioHandle = (storedUser?.handle || storedUser?.username || "").replace(/\s+/g, "").toLowerCase();
  const usuarioNome = (storedUser?.username || "").toLowerCase();

  const normalizeCommentKey = (value) => String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
  const usuarioKeys = [usuarioEmail, usuarioHandle, usuarioNome].filter(Boolean).map(normalizeCommentKey);

  const isOwnComment = (comment) => {
    const commentEmail = (comment?.email || "").toLowerCase();
    const commentHandle = normalizeCommentKey(comment?.handle || comment?.username || "");
    const commentName = (comment?.username || "").toLowerCase();

    return (
      (usuarioEmail && commentEmail === usuarioEmail) ||
      (usuarioHandle && commentHandle === usuarioHandle) ||
      (usuarioNome && commentName === usuarioNome)
    );
  };

  const isCommentLiked = (comment) => {
    const likedBy = Array.isArray(comment?.likedBy)
      ? comment.likedBy.map(normalizeCommentKey)
      : [];
    return usuarioKeys.some((key) => likedBy.includes(key));
  };

  const renderCommentText = (text) => {
    const parts = String(text || "").split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) =>
      part.startsWith("@") ? (
        <span key={index} className="comment-mention">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleSubmit = (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (e?.stopPropagation) {
      e.stopPropagation();
    }

    const texto = novoComentario.trim();
    if (!texto && !image) return;
    const saved = onAddComment(postId, texto, replyTo?.id, image);
    if (saved === false) {
      setErro("Não foi possível salvar o comentário. Tente novamente.");
      return;
    }

    setErro("");
    setNovoComentario("");
    setReplyTo(null);
    setImage(null);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleReply = (comment) => {
    const handle = (comment?.handle || comment?.username || "")
      .replace(/^@+/, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (!handle) return;

    const mention = `@${handle}`;
    setReplyTo({ id: comment.id, username: comment.username, handle });
    setNovoComentario((current) => {
      const text = current.trimStart();
      if (text === mention || text.startsWith(`${mention} `)) {
        return `${mention} `;
      }
      return `${mention} ${text}`.trimEnd() + " ";
    });

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      const length = inputRef.current?.value.length || 0;
      inputRef.current?.setSelectionRange(length, length);
    });
  };

  const handlePaste = (event) => {
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            setImage(loadEvent.target.result);
          };
          reader.readAsDataURL(file);
          event.preventDefault();
          return;
        }
      }
    }
  };

  const repliesByParent = comments.reduce((map, comment) => {
    if (!comment.parentId) return map;
    const parentKey = String(comment.parentId);
    const parent = map.get(parentKey) || [];
    parent.push(comment);
    map.set(parentKey, parent);
    return map;
  }, new Map());

  const topLevelComments = comments.filter((comment) => !comment.parentId);

  const renderComment = (comment, isReply = false) => {
    const replies = repliesByParent.get(String(comment.id)) || [];
    return (
      <div key={comment.id} className={`post-comment ${isReply ? "comment-reply" : ""}`}>
        <div className="comment-row">
          <div
            className="comment-avatar"
            style={{
              backgroundImage: comment.fotoPerfil ? `url(${comment.fotoPerfil})` : "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenUserProfile?.(comment);
            }}
          />
          <div className="comment-content">
            <div className="comment-header">
              <strong
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUserProfile?.(comment);
                }}
                style={{ cursor: "pointer" }}
              >
                {comment.username}
              </strong>
              <small>@{comment.handle}</small>
            </div>
            <p className="comment-text">{renderCommentText(comment.texto)}</p>
            {comment.imagem && (
              <div className="comment-image-view">
                <img src={comment.imagem} alt="Imagem do comentário" />
              </div>
            )}
            <div className="comment-actions">
              <small className="comment-time">
                {new Date(comment.criadoEm).toLocaleDateString("pt-BR")}
              </small>
              <button
                type="button"
                className={`comment-like-btn ${isCommentLiked(comment) ? "liked" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!storedUser) {
                    onRequireAuth?.("Entre para curtir comentários.");
                    return;
                  }
                  onToggleCommentLike?.(postId, comment.id);
                }}
              >
                ❤️ {Number(comment.likes || 0)}
              </button>
              {storedUser && (
                <button
                  type="button"
                  className="comment-reply-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReply(comment);
                  }}
                >
                  Responder
                </button>
              )}
            </div>
          </div>
          {isOwnComment(comment) && (
            <button
              type="button"
              className="comment-delete-btn"
              title="Excluir comentário"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteComment?.(postId, comment.id);
              }}
            >
              ×
            </button>
          )}
        </div>
        {replies.length > 0 && (
          <div className="comment-replies-list">
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`post-comments-section ${isExpanded ? "expanded" : ""}`}
      data-post-id={postId}
      onClick={(e) => e.stopPropagation()}
    >
      {isExpanded && (
        <div className="post-comments-container">
          <div className="post-comments-list">
            {comments.length === 0 && (
              <p className="post-comments-empty">Sem comentários ainda.</p>
            )}

            {topLevelComments.map((comment) => renderComment(comment))}
          </div>

          {replyTo && (
            <div className="comment-replying-label">
              Respondendo a <strong>@{replyTo.handle}</strong>
              <button
                type="button"
                className="reply-cancel-btn"
                onClick={() => setReplyTo(null)}
              >
                cancelar
              </button>
            </div>
          )}

          {image && (
            <div className="comment-image-preview">
              <img src={image} alt="Prévia do comentário" />
              <button type="button" className="comment-image-remove" onClick={() => setImage(null)}>
                ×
              </button>
            </div>
          )}
          <form
            className="comment-form"
            onSubmit={handleSubmit}
            onClickCapture={(e) => {
              if (!storedUser) {
                e.preventDefault();
                e.stopPropagation();
                onRequireAuth?.("Entre para comentar.");
              }
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              placeholder="Escreva um comentário"
              disabled={!storedUser}
            />
            <button type="submit" disabled={!storedUser || (!novoComentario.trim() && !image)}>
              Comentar
            </button>
          </form>
          {erro && <p className="post-error">{erro}</p>}
        </div>
      )}
    </div>
  );
}
