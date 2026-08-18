import { useEffect, useState } from "react";
import { useOverlayClose } from "./hooks/useOverlayClose";
import Login from "./paginas/login";
import Home from "./paginas/Home";
import { persistSidebarOpen } from "./hooks/useSidebarOpen";
import Perfil from "./paginas/perfil";
import PerfilColecao from "./paginas/PerfilColecao";
import Explorar from "./paginas/explorar";
import Chat from "./paginas/Chat";
import Notificacoes from "./paginas/Notificacoes";
import Configuracoes from "./paginas/Configuracoes";
import NaoEncontrada from "./paginas/NaoEncontrada";
import PostModal from "./components/PostModal";
import { readSessionUser } from "./utils/storage";
import { placeholderAvatarUri, usableFotoPerfil } from "./utils/avatar";
import { clearAuthToken } from "./api";
import {
  isSameUser,
  recordUserPostProgress,
  syncUsersStarProgress,
} from "./utils/starProgress";
import {
  fetchUser,
  sendContactRequest,
  fetchContactRequests,
  acceptContactRequest,
  declineContactRequest,
  fetchUnreadConversas,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markMessageNotificationsAsRead,
  blockUser,
  unblockUser,
  fetchBlockedUsers,
  updateNotifPrefs,
} from "./api";

function fakeAvatar(handle) {
  return placeholderAvatarUri(handle || "usuario");
}

function fakeCover(handle) {
  return `https://picsum.photos/seed/${encodeURIComponent((handle || "usuario") + "-cover")}/1200/320`;
}

function isFakeCommunityUser(user) {
  const email = (user?.email || "").toLowerCase();
  return email.endsWith("@dev.com") || email.endsWith("@devspace.fake");
}

function scoreUser(user) {
  return (
    (user?.bio ? 3 : 0) +
    (user?.fotoPerfil ? 3 : 0) +
    (user?.fotoCapa ? 2 : 0) +
    (user?.email ? 1 : 0) +
    (user?.username ? 1 : 0)
  );
}

function userImageBackupKey(user) {
  return String(user?.email || user?.handle || user?.username || "").toLowerCase();
}

function getUserImageBackup(user) {
  try {
    const backups = JSON.parse(localStorage.getItem("profileImageBackups")) || {};
    return backups[userImageBackupKey(user)] || null;
  } catch {
    return null;
  }
}

function mergeUserRecord(baseUser, nextUser) {
  if (!baseUser) return nextUser;
  if (!nextUser) return baseUser;
  const backup = getUserImageBackup(nextUser) || getUserImageBackup(baseUser);

  return {
    ...baseUser,
    ...nextUser,
    username: nextUser.username || baseUser.username,
    handle: nextUser.handle || baseUser.handle,
    email: nextUser.email || baseUser.email,
    bio: nextUser.bio || baseUser.bio,
    fotoPerfil: nextUser.fotoPerfil || baseUser.fotoPerfil || backup?.fotoPerfil || "",
    fotoCapa: nextUser.fotoCapa || baseUser.fotoCapa || backup?.fotoCapa || "",
    posPerfil: nextUser.posPerfil || baseUser.posPerfil || backup?.posPerfil,
    posCapa: nextUser.posCapa || baseUser.posCapa || backup?.posCapa,
    zoomPerfil: nextUser.zoomPerfil || baseUser.zoomPerfil || backup?.zoomPerfil,
    zoomCapa: nextUser.zoomCapa || baseUser.zoomCapa || backup?.zoomCapa,
    seguindo: Array.isArray(nextUser.seguindo) ? nextUser.seguindo : baseUser.seguindo,
    seguidores: Math.max(Number(baseUser.seguidores || 0), Number(nextUser.seguidores || 0)),
    starStats: {
      ...(baseUser.starStats || {}),
      ...(nextUser.starStats || {}),
    },
  };
}

function StarAchievement({ open, stars, onClose }) {
  useOverlayClose(open, onClose);
  if (!open) return null;
  const count = Math.max(1, Math.min(5, Number(stars || 1)));

  return (
    <div
      className="achievement-overlay"
      aria-live="polite"
      role="dialog"
      aria-label="Conquista desbloqueada"
      onClick={onClose}
    >
      <div className="achievement-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="achievement-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <div className="achievement-label">Conquista desbloqueada</div>
        <h2>{count === 1 ? "Primeiro post publicado" : `Nível ${count} alcançado`}</h2>
        <p>Seu perfil ganhou {count === 1 ? "a primeira estrela" : `${count} estrelas`}.</p>
        <div className="achievement-stars" aria-label={`${count} de 5 estrelas`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={index < count ? "achievement-star earned" : "achievement-star"}>
              &#9733;
            </span>
          ))}
        </div>
        <button type="button" className="achievement-dismiss" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}

function AuthGate({ mensagem, onEntrar, onFechar }) {
  useOverlayClose(true, onFechar);
  return (
    <div className="auth-gate-overlay" onClick={onFechar} role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
      <div className="auth-gate-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-gate-close" onClick={onFechar} type="button" title="Fechar" aria-label="Fechar">
          ×
        </button>
        <h2 id="auth-gate-title">Entre no DevSpace</h2>
        <p>{mensagem}</p>
        <div className="auth-gate-actions">
          <button type="button" className="auth-gate-primary" onClick={onEntrar}>
            Entrar ou criar conta
          </button>
          <button type="button" className="auth-gate-ghost" onClick={onFechar}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

const LEGACY_COMMUNITY_USERS = [
  { username: "Lia Gomes", handle: "liagomes", email: "lia.gomes@dev.com", bio: "Compartilhando ideias, rotina e pequenos avanços no DevSpace." },
  { username: "Felipe Rocha", handle: "feliperocha", email: "felipe.rocha@dev.com", bio: "Desenvolvedor em modo protótipo, teste e café." },
  { username: "Nina Correa", handle: "ninacorrea", email: "nina.correa@dev.com", bio: "Aprendendo front-end, animações e interfaces mais fluidas." },
  { username: "Arthur Silva", handle: "arthursilva", email: "arthur.silva@dev.com", bio: "Design, produto e detalhes que deixam apps melhores." },
  { username: "Xande", handle: "xande", email: "xande@dev.com", bio: "Conta antiga da comunidade DevSpace." },
  { username: "Xande7", handle: "xande7", email: "xande7@devspace.fake", bio: "Perfil da comunidade DevSpace." },
  { username: "Maria Silva", handle: "mariasilva", email: "mariasilva@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Carlos Devs", handle: "carlosdevs", email: "carlosdevs@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Ana Tech", handle: "anatech", email: "anatech@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Pedro Code", handle: "pedrocode", email: "pedrocode@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Bruna UX", handle: "brunaux", email: "brunaux@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Vitor Front", handle: "vitorfront", email: "vitorfront@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Caio Stack", handle: "caiostack", email: "caiostack@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
  { username: "Duda Product", handle: "dudaproduct", email: "dudaproduct@devspace.fake", bio: "Pessoa da comunidade DevSpace." },
];

const COLLECTION_TYPES = new Set(["curtidos", "salvos", "republicados"]);

function getRouteFromLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (!parts.length) {
    return { pagina: "home", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (["login", "entrar", "register", "cadastro", "signup"].includes(parts[0])) {
    return { pagina: "login", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (parts[0] === "explorar") {
    return { pagina: "explorar", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (parts[0] === "chat") {
    return { pagina: "chat", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (parts[0] === "notificacoes") {
    return { pagina: "notificacoes", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (parts[0] === "configuracoes") {
    return { pagina: "configuracoes", perfilAlvo: null, perfilCollection: "curtidos" };
  }

  if (parts[0] === "perfil" && parts[1] === "colecao" && COLLECTION_TYPES.has(parts[2])) {
    return { pagina: "perfilColecao", perfilAlvo: null, perfilCollection: parts[2] };
  }

  if (parts[0] === "perfil") {
    const handle = parts[1]?.replace(/^@+/, "");
    return {
      pagina: "perfil",
      perfilAlvo: handle ? { handle } : null,
      perfilCollection: "curtidos",
    };
  }

  return { pagina: "naoEncontrada", perfilAlvo: null, perfilCollection: "curtidos" };
}

function buildRouteUrl(pagina, perfilAlvo, perfilCollection) {
  if (pagina === "naoEncontrada") return window.location.pathname || "/";
  if (pagina === "login") return "/login";
  if (pagina === "explorar") return "/explorar";
  if (pagina === "chat") return "/chat";
  if (pagina === "notificacoes") return "/notificacoes";
  if (pagina === "configuracoes") return "/configuracoes";
  if (pagina === "perfilColecao") return `/perfil/colecao/${perfilCollection || "curtidos"}`;
  if (pagina === "perfil") {
    const handle = (perfilAlvo?.handle || "").replace(/^@+/, "").trim();
    return handle ? `/perfil/${encodeURIComponent(handle)}` : "/perfil";
  }
  return "/";
}

function createHistoryState(pagina, perfilAlvo, perfilCollection) {
  return {
    devspace: true,
    pagina,
    perfilAlvo,
    perfilCollection,
  };
}

function createInitialRouteState() {
  return getRouteFromLocation();
}

function createCommunityUser(user) {
  const handle = (user.handle || user.username || "usuario").replace(/\s+/g, "").toLowerCase();
  return {
    username: user.username || "Usuário",
    handle,
    email: user.email || `${handle}@devspace.fake`,
    senha: "123456",
    criadoEm: new Date().toISOString(),
    bio: user.bio || "Perfil da comunidade DevSpace.",
    fotoPerfil: usableFotoPerfil(user.fotoPerfil) || fakeAvatar(handle),
    fotoCapa: user.fotoCapa || fakeCover(handle),
    estrelas: 0,
    avaliacao: 0,
    starStats: {
      postsCreated: 0,
      commentsMade: 0,
      firstPostAwarded: false,
    },
    projetos: [],
    seguidores: 0,
    seguindo: [],
    comments: 0,
    isAdmin: false,
  };
}

function getStoredUsuario() {
  return readSessionUser();
}

function normalizeStoredPost(post) {
  if (!post || typeof post !== "object") return null;
  const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
  const handle = (post.handle || post.username || "usuario").replace(/\s+/g, "").toLowerCase();
  const comments = post.isSeedFake
    ? commentsList.length || Number(post.comments || 0)
    : commentsList.length;

  return {
    ...post,
    id: Number(post.id) || Date.now(),
    username: post.username || "Usuário",
    handle,
    email: post.email || "",
    fotoPerfil: post.fotoPerfil || "",
    texto: post.texto || "",
    imagem: post.imagem || "",
    anexo: post.anexo && post.anexo.url ? post.anexo : null,
    criadoEm: post.criadoEm || new Date().toISOString(),
    comments,
    commentsList,
    isSeedFake: !!post.isSeedFake,
    shares: Number(post.shares || 0),
    likes: Number(post.likes || 0),
    bookmarks: Number(post.bookmarks || 0),
    likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
    savedBy: Array.isArray(post.savedBy) ? post.savedBy : [],
    repostedBy: Array.isArray(post.repostedBy) ? post.repostedBy : [],
  };
}

function sanitizeStoredPosts(posts) {
  if (!Array.isArray(posts)) return [];
  return posts
    .map(normalizeStoredPost)
    .filter((post) => post && (post.email || post.username || post.handle));
}

function stripPostForStorage(post) {
  const isSeedFake = !!post?.isSeedFake || (post?.email || "").toLowerCase().endsWith("@dev.com");
  const commentsList = Array.isArray(post?.commentsList)
    ? post.commentsList.map((comment) => ({
        ...comment,
        fotoPerfil: "",
      }))
    : [];

  return {
    ...post,
    fotoPerfil: "",
    imagem: isSeedFake ? "" : post?.imagem || "",
    anexo:
      post?.anexo?.url && !String(post.anexo.url).startsWith("data:")
        ? {
            url: post.anexo.url,
            tipo: post.anexo.tipo || "",
            nome: post.anexo.nome || "arquivo",
            tamanho: post.anexo.tamanho || null,
          }
        : null,
    commentsList,
  };
}

function savePostsToStorage(posts) {
  const storagePosts = sanitizeStoredPosts(posts).map(stripPostForStorage);
  const serializedPosts = JSON.stringify(storagePosts);
  try {
    localStorage.setItem("posts", serializedPosts);
  } catch (_error) {
    localStorage.removeItem("posts");
    try {
      localStorage.setItem("posts", serializedPosts);
    } catch (_retryError) {
      const emergencyPosts = storagePosts.map((post) => ({ ...post, imagem: "" }));
      localStorage.removeItem("profileImageBackups");
      localStorage.setItem("posts", JSON.stringify(emergencyPosts));
      return emergencyPosts;
    }
  }
  return storagePosts;
}

function App() {
  const [route, setRoute] = useState(createInitialRouteState);
  const [logado, setLogado] = useState(() => {
    const jaLogado = !!getStoredUsuario();
    if (jaLogado && !window.matchMedia("(max-width: 760px)").matches) persistSidebarOpen(true);
    return jaLogado;
  });
  const [usuario, setUsuario] = useState(() => getStoredUsuario());
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postRefresh, setPostRefresh] = useState(0);
  const [lastCreatedPostId, setLastCreatedPostId] = useState(null);
  const [achievementStars, setAchievementStars] = useState(0);
  const [chatAlvo, setChatAlvo] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [authGateMsg, setAuthGateMsg] = useState(null);
  const [contactRequestsRaw, setContactRequestsRaw] = useState([]);
  const [unreadConversasRaw, setUnreadConversasRaw] = useState([]);
  const [activityNotificationsRaw, setActivityNotificationsRaw] = useState([]);
  // Historico completo (lidas + nao lidas), independente do que aparece no
  // sininho/badge -- usado so pela pagina de Notificacoes, que precisa
  // continuar mostrando os avisos mesmo depois de marcados como lidos.
  const [activityNotificationsAllRaw, setActivityNotificationsAllRaw] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState({ contatos: true, mensagens: true, atividade: true });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [contactFeedback, setContactFeedback] = useState("");
  const pagina = route.pagina;
  const perfilAlvo = route.perfilAlvo;
  const perfilCollection = route.perfilCollection;

  // Preferencias de notificacao sao so um "mudo" local por categoria: as
  // notificacoes continuam sendo geradas no backend normalmente, mas a
  // categoria desativada some da lista/badge em todo o site.
  const contactRequests = notifPrefs.contatos ? contactRequestsRaw : [];
  const unreadConversas = notifPrefs.mensagens ? unreadConversasRaw : [];
  const activityNotifications = notifPrefs.atividade ? activityNotificationsRaw : [];
  const activityNotificationsAll = notifPrefs.atividade ? activityNotificationsAllRaw : [];

  const blockedIds = new Set(blockedUsers.map((u) => u.id));
  const blockedHandles = new Set(blockedUsers.map((u) => (u.handle || "").toLowerCase()));

  function isUsuarioBloqueado(userRef) {
    if (!userRef) return false;
    if (userRef.id && blockedIds.has(userRef.id)) return true;
    const handle = (userRef.handle || userRef.username || "").toLowerCase();
    return handle ? blockedHandles.has(handle) : false;
  }

  function notifPrefsStorageKey() {
    return `notifPrefs_${usuario?.id || usuario?.handle || usuario?.email || "anon"}`;
  }

  function atualizarNotifPref(tipo, valor) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [tipo]: valor };
      try {
        localStorage.setItem(notifPrefsStorageKey(), JSON.stringify(next));
      } catch {
        // ignora; a preferencia so nao persiste entre sessoes
      }
      if (usuario?.id) updateNotifPrefs(next).catch(() => {});
      return next;
    });
  }

  async function recarregarBloqueados() {
    if (!usuario?.id) {
      setBlockedUsers([]);
      return;
    }
    try {
      const lista = await fetchBlockedUsers(usuario.id);
      setBlockedUsers(Array.isArray(lista) ? lista : []);
    } catch {
      // backend indisponivel; mantem a lista atual
    }
  }

  async function bloquearUsuario(usuarioAlvoId) {
    if (!usuario?.id || !usuarioAlvoId) return;
    try {
      await blockUser(usuarioAlvoId, usuario.id);
      await recarregarBloqueados();
    } catch (error) {
      setContactFeedback(error.message || "Não foi possível bloquear este perfil.");
    }
  }

  async function desbloquearUsuario(usuarioAlvoId) {
    if (!usuario?.id || !usuarioAlvoId) return;
    try {
      await unblockUser(usuarioAlvoId, usuario.id);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== usuarioAlvoId));
    } catch (error) {
      setContactFeedback(error.message || "Não foi possível desbloquear este perfil.");
    }
  }

  async function recarregarContactRequests() {
    if (!usuario?.id) {
      setContactRequestsRaw([]);
      return;
    }
    try {
      const lista = await fetchContactRequests(usuario.id);
      setContactRequestsRaw(Array.isArray(lista) ? lista : []);
    } catch {
      // backend indisponivel; mantem a lista atual
    }
  }

  async function recarregarMensagensNaoLidas() {
    if (!usuario?.id) {
      setUnreadConversasRaw([]);
      return;
    }
    try {
      const lista = await fetchUnreadConversas(usuario.id);
      setUnreadConversasRaw(Array.isArray(lista) ? lista : []);
    } catch {
      // backend indisponivel; mantem a lista atual
    }
  }

  async function recarregarNotificacoes() {
    if (!usuario?.id) {
      setActivityNotificationsRaw([]);
      setActivityNotificationsAllRaw([]);
      return;
    }
    try {
      const lista = await fetchNotifications(usuario.id);
      const arr = Array.isArray(lista) ? lista : [];
      // So mantem as nao lidas: sem isso, uma notificacao ja vista/marcada
      // como lida voltava a aparecer no proximo polling (o backend devolve
      // o historico inteiro, lidas e nao lidas, nessa mesma rota). Essa lista
      // e so o que conta pro sininho/badge -- a pagina de Notificacoes usa o
      // historico completo (activityNotificationsAllRaw) pra continuar
      // mostrando os avisos mesmo depois de vistos.
      setActivityNotificationsRaw(arr.filter((n) => !n.lida));
      setActivityNotificationsAllRaw(arr);
    } catch {
      // backend indisponivel; mantem a lista atual
    }
  }

  // Notificacoes de atividade (curtida/comentario/mencao) só somem quando
  // voce realmente "consome" o conteudo: clicando nela na lista, ou vendo o
  // post referenciado aparecer no feed (mesmo sem ter clicado na notificacao).
  async function marcarNotificacoesDoPostComoVistas(postId) {
    if (!postId) return;
    // Compara como string: o id pode chegar como numero (clique na notificacao)
    // ou como string (data-post-card-id lido do DOM pelo IntersectionObserver).
    const idsParaMarcar = activityNotificationsRaw
      .filter((n) => String(n.postId) === String(postId))
      .map((n) => n.id);
    if (idsParaMarcar.length === 0) return;

    setActivityNotificationsRaw((prev) => prev.filter((n) => String(n.postId) !== String(postId)));
    try {
      await Promise.all(idsParaMarcar.map((id) => markNotificationAsRead(id)));
    } catch {
      // backend indisponivel; o proximo polling reflete o estado real
    }
  }

  // Busca solicitacoes de contato pendentes, mensagens nao lidas e
  // notificacoes de atividade (curtida/comentario/mencao) ao logar e
  // periodicamente (nao ha websocket, entao um polling leve serve como
  // "notificacao").
  useEffect(() => {
    if (!usuario?.id) {
      setContactRequestsRaw([]);
      setUnreadConversasRaw([]);
      setActivityNotificationsRaw([]);
      setBlockedUsers([]);
      return;
    }
    try {
      if (usuario?.notifPrefs) {
        setNotifPrefs({
          contatos: usuario.notifPrefs.contatos !== false,
          mensagens: usuario.notifPrefs.mensagens !== false,
          atividade: usuario.notifPrefs.atividade !== false,
        });
      } else {
        const salvo = JSON.parse(localStorage.getItem(notifPrefsStorageKey()));
        setNotifPrefs({
          contatos: salvo?.contatos !== false,
          mensagens: salvo?.mensagens !== false,
          atividade: salvo?.atividade !== false,
        });
      }
    } catch {
      setNotifPrefs({ contatos: true, mensagens: true, atividade: true });
    }
    recarregarContactRequests();
    recarregarMensagensNaoLidas();
    recarregarNotificacoes();
    recarregarBloqueados();
    const intervalo = window.setInterval(() => {
      recarregarContactRequests();
      recarregarMensagensNaoLidas();
      recarregarNotificacoes();
      recarregarBloqueados();
    }, 20000);
    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => {
    if (!contactFeedback) return;
    const timeout = window.setTimeout(() => setContactFeedback(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [contactFeedback]);

  useEffect(() => {
    // Limpa e migra posts antigos
    try {
      const posts = JSON.parse(localStorage.getItem("posts")) || [];
      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const localUser = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
      const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
      const postsValidos = posts.filter((post) => {
        return post && (post.email || post.username || post.handle);
      });

      const postsMigrados = postsValidos.map((post) => {
        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
        const isSeedFake = !!post.isSeedFake;
        const comments = isSeedFake
          ? commentsList.length || Number(post.comments || 0)
          : commentsList.length;

        return {
          ...post,
          criadoEm: post.criadoEm || new Date().toISOString(),
          commentsList,
          isSeedFake,
          comments,
          shares: Number(post.shares || 0),
          likes: Number(post.likes || 0),
          bookmarks: Number(post.bookmarks || 0),
          likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
          savedBy: Array.isArray(post.savedBy) ? post.savedBy : [],
          repostedBy: Array.isArray(post.repostedBy) ? post.repostedBy : [],
        };
      });

      savePostsToStorage(postsMigrados);

      const sessionCandidates = [localUser, sessionUser].filter(Boolean);
      const usersWithSession = [...usuarios];
      sessionCandidates.forEach((candidate) => {
        const existingIndex = usersWithSession.findIndex((user) => isSameUser(user, candidate));
        if (existingIndex >= 0) {
          usersWithSession[existingIndex] = mergeUserRecord(usersWithSession[existingIndex], candidate);
        } else {
          usersWithSession.push(candidate);
        }
      });

      const byEmail = new Set(usersWithSession.map((u) => (u.email || "").toLowerCase()));
      const byHandle = new Set(usersWithSession.map((u) => (u.handle || "").toLowerCase()).filter(Boolean));
      const novosUsuarios = usersWithSession.map((u) => {
        const handle = (u.handle || u.username || "usuario").replace(/\s+/g, "").toLowerCase();
        const isLikelyFake = isFakeCommunityUser(u);
        if (!isLikelyFake) return u;
        return {
          ...u,
          handle,
          fotoPerfil: usableFotoPerfil(u.fotoPerfil) || fakeAvatar(handle),
          fotoCapa: u.fotoCapa || fakeCover(handle),
        };
      });
      LEGACY_COMMUNITY_USERS.forEach((legacyUser) => {
        const email = (legacyUser.email || "").toLowerCase();
        const handle = (legacyUser.handle || "").toLowerCase();
        if (byEmail.has(email) || byHandle.has(handle)) return;

        byEmail.add(email);
        byHandle.add(handle);
        novosUsuarios.push(createCommunityUser(legacyUser));
      });
      postsMigrados.forEach((post) => {
        const email = (post.email || `${post.handle || post.username}@devspace.fake`).toLowerCase();
        const handle = (post.handle || post.username || "usuario").replace(/\s+/g, "").toLowerCase();
        if (!byEmail.has(email)) {
          byEmail.add(email);
          novosUsuarios.push({
            username: post.username || "Usuário",
            handle,
            email,
            senha: "123456",
            criadoEm: post.criadoEm || new Date().toISOString(),
            bio: "Perfil da comunidade DevSpace.",
            fotoPerfil: usableFotoPerfil(post.fotoPerfil) || fakeAvatar(handle),
            fotoCapa: fakeCover(handle),
            estrelas: 0,
            avaliacao: 0,
            starStats: {
              postsCreated: 0,
              commentsMade: 0,
              firstPostAwarded: false,
            },
            projetos: [],
            seguidores: 0,
            seguindo: [],
            comments: 0,
            isAdmin: false,
          });
        }
        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
        commentsList.forEach((comment) => {
          const cEmail = (comment.email || `${comment.handle || comment.username}@devspace.fake`).toLowerCase();
          const cHandle = (comment.handle || comment.username || "usuario").replace(/\s+/g, "").toLowerCase();
          if (!byEmail.has(cEmail)) {
            byEmail.add(cEmail);
            novosUsuarios.push({
              username: comment.username || "Usuário",
              handle: cHandle,
              email: cEmail,
              senha: "123456",
              criadoEm: comment.criadoEm || new Date().toISOString(),
              bio: "Pessoa da comunidade DevSpace.",
              fotoPerfil: usableFotoPerfil(comment.fotoPerfil) || fakeAvatar(cHandle),
              fotoCapa: fakeCover(cHandle),
              estrelas: 0,
              avaliacao: 0,
              starStats: {
                postsCreated: 0,
                commentsMade: 0,
                firstPostAwarded: false,
              },
              projetos: [],
              seguidores: 0,
              seguindo: [],
              comments: 0,
              isAdmin: false,
            });
          }
        });
      });
      const enrichedUsers = novosUsuarios.map((u) => {
        const handle = (u.handle || u.username || "usuario").replace(/\s+/g, "").toLowerCase();
        if (!isFakeCommunityUser(u)) return { ...u, handle };
        return {
          ...u,
          handle,
          fotoPerfil: usableFotoPerfil(u.fotoPerfil) || fakeAvatar(handle),
          fotoCapa: u.fotoCapa || fakeCover(handle),
        };
      });
      const usersByEmail = new Map(
        enrichedUsers.map((u) => [String(u.email || "").toLowerCase(), (u.handle || "").toLowerCase()])
      );
      const usersByHandle = new Set(
        enrichedUsers.map((u) => String(u.handle || "").toLowerCase()).filter(Boolean)
      );
      const migratedUsers = enrichedUsers.map((u) => {
        const seguindoRaw = Array.isArray(u.seguindo) ? u.seguindo : [];
        const seguindoNormalized = seguindoRaw
          .map((entry) => {
            const key = String(entry || "").toLowerCase();
            if (!key) return "";
            if (usersByHandle.has(key)) return key;
            if (usersByEmail.has(key)) return usersByEmail.get(key) || "";
            return "";
          })
          .filter(Boolean);
        const seguindo = [...new Set(seguindoNormalized)];
        return {
          ...u,
          seguindo,
        };
      });

      const dedupedMap = new Map();
      migratedUsers.forEach((u) => {
        const handle = String(u.handle || u.username || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const key = handle || email;
        if (!key) return;
        const prev = dedupedMap.get(key);
        if (!prev) {
          dedupedMap.set(key, u);
          return;
        }
        const keepCurrent = scoreUser(u) > scoreUser(prev);
        dedupedMap.set(key, mergeUserRecord(keepCurrent ? prev : u, keepCurrent ? u : prev));
      });

      const dedupedUsers = syncUsersStarProgress([...dedupedMap.values()], postsMigrados);
      const repairedPosts = postsMigrados.map((post) => {
        const postUser = dedupedUsers.find((user) => isSameUser(user, post));
        const commentsList = Array.isArray(post.commentsList)
          ? post.commentsList.map((comment) => {
              const commentUser = dedupedUsers.find((user) => isSameUser(user, comment));
              if (!commentUser) return comment;
              return {
                ...comment,
                username: comment.username || commentUser.username,
                handle: comment.handle || commentUser.handle,
                email: comment.email || commentUser.email,
                fotoPerfil: comment.fotoPerfil || commentUser.fotoPerfil || "",
              };
            })
          : [];

        if (!postUser) {
          return {
            ...post,
            commentsList,
          };
        }

        return {
          ...post,
          username: post.username || postUser.username,
          handle: post.handle || postUser.handle,
          email: post.email || postUser.email,
          fotoPerfil: post.fotoPerfil || postUser.fotoPerfil || "",
          commentsList,
        };
      });

      localStorage.setItem("usuarios", JSON.stringify(dedupedUsers));
      savePostsToStorage(repairedPosts);
      const syncedLocal = localUser && dedupedUsers.find((user) => isSameUser(user, localUser));
      const syncedSession = sessionUser && dedupedUsers.find((user) => isSameUser(user, sessionUser));
      if (syncedLocal) localStorage.setItem("usuarioLogado", JSON.stringify(syncedLocal));
      if (syncedSession) sessionStorage.setItem("usuarioLogado", JSON.stringify(syncedSession));
    } catch (error) {
      console.warn("Erro ao limpar posts:", error);
    }
  }, []);

  useEffect(() => {
    const currentUrl = buildRouteUrl(pagina, perfilAlvo, perfilCollection);
    window.history.replaceState(
      createHistoryState(pagina, perfilAlvo, perfilCollection),
      "",
      currentUrl
    );

    const handlePopState = (event) => {
      const route = event.state?.devspace ? event.state : getRouteFromLocation();
      setRoute({
        pagina: route.pagina || "home",
        perfilAlvo: route.perfilAlvo || null,
        perfilCollection: route.perfilCollection || "curtidos",
      });
      setIsPostModalOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (logado) {
      setUsuario(readSessionUser());
    } else {
      setUsuario(null);
    }
  }, [logado]);

  useEffect(() => {
    function onUnauthorized() {
      clearAuthToken();
      localStorage.removeItem("usuarioLogado");
      sessionStorage.removeItem("usuarioLogado");
      localStorage.removeItem("lembrarMe");
      setLogado(false);
      setUsuario(null);
      setMostrarLogin(true);
    }
    window.addEventListener("devspace:unauthorized", onUnauthorized);
    return () => window.removeEventListener("devspace:unauthorized", onUnauthorized);
  }, []);

  function handleOpenPost() {
    setUsuario(getStoredUsuario());
    setIsPostModalOpen(true);
  }

  function handleClosePost() {
    setIsPostModalOpen(false);
  }

  function navigate(next) {
    const hasPerfilAlvo = Object.prototype.hasOwnProperty.call(next, "perfilAlvo");
    const hasPerfilCollection = Object.prototype.hasOwnProperty.call(next, "perfilCollection");
    const nextPagina = next.pagina || pagina;
    const nextPerfilAlvo = hasPerfilAlvo ? next.perfilAlvo : perfilAlvo;
    const nextPerfilCollection = hasPerfilCollection ? next.perfilCollection : perfilCollection;
    const nextUrl = buildRouteUrl(nextPagina, nextPerfilAlvo, nextPerfilCollection);

    setRoute({
      pagina: nextPagina,
      perfilAlvo: nextPerfilAlvo,
      perfilCollection: nextPerfilCollection,
    });
    setIsPostModalOpen(false);

    window.history.pushState(
      createHistoryState(nextPagina, nextPerfilAlvo, nextPerfilCollection),
      "",
      nextUrl
    );
  }

  function irParaConfiguracoes() {
    navigate({ pagina: "configuracoes", perfilAlvo: null });
  }

  function abrirPerfilAlvo(userRef) {
    if (!userRef) return;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const byEmail = userRef.email
      ? usuarios.find((u) => (u.email || "").toLowerCase() === userRef.email.toLowerCase())
      : null;
    const byHandle = !byEmail
      ? usuarios.find((u) => (u.handle || "").toLowerCase() === (userRef.handle || "").toLowerCase())
      : null;
    const storedUser = byEmail || byHandle || null;
    const handle = (userRef.handle || storedUser?.handle || userRef.username || storedUser?.username || "usuario")
      .replace(/\s+/g, "")
      .toLowerCase();
    const mergedUser = {
      ...(storedUser || {}),
      ...userRef,
      handle,
      bio: userRef.bio || storedUser?.bio || "Perfil da comunidade DevSpace.",
      fotoPerfil: userRef.fotoPerfil || storedUser?.fotoPerfil || (isFakeCommunityUser(userRef) ? fakeAvatar(handle) : ""),
      fotoCapa: userRef.fotoCapa || storedUser?.fotoCapa || (isFakeCommunityUser(userRef) ? fakeCover(handle) : ""),
    };
    const alvo = mergedUser;

    if (storedUser) {
      const updatedUsers = usuarios.map((u) => {
        const sameEmail = alvo.email && u.email && u.email.toLowerCase() === alvo.email.toLowerCase();
        const sameHandle = handle && (u.handle || "").toLowerCase() === handle;
        return sameEmail || sameHandle ? { ...u, ...alvo } : u;
      });
      localStorage.setItem("usuarios", JSON.stringify(updatedUsers));
    } else if (isFakeCommunityUser(alvo)) {
      localStorage.setItem("usuarios", JSON.stringify([...usuarios, alvo]));
    }

    navigate({ pagina: "perfil", perfilAlvo: alvo });
  }

  async function abrirChatCom(userRef) {
    if (!userRef) return;

    if (isUsuarioBloqueado(userRef)) {
      setContactFeedback("Não é possível contatar este perfil.");
      return;
    }

    if (!usuario?.id) {
      setChatAlvo(userRef);
      navigate({ pagina: "chat", perfilAlvo: null });
      return;
    }

    // Resolve o id de destino direto no backend pelo handle, em vez de
    // confiar no que veio em userRef (que pode estar desatualizado por
    // vir de um cache local antigo). Se nao existir no backend, e um
    // perfil bot/demonstracao: cai pro chat local instantaneo.
    let destinatarioId = null;
    try {
      const fresco = await fetchUser(userRef.handle || userRef.username);
      destinatarioId = fresco?.id || null;
    } catch {
      destinatarioId = null;
    }

    if (!destinatarioId) {
      setChatAlvo(userRef);
      navigate({ pagina: "chat", perfilAlvo: null });
      return;
    }

    try {
      const resposta = await sendContactRequest(destinatarioId, usuario.id);
      if (resposta.status === "conversa_existente") {
        setChatAlvo({ ...userRef, id: destinatarioId });
        navigate({ pagina: "chat", perfilAlvo: null });
        return;
      }
      setContactFeedback(`Solicitação de contato enviada para ${userRef.username || userRef.handle}.`);
    } catch (error) {
      setContactFeedback(error.message || "Não foi possível enviar a solicitação de contato.");
    }
  }

  async function aceitarSolicitacaoContato(solicitacaoId) {
    if (!usuario?.id) return;
    const solicitacao = contactRequests.find((r) => r.id === solicitacaoId);
    try {
      await acceptContactRequest(solicitacaoId, usuario.id);
      setContactRequestsRaw((prev) => prev.filter((r) => r.id !== solicitacaoId));
      if (solicitacao?.remetente) {
        setChatAlvo(solicitacao.remetente);
        navigate({ pagina: "chat", perfilAlvo: null });
      }
    } catch (error) {
      setContactFeedback(error.message || "Não foi possível aceitar a solicitação.");
    }
  }

  async function recusarSolicitacaoContato(solicitacaoId) {
    if (!usuario?.id) return;
    try {
      await declineContactRequest(solicitacaoId, usuario.id);
      setContactRequestsRaw((prev) => prev.filter((r) => r.id !== solicitacaoId));
    } catch (error) {
      setContactFeedback(error.message || "Não foi possível recusar a solicitação.");
    }
  }

  // Clicar numa notificacao de mensagem nova abre a conversa direto (o id ja
  // e conhecido, nao precisa passar pela solicitacao de contato).
  function abrirConversaNaoLida(conversaId, outroParticipante) {
    setUnreadConversasRaw((prev) => prev.filter((c) => c.conversaId !== conversaId));
    setChatAlvo({ conversaId, ...outroParticipante });
    navigate({ pagina: "chat", perfilAlvo: null });
  }

  // Uma mensagem gera DUAS "notificacoes" distintas: a conversa fica marcada
  // como nao lida (badge de Mensagens) e um aviso tipo "mensagem" na lista de
  // Atividade/sino. Abrir e ler a conversa (em Chat.jsx, seja clicando direto
  // na lista ou vindo de uma notificacao) precisa consumir as duas -- senao
  // o outro badge fica com uma contagem de algo que voce ja viu ate o
  // proximo poll (ate 20s depois).
  function marcarConversaVisualizada(conversaId, outroParticipante) {
    if (conversaId) {
      setUnreadConversasRaw((prev) => prev.filter((c) => c.conversaId !== conversaId));
    }
    const atorHandle = outroParticipante?.handle;
    if (!atorHandle) return;
    const handleLower = atorHandle.toLowerCase();
    setActivityNotificationsRaw((prev) =>
      prev.filter((n) => !(n.tipo === "mensagem" && (n.ator?.handle || "").toLowerCase() === handleLower))
    );
    markMessageNotificationsAsRead(atorHandle).catch(() => {});
  }

  // Clicar numa notificacao de atividade (curtida/comentario/mencao) marca
  // como lida e leva pro feed, reaproveitando o mesmo "rolar ate o post e
  // destacar" que ja existe pra quando voce acabou de postar.
  function abrirNotificacaoAtividade(notificacao) {
    setActivityNotificationsRaw((prev) => prev.filter((n) => n.id !== notificacao.id));
    markNotificationAsRead(notificacao.id).catch(() => {});
    if (notificacao.postId) {
      setLastCreatedPostId(notificacao.postId);
    }
    navigate({ pagina: "home", perfilAlvo: null });
  }

  function handlePostCreated(post) {
    try {
      const rawPosts = JSON.parse(localStorage.getItem("posts")) || [];
      const posts = sanitizeStoredPosts(rawPosts);
      const currentUser = getStoredUsuario() || usuario;
      const novoPost = normalizeStoredPost({
        ...post,
        username: currentUser?.username || post.username,
        handle: currentUser?.handle || post.handle || post.username,
        email: currentUser?.email || post.email || "",
        fotoPerfil: currentUser?.fotoPerfil || post.fotoPerfil || "",
        isSeedFake: !!post.isSeedFake,
      });
      const novos = [novoPost, ...posts];
      savePostsToStorage(novos);
      window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));

      if (currentUser) {
        const { updatedUser, previousStars, newStars } = recordUserPostProgress(currentUser);
        setUsuario(updatedUser);

        if (newStars > previousStars) {
          setAchievementStars(newStars);
          window.setTimeout(() => setAchievementStars(0), 4600);
        }
      }

      setLastCreatedPostId(novoPost.id);
      setPostRefresh((value) => value + 1);
      setIsPostModalOpen(false);
      return true;
    } catch (error) {
      console.warn("Nao foi possivel salvar o post:", error);
      return false;
    }
  }

  function showStarAchievement(stars) {
    setAchievementStars(stars);
    window.setTimeout(() => setAchievementStars(0), 4600);
  }

  function solicitarLogin(mensagem) {
    setAuthGateMsg(mensagem || "Entre ou crie uma conta para continuar.");
  }

  function fecharAuthGate() {
    setAuthGateMsg(null);
  }

  function abrirLoginDoGate() {
    setAuthGateMsg(null);
    setMostrarLogin(true);
  }

  function voltarParaFeedDoLogin() {
    setMostrarLogin(false);
    navigate({ pagina: "home", perfilAlvo: null });
  }

  const paginaExigeLogin =
    pagina === "chat" ||
    pagina === "perfilColecao" ||
    pagina === "notificacoes" ||
    pagina === "configuracoes" ||
    (pagina === "perfil" && !perfilAlvo);

  // Entrar na pagina de Notificacoes so precisa sumir com o numero vermelho
  // do sininho (voce ja viu que tem coisa nova) -- os avisos em si continuam
  // na lista pra sempre, sao a lista completa (activityNotificationsAllRaw)
  // que nao e afetada por isso.
  useEffect(() => {
    if (pagina !== "notificacoes" || !usuario?.id) return;
    setActivityNotificationsRaw([]);
    markAllNotificationsAsRead(usuario.id).catch(() => {});
  }, [pagina, usuario?.id]);

  useEffect(() => {
    if (!logado && (mostrarLogin || pagina === "login" || paginaExigeLogin)) {
      document.title = "Entrar · DevSpace";
      return;
    }
    if (pagina === "explorar") document.title = "Explorar · DevSpace";
    else if (pagina === "chat") document.title = "Mensagens · DevSpace";
    else if (pagina === "notificacoes") document.title = "Notificações · DevSpace";
    else if (pagina === "configuracoes") document.title = "Configurações · DevSpace";
    else if (pagina === "perfilColecao") document.title = "Coleção · DevSpace";
    else if (pagina === "perfil") {
      const handle = String(perfilAlvo?.handle || "").replace(/^@+/, "");
      document.title = handle ? `@${handle} · DevSpace` : "Perfil · DevSpace";
    } else if (pagina === "naoEncontrada") document.title = "Não encontrada · DevSpace";
    else document.title = "Início · DevSpace";
  }, [pagina, perfilAlvo, mostrarLogin, logado, paginaExigeLogin]);

  if (!logado && (mostrarLogin || pagina === "login" || paginaExigeLogin)) {
    return (
      <Login
        onLogin={() => {
          persistSidebarOpen(!window.matchMedia("(max-width: 760px)").matches);
          setUsuario(readSessionUser());
          setLogado(true);
          setMostrarLogin(false);
          setPostRefresh((value) => value + 1);
        }}
        onVoltar={voltarParaFeedDoLogin}
      />
    );
  }

  if (pagina === "perfil") {
    return (
      <>
        <Perfil
          onLogout={() => setLogado(false)}
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          refreshFeed={postRefresh}
          viewedUser={perfilAlvo}
          onOpenProfileCollection={(tipo) => {
            navigate({ pagina: "perfilColecao", perfilAlvo: null, perfilCollection: tipo });
          }}
          onContact={abrirChatCom}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
          irConfiguracoes={irParaConfiguracoes}
          blockedUsers={blockedUsers}
          onBlockUser={bloquearUsuario}
          onUnblockUser={desbloquearUsuario}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  if (pagina === "perfilColecao") {
    return (
      <>
        <PerfilColecao
          tipo={perfilCollection}
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
          onStarAchievement={showStarAchievement}
          logado={logado}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
          irConfiguracoes={irParaConfiguracoes}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  if (pagina === "explorar") {
    return (
      <>
        <Explorar
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
          logado={logado}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
          irConfiguracoes={irParaConfiguracoes}
          blockedUsers={blockedUsers}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  if (pagina === "chat") {
    return (
      <>
        <Chat
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
          chatAlvo={chatAlvo}
          onChatAlvoConsumido={() => setChatAlvo(null)}
          logado={logado}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          onConversaVisualizada={marcarConversaVisualizada}
          irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
          irConfiguracoes={irParaConfiguracoes}
          blockedUsers={blockedUsers}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  if (pagina === "notificacoes") {
    return (
      <>
        <Notificacoes
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          logado={logado}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          activityNotificationsAll={activityNotificationsAll}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          notifPrefs={notifPrefs}
          onUpdateNotifPref={atualizarNotifPref}
          irConfiguracoes={irParaConfiguracoes}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  if (pagina === "naoEncontrada") {
    return (
      <NaoEncontrada
        irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
        irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
        irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
        irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
        onOpenPost={handleOpenPost}
        logado={logado}
        onRequireAuth={solicitarLogin}
        irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
        irConfiguracoes={irParaConfiguracoes}
      />
    );
  }

  if (pagina === "configuracoes") {
    return (
      <>
        <Configuracoes
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          logado={logado}
          onRequireAuth={solicitarLogin}
          contactRequests={contactRequests}
          onAcceptContact={aceitarSolicitacaoContato}
          onDeclineContact={recusarSolicitacaoContato}
          unreadConversas={unreadConversas}
          onOpenUnreadConversa={abrirConversaNaoLida}
          activityNotifications={activityNotifications}
          onOpenActivityNotification={abrirNotificacaoAtividade}
          irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
          irConfiguracoes={irParaConfiguracoes}
          blockedUsers={blockedUsers}
          onUnblockUser={desbloquearUsuario}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
        {authGateMsg && (
          <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
        )}
        {contactFeedback && <div className="contact-toast" role="status" aria-live="polite">{contactFeedback}</div>}
      </>
    );
  }

  return (
    <>
      <Home
        irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
        irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
        irChat={() => navigate({ pagina: "chat", perfilAlvo: null })}
        onOpenPost={handleOpenPost}
        refreshFeed={postRefresh}
        onOpenUserProfile={abrirPerfilAlvo}
        onStarAchievement={showStarAchievement}
        onRequireAuth={solicitarLogin}
        highlightPostId={lastCreatedPostId}
        onHighlightPostShown={() => setLastCreatedPostId(null)}
        contactRequests={contactRequests}
        onAcceptContact={aceitarSolicitacaoContato}
        onDeclineContact={recusarSolicitacaoContato}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={abrirConversaNaoLida}
        activityNotifications={activityNotifications}
        onOpenActivityNotification={abrirNotificacaoAtividade}
        onActivityNotificationSeen={marcarNotificacoesDoPostComoVistas}
        irNotificacoes={() => navigate({ pagina: "notificacoes", perfilAlvo: null })}
        irConfiguracoes={irParaConfiguracoes}
        blockedUsers={blockedUsers}
        onLogout={() => setLogado(false)}
      />

      <PostModal
        open={isPostModalOpen}
        onClose={handleClosePost}
        usuario={usuario}
        onPostSaved={handlePostCreated}
      />
      <StarAchievement open={achievementStars > 0} stars={achievementStars} onClose={() => setAchievementStars(0)} />
      {authGateMsg && (
        <AuthGate mensagem={authGateMsg} onEntrar={abrirLoginDoGate} onFechar={fecharAuthGate} />
      )}
      {contactFeedback && <div className="contact-toast">{contactFeedback}</div>}
    </>
  );
}

export default App;
