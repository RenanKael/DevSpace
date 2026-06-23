import { useRef, useState } from "react";

export default function PostComments({
  postId,
  isExpanded,
  comments,
  onAddComment,
  onDeleteComment,
  usuario,
  onOpenUserProfile,
}) {
  const [novoComentario, setNovoComentario] = useState("");
  const inputRef = useRef(null);
  const storedUser =
    usuario ||
    JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
    JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");

  const usuarioEmail = (storedUser?.email || "").toLowerCase();
  const usuarioHandle = (storedUser?.handle || storedUser?.username || "").replace(/\s+/g, "").toLowerCase();
  const usuarioNome = (storedUser?.username || "").toLowerCase();

  const isOwnComment = (comment) => {
    const commentEmail = (comment?.email || "").toLowerCase();
    const commentHandle = (comment?.handle || comment?.username || "").replace(/\s+/g, "").toLowerCase();
    const commentName = (comment?.username || "").toLowerCase();

    return (
      (usuarioEmail && commentEmail === usuarioEmail) ||
      (usuarioHandle && commentHandle === usuarioHandle) ||
      (usuarioNome && commentName === usuarioNome)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const texto = novoComentario.trim();
    if (!texto) return;
    onAddComment(postId, texto);
    setNovoComentario("");
  };

  const handleReply = (comment) => {
    const handle = (comment?.handle || comment?.username || "")
      .replace(/^@+/, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (!handle) return;

    const mention = `@${handle}`;
    setNovoComentario((current) => {
      const text = current.trimStart();
      if (text === mention || text.startsWith(`${mention} `)) return current;
      return `${mention} ${text}`.trimEnd();
    });

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      const length = inputRef.current?.value.length || 0;
      inputRef.current?.setSelectionRange(length, length);
    });
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
              <p className="post-comments-empty">Sem comentarios ainda.</p>
            )}

            {comments.map((comment) => (
              <div key={comment.id} className="post-comment">
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
                    <p className="comment-text">{comment.texto}</p>
                    <div className="comment-actions">
                      <small className="comment-time">
                        {new Date(comment.criadoEm).toLocaleDateString("pt-BR")}
                      </small>
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
                      title="Excluir comentario"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteComment?.(postId, comment.id);
                      }}
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form className="comment-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Escreva um comentario"
              disabled={!storedUser}
            />
            <button type="submit" disabled={!storedUser || !novoComentario.trim()}>
              Comentar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
