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
  const [selectedPost, setSelectedPost] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    let saved = [];
    const raw = localStorage.getItem("posts");

    try {
      saved = JSON.parse(raw) || [];
    } catch (error) {
      saved = [];
    }

    const isAdmin = usuario?.email === "renan.kael@gmail.com";

    if (!Array.isArray(saved) || saved.length === 0) {
      if (isAdmin) {
        const fakeSeed = [
          {
            id: 1,
            username: "Lia Gomes",
            handle: "liagomes",
            email: "lia.gomes@dev.com",
            fotoPerfil: "",
            texto: "Começando a semana com foco e café na mesa. Vamos fazer acontecer!",
            imagem: "",
            comments: 2,
            shares: 1,
            likes: 5,
            bookmarks: 1,
            downloads: 0,
            criadoEm: new Date().toISOString(),
          },
          {
            id: 2,
            username: "Felipe Rocha",
            handle: "feliperocha",
            email: "felipe.rocha@dev.com",
            fotoPerfil: "",
            texto: "Adorei o novo projeto, já estou testando as ideias no protótipo.",
            imagem: "",
            comments: 3,
            shares: 2,
            likes: 8,
            bookmarks: 2,
            downloads: 0,
            criadoEm: new Date().toISOString(),
          },
          {
            id: 3,
            username: "Nina Correa",
            handle: "ninacorrea",
            email: "nina.correa@dev.com",
            fotoPerfil: "",
            texto: "Hora de aprender algo novo: hoje vou estudar animações CSS para fazer cards mais fluidos.",
            imagem: "",
            comments: 4,
            shares: 1,
            likes: 11,
            bookmarks: 3,
            downloads: 0,
            criadoEm: new Date().toISOString(),
          },
          {
            id: 4,
            username: "Arthur Silva",
            handle: "arthursilva",
            email: "arthur.silva@dev.com",
            fotoPerfil: "",
            texto: "Todo dia é dia de melhorar o design e deixar o app mais agradável para as pessoas.",
            imagem: "",
            comments: 1,
            shares: 0,
            likes: 7,
            bookmarks: 1,
            downloads: 0,
            criadoEm: new Date().toISOString(),
          },
        ];

        localStorage.setItem("posts", JSON.stringify(fakeSeed));
        setPosts(fakeSeed);
      } else {
        setPosts([]);
      }
    } else {
      setPosts(saved);
    }
  }, [refreshFeed, usuario]);

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
            <div
              key={post.id}
              className="post-card"
              onClick={() => setSelectedPost(post)}
            >
              <div className="post-card-header">
                <div
                  className="post-card-avatar"
                  style={{
                    backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                  }}
                />
                <div className="post-card-user">
                  <small className="post-card-handle">@{post.handle || post.username}</small>
                  <strong>{post.username}</strong>
                </div>
              </div>

              <p className="post-card-text">{post.texto}</p>

              {post.imagem && (
                <div className="post-card-window" onClick={(e) => e.stopPropagation()}>
                  <div className="post-card-window-top">
                    <span className="window-dot red" />
                    <span className="window-dot yellow" />
                    <span className="window-dot green" />
                  </div>
                  <div
                    className="post-card-window-body"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(post.imagem);
                    }}
                  >
                    <img src={post.imagem} alt="Post" />
                  </div>
                </div>
              )}

              <div className="post-card-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" aria-label="Comentários">
                  <span>💬</span>
                  <strong>{post.comments ?? 1}</strong>
                </button>
                <button type="button" aria-label="Compartilhar">
                  <span>🔁</span>
                  <strong>{post.shares ?? 1}</strong>
                </button>
                <button type="button" aria-label="Curtir">
                  <span>❤️</span>
                  <strong>{post.likes ?? 1}</strong>
                </button>
                <button type="button" aria-label="Salvar">
                  <span>🔖</span>
                  <strong>{post.bookmarks ?? 1}</strong>
                </button>
                <button type="button" aria-label="Baixar">
                  <span>⬇️</span>
                  <strong>{post.downloads ?? 1}</strong>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPost && (
        <div className="post-preview-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-expanded-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setSelectedPost(null)}>
              ✕
            </button>
            <div className="post-card-header">
              <div
                className="post-card-avatar"
                style={{
                  backgroundImage: selectedPost.fotoPerfil ? `url(${selectedPost.fotoPerfil})` : "none",
                }}
              />
              <div className="post-card-user">
                <small className="post-card-handle">@{selectedPost.handle || selectedPost.username}</small>
                <strong>{selectedPost.username}</strong>
              </div>
            </div>
            <p className="post-card-text post-expanded-text">{selectedPost.texto}</p>
            {selectedPost.imagem && (
              <div className="post-card-window post-expanded-window" onClick={() => setImagePreview(selectedPost.imagem)}>
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
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="post-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="image-only-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setImagePreview(null)}>
              ✕
            </button>
            <img src={imagePreview} alt="Imagem ampliada do post" />
          </div>
        </div>
      )}
    </div>
  );
}