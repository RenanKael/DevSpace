import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import PostComments from "../components/PostComments";
import "../style/perfil.css";
import "../style/home.css";
import PageHeader from "../components/PageHeader";
import { PostContent } from "../components/CodeBlock";
import { DsIcon } from "../components/icons";
import { Icons } from "../components/iconKit";
import { avatarInitial, avatarStyle, placeholderAvatarUri } from "../utils/avatar";
import { fetchMyCollection, addComment, deleteComment, likeComment, likePost, sharePost, bookmarkPost } from "../api";
import {
  recordUserLikeProgress,
  recordUserRepostProgress,
  recordUserSaveProgress,
} from "../utils/starProgress";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import { useOverlayClose } from "../hooks/useOverlayClose";

const COLLECTIONS = {
  curtidos: {
    title: "Curtidos",
    kicker: "Coleção",
    description: "Posts que você curtiu na comunidade.",
    emptyTitle: "Nenhum post curtido ainda",
    empty: "Explore o feed e curta conteúdos para encontrá-los depois.",
    field: "likedBy",
  },
  salvos: {
    title: "Posts salvos",
    kicker: "Coleção",
    description: "Seus posts guardados para consultar depois.",
    emptyTitle: "Nenhum post salvo ainda",
    empty: "Explore o feed e salve conteúdos para encontrar depois.",
    field: "savedBy",
  },
  republicados: {
    title: "Republicados",
    kicker: "Coleção",
    description: "Publicações que você republicou.",
    emptyTitle: "Nenhum republicado ainda",
    empty: "Republicações aparecem aqui.",
    field: "repostedBy",
  },
};

const ACTIONS = {
  shares: "repostedBy",
  likes: "likedBy",
  bookmarks: "savedBy",
};

const ACTION_PROGRESS_RECORDERS = {
  shares: recordUserRepostProgress,
  likes: recordUserLikeProgress,
  bookmarks: recordUserSaveProgress,
};

function sortPostsByDate(posts) {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a?.criadoEm || 0).getTime();
    const dateB = new Date(b?.criadoEm || 0).getTime();
    return dateB - dateA;
  });
}

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

function postActionIsActive(post, action, userKeys) {
  const field = ACTIONS[action];
  if (!field) return false;
  return postHasUserAction(post, field, userKeys);
}

export default function PerfilColecao({
  tipo,
  irHome,
  irPerfil,
  irExplorar,
  irChat,
  onOpenPost,
  onOpenUserProfile,
  onStarAchievement,
  logado,
  onRequireAuth,
  contactRequests,
  onAcceptContact,
  onDeclineContact,
  unreadConversas,
  onOpenUnreadConversa,
  activityNotifications,
  onOpenActivityNotification,
  irNotificacoes,
  irConfiguracoes,
}) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [usuario, setUsuario] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [status, setStatus] = useState("loading");
  const [erroColecao, setErroColecao] = useState("");
  const config = COLLECTIONS[tipo] || COLLECTIONS.curtidos;

  useEffect(() => {
    let canceled = false;
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const currentUser = localUser || sessionUser || null;
    setUsuario(currentUser);

    async function loadCollection() {
      if (!currentUser) {
        setStatus("auth");
        setPosts([]);
        onRequireAuth?.("Entre para ver esta coleção.");
        return;
      }
      setStatus("loading");
      setErroColecao("");
      try {
        const lista = await fetchMyCollection(tipo);
        if (canceled) return;
        setPosts(Array.isArray(lista) ? sortPostsByDate(lista) : []);
        setStatus("ok");
      } catch (error) {
        if (canceled) return;
        setPosts([]);
        setErroColecao(error.message || "Não foi possível carregar a coleção.");
        setStatus("error");
      }
    }

    loadCollection();
    return () => {
      canceled = true;
    };
  }, [tipo]);

  function togglePostAction(postId, action) {
    const field = ACTIONS[action];
    const userKeys = getUserKeys(usuario);
    const ownerKey = userKeys[0];
    if (!field || !ownerKey) return;

    const currentPost = posts.find((post) => post.id === postId);
    const wasActive = currentPost ? postActionIsActive(currentPost, action, userKeys) : false;

    if (!wasActive) {
      const recorder = ACTION_PROGRESS_RECORDERS[action];
      if (typeof recorder === "function") {
        const { updatedUser, previousStars, newStars } = recorder(usuario);
        setUsuario(updatedUser);
        if (newStars > previousStars) {
          onStarAchievement?.(newStars);
        }
      }
    }

    const updatedPosts = posts.map((post) => {
      if (post.id !== postId) return post;

      const owners = Array.isArray(post[field]) ? post[field].map(normalizeKey) : [];
      const isActive = userKeys.some((key) => owners.includes(key));
      const nextOwners = isActive
        ? owners.filter((key) => !userKeys.includes(key))
        : [...new Set([...owners, ownerKey])];
      const currentValue = Number(post[action] || 0);

      return {
        ...post,
        [action]: isActive ? Math.max(0, currentValue - 1) : currentValue + 1,
        [field]: nextOwners,
      };
    });

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));
    setPosts(updatedPosts);

    if (usuario?.id && currentPost && !currentPost.isSeedFake) {
      const apiCall = action === "likes" ? likePost : action === "shares" ? sharePost : bookmarkPost;
      apiCall(postId, usuario.id).catch(() => {});
    }

    const nextSelectedPost = updatedPosts.find((post) => post.id === postId);
    const stillInThisCollection = nextSelectedPost
      ? postHasUserAction(nextSelectedPost, config.field, userKeys)
      : false;

    if (nextSelectedPost && stillInThisCollection) {
      setSelectedPost(nextSelectedPost);
    } else {
      setSelectedPost(null);
    }
  }

  function atualizarComentariosDoPost(postId, updater) {
    setPosts((prev) => {
      const next = prev.map((post) => (post.id === postId ? updater(post) : post));
      localStorage.setItem("posts", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));
      const atualizado = next.find((post) => post.id === postId);
      if (atualizado) setSelectedPost(atualizado);
      return next;
    });
  }

  function addCommentToPost(postId, texto, parentId = null, imagem = null) {
    if (!usuario) {
      onRequireAuth?.("Entre para comentar.");
      return;
    }
    const novo = {
      id: `c-${Date.now()}`,
      texto,
      parentId,
      imagem,
      username: usuario.username,
      handle: usuario.handle,
      email: usuario.email,
      fotoPerfil: usuario.fotoPerfil,
      criadoEm: new Date().toISOString(),
      likes: 0,
      likedBy: [],
    };
    atualizarComentariosDoPost(postId, (post) => {
      const list = Array.isArray(post.commentsList) ? post.commentsList : [];
      return { ...post, commentsList: [...list, novo], comments: list.length + 1 };
    });
    if (usuario.id) addComment(postId, usuario.id, texto, parentId, imagem).catch(() => {});
  }

  function deleteCommentFromPost(postId, commentId) {
    atualizarComentariosDoPost(postId, (post) => {
      const list = (Array.isArray(post.commentsList) ? post.commentsList : []).filter((c) => c.id !== commentId);
      return { ...post, commentsList: list, comments: list.length };
    });
    deleteComment(commentId).catch(() => {});
  }

  function toggleCommentLike(postId, commentId) {
    const key = getUserKeys(usuario)[0];
    atualizarComentariosDoPost(postId, (post) => ({
      ...post,
      commentsList: (Array.isArray(post.commentsList) ? post.commentsList : []).map((comment) => {
        if (comment.id !== commentId) return comment;
        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy.map(normalizeKey) : [];
        const already = key && likedBy.includes(key);
        return {
          ...comment,
          likedBy: already ? likedBy.filter((item) => item !== key) : key ? [...likedBy, key] : likedBy,
          likes: already ? Math.max(0, Number(comment.likes || 0) - 1) : Number(comment.likes || 0) + 1,
        };
      }),
    }));
    if (usuario?.id) likeComment(commentId, usuario.id).catch(() => {});
  }

  const selectedPostUserKeys = getUserKeys(usuario);
  useOverlayClose(!!selectedPost && !commentsOpen && !imagePreview, () => setSelectedPost(null));
  useOverlayClose(!!commentsOpen, () => setCommentsOpen(false));
  useOverlayClose(!!imagePreview, () => setImagePreview(null));

  return (
    <div className="home">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={irHome}
        irPerfil={irPerfil}
        irExplorar={irExplorar}
        irChat={irChat}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
        contactRequests={contactRequests}
        onAcceptContact={onAcceptContact}
        onDeclineContact={onDeclineContact}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={onOpenUnreadConversa}
        activityNotifications={activityNotifications}
        onOpenActivityNotification={onOpenActivityNotification}
        irNotificacoes={irNotificacoes}
        irConfiguracoes={irConfiguracoes}
      />

      <div id="conteudo-principal" className={`profile-page collection-shell${sidebarOpen ? "" : " sidebar-closed"}`}>
        <PageHeader
          eyebrow={config.kicker}
          title={config.title}
          description={config.description}
          backLabel="Voltar ao perfil"
          onBack={irPerfil}
        />

        <div className="profile-collection-page">
          {status === "loading" && (
            <div className="perfil-post-empty">
              <strong>Carregando...</strong>
              <p>Buscando sua coleção.</p>
            </div>
          )}
          {status === "auth" && (
            <div className="perfil-post-empty">
              <strong>Entre para ver esta coleção</strong>
              <p>Curtidos, posts salvos e republicados são pessoais.</p>
            </div>
          )}
          {status === "error" && (
            <div className="perfil-post-empty">
              <strong>Não foi possível carregar</strong>
              <p>{erroColecao}</p>
            </div>
          )}
          {status === "ok" && posts.length === 0 && (
            <div className="perfil-post-empty">
              <strong>{config.emptyTitle}</strong>
              <p>{config.empty}</p>
              <button type="button" className="perfil-empty-cta" onClick={irExplorar}>
                Explorar feed
              </button>
            </div>
          )}
          {status === "ok" && posts.length > 0 && (
            <div className="posts-list collection-posts-list">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="post-card"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="post-card-header">
                    <div
                      className="post-card-avatar"
                      style={avatarStyle(post.fotoPerfil, post.handle || post.username)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUserProfile?.(post);
                      }}
                    >
                      {!post.fotoPerfil && avatarInitial(post.username || post.handle)}
                    </div>
                    <div className="post-card-user">
                      <strong onClick={(e) => { e.stopPropagation(); onOpenUserProfile?.(post); }}>{post.username || "Usuário"}</strong>
                      <span className="post-card-handle">@{post.handle || post.username || "usuário"}</span>
                    </div>
                  </div>
                  {post.texto ? <PostContent texto={post.texto} /> : <p className="post-card-text">Post sem texto</p>}
                  {post.imagem && (
                    <button
                      type="button"
                      className="post-card-media"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(post.imagem);
                      }}
                    >
                      <img src={post.imagem} alt="" />
                    </button>
                  )}
                  <div className="post-card-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="post-card-actions-left">
                      <button
                        type="button"
                        aria-label="Curtir"
                        className={postActionIsActive(post, "likes", getUserKeys(usuario)) ? "active" : ""}
                        onClick={() => togglePostAction(post.id, "likes")}
                      >
                        <DsIcon icon={Icons.Heart} size="action" className="action-icon" fill={postActionIsActive(post, "likes", getUserKeys(usuario)) ? "currentColor" : "none"} />
                        {Number(post.likes || 0) > 0 && <strong>{post.likes}</strong>}
                      </button>
                      <button type="button" aria-label="Comentar" className="action-comment" onClick={() => { setSelectedPost(post); setCommentsOpen(true); }}>
                        <DsIcon icon={Icons.MessageCircle} size="action" className="action-icon" />
                        {Number(Array.isArray(post.commentsList) ? post.commentsList.length : post.comments || 0) > 0 && (
                          <strong>{Array.isArray(post.commentsList) ? post.commentsList.length : post.comments}</strong>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Repostar"
                        className={postActionIsActive(post, "shares", getUserKeys(usuario)) ? "active" : ""}
                        onClick={() => togglePostAction(post.id, "shares")}
                      >
                        <DsIcon icon={Icons.Repeat2} size="action" className="action-icon" />
                        {Number(post.shares || 0) > 0 && <strong>{post.shares}</strong>}
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Salvar"
                      className={postActionIsActive(post, "bookmarks", getUserKeys(usuario)) ? "active" : ""}
                      onClick={() => togglePostAction(post.id, "bookmarks")}
                    >
                      <DsIcon icon={Icons.Bookmark} size="action" className="action-icon" fill={postActionIsActive(post, "bookmarks", getUserKeys(usuario)) ? "currentColor" : "none"} />
                    </button>
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
              ×
            </button>

            <div className="post-card-header">
              <div
                className="post-card-avatar"
                style={{
                  backgroundImage: `url("${selectedPost.fotoPerfil || placeholderAvatarUri(selectedPost.handle || selectedPost.username || "usuario")}")`,
                }}
                onClick={() => {
                  setSelectedPost(null);
                  onOpenUserProfile?.(selectedPost);
                }}
              />
              <div className="post-card-user">
                <small className="post-card-handle">@{selectedPost.handle || selectedPost.username || "usuário"}</small>
                <strong
                  onClick={() => {
                    setSelectedPost(null);
                    onOpenUserProfile?.(selectedPost);
                  }}
                >
                  {selectedPost.username || "Usuário"}
                </strong>
              </div>
            </div>

            {selectedPost.texto ? <PostContent texto={selectedPost.texto} expanded className="post-expanded-text" /> : <p className="post-card-text">Post sem texto</p>}

            {selectedPost.imagem && (
              <button type="button" className="post-card-media" onClick={() => setImagePreview(selectedPost.imagem)}>
                <img src={selectedPost.imagem} alt="" />
              </button>
            )}

            <div className="post-card-actions post-expanded-actions">
              <div className="post-card-actions-left">
                <button
                  type="button"
                  aria-label="Curtir"
                  className={postActionIsActive(selectedPost, "likes", selectedPostUserKeys) ? "active" : ""}
                  onClick={() => togglePostAction(selectedPost.id, "likes")}
                >
                  <DsIcon icon={Icons.Heart} size="action" className="action-icon" fill={postActionIsActive(selectedPost, "likes", selectedPostUserKeys) ? "currentColor" : "none"} />
                  {Number(selectedPost.likes || 0) > 0 && <strong>{selectedPost.likes}</strong>}
                </button>
                <button type="button" className="action-comment" aria-label="Comentar" onClick={() => setCommentsOpen(true)}>
                  <DsIcon icon={Icons.MessageCircle} size="action" className="action-icon" />
                  {Number(Array.isArray(selectedPost.commentsList) ? selectedPost.commentsList.length : selectedPost.comments || 0) > 0 && (
                    <strong>{Array.isArray(selectedPost.commentsList) ? selectedPost.commentsList.length : selectedPost.comments}</strong>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Repostar"
                  className={postActionIsActive(selectedPost, "shares", selectedPostUserKeys) ? "active" : ""}
                  onClick={() => togglePostAction(selectedPost.id, "shares")}
                >
                  <DsIcon icon={Icons.Repeat2} size="action" className="action-icon" />
                  {Number(selectedPost.shares || 0) > 0 && <strong>{selectedPost.shares}</strong>}
                </button>
              </div>
              <button
                type="button"
                aria-label="Salvar"
                className={postActionIsActive(selectedPost, "bookmarks", selectedPostUserKeys) ? "active" : ""}
                onClick={() => togglePostAction(selectedPost.id, "bookmarks")}
              >
                <DsIcon icon={Icons.Bookmark} size="action" className="action-icon" fill={postActionIsActive(selectedPost, "bookmarks", selectedPostUserKeys) ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      )}

      {commentsOpen && selectedPost && (
        <div className="post-preview-overlay comments-overlay" onClick={() => setCommentsOpen(false)}>
          <div className="comments-popup" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setCommentsOpen(false)} type="button" title="Fechar">
              ×
            </button>
            <div className="comments-popup-head">
              <div
                className="post-card-avatar"
                style={{ backgroundImage: selectedPost.fotoPerfil ? `url("${selectedPost.fotoPerfil}")` : "none" }}
              />
              <div>
                <small className="post-card-handle">@{selectedPost.handle || selectedPost.username}</small>
                <strong>{selectedPost.username || "Usuário"}</strong>
              </div>
            </div>
            {selectedPost.texto ? <PostContent texto={selectedPost.texto} expanded className="comments-popup-text" /> : <p className="comments-popup-text">Post sem texto</p>}
            <PostComments
              postId={selectedPost.id}
              isExpanded
              comments={selectedPost.commentsList || []}
              onAddComment={addCommentToPost}
              onDeleteComment={deleteCommentFromPost}
              onToggleCommentLike={toggleCommentLike}
              usuario={usuario}
              onOpenUserProfile={onOpenUserProfile}
              onRequireAuth={onRequireAuth}
            />
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="post-preview-overlay" onClick={() => setImagePreview(null)} role="presentation">
          <div className="image-only-popup" role="dialog" aria-modal="true" aria-label="Imagem do post" onClick={(e) => e.stopPropagation()}>
            <button className="post-expanded-close" onClick={() => setImagePreview(null)} aria-label="Fechar">
              ×
            </button>
            <img src={imagePreview} alt="Imagem ampliada do post" />
          </div>
        </div>
      )}
    </div>
  );
}

