import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home({ irPerfil, onOpenPost, refreshFeed }) {
  const [showTopbar, setShowTopbar] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    setUsuario(user);
  }, []);

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("posts")) || [];
    setPosts(saved);
  }, [refreshFeed]);

  const [loading, setLoading] = useState(false);

  let lastScroll = 0;

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setShowTopbar(currentScroll < lastScroll);
      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const reloadFeed = () => {
    if (loading) return;

    setLoading(true);

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem("posts")) || [];
      setPosts(saved);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="home">
      <Sidebar
        onReload={reloadFeed}
        irPerfil={irPerfil}
        onOpenPost={onOpenPost}
      />

      <div className="main">
        <Topbar visible={showTopbar} usuario={usuario} />

        <div className="feed">
          {loading && <p>Carregando...</p>}

          {!loading && posts.length === 0 && (
            <p>Sem posts ainda. Use o botão "Postar" para começar.</p>
          )}

          {posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-card-header">
                <div
                  className="post-card-avatar"
                  style={{
                    backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                  }}
                />
                <div className="post-card-user">
                  <strong>{post.username}</strong>
                  <span>@{post.username}</span>
                </div>
              </div>

              <p className="post-card-text">{post.texto}</p>

              {post.imagem && (
                <div className="post-card-image">
                  <img src={post.imagem} alt="Post" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}