import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
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
                >
                  <div
                    className="perfil-post-avatar-card"
                    style={{
                      backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() => onOpenUserProfile?.(post)}
                    title="Abrir perfil"
                  />
                  <div className="perfil-post-body">
                    <div className="perfil-post-title">{post.username || "Usuario"}</div>
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
    </div>
  );
}
