import { useState } from "react";

export default function PostComments({
  postId,
  isExpanded,
  comments,
  onAddComment,
  usuario,
}) {
  const [novoComentario, setNovoComentario] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = novoComentario.trim();
    if (!texto) return;
    onAddComment(postId, texto);
    setNovoComentario("");
  };

  return (
    <div
      className={`post-comments-section ${isExpanded ? "expanded" : ""}`}
      data-post-id={postId}
    >
      {isExpanded && (
        <div className="post-comments-container">
          {comments.length === 0 && (
            <p className="post-comments-empty">Sem comentários ainda.</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="post-comment">
              <div className="comment-header">
                <strong>{comment.username}</strong>
                <small>@{comment.handle}</small>
              </div>
              <p className="comment-text">{comment.texto}</p>
              <small className="comment-time">
                {new Date(comment.criadoEm).toLocaleDateString("pt-BR")}
              </small>
            </div>
          ))}

          <form className="comment-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Escreva um comentário"
              disabled={!usuario}
            />
            <button type="submit" disabled={!usuario || !novoComentario.trim()}>
              Comentar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
