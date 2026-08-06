import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import PostComments from "../components/PostComments";
import { useOverlayClose } from "../hooks/useOverlayClose";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import {
  fetchPosts,
  fetchUsers,
  deletePost as deletePostRequest,
  likePost,
  sharePost,
  bookmarkPost,
  votePoll,
  addComment,
  deleteComment,
  likeComment,
  followUser,
} from "../api";

const ACTION_API_CALLS = {
  likes: likePost,
  shares: sharePost,
  bookmarks: bookmarkPost,
};
import {
  recordUserCommentProgress,
  recordUserLikeProgress,
  recordUserRepostProgress,
  recordUserSaveProgress,
  syncUsersStarProgress,
} from "../utils/starProgress";
import { tagLabel, displayHashtag } from "../utils/postTags";
import "../style/home.css";

const MIN_SUGGESTIONS_WIDTH = 220;
const MAX_SUGGESTIONS_WIDTH = 460;
const DEFAULT_SUGGESTIONS_WIDTH = 300;

function clampSuggestionsWidth(value) {
  return Math.min(MAX_SUGGESTIONS_WIDTH, Math.max(MIN_SUGGESTIONS_WIDTH, value));
}

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

const SUGGESTED_PROFILE_POOL = [
  { username: "Joao Gabriel", handle: "joaogabriel", bio: "Front-end, treino e interfaces limpas." },
  { username: "Rockstar Games", handle: "rockstargames", bio: "Projetos, games e bastidores criativos." },
  { username: "Pedro Zauristak", handle: "pedrozauristak", bio: "Fotografia, design e pequenos projetos." },
  { username: "o terror dos profs", handle: "terrordosprofs", bio: "Codando e testando ideias no DevSpace." },
  { username: "dieli", handle: "dieli", bio: "UI, rotina e estudos." },
  { username: "Maya Dev", handle: "mayadev", bio: "React, produto e cafe." },
  { username: "Lucas Motion", handle: "lucasmotion", bio: "Animacoes e microinteracoes." },
  { username: "Sofia UX", handle: "sofiaux", bio: "Experiencias simples para problemas chatos." },
  { username: "Nicolas Code", handle: "nicolascode", bio: "Back-end curioso com alma de front." },
  { username: "Clara Pixel", handle: "clarapixel", bio: "Design visual e posts com referencias." },
  { username: "Mateus Stack", handle: "mateusstack", bio: "APIs, bancos e deploys sem drama." },
  { username: "Lara Studio", handle: "larastudio", bio: "Branding, telas e experimentos." },
  { username: "Gui Mobile", handle: "guimobile", bio: "Apps, prototipos e performance." },
  { username: "Bia Product", handle: "biaproduct", bio: "Produto digital e pesquisa." },
  { username: "Rafa Cloud", handle: "rafacloud", bio: "Infra, automacao e observabilidade." },
  { username: "Iris Data", handle: "irisdata", bio: "Dados, dashboards e historias." },
  { username: "Theo Games", handle: "theogames", bio: "Gameplay, level design e Unity." },
  { username: "Manu CSS", handle: "manucss", bio: "CSS, layout e componentes." },
  { username: "Enzo AI", handle: "enzoai", bio: "IA aplicada em produtos pequenos." },
  { username: "Helena QA", handle: "helenaqa", bio: "Testes, bugs e qualidade." },
];

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function codeShot(title, subtitle, lines) {
  const codeRows = lines.map((line, index) => {
    const y = 150 + index * 34;
    const color = line.color || "#d7dce2";
    return `<text x="82" y="${y}" fill="${color}" font-size="20" font-family="Consolas, monospace">${escapeSvgText(line.text)}</text>`;
  }).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 650">
      <rect width="900" height="650" fill="#080a0d"/>
      <rect x="46" y="42" width="808" height="566" rx="22" fill="#111418" stroke="#2b2f36"/>
      <rect x="46" y="42" width="808" height="58" rx="22" fill="#171b21"/>
      <circle cx="82" cy="72" r="9" fill="#ff5f57"/>
      <circle cx="112" cy="72" r="9" fill="#ffbd2e"/>
      <circle cx="142" cy="72" r="9" fill="#28c840"/>
      <text x="180" y="78" fill="#aab2bf" font-size="18" font-family="Inter, Arial, sans-serif">${escapeSvgText(title)}</text>
      <text x="70" y="126" fill="#7aa2ff" font-size="17" font-family="Inter, Arial, sans-serif">${escapeSvgText(subtitle)}</text>
      <rect x="66" y="138" width="768" height="430" rx="14" fill="#0b0e12" stroke="#20242c"/>
      ${codeRows}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const FAKE_CODE_IMAGES = {
  "-9102": codeShot("dashboard-theme.css", "dark dashboard moodboard", [
    { text: ":root { --bg: #090b10; --panel: #151922; }", color: "#d7dce2" },
    { text: ".metric { color: #f4f7fb; border-color: #2c3442; }", color: "#93c5fd" },
    { text: ".alert { color: #f8d66d; background: rgba(248,214,109,.12); }", color: "#fbbf24" },
  ]),
  "-9104": codeShot("signup-flow.jsx", "shorter signup flow", [
    { text: "const fields = ['email', 'password'];", color: "#d7dce2" },
    { text: "const optional = ['company', 'role'];", color: "#9ca3af" },
    { text: "return <SignupForm fields={fields} next='profile' />;", color: "#93c5fd" },
  ]),
  "-9106": codeShot("cover-studio.jsx", "profile cover experiments", [
    { text: "const cover = createGradient(['#111827', '#7aa2ff']);", color: "#d7dce2" },
    { text: "cover.addLayer('grid', { opacity: .16 });", color: "#93c5fd" },
    { text: "export default <ProfileCover art={cover} />;", color: "#c084fc" },
  ]),
  "-9109": codeShot("scene-lighting.cs", "dramatic prototype scene", [
    { text: "sun.intensity = 0.45f;", color: "#d7dce2" },
    { text: "fog.color = new Color(0.08f, 0.10f, 0.14f);", color: "#93c5fd" },
    { text: "playerSpawn.SetMood('quiet-night');", color: "#c084fc" },
  ]),
  "-9110": codeShot("layout-grid.css", "five-line grid solution", [
    { text: ".board { display: grid; gap: 12px; }", color: "#d7dce2" },
    { text: "grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));", color: "#93c5fd" },
    { text: ".panel { min-width: 0; }", color: "#86efac" },
  ]),
};

// IDs negativos garantem que o feed de demonstracao nunca colida com IDs reais
// atribuidos automaticamente pelo backend (que sempre comecam em 1).
const COMMUNITY_FEED_SEED = [
  { id: -9101, username: "Maya Dev", handle: "mayadev", texto: "Refatorei um componente hoje e finalmente ficou legivel. Pequenas vitorias contam muito.", imagem: "" },
  { id: -9102, username: "Clara Pixel", handle: "clarapixel", texto: "Moodboard novo para um dashboard escuro com contraste melhor.", imagem: FAKE_CODE_IMAGES["-9102"] },
  { id: -9103, username: "Lucas Motion", handle: "lucasmotion", texto: "Microanimacao boa e aquela que quase ninguem percebe, mas todo mundo sente.", imagem: "" },
  { id: -9104, username: "Sofia UX", handle: "sofiaux", texto: "Testei um fluxo de cadastro com menos campos. A sensacao ficou bem mais leve.", imagem: FAKE_CODE_IMAGES["-9104"] },
  { id: -9105, username: "Nicolas Code", handle: "nicolascode", texto: "Uma API bem documentada economiza uma tarde inteira de confusao.", imagem: "" },
  { id: -9106, username: "Lara Studio", handle: "larastudio", texto: "Experimentando capas de perfil com mais personalidade.", imagem: FAKE_CODE_IMAGES["-9106"] },
  { id: -9107, username: "Mateus Stack", handle: "mateusstack", texto: "Deploy de sexta sem susto: checklist, variaveis conferidas e logs abertos.", imagem: "" },
  { id: -9108, username: "Bia Product", handle: "biaproduct", texto: "Ideia do dia: salvar feedback bruto antes de tentar transformar tudo em feature.", imagem: "" },
  { id: -9109, username: "Theo Games", handle: "theogames", texto: "Prototipo de cena com luz mais dramatica. Ainda simples, mas ja deu clima.", imagem: FAKE_CODE_IMAGES["-9109"] },
  { id: -9110, username: "Manu CSS", handle: "manucss", texto: "Grid resolveu em cinco linhas o layout que eu estava complicando com vinte.", imagem: FAKE_CODE_IMAGES["-9110"] },
];

function fakeAvatar(handle) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle)}`;
}

function fakeCover(handle) {
  return `https://picsum.photos/seed/${encodeURIComponent(handle + "-cover")}/1200/320`;
}

function buildSuggestedUser(profile) {
  const handle = normalizeHandle(profile.handle || profile.username);
  return {
    username: profile.username,
    handle,
    email: `${handle}@devspace.fake`,
    senha: "123456",
    criadoEm: new Date(Date.now() - 86400000).toISOString(),
    bio: profile.bio || "Perfil da comunidade DevSpace.",
    fotoPerfil: fakeAvatar(handle),
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
  };
}

function buildCommunityPost(seed, index) {
  const handle = normalizeHandle(seed.handle || seed.username);
  return {
    ...seed,
    handle,
    email: `${handle}@devspace.fake`,
    fotoPerfil: fakeAvatar(handle),
    comments: (index % 3) + 1,
    commentsList: buildFakeComments(seed.id, (index % 3) + 1),
    isSeedFake: true,
    shares: index % 4,
    likes: 6 + index * 2,
    bookmarks: index % 3,
    likedBy: [],
    savedBy: [],
    repostedBy: [],
    criadoEm: new Date(Date.now() - index * 2700000).toISOString(),
  };
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

function normalizeActionKey(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
}

function getActionKeys(user) {
  return [
    normalizeActionKey(user?.email),
    normalizeActionKey(user?.handle),
    normalizeActionKey(user?.username),
  ].filter(Boolean);
}

const ACTION_OWNER_FIELDS = {
  shares: "repostedBy",
  likes: "likedBy",
  bookmarks: "savedBy",
};

const ACTION_PROGRESS_RECORDERS = {
  shares: recordUserRepostProgress,
  likes: recordUserLikeProgress,
  bookmarks: recordUserSaveProgress,
};

function findUserProfile(item, users) {
  const email = (item?.email || "").toLowerCase();
  const handle = normalizeHandle(item?.handle || "");
  const username = (item?.username || "").toLowerCase();

  const byEmail = email
    ? users.find((user) => (user.email || "").toLowerCase() === email)
    : null;

  if (byEmail) return byEmail;

  return users.find((user) => {
    const userHandle = normalizeHandle(user.handle || user.username || "");
    const userName = (user.username || "").toLowerCase();

    return (
      (handle && userHandle === handle) ||
      (username && userName === username)
    );
  });
}

function isFakeIdentity(item) {
  const email = (item?.email || "").toLowerCase();
  const handle = normalizeHandle(item?.handle || item?.username || "");
  const isFakeHandle = FAKE_COMMENT_POOL.some((fake) => fake.handle === handle);

  return (
    !!item?.isSeedFake ||
    isFakeHandle ||
    email.endsWith("@dev.com") ||
    email.endsWith("@devspace.fake")
  );
}

function sortPostsByDate(posts) {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a?.criadoEm || 0).getTime();
    const dateB = new Date(b?.criadoEm || 0).getTime();
    return dateB - dateA;
  });
}

function normalizePoll(poll) {
  if (!poll || !Array.isArray(poll.options) || poll.options.length < 2) return null;
  return {
    options: poll.options,
    optionVoters: poll.options.map((_, index) =>
      Array.isArray(poll.optionVoters?.[index]) ? poll.optionVoters[index] : []
    ),
  };
}

function normalizeStoredPost(post) {
  if (!post || typeof post !== "object") return null;
  const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
  const isSeedFake = !!post.isSeedFake || (post.email || "").toLowerCase().endsWith("@dev.com");
  const seedImage = isSeedFake ? FAKE_CODE_IMAGES[Number(post.id)] : "";

  return {
    ...post,
    commentsList,
    comments: isSeedFake
      ? commentsList.length || Number(post.comments || 0)
      : commentsList.length,
    imagem: isSeedFake ? (seedImage || post.imagem || "") : post.imagem || "",
    isSeedFake,
    shares: Number(post.shares || 0),
    likes: Number(post.likes || 0),
    bookmarks: Number(post.bookmarks || 0),
    likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
    savedBy: Array.isArray(post.savedBy) ? post.savedBy : [],
    repostedBy: Array.isArray(post.repostedBy) ? post.repostedBy : [],
    anexo: post.anexo && post.anexo.url ? post.anexo : null,
    poll: normalizePoll(post.poll),
    tag: post.tag || "",
    agendadoPara: post.agendadoPara || "",
  };
}

function isPostDue(post) {
  if (!post?.agendadoPara) return true;
  return new Date(post.agendadoPara).getTime() <= Date.now();
}

function normalizeStoredPosts(posts) {
  if (!Array.isArray(posts)) return [];
  return posts
    .map(normalizeStoredPost)
    .filter((post) => post && (post.email || post.username || post.handle));
}

function hydratePostsForDisplay(posts, users) {
  const usersList = Array.isArray(users) ? users : [];
  return normalizeStoredPosts(posts).filter(isPostDue).map((post) => {
    const isFakePost = isFakeIdentity(post);
    const postHandle = normalizeHandle(post.handle || post.username);
    const postProfile = isFakePost ? null : findUserProfile(post, usersList);
    const commentsList = (Array.isArray(post.commentsList) ? post.commentsList : []).map((comment) => {
      const commentHandle = normalizeHandle(comment?.handle || comment?.username);
      const commentIsFake = isFakeIdentity(comment);
      const commentProfile = commentIsFake ? null : findUserProfile(comment, usersList);

      return {
        ...comment,
        username: commentProfile?.username || comment.username || "Usuario",
        handle: commentProfile?.handle || comment.handle || commentHandle,
        email: commentProfile?.email || comment.email || "",
        fotoPerfil: commentProfile?.fotoPerfil || comment.fotoPerfil || (commentIsFake ? fakeAvatar(commentHandle) : ""),
      };
    });

    return {
      ...post,
      username: postProfile?.username || post.username || "Usuario",
      handle: postProfile?.handle || post.handle || postHandle,
      email: postProfile?.email || post.email || "",
      fotoPerfil: postProfile?.fotoPerfil || post.fotoPerfil || (isFakePost ? fakeAvatar(postHandle) : ""),
      commentsList,
      comments: commentsList.length,
    };
  });
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
    commentsList,
  };
}

function savePostsToStorage(posts) {
  const storagePosts = normalizeStoredPosts(posts).map(stripPostForStorage);
  const serializedPosts = JSON.stringify(storagePosts);
  try {
    localStorage.setItem("posts", serializedPosts);
  } catch (error) {
    localStorage.removeItem("posts");
    try {
      localStorage.setItem("posts", serializedPosts);
    } catch (retryError) {
      const emergencyPosts = storagePosts.map((post) => ({ ...post, imagem: "" }));
      localStorage.removeItem("profileImageBackups");
      localStorage.setItem("posts", JSON.stringify(emergencyPosts));
      return emergencyPosts;
    }
  }
  return storagePosts;
}

export default function Home({ irPerfil, irExplorar, irChat, onOpenPost, refreshFeed, onOpenUserProfile, onStarAchievement, onRequireAuth, highlightPostId, onHighlightPostShown, contactRequests, onAcceptContact, onDeclineContact, unreadConversas, onOpenUnreadConversa, activityNotifications, onOpenActivityNotification, onActivityNotificationSeen, irNotificacoes, irConfiguracoes, blockedUsers = [], onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [suggestionsWidth, setSuggestionsWidth] = useState(() => {
    const salva = localStorage.getItem("suggestionsWidth");
    const numero = salva === null ? NaN : Number(salva);
    return Number.isFinite(numero) ? clampSuggestionsWidth(numero) : DEFAULT_SUGGESTIONS_WIDTH;
  });
  const [redimensionando, setRedimensionando] = useState(false);
  const arrastoRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("suggestionsWidth", String(suggestionsWidth));
  }, [suggestionsWidth]);

  useEffect(() => {
    if (!redimensionando) return;

    function pegarX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function mover(e) {
      if (!arrastoRef.current) return;
      const deltaX = arrastoRef.current.startX - pegarX(e);
      setSuggestionsWidth(clampSuggestionsWidth(arrastoRef.current.startWidth + deltaX));
    }

    function soltar() {
      setRedimensionando(false);
      arrastoRef.current = null;
    }

    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("touchend", soltar);

    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
    };
  }, [redimensionando]);

  function iniciarRedimensionamento(e) {
    e.preventDefault();
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    arrastoRef.current = { startX, startWidth: suggestionsWidth };
    setRedimensionando(true);
  }

  const [showTopbar, setShowTopbar] = useState(true);
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("usuarioLogado")) || JSON.parse(sessionStorage.getItem("usuarioLogado"));
    } catch {
      return null;
    }
  });
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    setUsuario(localUser || sessionUser);
    const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usersList = Array.isArray(savedUsers) ? savedUsers : [];
    const knownHandles = new Set(usersList.map((u) => normalizeHandle(u.handle || u.username)));
    const suggestedUsers = SUGGESTED_PROFILE_POOL
      .filter((profile) => !knownHandles.has(normalizeHandle(profile.handle || profile.username)))
      .map(buildSuggestedUser);
    const nextUsers = [...usersList, ...suggestedUsers];
    if (suggestedUsers.length > 0) {
      localStorage.setItem("usuarios", JSON.stringify(nextUsers));
    }
    setUsuarios(nextUsers);
  }, []);

  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [activeActions, setActiveActions] = useState({});
  const [visibleSuggestionHandles, setVisibleSuggestionHandles] = useState(null);

  useOverlayClose(!!selectedPost && !commentsPostId, () => setSelectedPost(null));
  useOverlayClose(!!imagePreview, () => setImagePreview(null));
  useOverlayClose(!!commentsPostId, () => setCommentsPostId(null));

  function salvarPosts(postsAtualizados) {
    try {
      savePostsToStorage(postsAtualizados);
      window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));
      return true;
    } catch (error) {
      console.warn("Nao foi possivel salvar posts no localStorage:", error);
      return false;
    }
  }

  function getStoredPosts(fallback = []) {
    try {
      const saved = JSON.parse(localStorage.getItem("posts")) || [];
      return Array.isArray(saved) ? normalizeStoredPosts(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  function updateUserInState(updatedUser) {
    setUsuario(updatedUser);
    setUsuarios((prev) => {
      let found = false;
      const next = prev.map((item) => {
        const sameEmail = updatedUser.email && item.email &&
          item.email.toLowerCase() === updatedUser.email.toLowerCase();
        const sameHandle = (updatedUser.handle || updatedUser.username || "").toLowerCase() ===
          (item.handle || item.username || "").toLowerCase();
        if (sameEmail || sameHandle) found = true;
        return sameEmail || sameHandle ? updatedUser : item;
      });
      return found ? next : [...next, updatedUser];
    });
  }

  function commitStarProgress(baseUser, recordProgress) {
    if (!baseUser || typeof recordProgress !== "function") return null;

    const { updatedUser, previousStars, newStars } = recordProgress(baseUser);
    updateUserInState(updatedUser);

    if (newStars > previousStars) {
      onStarAchievement?.(newStars);
    }

    return updatedUser;
  }

  function deletePost(postId) {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updated = savedPosts.filter((post) => post.id !== postId);
    salvarPosts(updated);
    setPosts(sortPostsByDate(hydratePostsForDisplay(updated, usuarios)));
    if (selectedPost?.id === postId) setSelectedPost(null);
    deletePostRequest(postId).catch(() => {
      // post local-only (seed/fake) ou ja removido no backend, sem problema
    });
  }

  function toggleComments(postId) {
    setCommentsPostId(postId);
  }

  function togglePostAction(postId, action) {
    if (!usuario) {
      onRequireAuth?.("Entre para curtir, repostar e salvar posts.");
      return;
    }

    const ownerField = ACTION_OWNER_FIELDS[action];
    const userKeys = getActionKeys(usuario);
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || posts;
    const currentPost = savedPosts.find((post) => post.id === postId) || posts.find((post) => post.id === postId);
    const currentOwners = ownerField && Array.isArray(currentPost?.[ownerField])
      ? currentPost[ownerField].map(normalizeActionKey)
      : [];
    const isActive = ownerField && userKeys.length > 0
      ? userKeys.some((key) => currentOwners.includes(key))
      : !!activeActions[postId]?.[action];
    const nextValue = !isActive;
    const ownerKey = userKeys[0];

    if (nextValue) {
      const recorder = ACTION_PROGRESS_RECORDERS[action];
      const usuarioAtualizado = findUserProfile(usuario, usuarios) || usuario;
      commitStarProgress(usuarioAtualizado, recorder);
    }

    setActiveActions((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {}),
        [action]: nextValue,
      },
    }));

    const sourcePosts = getStoredPosts(posts);
    const updatedPosts = sourcePosts.map((post) => {
      if (post.id !== postId) return post;
      const currentValue = Number(post[action] || 0);
      const owners = ownerField && Array.isArray(post[ownerField])
        ? post[ownerField].map(normalizeActionKey)
        : [];
      const nextOwners = ownerField && ownerKey
        ? nextValue
          ? [...new Set([...owners, ownerKey])]
          : owners.filter((key) => !userKeys.includes(key))
        : owners;

      return {
        ...post,
        [action]: nextValue ? currentValue + 1 : Math.max(0, currentValue - 1),
        ...(ownerField ? { [ownerField]: nextOwners } : {}),
      };
    });

    if (salvarPosts(updatedPosts)) {
      setPosts(sortPostsByDate(hydratePostsForDisplay(updatedPosts, usuarios)));
    }

    if (!currentPost?.isSeedFake && usuario?.id) {
      ACTION_API_CALLS[action]?.(postId, usuario.id).catch(() => {
        // post local-only ou backend indisponivel; o estado otimista local ja foi aplicado
      });
    }
  }

  function togglePollVote(postId, optionIndex) {
    if (!usuario) {
      onRequireAuth?.("Entre para votar em enquetes.");
      return;
    }

    const userKey = normalizeActionKey(usuario.email || usuario.handle || usuario.username);
    if (!userKey) return;

    const sourcePosts = getStoredPosts(posts);
    const targetPost = sourcePosts.find((post) => post.id === postId);
    const updatedPosts = sourcePosts.map((post) => {
      if (post.id !== postId || !post.poll) return post;

      const optionVoters = post.poll.optionVoters.map((voters) =>
        Array.isArray(voters) ? voters.map(normalizeActionKey) : []
      );
      const votadaAtualmente = optionVoters.findIndex((voters) => voters.includes(userKey));

      if (votadaAtualmente === optionIndex) {
        optionVoters[optionIndex] = optionVoters[optionIndex].filter((key) => key !== userKey);
      } else {
        if (votadaAtualmente !== -1) {
          optionVoters[votadaAtualmente] = optionVoters[votadaAtualmente].filter((key) => key !== userKey);
        }
        optionVoters[optionIndex] = [...optionVoters[optionIndex], userKey];
      }

      return {
        ...post,
        poll: { ...post.poll, optionVoters },
      };
    });

    if (salvarPosts(updatedPosts)) {
      setPosts(sortPostsByDate(hydratePostsForDisplay(updatedPosts, usuarios)));
    }

    if (!targetPost?.isSeedFake && usuario?.id) {
      votePoll(postId, usuario.id, optionIndex).catch(() => {
        // post local-only ou backend indisponivel; o estado otimista local ja foi aplicado
      });
    }
  }

  function addCommentToPost(postId, texto, parentId = null, imagem = null) {
    const storedUser =
      usuario ||
      JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
      JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");

    if (!storedUser) return false;
    if (!texto.trim() && !imagem) return false;

    const usuarioAtualizado = findUserProfile(storedUser, usuarios) || storedUser;
    const commentHandle = (usuarioAtualizado.handle || usuarioAtualizado.username || "usuario").replace(/\s+/g, "").toLowerCase();

    const sourcePosts = getStoredPosts(posts);
    const targetPost = sourcePosts.find((post) => post.id === postId);
    let didUpdate = false;
    const updatedPosts = sourcePosts.map((post) => {
      if (post.id !== postId) return post;

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
      const novoComentario = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        username: usuarioAtualizado.username || "Usuario",
        handle: commentHandle,
        email: usuarioAtualizado.email || "",
        fotoPerfil: usuarioAtualizado.fotoPerfil || "",
        texto: texto.trim(),
        criadoEm: new Date().toISOString(),
        parentId,
        imagem: imagem || "",
        likes: 0,
        likedBy: [],
      };

      didUpdate = true;
      const nextComments = [novoComentario, ...commentsList];
      return {
        ...post,
        commentsList: nextComments,
        comments: nextComments.length,
      };
    });

    if (!didUpdate || !salvarPosts(updatedPosts)) return false;
    setUsuario(usuarioAtualizado);
    commitStarProgress(usuarioAtualizado, recordUserCommentProgress);
    setPosts(sortPostsByDate(hydratePostsForDisplay(updatedPosts, usuarios)));

    if (!targetPost?.isSeedFake && usuarioAtualizado?.id) {
      addComment(postId, usuarioAtualizado.id, texto.trim(), parentId, imagem || null)
        .then((fullPost) => {
          // troca o comentario otimista (id temporario) pelos dados reais do
          // backend, para que curtir/excluir esse comentario funcione depois
          const reconciled = getStoredPosts(posts).map((post) =>
            post.id === postId ? { ...post, ...fullPost, isSeedFake: false } : post
          );
          if (salvarPosts(reconciled)) {
            setPosts(sortPostsByDate(hydratePostsForDisplay(reconciled, usuarios)));
          }
        })
        .catch(() => {
          // backend indisponivel; o estado otimista local ja foi aplicado
        });
    }

    return true;
  }

  function deleteCommentFromPost(postId, commentId) {
    if (!usuario) return;

    const sourcePosts = getStoredPosts(posts);
    const targetPost = sourcePosts.find((post) => post.id === postId);
    const updatedPosts = sourcePosts.map((post) => {
      if (post.id !== postId) return post;

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
      const targetCommentId = String(commentId);
      const nextComments = commentsList.filter((comment) => String(comment.id) !== targetCommentId);

      return {
        ...post,
        commentsList: nextComments,
        comments: nextComments.length,
      };
    });

    if (salvarPosts(updatedPosts)) {
      setPosts(sortPostsByDate(hydratePostsForDisplay(updatedPosts, usuarios)));
    }

    if (!targetPost?.isSeedFake) {
      deleteComment(commentId).catch(() => {
        // comentario local-only ou backend indisponivel; o estado otimista local ja foi aplicado
      });
    }
  }

  function toggleCommentLike(postId, commentId) {
    const storedUser =
      usuario ||
      JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
      JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
    if (!storedUser) return;

    const userKey = normalizeActionKey(storedUser.email || storedUser.handle || storedUser.username);
    if (!userKey) return;

    const sourcePosts = getStoredPosts(posts);
    const targetPost = sourcePosts.find((post) => post.id === postId);
    const updatedPosts = sourcePosts.map((post) => {
      if (post.id !== postId) return post;

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
      const nextComments = commentsList.map((comment) => {
        if (String(comment.id) !== String(commentId)) return comment;

        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
        const normalizedLikes = likedBy.map(normalizeActionKey);
        const hasLiked = normalizedLikes.includes(userKey);
        const nextLikedBy = hasLiked
          ? likedBy.filter((key) => normalizeActionKey(key) !== userKey)
          : [...likedBy, userKey];
        const currentLikes = Number(comment.likes || 0);

        return {
          ...comment,
          likes: hasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
          likedBy: nextLikedBy,
        };
      });

      return {
        ...post,
        commentsList: nextComments,
      };
    });

    if (salvarPosts(updatedPosts)) {
      setPosts(sortPostsByDate(hydratePostsForDisplay(updatedPosts, usuarios)));
    }

    if (!targetPost?.isSeedFake && storedUser?.id) {
      likeComment(commentId, storedUser.id).catch(() => {
        // comentario local-only ou backend indisponivel; o estado otimista local ja foi aplicado
      });
    }
  }

  useEffect(() => {
    let saved = [];
    const raw = localStorage.getItem("posts");

    try {
      saved = JSON.parse(raw) || [];
    } catch {
      saved = [];
    }
    saved = normalizeStoredPosts(saved);

    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const currentUser = localUser || sessionUser;
    const isAdmin = currentUser?.email === "renan.kael@gmail.com";

    // IDs negativos (assim como no COMMUNITY_FEED_SEED) para nunca colidir com
    // IDs reais atribuidos pelo backend.
    const fakeSeed = isAdmin
      ? [
          {
            id: -1,
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
            criadoEm: new Date().toISOString(),
          },
          {
            id: -2,
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
            criadoEm: new Date().toISOString(),
          },
          {
            id: -3,
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
            criadoEm: new Date().toISOString(),
          },
          {
            id: -4,
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
            criadoEm: new Date().toISOString(),
          },
        ]
      : [];
    const communitySeed = COMMUNITY_FEED_SEED.map(buildCommunityPost);
    const seedPosts = [...communitySeed, ...fakeSeed];

    if (!Array.isArray(saved) || saved.length === 0) {
      salvarPosts(seedPosts);
      localStorage.setItem("communitySeedInitialized", "true");
      if (isAdmin) localStorage.setItem("adminSeedInitialized", "true");
      const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
      const progressedUsers = syncUsersStarProgress(savedUsers, seedPosts);
      if (JSON.stringify(progressedUsers) !== JSON.stringify(savedUsers)) {
        localStorage.setItem("usuarios", JSON.stringify(progressedUsers));
        setUsuarios(progressedUsers);
      }
      setPosts(sortPostsByDate(hydratePostsForDisplay(seedPosts, savedUsers)));
    } else {
      // Remove posts fake/seed de um esquema antigo com IDs positivos (podiam colidir
      // com IDs reais atribuidos pelo backend). Os seeds atuais usam IDs negativos;
      // eles serao readicionados logo abaixo pela logica de "missing seed".
      saved = saved.filter((post) => !(post?.isSeedFake && Number(post.id) > 0));

      const hasLegacySeed = saved.some((post) => post?.isSeedFake || (post?.email || "").toLowerCase().endsWith("@dev.com"));
      const savedIds = new Set(saved.map((post) => Number(post.id)));
      const missingCommunitySeed = communitySeed.filter((post) => !savedIds.has(Number(post.id)));
      const savedWithCommunitySeed = missingCommunitySeed.length > 0
        ? [...saved, ...missingCommunitySeed]
        : saved;
      const savedWithRecoveredSeed = isAdmin && !hasLegacySeed
        ? [...fakeSeed, ...savedWithCommunitySeed]
        : savedWithCommunitySeed;

      if (savedWithRecoveredSeed !== saved) {
        salvarPosts(savedWithRecoveredSeed);
      }

      saved = savedWithRecoveredSeed;

      const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
      const usersList = Array.isArray(savedUsers) ? savedUsers : [];
      const postsParaSalvar = [];
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
        const fakeCodeImage = FAKE_CODE_IMAGES[Number(post.id)];
        const normalizedPost = {
          ...post,
          username: postProfile?.username || post.username,
          handle: postProfile?.handle || post.handle,
          email: postProfile?.email || post.email,
          fotoPerfil: postProfile?.fotoPerfil || post.fotoPerfil || (isLegacyFake ? fakeAvatar(postHandle) : ""),
          imagem: isLegacyFake ? (fakeCodeImage || "") : post.imagem,
          commentsList,
          comments: normalizedComments,
          isSeedFake: isLegacyFake,
          likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
          savedBy: Array.isArray(post.savedBy) ? post.savedBy : [],
          repostedBy: Array.isArray(post.repostedBy) ? post.repostedBy : [],
        };
        const storageComments = commentsList.map((comment) => {
          const commentProfile = isFakeIdentity(comment) ? null : findUserProfile(comment, usersList);
          return {
            ...comment,
            fotoPerfil: commentProfile?.fotoPerfil || comment.fotoPerfil,
          };
        });
        postsParaSalvar.push({
          ...normalizedPost,
          fotoPerfil: postProfile?.fotoPerfil || normalizedPost.fotoPerfil,
          commentsList: storageComments,
        });
        return normalizedPost;
      });
      if (JSON.stringify(postsParaSalvar) !== JSON.stringify(saved)) {
        salvarPosts(postsParaSalvar);
      }
      const progressedUsers = syncUsersStarProgress(usersList, postsParaSalvar);
      if (JSON.stringify(progressedUsers) !== JSON.stringify(usersList)) {
        localStorage.setItem("usuarios", JSON.stringify(progressedUsers));
        setUsuarios(progressedUsers);
      }
      setPosts(sortPostsByDate(hydratePostsForDisplay(normalizedPosts, usersList)));
    }
  }, [refreshFeed]);

  const [loading, setLoading] = useState(false);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // Busca posts/usuarios atuais do backend. Usada tanto no carregamento
  // inicial (e sempre que um post novo e criado, via refreshFeed) quanto no
  // reload manual pelo logo/"Pagina Inicial" da sidebar -- assim clicar ali
  // realmente traz posts novos de outras pessoas, em vez de so re-ler o que
  // ja estava salvo localmente.
  const loadFeedFromBackend = useCallback(async () => {
    setLoading(true);

    try {
      const [backendPosts, backendUsers] = await Promise.all([fetchPosts(), fetchUsers()]);

      if (!montadoRef.current) return;

      if (Array.isArray(backendUsers)) {
        setUsuarios((prevUsuarios) => {
          const backendHandles = new Set(
            backendUsers.map((u) => normalizeHandle(u.handle || u.username))
          );
          // preserva contas que so existem localmente (perfis sugeridos e
          // qualquer conta que ainda nao tenha sido migrada pro backend)
          const localOnlyUsuarios = prevUsuarios.filter(
            (u) => !backendHandles.has(normalizeHandle(u.handle || u.username))
          );
          const mergedUsuarios = [...backendUsers, ...localOnlyUsuarios];
          try {
            localStorage.setItem("usuarios", JSON.stringify(mergedUsuarios));
          } catch {
            // ignore storage failures
          }
          return mergedUsuarios;
        });
      }

      if (Array.isArray(backendPosts) && backendPosts.length > 0) {
        setPosts((prevPosts) => {
          const backendIds = new Set(backendPosts.map((post) => String(post.id)));
          const localOnlyPosts = prevPosts.filter(
            (post) => post.isSeedFake || !backendIds.has(String(post.id))
          );
          const mergedPosts = [...backendPosts, ...localOnlyPosts];
          savePostsToStorage(mergedPosts);
          return sortPostsByDate(hydratePostsForDisplay(mergedPosts, backendUsers));
        });
      }
    } catch (error) {
      console.warn("Erro ao carregar feed do backend:", error);
    } finally {
      if (montadoRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFeedFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFeed]);

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
          const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
          setPosts(Array.isArray(saved) ? sortPostsByDate(hydratePostsForDisplay(saved, savedUsers)) : []);
        } catch {
          setPosts([]);
        }
      }

      if (event.key === "usuarioLogado") {
        const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
        const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        setUsuario(localUser || sessionUser || null);
      }

      if (event.key === "usuarios") {
        const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
        setUsuarios(Array.isArray(savedUsers) ? savedUsers : []);
      }
    };

    const handlePostsUpdated = () => {
      const saved = JSON.parse(localStorage.getItem("posts")) || [];
      const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
      setPosts(Array.isArray(saved) ? sortPostsByDate(hydratePostsForDisplay(saved, savedUsers)) : []);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("devspacePostsUpdated", handlePostsUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("devspacePostsUpdated", handlePostsUpdated);
    };
  }, []);


  useEffect(() => {
    const userKeys = getActionKeys(usuario);
    if (userKeys.length === 0) return;

    const nextActions = {};
    posts.forEach((post) => {
      nextActions[post.id] = {};
      Object.entries(ACTION_OWNER_FIELDS).forEach(([action, field]) => {
        const owners = Array.isArray(post[field]) ? post[field].map(normalizeActionKey) : [];
        nextActions[post.id][action] = userKeys.some((key) => owners.includes(key));
      });
    });

    setActiveActions(nextActions);
  }, [posts, usuario]);

  // Quando um post acabou de ser criado (highlightPostId veio do App), rola ate
  // ele no feed e deixa a classe "post-card-new" ativa por um tempo para a
  // animacao de destaque tocar; depois avisa o App para limpar o highlight.
  useEffect(() => {
    if (!highlightPostId) return;
    const existsInFeed = posts.some((post) => String(post.id) === String(highlightPostId));
    if (!existsInFeed) return;

    const el = document.querySelector(`[data-post-card-id="${highlightPostId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const timeout = window.setTimeout(() => {
      onHighlightPostShown?.();
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [highlightPostId, posts, onHighlightPostShown]);

  // Notificacao de atividade (curtida/comentario/mencao) some se voce clicar
  // nela OU se "ver ela pessoalmente" no feed -- ou seja, o post referenciado
  // rolar ate ficar visivel na tela, mesmo sem ter vindo da notificacao.
  const notificadosPostIds = useMemo(
    () => new Set(activityNotifications.map((n) => String(n.postId)).filter(Boolean)),
    [activityNotifications]
  );

  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const postId = entry.target.getAttribute("data-post-card-id");
          if (postId) onActivityNotificationSeen?.(postId);
          observerRef.current?.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    return () => observerRef.current?.disconnect();
  }, [onActivityNotificationSeen]);

  const observarSeNotificado = useCallback(
    (el) => {
      if (!el || !observerRef.current) return;
      const postId = el.getAttribute("data-post-card-id");
      if (postId && notificadosPostIds.has(postId)) {
        observerRef.current.observe(el);
      }
    },
    [notificadosPostIds]
  );

  const reloadFeed = () => {
    if (loading) return;
    loadFeedFromBackend();
  };

  const blockedHandles = new Set(blockedUsers.map((u) => (u.handle || "").toLowerCase()));
  const blockedEmails = new Set(blockedUsers.map((u) => (u.email || "").toLowerCase()));

  const filteredPosts = posts.filter((post) => {
    if (blockedHandles.has((post.handle || "").toLowerCase())) return false;
    if (blockedEmails.has((post.email || "").toLowerCase())) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    if (query.startsWith("@")) return false;

    if (query.startsWith("#")) {
      const tagQuery = query.slice(1).trim();
      if (!tagQuery || !post.tag) return false;
      const hashtagTexto = displayHashtag(post.tag).toLowerCase();
      const labelTexto = tagLabel(post.tag).toLowerCase();
      return hashtagTexto.includes(tagQuery) || labelTexto.includes(tagQuery);
    }

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

  const suggestedProfiles = (() => {
    const currentHandle = normalizeHandle(usuario?.handle || usuario?.username || "");
    const following = new Set((Array.isArray(usuario?.seguindo) ? usuario.seguindo : []).map(normalizeHandle));
    const merged = [...usuarios, ...SUGGESTED_PROFILE_POOL.map(buildSuggestedUser)];
    const dedupedMap = new Map();

    merged.forEach((profile) => {
      const handle = normalizeHandle(profile.handle || profile.username);
      if (!handle || handle === currentHandle) return;
      if (!dedupedMap.has(handle)) {
        dedupedMap.set(handle, {
          ...profile,
          handle,
          fotoPerfil: profile.fotoPerfil || fakeAvatar(handle),
          bio: profile.bio || "Perfil da comunidade DevSpace.",
        });
      }
    });

    const allSuggestions = [...dedupedMap.values()];
    if (!visibleSuggestionHandles) {
      return allSuggestions.filter((profile) => !following.has(profile.handle)).slice(0, 24);
    }

    return allSuggestions
      .filter((profile) => visibleSuggestionHandles.includes(profile.handle))
      .slice(0, 24);
  })();

  useEffect(() => {
    if (!usuario || visibleSuggestionHandles) return;

    setVisibleSuggestionHandles(suggestedProfiles.map((profile) => profile.handle));
  }, [usuario, suggestedProfiles, visibleSuggestionHandles]);

  function isFollowingSuggestion(profile) {
    const targetHandle = normalizeHandle(profile?.handle || profile?.username);
    const following = Array.isArray(usuario?.seguindo) ? usuario.seguindo.map(normalizeHandle) : [];
    return following.includes(targetHandle);
  }

  function followSuggestedProfile(profile) {
    if (!usuario) {
      onRequireAuth?.("Entre para seguir outros perfis.");
      return;
    }
    if (!profile) return;

    const target = buildSuggestedUser(profile);
    const targetHandle = normalizeHandle(target.handle || target.username);
    const loggedEmail = (usuario.email || "").toLowerCase();
    const loggedHandle = normalizeHandle(usuario.handle || usuario.username);
    const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usersList = Array.isArray(savedUsers) ? savedUsers : [];
    const hasTarget = usersList.some((u) => normalizeHandle(u.handle || u.username) === targetHandle);
    const baseUsers = hasTarget ? usersList : [...usersList, target];
    const isAlreadyFollowing = isFollowingSuggestion(profile);

    const nextUsers = baseUsers.map((u) => {
      const userEmail = (u.email || "").toLowerCase();
      const userHandle = normalizeHandle(u.handle || u.username);

      if ((loggedEmail && userEmail === loggedEmail) || (loggedHandle && userHandle === loggedHandle)) {
        const seguindo = Array.isArray(u.seguindo) ? u.seguindo.map(normalizeHandle) : [];
        return {
          ...u,
          seguindo: isAlreadyFollowing
            ? seguindo.filter((handle) => handle !== targetHandle)
            : [...new Set([...seguindo, targetHandle])],
        };
      }

      if (userHandle === targetHandle) {
        return {
          ...u,
          seguidores: isAlreadyFollowing
            ? Math.max(0, Number(u.seguidores || 0) - 1)
            : Number(u.seguidores || 0) + 1,
        };
      }

      return u;
    });

    const nextLogged = nextUsers.find((u) => {
      const userEmail = (u.email || "").toLowerCase();
      const userHandle = normalizeHandle(u.handle || u.username);
      return (loggedEmail && userEmail === loggedEmail) || (loggedHandle && userHandle === loggedHandle);
    }) || usuario;

    localStorage.setItem("usuarios", JSON.stringify(nextUsers));
    if (localStorage.getItem("usuarioLogado")) {
      localStorage.setItem("usuarioLogado", JSON.stringify(nextLogged));
    }
    if (sessionStorage.getItem("usuarioLogado")) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(nextLogged));
    }
    setUsuarios(nextUsers);
    setUsuario(nextLogged);

    // profile.id so existe quando o perfil sugerido veio de fato do backend
    // (perfis 100% ficticios do SUGGESTED_PROFILE_POOL nao tem id real)
    if (usuario?.id && profile?.id) {
      followUser(profile.id, usuario.id).catch(() => {
        // backend indisponivel; o estado otimista local ja foi aplicado
      });
    }
  }

  const selectedPostData = selectedPost
    ? posts.find((post) => post.id === selectedPost.id) || selectedPost
    : null;
  const commentsPost = commentsPostId
    ? posts.find((post) => post.id === commentsPostId) ||
      (selectedPostData?.id === commentsPostId ? selectedPostData : null)
    : null;

  function getUserPollVoteIndex(poll) {
    if (!poll || !usuario) return -1;
    const userKey = normalizeActionKey(usuario.email || usuario.handle || usuario.username);
    if (!userKey) return -1;
    return poll.optionVoters.findIndex((voters) => voters.map(normalizeActionKey).includes(userKey));
  }

  function renderPostTag(post) {
    if (!post.tag) return null;
    return (
      <span className="post-tag-chip-display" title={tagLabel(post.tag) || undefined}>
        #{displayHashtag(post.tag)}
      </span>
    );
  }

  function renderAnexo(post) {
    if (!post.anexo) return null;

    if (post.anexo.tipo?.startsWith("image/")) {
      return (
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
              setImagePreview(post.anexo.url);
            }}
          >
            <img src={post.anexo.url} alt={post.anexo.nome || "Anexo"} />
          </div>
        </div>
      );
    }

    return (
      <a
        className="post-anexo-file-card"
        href={post.anexo.url}
        download={post.anexo.nome}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="post-anexo-file-icon">📄</span>
        <div className="post-anexo-file-info">
          <strong>{post.anexo.nome}</strong>
          <small>Baixar arquivo</small>
        </div>
      </a>
    );
  }

  function getPostCardClass(post) {
    const anexoImagem = post.anexo && post.anexo.tipo?.startsWith("image/");
    const anexoArquivo = post.anexo && !anexoImagem;
    if (post.poll || anexoArquivo) return "post-card has-extra";
    if (post.imagem || anexoImagem) return "post-card has-image";
    return "post-card text-only";
  }

  function renderPoll(post) {
    if (!post.poll) return null;
    const totalVotos = post.poll.optionVoters.reduce((total, voters) => total + voters.length, 0);
    const votadaIndex = getUserPollVoteIndex(post.poll);

    return (
      <div className="post-poll" onClick={(e) => e.stopPropagation()}>
        {post.poll.options.map((opcao, index) => {
          const votos = post.poll.optionVoters[index]?.length || 0;
          const percentual = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;
          return (
            <button
              key={index}
              type="button"
              className={`post-poll-option${votadaIndex === index ? " voted" : ""}`}
              onClick={() => togglePollVote(post.id, index)}
            >
              <span className="post-poll-option-fill" style={{ width: `${percentual}%` }} />
              <span className="post-poll-option-label">{opcao}</span>
              <span className="post-poll-option-pct">{percentual}%</span>
            </button>
          );
        })}
        <small className="post-poll-total">{totalVotos} {totalVotos === 1 ? "voto" : "votos"}</small>
      </div>
    );
  }

  return (
    <div className={`home${redimensionando ? " resizing-suggestions" : ""}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={reloadFeed}
        irPerfil={irPerfil}
        irExplorar={irExplorar}
        irChat={irChat}
        onOpenPost={onOpenPost}
        logado={!!usuario}
        onRequireAuth={onRequireAuth}
        contactRequests={contactRequests}
        onAcceptContact={onAcceptContact}
        onDeclineContact={onDeclineContact}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={onOpenUnreadConversa}
        activityNotifications={activityNotifications}
        onOpenActivityNotification={onOpenActivityNotification}
        irNotificacoes={irNotificacoes}
      />

      <div className={`main${sidebarOpen ? "" : " sidebar-closed"}`}>
        <Topbar
          visible={showTopbar}
          usuario={usuario}
          onSearch={setSearchQuery}
          sidebarOpen={sidebarOpen}
          onOpenUserProfile={() => usuario && onOpenUserProfile?.(usuario)}
          onOpenSettings={irConfiguracoes}
          onLogout={onLogout}
        />

        <div
          className={`feed-layout${sidebarOpen ? "" : " sidebar-closed"}`}
          style={{ "--suggestions-width": `${suggestionsWidth}px` }}
        >
        <div className="feed">
          {loading && <p>Carregando...</p>}
          {!loading && filteredPosts.length === 0 && profileOnlyResults.length === 0 && (
            <p>
              {searchQuery.trim().startsWith("@")
                ? "Nenhum perfil encontrado."
                : searchQuery.trim().startsWith("#")
                  ? "Nenhum post com essa tag."
                  : "Sem posts correspondentes a busca."}
            </p>
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
            <div
              key={post.id}
              ref={observarSeNotificado}
              data-post-card-id={post.id}
              className={`${getPostCardClass(post)}${String(post.id) === String(highlightPostId) ? " post-card-new" : ""}`}
              onClick={() => setSelectedPost(post)}
            >
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
                {renderPostTag(post)}
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

              {renderAnexo(post)}
              {renderPoll(post)}

              <div className="post-card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label="Comentarios"
                  className={commentsPostId === post.id ? "active pulse" : ""}
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
              </div>

            </div>
          ))}
        </div>
        <aside className="suggestions-sidebar" aria-label="Sugestoes de perfis">
          <div
            className={`suggestions-resize-handle${redimensionando ? " active" : ""}`}
            onMouseDown={iniciarRedimensionamento}
            onTouchStart={iniciarRedimensionamento}
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar sugestoes"
          />
          <div className="suggestions-sidebar-inner">
            <h3>Sugestões para você</h3>
            <div className="suggestions-list">
              {suggestedProfiles.map((profile) => (
                <div key={profile.email || profile.handle} className="suggestion-card">
                  <button
                    type="button"
                    className="suggestion-avatar"
                    style={{ backgroundImage: profile.fotoPerfil ? `url(${profile.fotoPerfil})` : "none" }}
                    onClick={() => onOpenUserProfile?.(profile)}
                    aria-label={`Abrir perfil de ${profile.username}`}
                  />
                  <button
                    type="button"
                    className="suggestion-info"
                    onClick={() => onOpenUserProfile?.(profile)}
                  >
                    <strong>{profile.username}</strong>
                    <span>@{profile.handle || profile.username}</span>
                    <small>{profile.bio || "Perfil da comunidade DevSpace."}</small>
                  </button>
                  <button
                    type="button"
                    className="suggestion-follow"
                    onClick={() => followSuggestedProfile(profile)}
                  >
                    {isFollowingSuggestion(profile) ? "Deixar de seguir" : "Seguir"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
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
              {renderPostTag(selectedPostData)}
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

            {renderAnexo(selectedPostData)}
            {renderPoll(selectedPostData)}

            <div className="post-card-actions post-expanded-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Comentarios"
                className={commentsPostId === selectedPostData.id ? "active pulse" : ""}
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
            </div>
          </div>
        </div>
      )}

      {commentsPost && (
        <div className="post-preview-overlay comments-overlay" onClick={() => setCommentsPostId(null)}>
          <div className="comments-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="post-expanded-close"
              onClick={() => setCommentsPostId(null)}
              type="button"
              title="Fechar"
            >
              x
            </button>

            <div className="comments-popup-head">
              <div
                className="post-card-avatar"
                style={{
                  backgroundImage: commentsPost.fotoPerfil ? `url(${commentsPost.fotoPerfil})` : "none",
                }}
              />
              <div>
                <small className="post-card-handle">@{commentsPost.handle || commentsPost.username}</small>
                <strong>{commentsPost.username}</strong>
              </div>
            </div>

            <p className="comments-popup-text">{commentsPost.texto || "Post sem texto"}</p>

            <PostComments
              postId={commentsPost.id}
              isExpanded
              comments={commentsPost.commentsList || []}
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

