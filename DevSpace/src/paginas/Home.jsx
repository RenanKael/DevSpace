import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import PostComments from "../components/PostComments";
import { useOverlayClose } from "../hooks/useOverlayClose";
import "../style/home.css";

export default function Home({ irPerfil, onOpenPost, refreshFeed, onOpenUserProfile }) {
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
  const [openedComments, setOpenedComments] = useState({});
  const [activeActions, setActiveActions] = useState({});

  useOverlayClose(!!selectedPost, () => setSelectedPost(null));
  useOverlayClose(!!imagePreview, () => setImagePreview(null));

  function deletePost(postId) {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updated = savedPosts.filter((post) => post.id !== postId);
    localStorage.setItem("posts", JSON.stringify(updated));
    setPosts(updated);
    if (selectedPost?.id === postId) setSelectedPost(null);
  }

  function toggleComments(postId) {
    setOpenedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  function togglePostAction(postId, action) {
    setActiveActions((prev) => {
      const postActions = prev[postId] || {};
      const isActive = !!postActions[action];
      const nextValue = !isActive;

      setPosts((prevPosts) => {
        const updatedPosts = prevPosts.map((post) => {
          if (post.id !== postId) return post;
          const currentValue = Number(post[action] || 0);
          return {
            ...post,
            [action]: nextValue ? currentValue + 1 : Math.max(0, currentValue - 1),
          };
        });
        localStorage.setItem("posts", JSON.stringify(updatedPosts));
        return updatedPosts;
      });

      return {
        ...prev,
        [postId]: {
          ...postActions,
          [action]: nextValue,
        },
      };
    });
  }

  function addCommentToPost(postId, texto) {
    if (!usuario) return;

    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
        const novoComentario = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          username: usuario.username || "Usuario",
          handle: (usuario.handle || usuario.username || "usuario").replace(/\s+/g, "").toLowerCase(),
          email: usuario.email || "",
          fotoPerfil: usuario.fotoPerfil || "",
          texto,
          criadoEm: new Date().toISOString(),
        };

        const nextComments = [novoComentario, ...commentsList];
        return {
          ...post,
          commentsList: nextComments,
          comments: nextComments.length,
        };
      });

      localStorage.setItem("posts", JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  }

  useEffect(() => {
    let saved = [];
    const raw = localStorage.getItem("posts");

    try {
      saved = JSON.parse(raw) || [];
    } catch {
      saved = [];
    }

    const isAdmin = usuario?.email === "renan.kael@gmail.com";
    const adminSeedInitialized = localStorage.getItem("adminSeedInitialized") === "true";

    if (!Array.isArray(saved) || saved.length === 0) {
      if (isAdmin && !adminSeedInitialized) {
        const fakeSeed = [
          {
            id: 1,
            username: "Lia Gomes",
            handle: "liagomes",
            email: "lia.gomes@dev.com",
            fotoPerfil: "",
            texto: "Comecando a semana com foco e cafe na mesa. Vamos fazer acontecer!",
            imagem: "",
            comments: 2,
            commentsList: [
              {
                id: 1001,
                username: "Felipe Rocha",
                handle: "feliperocha",
                texto: "Boa! Bora pra cima nessa semana.",
                criadoEm: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 1002,
                username: "Nina Correa",
                handle: "ninacorrea",
                texto: "Post motivador, curti demais.",
                criadoEm: new Date(Date.now() - 5400000).toISOString(),
              },
            ],
            isSeedFake: true,
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
            texto: "Adorei o novo projeto, ja estou testando as ideias no prototipo.",
            imagem: "",
            comments: 3,
            commentsList: [
              {
                id: 2001,
                username: "Lia Gomes",
                handle: "liagomes",
                texto: "Manda depois o resultado desse prototipo.",
                criadoEm: new Date(Date.now() - 4200000).toISOString(),
              },
              {
                id: 2002,
                username: "Arthur Silva",
                handle: "arthursilva",
                texto: "Tambem to testando algo parecido.",
                criadoEm: new Date(Date.now() - 6500000).toISOString(),
              },
              {
                id: 2003,
                username: "Ana Tech",
                handle: "anatech",
                texto: "Curti a ideia, compartilha updates.",
                criadoEm: new Date(Date.now() - 8000000).toISOString(),
              },
            ],
            isSeedFake: true,
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
            texto: "Hora de aprender algo novo: hoje vou estudar animacoes CSS para fazer cards mais fluidos.",
            imagem: "",
            comments: 4,
            commentsList: [
              {
                id: 3001,
                username: "Pedro Code",
                handle: "pedrocode",
                texto: "Animacao em CSS faz muita diferenca mesmo.",
                criadoEm: new Date(Date.now() - 5100000).toISOString(),
              },
              {
                id: 3002,
                username: "Maria Silva",
                handle: "mariasilva",
                texto: "Se quiser posso te mandar referencias boas.",
                criadoEm: new Date(Date.now() - 8400000).toISOString(),
              },
              {
                id: 3003,
                username: "Carlos Devs",
                handle: "carlosdevs",
                texto: "Boa trilha de estudo.",
                criadoEm: new Date(Date.now() - 10400000).toISOString(),
              },
              {
                id: 3004,
                username: "Felipe Rocha",
                handle: "feliperocha",
                texto: "Depois posta o antes e depois dos cards.",
                criadoEm: new Date(Date.now() - 12400000).toISOString(),
              },
            ],
            isSeedFake: true,
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
            texto: "Todo dia e dia de melhorar o design e deixar o app mais agradavel para as pessoas.",
            imagem: "",
            comments: 1,
            commentsList: [
              {
                id: 4001,
                username: "Lia Gomes",
                handle: "liagomes",
                texto: "Design centrado no usuario sempre vence.",
                criadoEm: new Date(Date.now() - 4800000).toISOString(),
              },
            ],
            isSeedFake: true,
            shares: 0,
            likes: 7,
            bookmarks: 1,
            downloads: 0,
            criadoEm: new Date().toISOString(),
          },
        ];

        localStorage.setItem("posts", JSON.stringify(fakeSeed));
        localStorage.setItem("adminSeedInitialized", "true");
        setPosts(fakeSeed);
      } else {
        setPosts(saved);
      }
    } else {
      const normalizedPosts = saved.map((post) => {
        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
        const isSeedFake = !!post.isSeedFake;
        const normalizedComments = isSeedFake
          ? commentsList.length || Number(post.comments || 0)
          : commentsList.length;
        return {
          ...post,
          commentsList,
          comments: normalizedComments,
          isSeedFake,
        };
      });
      setPosts(normalizedPosts);
    }
  }, [refreshFeed, usuario]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let lastScroll = 0;

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

    return [post.texto, post.username, post.handle, post.email].some((value) =>
      value?.toLowerCase().includes(query)
    );
  });

  const selectedPostData = selectedPost
    ? posts.find((post) => post.id === selectedPost.id) || selectedPost
    : null;

  return (
    <div className="home">
      <Sidebar onReload={reloadFeed} irPerfil={irPerfil} onOpenPost={onOpenPost} />

      <div className="main">
        <Topbar visible={showTopbar} usuario={usuario} onSearch={setSearchQuery} />

        <div className="feed">
          {loading && <p>Carregando...</p>}
          {!loading && filteredPosts.length === 0 && <p>Sem posts correspondentes a busca.</p>}

          {filteredPosts.map((post) => (
            <div key={post.id} className="post-card" onClick={() => setSelectedPost(post)}>
              <div className="post-card-header">
                <div
                  className="post-card-avatar"
                  style={{ backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUserProfile?.(post);
                  }}
                />
                <div className="post-card-user">
                  <small className="post-card-handle">@{post.handle || post.username}</small>
                  <strong
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenUserProfile?.(post);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {post.username}
                  </strong>
                </div>
                {(usuario?.email === post.email || usuario?.username === post.username) && (
                  <button
                    className="post-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePost(post.id);
                    }}
                    title="Excluir post"
                  >
                    x
                  </button>
                )}
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
                <button
                  type="button"
                  aria-label="Comentarios"
                  className={openedComments[post.id] ? "active pulse" : ""}
                  onClick={() => toggleComments(post.id)}
                >
                  <span>??</span>
                  <strong>{Array.isArray(post.commentsList) ? post.commentsList.length : post.comments ?? 0}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Repost"
                  className={activeActions[post.id]?.shares ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "shares")}
                >
                  <span>??</span>
                  <strong>{post.shares ?? 1}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Curtir"
                  className={activeActions[post.id]?.likes ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "likes")}
                >
                  <span>??</span>
                  <strong>{post.likes ?? 1}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Salvar"
                  className={activeActions[post.id]?.bookmarks ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "bookmarks")}
                >
                  <span>??</span>
                  <strong>{post.bookmarks ?? 1}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Baixar"
                  className={activeActions[post.id]?.downloads ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "downloads")}
                >
                  <span>??</span>
                  <strong>{post.downloads ?? 1}</strong>
                </button>
              </div>

              <PostComments
                postId={post.id}
                isExpanded={!!openedComments[post.id]}
                comments={post.commentsList || []}
                onAddComment={addCommentToPost}
                usuario={usuario}
                onOpenUserProfile={onOpenUserProfile}
              />
            </div>
          ))}
        </div>
      </div>

      {selectedPostData && (
        <div className="post-preview-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-expanded-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setSelectedPost(null)} type="button" title="Fechar">
              x
            </button>
            <div className="post-card-header">
              <div
                className="post-card-avatar"
                style={{
                  backgroundImage: selectedPostData.fotoPerfil ? `url(${selectedPostData.fotoPerfil})` : "none",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUserProfile?.(selectedPostData);
                }}
              />
              <div className="post-card-user">
                <small className="post-card-handle">@{selectedPostData.handle || selectedPostData.username}</small>
                <strong
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUserProfile?.(selectedPostData);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {selectedPostData.username}
                </strong>
              </div>
            </div>
            <p className="post-card-text post-expanded-text">{selectedPostData.texto}</p>
            {selectedPostData.imagem && (
              <div
                className="post-card-window post-expanded-window"
                onClick={() => setImagePreview(selectedPostData.imagem)}
              >
                <div className="post-card-window-top">
                  <span className="window-dot red" />
                  <span className="window-dot yellow" />
                  <span className="window-dot green" />
                </div>
                <div className="post-card-window-body">
                  <img src={selectedPostData.imagem} alt="Post ampliado" />
                </div>
              </div>
            )}

            <div className="post-card-actions post-expanded-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Comentarios"
                className={openedComments[selectedPostData.id] ? "active pulse" : ""}
                onClick={() => toggleComments(selectedPostData.id)}
              >
                <span>??</span>
                <strong>{Array.isArray(selectedPostData.commentsList) ? selectedPostData.commentsList.length : selectedPostData.comments ?? 0}</strong>
              </button>
              <button
                type="button"
                aria-label="Repost"
                className={activeActions[selectedPostData.id]?.shares ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "shares")}
              >
                <span>??</span>
                <strong>{selectedPostData.shares ?? 1}</strong>
              </button>
              <button
                type="button"
                aria-label="Curtir"
                className={activeActions[selectedPostData.id]?.likes ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "likes")}
              >
                <span>??</span>
                <strong>{selectedPostData.likes ?? 1}</strong>
              </button>
              <button
                type="button"
                aria-label="Salvar"
                className={activeActions[selectedPostData.id]?.bookmarks ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "bookmarks")}
              >
                <span>??</span>
                <strong>{selectedPostData.bookmarks ?? 1}</strong>
              </button>
              <button
                type="button"
                aria-label="Baixar"
                className={activeActions[selectedPostData.id]?.downloads ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "downloads")}
              >
                <span>??</span>
                <strong>{selectedPostData.downloads ?? 1}</strong>
              </button>
            </div>

            <PostComments
              postId={selectedPostData.id}
              isExpanded={!!openedComments[selectedPostData.id]}
              comments={selectedPostData.commentsList || []}
              onAddComment={addCommentToPost}
              usuario={usuario}
              onOpenUserProfile={onOpenUserProfile}
            />
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
