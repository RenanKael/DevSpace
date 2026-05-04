import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import PostComments from "../components/PostComments";
import { useOverlayClose } from "../hooks/useOverlayClose";
import "../style/home.css";

const FAKE_COMMENT_POOL = [
  { username: "Maria Silva", handle: "mariasilva", texto: "Curti muito essa ideia, ficou bem legal." },
  { username: "Carlos Devs", handle: "carlosdevs", texto: "Testei aqui e funcionou direitinho." },
  { username: "Ana Tech", handle: "anatech", texto: "Boa! Depois posta a evolução disso." },
  { username: "Pedro Code", handle: "pedrocode", texto: "Visual limpo e com boa leitura." },
  { username: "Lia Gomes", handle: "liagomes", texto: "Mandou bem demais nesse post." },
  { username: "Felipe Rocha", handle: "feliperocha", texto: "Gostei da solução, bem prática." },
  { username: "Nina Correa", handle: "ninacorrea", texto: "Esse tipo de conteúdo ajuda muito." },
  { username: "Arthur Silva", handle: "arthursilva", texto: "Ficou claro e objetivo, top." },
  { username: "Bruna UX", handle: "brunaux", texto: "Design e conteúdo conversaram bem aqui." },
  { username: "Vitor Front", handle: "vitorfront", texto: "Vou usar essa abordagem no meu projeto." },
  { username: "Caio Stack", handle: "caiostack", texto: "Achei a implementação bem elegante." },
  { username: "Duda Product", handle: "dudaproduct", texto: "Esse fluxo ficou muito mais intuitivo." },
];

function fakeAvatar(handle) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle)}`;
}

function buildFakeComments(postId, count) {
  const desired = Math.max(1, Number(count || 1));
  const start = Math.abs(Number(postId || 0)) % FAKE_COMMENT_POOL.length;
  return Array.from({ length: desired }, (_, idx) => {
    const item = FAKE_COMMENT_POOL[(start + idx * 2) % FAKE_COMMENT_POOL.length];
    return {
      id: Number(`${postId}${idx + 1}`),
      username: item.username,
      handle: item.handle,
      email: `${item.handle}@devspace.fake`,
      fotoPerfil: fakeAvatar(item.handle),
      texto: item.texto,
      criadoEm: new Date(Date.now() - (idx + 1) * 1800000).toISOString(),
    };
  });
}

function normalizeHandle(value) {
  return (value || "usuario").replace(/\s+/g, "").toLowerCase();
}

function findUserProfile(item, users) {
  const email = (item?.email || "").toLowerCase();
  const handle = normalizeHandle(item?.handle || "");
  const username = (item?.username || "").toLowerCase();

  return users.find((user) => {
    const userEmail = (user.email || "").toLowerCase();
    const userHandle = normalizeHandle(user.handle || user.username || "");
    const userName = (user.username || "").toLowerCase();

    return (
      (email && userEmail === email) ||
      (handle && userHandle === handle) ||
      (username && userName === username)
    );
  });
}

function isFakeIdentity(item) {
  const email = (item?.email || "").toLowerCase();
  return !!item?.isSeedFake || email.endsWith("@dev.com") || email.endsWith("@devspace.fake");
}

export default function Home({ irPerfil, irExplorar, onOpenPost, refreshFeed, onOpenUserProfile }) {
  const [showTopbar, setShowTopbar] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    setUsuario(localUser || sessionUser);
    const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
    setUsuarios(Array.isArray(savedUsers) ? savedUsers : []);
  }, []);

  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [openedComments, setOpenedComments] = useState({});
  const [activeActions, setActiveActions] = useState({});
  const [syncToast, setSyncToast] = useState(false);

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
    const isActive = !!activeActions[postId]?.[action];
    const nextValue = !isActive;

    setActiveActions((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {}),
        [action]: nextValue,
      },
    }));

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
      const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
      const usersList = Array.isArray(savedUsers) ? savedUsers : [];
      const normalizedPosts = saved.map((post) => {
        const isLegacyFake =
          !!post.isSeedFake ||
          (post.email || "").toLowerCase().endsWith("@dev.com");
        const postProfile = isLegacyFake ? null : findUserProfile(post, usersList);
        const rawComments = Array.isArray(post.commentsList) ? post.commentsList : [];
        const fallbackCount = Number(post.comments || 0) > 0 ? Number(post.comments) : 2;
        const commentsListRaw =
          isLegacyFake && rawComments.length === 0
            ? buildFakeComments(post.id, fallbackCount)
            : rawComments;
        const commentsList = commentsListRaw.map((comment) => {
          const handle = normalizeHandle(comment?.handle || comment?.username);
          const commentIsFake = isFakeIdentity(comment);
          const commentProfile = commentIsFake ? null : findUserProfile(comment, usersList);
          return {
            ...comment,
            username: commentProfile?.username || comment?.username,
            handle: commentProfile?.handle || handle,
            email: commentProfile?.email || comment?.email,
            fotoPerfil: commentProfile?.fotoPerfil || comment?.fotoPerfil || (commentIsFake ? fakeAvatar(handle) : ""),
          };
        });
        const postHandle = normalizeHandle(post.handle || post.username);
        const normalizedComments = isLegacyFake
          ? commentsList.length
          : rawComments.length;
        return {
          ...post,
          username: postProfile?.username || post.username,
          handle: postProfile?.handle || post.handle,
          email: postProfile?.email || post.email,
          fotoPerfil: postProfile?.fotoPerfil || post.fotoPerfil || (isLegacyFake ? fakeAvatar(postHandle) : ""),
          commentsList,
          comments: normalizedComments,
          isSeedFake: isLegacyFake,
        };
      });
      localStorage.setItem("posts", JSON.stringify(normalizedPosts));
      setPosts(normalizedPosts);
    }
  }, [refreshFeed, usuario, usuarios]);

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

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== "posts" && event.key !== "usuarioLogado" && event.key !== "usuarios") return;

      if (event.key === "posts") {
        try {
          const saved = JSON.parse(localStorage.getItem("posts")) || [];
          setPosts(Array.isArray(saved) ? saved : []);
          setSyncToast(true);
        } catch {
          setPosts([]);
        }
      }

      if (event.key === "usuarioLogado") {
        const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
        const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        setUsuario(localUser || sessionUser || null);
        setSyncToast(true);
      }

      if (event.key === "usuarios") {
        const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
        setUsuarios(Array.isArray(savedUsers) ? savedUsers : []);
        setSyncToast(true);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!syncToast) return;
    const timer = setTimeout(() => setSyncToast(false), 2200);
    return () => clearTimeout(timer);
  }, [syncToast]);

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
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    if (query.startsWith("@")) return false;

    return [post.texto, post.username, post.handle, post.email].some((value) =>
      value?.toLowerCase().includes(query)
    );
  });

  const profileOnlyResults = (() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query.startsWith("@")) return [];
    const queryUser = query.slice(1);
    if (!queryUser) return [];

    const postAuthors = posts.map((post) => ({
      username: post.username,
      handle: post.handle || normalizeHandle(post.username),
      email: post.email,
      fotoPerfil: post.fotoPerfil,
      bio: post.bio,
    }));

    const matchedUsersRaw = [...usuarios, ...postAuthors].filter((u) => {
      const handle = (u.handle || u.username || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return handle.includes(queryUser) || username.includes(queryUser);
    });

    const dedupedMap = new Map();
    matchedUsersRaw.forEach((u) => {
      const key = ((u.handle || u.username || "").toLowerCase() || (u.email || "").toLowerCase());
      if (!key) return;
      const prev = dedupedMap.get(key);
      if (!prev) {
        dedupedMap.set(key, u);
        return;
      }
      const prevScore = (prev.bio ? 1 : 0) + (prev.fotoPerfil ? 1 : 0) + (prev.fotoCapa ? 1 : 0);
      const nextScore = (u.bio ? 1 : 0) + (u.fotoPerfil ? 1 : 0) + (u.fotoCapa ? 1 : 0);
      dedupedMap.set(key, nextScore > prevScore ? u : prev);
    });

    return [...dedupedMap.values()];
  })();

  const selectedPostData = selectedPost
    ? posts.find((post) => post.id === selectedPost.id) || selectedPost
    : null;

  return (
    <div className="home">
      <Sidebar onReload={reloadFeed} irPerfil={irPerfil} irExplorar={irExplorar} onOpenPost={onOpenPost} />

      <div className="main">
        <Topbar visible={showTopbar} usuario={usuario} onSearch={setSearchQuery} />

        <div className="feed">
          {loading && <p>Carregando...</p>}
          {!loading && filteredPosts.length === 0 && profileOnlyResults.length === 0 && (
            <p>{searchQuery.trim().startsWith("@") ? "Nenhum perfil encontrado." : "Sem posts correspondentes a busca."}</p>
          )}

          {!loading && profileOnlyResults.length > 0 && (
            <div className="profile-search-list">
              {profileOnlyResults.map((u) => (
                <div
                  key={u.email || u.handle || u.username}
                  className="profile-search-card"
                  onClick={() => onOpenUserProfile?.(u)}
                >
                  <div
                    className="profile-search-cover"
                    style={{ backgroundImage: u.fotoCapa ? `url(${u.fotoCapa})` : "none" }}
                  />
                  <div className="profile-search-body">
                    <div
                      className="profile-search-avatar"
                      style={{ backgroundImage: u.fotoPerfil ? `url(${u.fotoPerfil})` : "none" }}
                    />
                    <div className="profile-search-meta">
                      <strong>{u.username}</strong>
                      <small>@{u.handle || u.username}</small>
                      <p>{u.bio || "Sem bio..."}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                  <span>💬</span>
                  <strong>{Array.isArray(post.commentsList) ? post.commentsList.length : post.comments ?? 0}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Repost"
                  className={activeActions[post.id]?.shares ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "shares")}
                >
                  <span>🔁</span>
                  <strong>{post.shares ?? 0}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Curtir"
                  className={activeActions[post.id]?.likes ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "likes")}
                >
                  <span>❤️</span>
                  <strong>{post.likes ?? 0}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Salvar"
                  className={activeActions[post.id]?.bookmarks ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "bookmarks")}
                >
                  <span>🔖</span>
                  <strong>{post.bookmarks ?? 0}</strong>
                </button>
                <button
                  type="button"
                  aria-label="Baixar"
                  className={activeActions[post.id]?.downloads ? "active pulse" : ""}
                  onClick={() => togglePostAction(post.id, "downloads")}
                >
                  <span>⬇️</span>
                  <strong>{post.downloads ?? 0}</strong>
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
                <span>💬</span>
                <strong>{Array.isArray(selectedPostData.commentsList) ? selectedPostData.commentsList.length : selectedPostData.comments ?? 0}</strong>
              </button>
              <button
                type="button"
                aria-label="Repost"
                className={activeActions[selectedPostData.id]?.shares ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "shares")}
              >
                <span>🔁</span>
                <strong>{selectedPostData.shares ?? 0}</strong>
              </button>
              <button
                type="button"
                aria-label="Curtir"
                className={activeActions[selectedPostData.id]?.likes ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "likes")}
              >
                <span>❤️</span>
                <strong>{selectedPostData.likes ?? 0}</strong>
              </button>
              <button
                type="button"
                aria-label="Salvar"
                className={activeActions[selectedPostData.id]?.bookmarks ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "bookmarks")}
              >
                <span>🔖</span>
                <strong>{selectedPostData.bookmarks ?? 0}</strong>
              </button>
              <button
                type="button"
                aria-label="Baixar"
                className={activeActions[selectedPostData.id]?.downloads ? "active pulse" : ""}
                onClick={() => togglePostAction(selectedPostData.id, "downloads")}
              >
                <span>⬇️</span>
                <strong>{selectedPostData.downloads ?? 0}</strong>
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

      {syncToast && (
        <div className="sync-toast">Dados atualizados em outra aba.</div>
      )}
    </div>
  );
}
