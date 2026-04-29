import { useState } from "react";

/**
 * Dados fake de comentários de outros usuários
 */
const FAKE_COMMENTS = [
  {
    id: 1,
    username: "Maria Silva",
    handle: "mariasilva",
    avatar: "",
    texto: "Adorei esse post! Muito inspirador 🔥",
    criadoEm: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    username: "Carlos Devs",
    handle: "carlosdevs",
    avatar: "",
    texto: "Concordo totalmente com essa abordagem!",
    criadoEm: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    username: "Ana Tech",
    handle: "anatech",
    avatar: "",
    texto: "Excelente contribuição para a comunidade",
    criadoEm: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 4,
    username: "Pedro Code",
    handle: "pedrocode",
    avatar: "",
    texto: "Implementei isso no meu projeto e funcionou perfeitamente!",
    criadoEm: new Date(Date.now() - 14400000).toISOString(),
  },
];

export default function PostComments({ postId, isExpanded, onToggle }) {
  const [comments, setComments] = useState(FAKE_COMMENTS.slice(0, 2));

  const handleLoadMore = () => {
    if (comments.length < FAKE_COMMENTS.length) {
      setComments(FAKE_COMMENTS);
    }
  };

  return (
    <div className={`post-comments-section ${isExpanded ? "expanded" : ""}`}>
      <button
        className="post-comments-toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title="Ver comentários"
      >
        💬 Comentários
      </button>

      {isExpanded && (
        <div className="post-comments-container">
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

          {comments.length < FAKE_COMMENTS.length && (
            <button className="load-more-comments" onClick={handleLoadMore}>
              Carregar mais comentários
            </button>
          )}
        </div>
      )}
    </div>
  );
}
