import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home({ irPerfil, onOpenPost, refreshFeed }) {
  const [showTopbar, setShowTopbar] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    setUsuario(localUser || sessionUser);
  }, []);

  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return [
      post.texto,
      post.username,
      post.handle,
      post.email
    ].some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <div className="home">
      <Sidebar
        onReload={reloadFeed}
        irPerfil={irPerfil}
        onOpenPost={onOpenPost}
      />

      <div className="main">
        <Topbar visible={showTopbar} usuario={usuario} onSearch={setSearchQuery} />

        <div className="feed">
          {loading && <p>Carregando...</p>}

          {!loading && filteredPosts.length === 0 && (
            <p>Sem posts correspondentes à busca.</p>
          )}

          {filteredPosts.map((post) => (
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