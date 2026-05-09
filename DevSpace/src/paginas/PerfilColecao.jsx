import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import "../style/home.css";
import backArrow from "../assets/IMGS/DawnFlech (2).png";

const COLLECTIONS = {
  curtidos: {
    title: "Curtidos",
    empty: "Nenhum post curtido ainda.",
    field: "likedBy",
  },
  salvos: {
    title: "Posts salvos",
    empty: "Nenhum post salvo ainda.",
    field: "savedBy",
  },
  republicados: {
    title: "Republicados",
    empty: "Nenhum post republicado ainda.",
    field: "repostedBy",
  },
};

function normalizeKey(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
}

function getUserKeys(user) {
  return [
    normalizeKey(user?.email),
    normalizeKey(user?.handle),
    normalizeKey(user?.username),
  ].filter(Boolean);
}

function postHasUserAction(post, field, userKeys) {
  const values = Array.isArray(post?.[field]) ? post[field].map(normalizeKey) : [];
  return userKeys.some((key) => values.includes(key));
}

export default function PerfilColecao({
  tipo,
  irHome,
  irPerfil,
  irExplorar,
  onOpenPost,
  onOpenUserProfile,
}) {
  const [usuario, setUsuario] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const config = COLLECTIONS[tipo] || COLLECTIONS.curtidos;

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    setUsuario(localUser || sessionUser || null);
    setPosts(JSON.parse(localStorage.getItem("posts")) || []);
  }, [tipo]);

  const filteredPosts = useMemo(() => {
    const userKeys = getUserKeys(usuario);
    if (userKeys.length === 0) return [];

    return posts
      .filter((post) => postHasUserAction(post, config.field, userKeys))
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }, [posts, usuario, config.field]);

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={irPerfil} irExplorar={irExplorar} onOpenPost={onOpenPost} />

      <div className="profile-page">
        <div className="topo-perfil collection-top">
          <button className="back-arrow-btn" onClick={irPerfil} type="button" title="Voltar ao perfil">
            <img src={backArrow} alt="Voltar" />
          </button>
          <h3>{config.title}</h3>
        </div>

        <div className="profile-collection-page">
          {filteredPosts.length === 0 ? (
            <div className="perfil-post-empty">{config.empty}</div>
          ) : (
            <div className="posts-list collection-posts-list">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="perfil-post-card collection-post-card"
                  onClick={() => setSelectedPost(post)}
                >
                  <div
                    className="perfil-post-avatar-card"
                    style={{
                      backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenUserProfile?.(post);
                    }}
                    title="Abrir perfil"
                  />
                  <div className="perfil-post-body">
                    <div
                      className="perfil-post-title"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUserProfile?.(post);
                      }}
                    >
                      {post.username || "Usuario"}
                    </div>
                    <div className="perfil-post-handle">@{post.handle || post.username || "usuario"}</div>
                    <div className="perfil-post-text">{post.texto || "Post sem texto"}</div>
                    {post.imagem && <div className="perfil-post-saved">Com imagem</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <div className="post-preview-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-expanded-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setSelectedPost(null)} type="button" title="Fechar">
              x
            </button>

            <div className="post-card-header">
              <div
                className="post-card-avatar"
                style={{
                  backgroundImage: selectedPost.fotoPerfil ? `url(${selectedPost.fotoPerfil})` : "none",
                }}
                onClick={() => {
                  setSelectedPost(null);
                  onOpenUserProfile?.(selectedPost);
                }}
              />
              <div className="post-card-user">
                <small className="post-card-handle">@{selectedPost.handle || selectedPost.username || "usuario"}</small>
                <strong
                  onClick={() => {
                    setSelectedPost(null);
                    onOpenUserProfile?.(selectedPost);
                  }}
                >
                  {selectedPost.username || "Usuario"}
                </strong>
              </div>
            </div>

            <p className="post-card-text post-expanded-text">{selectedPost.texto || "Post sem texto"}</p>

            {selectedPost.imagem && (
              <div
                className="post-card-window post-expanded-window"
                onClick={() => setImagePreview(selectedPost.imagem)}
              >
                <div className="post-card-window-top">
                  <span className="window-dot red" />
                  <span className="window-dot yellow" />
                  <span className="window-dot green" />
                </div>
                <div className="post-card-window-body">
                  <img src={selectedPost.imagem} alt="Post ampliado" />
                </div>
              </div>
            )}

            <div className="post-card-actions post-expanded-actions">
              <button type="button" aria-label="Comentarios">
                <span>C</span>
                <strong>{Array.isArray(selectedPost.commentsList) ? selectedPost.commentsList.length : selectedPost.comments ?? 0}</strong>
              </button>
              <button type="button" aria-label="Repost">
                <span>R</span>
                <strong>{selectedPost.shares ?? 0}</strong>
              </button>
              <button type="button" aria-label="Curtir">
                <span>L</span>
                <strong>{selectedPost.likes ?? 0}</strong>
              </button>
              <button type="button" aria-label="Salvar">
                <span>S</span>
                <strong>{selectedPost.bookmarks ?? 0}</strong>
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="post-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="image-only-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setImagePreview(null)}>
              x
            </button>
            <img src={imagePreview} alt="Imagem ampliada do post" />
          </div>
        </div>
      )}
    </div>
  );
}
