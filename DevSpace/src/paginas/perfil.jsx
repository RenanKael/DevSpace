import { useEffect, useMemo, useRef, useState } from "react";
import backArrow from "../assets/IMGS/DawnFlech (2).png";
import Sidebar from "../components/Sidebar";
import GearIcon from "../components/GearIcon";
import "../style/perfil.css";
import { createPortal } from "react-dom";
import { deletePost as deletePostRequest, updateUser as updateUserRequest, updatePost as updatePostRequest, followUser, bookmarkPost, fetchUser, rateUser, fetchPosts, fetchFollowers, fetchFollowing } from "../api";
import { readSessionUser, readJson } from "../utils/storage";
import { syncUsersStarProgress } from "../utils/starProgress";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import { avatarInitial, avatarStyle } from "../utils/avatar";
import { resizeImageForChat } from "../utils/image";
import { DsIcon } from "../components/icons";
import { Icons } from "../components/iconKit";
import { PostContent } from "../components/CodeBlock";
import StarRating from "../components/StarRating";
import ProfileForm from "../components/ProfileForm";
import PageHeader from "../components/PageHeader";

export default function Perfil({ onLogout, irHome, irPerfil, irExplorar, irChat, onOpenPost, refreshFeed, viewedUser, onOpenProfileCollection, onContact, onRequireAuth, contactRequests, onAcceptContact, onDeclineContact, unreadConversas, onOpenUnreadConversa, activityNotifications, onOpenActivityNotification, irNotificacoes, irConfiguracoes, blockedUsers = [], onBlockUser, onUnblockUser }) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [usuario, setUsuario] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [perfilInexistente, setPerfilInexistente] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editando, setEditando] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [perfilOpcoesAberto, setPerfilOpcoesAberto] = useState(false);
  const [postMenuPosition, setPostMenuPosition] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminOverrideStars, setAdminOverrideStars] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [editandoImagem, setEditandoImagem] = useState(null);

  const [form, setForm] = useState({});

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [previewImg, setPreviewImg] = useState(null);
  const [fotoPerfilAberta, setFotoPerfilAberta] = useState(false);

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });
  const [zoomPerfil, setZoomPerfil] = useState(100);
  const [zoomCapa, setZoomCapa] = useState(100);

  const [editPosPerfil, setEditPosPerfil] = useState({ x: 50, y: 50 });
  const [editPosCapa, setEditPosCapa] = useState({ x: 50, y: 50 });
  const [editZoomPerfil, setEditZoomPerfil] = useState(100);
  const [editZoomCapa, setEditZoomCapa] = useState(100);

  const [reloadImg, setReloadImg] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    baseX: 50,
    baseY: 50,
  });
  const postMenuAnchorRef = useRef(null);

  const [animatingStar, setAnimatingStar] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [listaSocial, setListaSocial] = useState(null);
  const [ratingToast, setRatingToast] = useState("");

  function normalizeProfileKey(value) {
    return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
  }

  function postBelongsToUser(post, user) {
    if (!post || !user) return false;

    const postEmail = String(post.email || "").toLowerCase().trim();
    const userEmail = String(user.email || "").toLowerCase().trim();
    const postUsername = String(post.username || "").toLowerCase().trim();
    const userUsername = String(user.username || "").toLowerCase().trim();
    const postHandle = normalizeProfileKey(post.handle || post.username);
    const userHandle = normalizeProfileKey(user.handle || user.username);

    return (
      (postEmail && userEmail && postEmail === userEmail) ||
      (postUsername && userUsername && postUsername === userUsername) ||
      (postHandle && userHandle && postHandle === userHandle)
    );
  }

  function imageBackupKey(user) {
    return String(user?.email || user?.handle || user?.username || "").toLowerCase();
  }

  function getProfileImageBackup(user) {
    try {
      const backups = JSON.parse(localStorage.getItem("profileImageBackups")) || {};
      return backups[imageBackupKey(user)] || null;
    } catch {
      return null;
    }
  }

  function saveProfileImageBackup(user) {
    const key = imageBackupKey(user);
    if (!key || (!user?.fotoPerfil && !user?.fotoCapa)) return;

    const backups = JSON.parse(localStorage.getItem("profileImageBackups")) || {};
    backups[key] = {
      ...(backups[key] || {}),
      fotoPerfil: user.fotoPerfil || backups[key]?.fotoPerfil || "",
      fotoCapa: user.fotoCapa || backups[key]?.fotoCapa || "",
      posPerfil: user.posPerfil || backups[key]?.posPerfil,
      posCapa: user.posCapa || backups[key]?.posCapa,
      zoomPerfil: user.zoomPerfil || backups[key]?.zoomPerfil,
      zoomCapa: user.zoomCapa || backups[key]?.zoomCapa,
    };
    localStorage.setItem("profileImageBackups", JSON.stringify(backups));
  }

  function notifyPostsUpdated() {
    window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));
  }

  function restoreProfileImages(user) {
    const backup = getProfileImageBackup(user);
    if (!backup) return user;

    return {
      ...user,
      fotoPerfil: user.fotoPerfil || backup.fotoPerfil || "",
      fotoCapa: user.fotoCapa || backup.fotoCapa || "",
      posPerfil: user.posPerfil || backup.posPerfil,
      posCapa: user.posCapa || backup.posCapa,
      zoomPerfil: user.zoomPerfil || backup.zoomPerfil,
      zoomCapa: user.zoomCapa || backup.zoomCapa,
    };
  }

  function fallbackAvatar(user) {
    const seed = user?.handle || user?.username || user?.email || "usuario";
    return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}`;
  }

  function fallbackCover() {
    return "";
  }

  useEffect(() => {
    const logado = readSessionUser();
    const usuarios = readJson(localStorage, "usuarios", []) || [];
    const savedPosts = readJson(localStorage, "posts", []) || [];
    const syncedUsers = syncUsersStarProgress(usuarios, savedPosts);
    if (JSON.stringify(syncedUsers) !== JSON.stringify(usuarios)) {
      localStorage.setItem("usuarios", JSON.stringify(syncedUsers));
    }
    const baseUser = viewedUser || logado;
    const matched = baseUser
      ? syncedUsers.find((u) => {
          const byEmail = baseUser.email && u.email &&
            u.email.toLowerCase() === baseUser.email.toLowerCase();
          const byHandle = baseUser.handle && u.handle &&
            u.handle.toLowerCase() === baseUser.handle.toLowerCase();
          return byEmail || byHandle;
        })
      : null;
    const user = !viewedUser && logado ? { ...(matched || {}), ...logado } : matched;

    if (!user && viewedUser?.handle) {
      setPerfilInexistente(false);
      setUsuario(null);
      fetchUser(viewedUser.handle)
        .then((remote) => {
          if (!remote) {
            setPerfilInexistente(true);
            return;
          }
          const normalized = restoreProfileImages({
            ...remote,
            criadoEm: remote.criadoEm || new Date().toISOString(),
            handle: (remote.handle || remote.username || viewedUser.handle).replace(/\s+/g, "").toLowerCase(),
            seguidores: remote.seguidores || 0,
            seguindo: Array.isArray(remote.seguindo) ? remote.seguindo : [],
            comments: remote.comments || 0,
          });
          setUsuarioLogado(logado || null);
          setUsuario(normalized);
          setForm(normalized);
          setPerfilInexistente(false);
        })
        .catch(() => setPerfilInexistente(true));
      return;
    }

    if (!user && viewedUser) {
      setPerfilInexistente(true);
      setUsuario(null);
      return;
    }

    setPerfilInexistente(false);
    if (user) {
      const normalized = restoreProfileImages({
        ...user,
        criadoEm: user.criadoEm || new Date().toISOString(),
        handle: (user.handle || user.username || "usuario").replace(/\s+/g, "").toLowerCase(),
        seguidores: user.seguidores || 0,
        seguindo: Array.isArray(user.seguindo) ? user.seguindo : [],
        comments: user.comments || 0,
      });

      setUsuarioLogado(logado || null);
      setUsuario(normalized);
      setForm(normalized);
      setPosPerfil(normalized.posPerfil || { x: 50, y: 50 });
      setPosCapa(normalized.posCapa || { x: 50, y: 50 });
      setZoomPerfil(Number(normalized.zoomPerfil || 100));
      setZoomCapa(Number(normalized.zoomCapa || 100));
    }
  }, [viewedUser, refreshFeed]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== "usuarios" && event.key !== "usuarioLogado" && event.key !== "posts") return;

      const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
      const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
      const logado = localUser || sessionUser;
      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
      const syncedUsers = syncUsersStarProgress(usuarios, savedPosts);
      if (JSON.stringify(syncedUsers) !== JSON.stringify(usuarios)) {
        localStorage.setItem("usuarios", JSON.stringify(syncedUsers));
      }
      const baseUser = viewedUser || logado;
      const matched = baseUser
          ? syncedUsers.find((u) => {
              const byEmail = baseUser.email && u.email &&
                u.email.toLowerCase() === baseUser.email.toLowerCase();
              const byHandle = baseUser.handle && u.handle &&
                u.handle.toLowerCase() === baseUser.handle.toLowerCase();
              return byEmail || byHandle;
            })
          : null;
      const user = !viewedUser && logado ? { ...(matched || {}), ...logado } : matched || baseUser;

        if (user) {
          const normalized = restoreProfileImages({
            ...user,
            criadoEm: user.criadoEm || new Date().toISOString(),
            handle: (user.handle || user.username || "usuario").replace(/\s+/g, "").toLowerCase(),
            seguidores: user.seguidores || 0,
            seguindo: Array.isArray(user.seguindo) ? user.seguindo : [],
            comments: user.comments || 0,
          });
          setUsuario(normalized);
        }
        setUsuarioLogado(logado || null);
        setPosts(
          user
            ? savedPosts
                .filter((post) => postBelongsToUser(post, user))
                .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
            : []
        );
    };

    const handlePostsUpdated = () => {
      const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
      const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
      const logado = localUser || sessionUser;
      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
      const syncedUsers = syncUsersStarProgress(usuarios, savedPosts);
      if (JSON.stringify(syncedUsers) !== JSON.stringify(usuarios)) {
        localStorage.setItem("usuarios", JSON.stringify(syncedUsers));
      }
      const baseUser = viewedUser || logado;
      const matched = baseUser
          ? syncedUsers.find((u) => {
              const byEmail = baseUser.email && u.email &&
                u.email.toLowerCase() === baseUser.email.toLowerCase();
              const byHandle = baseUser.handle && u.handle &&
                u.handle.toLowerCase() === baseUser.handle.toLowerCase();
              return byEmail || byHandle;
            })
          : null;
      const user = !viewedUser && logado ? { ...(matched || {}), ...logado } : matched || baseUser;

        if (user) {
          const normalized = restoreProfileImages({
            ...user,
            criadoEm: user.criadoEm || new Date().toISOString(),
            handle: (user.handle || user.username || "usuario").replace(/\s+/g, "").toLowerCase(),
            seguidores: user.seguidores || 0,
            seguindo: Array.isArray(user.seguindo) ? user.seguindo : [],
            comments: user.comments || 0,
          });
          setUsuario(normalized);
        }
        setUsuarioLogado(logado || null);
        setPosts(user ? savedPosts.filter((post) => postBelongsToUser(post, user)) : []);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("devspacePostsUpdated", handlePostsUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("devspacePostsUpdated", handlePostsUpdated);
    };
  }, [viewedUser]);

  useEffect(() => {
    const id = usuario?.id;
    if (!id || Number(id) <= 0) return;
    let canceled = false;
    fetchUser(id)
      .then((remote) => {
        if (canceled || !remote) return;
        setUsuario((prev) => {
          if (!prev || Number(prev.id) !== Number(remote.id)) return prev;
          return {
            ...prev,
            ratingMedia: remote.ratingMedia,
            ratingCount: remote.ratingCount,
            minhaNota: remote.minhaNota,
            seguidores: remote.seguidores ?? prev.seguidores,
            seguindo: Array.isArray(remote.seguindo) ? remote.seguindo : prev.seguindo,
            disponivelContratacao: remote.disponivelContratacao ?? prev.disponivelContratacao,
            bloqueado: !!remote.bloqueado,
          };
        });
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [usuario?.id]);

  useEffect(() => {
    if (!usuario || !usuarioLogado) return;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const loggedEmail = (usuarioLogado.email || "").toLowerCase();
    const loggedHandle = (usuarioLogado.handle || usuarioLogado.username || "").toLowerCase();
    const currentLogged =
      usuarios.find((u) => {
        const uEmail = (u.email || "").toLowerCase();
        const uHandle = (u.handle || u.username || "").toLowerCase();
        return (loggedEmail && uEmail === loggedEmail) || (loggedHandle && uHandle === loggedHandle);
      }) || usuarioLogado;
    const followingList = Array.isArray(currentLogged.seguindo) ? currentLogged.seguindo : [];
    const targetHandle = (usuario.handle || usuario.username || "").toLowerCase();
    setIsFollowing(
      followingList.some((item) => {
        const key = (item || "").toLowerCase();
        return key === targetHandle;
      })
    );
  }, [usuario, usuarioLogado]);

  const isOwnProfile = useMemo(() => {
    if (!usuario || !usuarioLogado) return false;
    const emailMatch =
      usuarioLogado.email && usuario.email &&
      usuarioLogado.email.toLowerCase() === usuario.email.toLowerCase();
    const handleMatch =
      usuarioLogado.handle && usuario.handle &&
      usuarioLogado.handle.toLowerCase() === usuario.handle.toLowerCase();
    return !!(emailMatch || handleMatch);
  }, [usuario, usuarioLogado]);

  const isAdmin = usuarioLogado?.email === "renan.kael@gmail.com";

  const isBlockedByMe = useMemo(() => {
    if (!usuario || isOwnProfile) return false;
    const handle = (usuario.handle || usuario.username || "").toLowerCase();
    return blockedUsers.some(
      (u) => (usuario.id && u.id === usuario.id) || (handle && (u.handle || "").toLowerCase() === handle)
    );
  }, [usuario, isOwnProfile, blockedUsers]);

  // Bloqueio e mutuo: o backend ja devolve usuario.bloqueado quando existe
  // uma linha em qualquer sentido (eu bloqueei ou fui bloqueado). Sem isso,
  // quem foi bloqueado ainda conseguia abrir o perfil de quem o bloqueou.
  const bloqueadoPeloOutro = !isOwnProfile && !!usuario?.bloqueado && !isBlockedByMe;

  useEffect(() => {
    if (!usuario) return;
    let canceled = false;

    fetchPosts()
      .then((lista) => {
        if (canceled) return;
        const source = Array.isArray(lista) && lista.length > 0
          ? lista
          : JSON.parse(localStorage.getItem("posts")) || [];
        const ordered = source
          .filter((post) => post && postBelongsToUser(post, usuario))
          .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
        setPosts(ordered);
        setActiveMenuPostId(null);
      })
      .catch(() => {
        if (canceled) return;
        const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
        setPosts(savedPosts.filter((post) => postBelongsToUser(post, usuario)));
      });

    return () => {
      canceled = true;
    };
  }, [usuario, refreshFeed]);

  useEffect(() => {
    if (!usuario?.id || !usuarioLogado || isOwnProfile) {
      setIsFollowing(false);
      return;
    }
    const seguindoList = Array.isArray(usuarioLogado.seguindo) ? usuarioLogado.seguindo : [];
    const alvoHandle = (usuario.handle || usuario.username || "").toLowerCase();
    setIsFollowing(seguindoList.some((h) => String(h).toLowerCase() === alvoHandle));
  }, [usuario?.id, usuario?.handle, usuario?.username, usuarioLogado, isOwnProfile]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setEditando(false);
        setEditandoImagem(null);
        setFotoPerfilAberta(false);
        setProfileMenuOpen(false);
        setPerfilOpcoesAberto(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function handleImagem(e, tipo) {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    // Converte HEIC/HEIF (padrao de fotos de iPhone, que nenhum navegador
    // decodifica sozinho) e redimensiona antes de exibir/salvar -- senao a
    // foto "sobe" mas nunca aparece.
    const dataUrl = await resizeImageForChat(file);
    if (!dataUrl) {
      setErro("Não foi possível ler essa imagem. Tente outro arquivo.");
      return;
    }

    setPreviewImg(dataUrl);
    setEditandoImagem(tipo);

    if (tipo === "perfil") setEditPosPerfil(posPerfil);
    if (tipo === "capa") setEditPosCapa(posCapa);
    if (tipo === "perfil") setEditZoomPerfil(zoomPerfil);
    if (tipo === "capa") setEditZoomCapa(zoomCapa);
  }

  function salvarImagem() {
    if (!isOwnProfile) return;
    if (!previewImg || !editandoImagem) return;

    if (editandoImagem === "perfil") {
      setForm((prev) => ({
        ...prev,
        fotoPerfil: previewImg,
        posPerfil: editPosPerfil,
        zoomPerfil: Number(editZoomPerfil || 100),
      }));
    }

    if (editandoImagem === "capa") {
      setForm((prev) => ({
        ...prev,
        fotoCapa: previewImg,
        posCapa: editPosCapa,
        zoomCapa: Number(editZoomCapa || 100),
      }));
    }

    setEditandoImagem(null);
    setPreviewImg(null);
  }

  async function salvarPerfil() {
    if (!isOwnProfile) return;

    if (!form.username || !form.handle) {
      setErro("Nome e @ são obrigatórios!");
      return;
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Verifica se o handle já está em uso por outro usuário
    const handleJaExiste = usuarios.find(
      (u) => u.handle === form.handle.toLowerCase() && u.email !== usuario.email
    );

    if (handleJaExiste) {
      setErro("Este @ já está em uso!");
      return;
    }

    let atualizado = {
      ...usuario,
      username: form.username,
      handle: form.handle.toLowerCase(),
      bio: form.bio || "",
      senha: usuario.senha,
    };

    atualizado.fotoPerfil = form.fotoPerfil || usuario.fotoPerfil || "";
    atualizado.fotoCapa = form.fotoCapa || usuario.fotoCapa || "";
    atualizado.posPerfil = form.posPerfil || usuario.posPerfil || posPerfil;
    atualizado.posCapa = form.posCapa || usuario.posCapa || posCapa;
    atualizado.zoomPerfil = Number(form.zoomPerfil || usuario.zoomPerfil || zoomPerfil || 100);
    atualizado.zoomCapa = Number(form.zoomCapa || usuario.zoomCapa || zoomCapa || 100);
    atualizado.avaliacao = usuario.avaliacao || 0;
    atualizado.estrelas = usuario.estrelas || usuario.avaliacao || 0;
    atualizado.starStats = usuario.starStats;
    atualizado.disponivelContratacao = !!form.disponivelContratacao;

    // Conta real (existe no backend): salva la tambem, nao so no localStorage
    if (usuario.id) {
      try {
        const payload = {
          username: form.username,
          handle: form.handle.toLowerCase(),
          bio: form.bio || "",
          fotoPerfil: atualizado.fotoPerfil,
          fotoCapa: atualizado.fotoCapa,
          disponivelContratacao: atualizado.disponivelContratacao,
          posPerfil: atualizado.posPerfil,
          posCapa: atualizado.posCapa,
          zoomPerfil: atualizado.zoomPerfil,
          zoomCapa: atualizado.zoomCapa,
        };
        const backendUser = await updateUserRequest(usuario.id, payload);
        // backendUser ja inclui posPerfil/posCapa/zoom confirmados pelo
        // servidor; so a senha nunca volta (nem deveria).
        atualizado = { ...atualizado, ...backendUser, senha: atualizado.senha };
      } catch (error) {
        setErro(error.message || "Erro ao salvar perfil no servidor.");
        return;
      }
    }

    saveProfileImageBackup(atualizado);

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    if (localStorage.getItem("usuarioLogado")) {
      localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }
    if (sessionStorage.getItem("usuarioLogado")) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }
    sincronizarReferenciasDoUsuario(usuario, atualizado);

    setUsuarioLogado(atualizado);
    setUsuario(atualizado);
    setForm(atualizado);
    setPosPerfil(atualizado.posPerfil || { x: 50, y: 50 });
    setPosCapa(atualizado.posCapa || { x: 50, y: 50 });
    setZoomPerfil(Number(atualizado.zoomPerfil || 100));
    setZoomCapa(Number(atualizado.zoomCapa || 100));

    setReloadImg(Date.now());

    setPreviewImg(null);
    setEditandoImagem(null);
    setEditando(false);

    setErro("");
    setSucesso("Perfil atualizado com sucesso!");
  }

  function abrirEditorPerfil() {
    setForm(usuario);
    setPreviewImg(null);
    setEditandoImagem(null);
    setErro("");
    setSucesso("");
    setEditando(true);
  }

  function cancelarEdicaoPerfil() {
    setForm(usuario);
    setEditando(false);
    setEditandoImagem(null);
    setPreviewImg(null);
    setErro("");
    setSucesso("");
  }

  function sincronizarReferenciasDoUsuario(anterior, atualizado) {
    const postsSalvos = JSON.parse(localStorage.getItem("posts")) || [];
    const antigoEmail = (anterior.email || "").toLowerCase();
    const antigoHandle = (anterior.handle || anterior.username || "").toLowerCase();
    const antigoUsername = (anterior.username || "").toLowerCase();

    function pertenceAoUsuario(item) {
      const itemEmail = (item.email || "").toLowerCase();
      const itemHandle = (item.handle || "").toLowerCase();
      const itemUsername = (item.username || "").toLowerCase();

      return (
        (antigoEmail && itemEmail === antigoEmail) ||
        (antigoHandle && itemHandle === antigoHandle) ||
        (antigoUsername && itemUsername === antigoUsername)
      );
    }

    const postsAtualizados = postsSalvos.map((post) => {
      const postDoUsuario = pertenceAoUsuario(post);
      const commentsList = Array.isArray(post.commentsList)
        ? post.commentsList.map((comment) =>
            pertenceAoUsuario(comment)
              ? {
                  ...comment,
                  username: atualizado.username,
                  handle: atualizado.handle,
                  email: atualizado.email,
                  fotoPerfil: atualizado.fotoPerfil || comment.fotoPerfil || "",
                }
              : comment
          )
        : [];

      return {
        ...post,
        ...(postDoUsuario
          ? {
              username: atualizado.username,
              handle: atualizado.handle,
              email: atualizado.email,
              fotoPerfil: atualizado.fotoPerfil || post.fotoPerfil || "",
            }
          : {}),
        commentsList,
        comments: commentsList.length || Number(post.comments || 0),
      };
    });

    try {
      localStorage.setItem("posts", JSON.stringify(postsAtualizados));
      notifyPostsUpdated();
    } catch (error) {
      console.warn("Nao foi possivel atualizar referencias dos posts:", error);
    }
  }

  function savePostEdit() {
    if (!isOwnProfile || !editingPost) return;

    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.map((post) =>
      post.id === editingPost.id ? { ...post, texto: editingText } : post
    );

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    notifyPostsUpdated();
    setPosts(updatedPosts.filter((post) => postBelongsToUser(post, usuario)));

    // Post real (nao fake/seed): salva no backend tambem, senao a proxima
    // sincronizacao com o servidor sobrescreve a edicao com o texto antigo.
    if (!editingPost.isSeedFake) {
      updatePostRequest(editingPost.id, { texto: editingText }).catch((error) => {
        console.warn("Nao foi possivel salvar a edicao do post no servidor:", error);
      });
    }

    setEditingPost(null);
    setEditingText("");
  }

  function postEstaSalvo(post) {
    // Bate com o que o backend devolve em savedBy (username/handle), nao
    // com o email -- senao posts salvos de verdade aparecem como "nao salvos".
    const key = String(usuarioLogado?.handle || usuarioLogado?.username || usuarioLogado?.email || "").toLowerCase();
    if (post?.salvo) return true;
    const savedBy = Array.isArray(post?.savedBy) ? post.savedBy.map((item) => String(item).toLowerCase()) : [];
    return key ? savedBy.includes(key) : false;
  }

  function toggleSavePost(post) {
    if (!isOwnProfile) return;
    const key = String(usuarioLogado?.handle || usuarioLogado?.username || usuarioLogado?.email || "").toLowerCase();
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.map((item) => {
      if (item.id !== post.id) return item;
      const savedBy = Array.isArray(item.savedBy) ? item.savedBy : [];
      const normalized = savedBy.map((itemKey) => String(itemKey).toLowerCase());
      const already = key ? normalized.includes(key) : !!item.salvo;
      return {
        ...item,
        salvo: !already,
        savedBy: already
          ? savedBy.filter((itemKey) => String(itemKey).toLowerCase() !== key)
          : key ? [...savedBy, key] : savedBy,
        bookmarks: already ? Math.max(0, Number(item.bookmarks || 0) - 1) : Number(item.bookmarks || 0) + 1,
      };
    });

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    notifyPostsUpdated();
    setPosts(updatedPosts.filter((item) => postBelongsToUser(item, usuario)));
    setActiveMenuPostId(null);
    setPostMenuPosition(null);
    postMenuAnchorRef.current = null;
    if (usuarioLogado?.id && post?.id) {
      bookmarkPost(post.id, usuarioLogado.id).catch(() => {});
    }
  }

  function deletePost(postId) {
    if (!isOwnProfile) return;
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.filter((post) => post.id !== postId);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    notifyPostsUpdated();
    setPosts(updatedPosts.filter((post) => postBelongsToUser(post, usuario)));
    setActiveMenuPostId(null);
    setPostMenuPosition(null);
    postMenuAnchorRef.current = null;
    deletePostRequest(postId).catch(() => {
      // post local-only (seed/fake) ou ja removido no backend, sem problema
    });
  }

  function editPost(post) {
    if (!isOwnProfile) return;
    setEditingPost(post);
    setEditingText(post.texto || "");
    setActiveMenuPostId(null);
    setPostMenuPosition(null);
    postMenuAnchorRef.current = null;
  }

  function getPostMenuPosition(button) {
    const rect = button.getBoundingClientRect();
    const menuHeight = isAdmin && !isOwnProfile ? 48 : 130;
    const menuWidth = 176;
    const gap = 8;

    const rawTop = rect.top + rect.height / 2 - menuHeight / 2;
    const top = Math.min(
      Math.max(gap, rawTop),
      Math.max(gap, window.innerHeight - menuHeight - gap)
    );
    const left = Math.max(gap, rect.left - menuWidth - gap);

    return { top, left };
  }

  function togglePostMenu(e, postId) {
    e.stopPropagation();

    if (activeMenuPostId === postId) {
      setActiveMenuPostId(null);
      setPostMenuPosition(null);
      postMenuAnchorRef.current = null;
      return;
    }

    const button = e.currentTarget;
    postMenuAnchorRef.current = button;
    setPostMenuPosition(getPostMenuPosition(button));
    setActiveMenuPostId(postId);
  }

  useEffect(() => {
    if (!activeMenuPostId) return;

    let frameId = null;
    const updateFloatingPostMenu = () => {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const button = postMenuAnchorRef.current;
        if (!button || !button.isConnected) {
          setActiveMenuPostId(null);
          setPostMenuPosition(null);
          postMenuAnchorRef.current = null;
          return;
        }

        setPostMenuPosition(getPostMenuPosition(button));
      });
    };

    window.addEventListener("scroll", updateFloatingPostMenu, true);
    window.addEventListener("resize", updateFloatingPostMenu);

    return () => {
      window.removeEventListener("scroll", updateFloatingPostMenu, true);
      window.removeEventListener("resize", updateFloatingPostMenu);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [activeMenuPostId, isAdmin, isOwnProfile]);

  function logout() {
    if (!isOwnProfile) return;
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("lembrarMe");
    sessionStorage.removeItem("usuarioLogado");
    onLogout?.();
  }

  function openProfileCollection(tipo) {
    if (!isOwnProfile) return;
    setProfileMenuOpen(false);
    onOpenProfileCollection?.(tipo);
  }

  async function avaliarPerfil(nota) {
    if (!usuario?.id || Number(usuario.id) <= 0 || isOwnProfile || savingRating) return;
    if (!usuarioLogado) {
      onRequireAuth?.("Entre para avaliar este perfil.");
      return;
    }
    setSavingRating(true);
    setErro("");
    try {
      const atualizado = await rateUser(usuario.id, nota);
      setUsuario((prev) => (prev ? {
        ...prev,
        ratingMedia: atualizado.ratingMedia,
        ratingCount: atualizado.ratingCount,
        minhaNota: atualizado.minhaNota,
      } : prev));
      setRatingToast("Avaliação salva.");
      window.setTimeout(() => setRatingToast(""), 2200);
    } catch (error) {
      setErro(error.message || "Não foi possível salvar a avaliação.");
    } finally {
      setSavingRating(false);
    }
  }

  async function toggleFollow() {
    if (!usuarioLogado) {
      onRequireAuth?.("Entre para seguir este perfil.");
      return;
    }
    if (isOwnProfile || !usuario?.id) return;

    try {
      const resultado = await followUser(usuario.id, usuarioLogado.id);
      const seguindoAgora = !!resultado?.seguindo;
      setIsFollowing(seguindoAgora);
      if (resultado?.alvo) {
        setUsuario((prev) => ({ ...prev, ...resultado.alvo }));
      } else {
        setUsuario((prev) => prev ? {
          ...prev,
          seguidores: Math.max(0, Number(prev.seguidores || 0) + (seguindoAgora ? 1 : -1)),
        } : prev);
      }
      if (resultado?.usuario) {
        setUsuarioLogado(resultado.usuario);
        if (localStorage.getItem("usuarioLogado")) {
          localStorage.setItem("usuarioLogado", JSON.stringify(resultado.usuario));
        }
        if (sessionStorage.getItem("usuarioLogado")) {
          sessionStorage.setItem("usuarioLogado", JSON.stringify(resultado.usuario));
        }
      }
    } catch (error) {
      setErro(error.message || "Não foi possível atualizar o follow.");
    }
  }

  async function abrirListaSocial(tipo) {
    if (!usuario?.id) return;
    setListaSocial({ tipo, loading: true, users: [] });
    try {
      const users = tipo === "seguidores" ? await fetchFollowers(usuario.id) : await fetchFollowing(usuario.id);
      setListaSocial({ tipo, loading: false, users: Array.isArray(users) ? users : [] });
    } catch {
      setListaSocial({ tipo, loading: false, users: [], erro: "Não foi possível carregar a lista." });
    }
  }

  async function copiarLinkPerfil() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setRatingToast("Link do perfil copiado.");
      window.setTimeout(() => setRatingToast(""), 2200);
    } catch {
      setErro("Não foi possível copiar o link.");
    }
    setProfileMenuOpen(false);
    setPerfilOpcoesAberto(false);
  }
  function beginImageDrag(e) {
    if (!isOwnProfile || !editandoImagem) return;
    const point = e.touches?.[0] || e;
    const base = editandoImagem === "perfil" ? editPosPerfil : editPosCapa;
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      baseX: Number(base.x),
      baseY: Number(base.y),
    };
    setDragging(true);
  }

  function moveImageDrag(e) {
    if (!dragging || !editandoImagem) return;
    const point = e.touches?.[0] || e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    const factor = 0.18;
    const nextX = Math.max(0, Math.min(100, dragRef.current.baseX + dx * factor));
    const nextY = Math.max(0, Math.min(100, dragRef.current.baseY + dy * factor));

    if (editandoImagem === "perfil") {
      setEditPosPerfil({ x: nextX, y: nextY });
    } else {
      setEditPosCapa({ x: nextX, y: nextY });
    }
  }

  function endImageDrag() {
    if (!dragging) return;
    setDragging(false);
  }

  const currentEditX = Number(editandoImagem === "perfil" ? editPosPerfil.x : editPosCapa.x);
  const currentEditY = Number(editandoImagem === "perfil" ? editPosPerfil.y : editPosCapa.y);
  const currentEditZoom = Number(editandoImagem === "perfil" ? editZoomPerfil : editZoomCapa);
  const imageAdjustStyle = (pos, zoom) => {
    const x = Number(pos?.x ?? 50);
    const y = Number(pos?.y ?? 50);
    const scale = Number(zoom || 100) / 100;

    return {
      objectPosition: `${x}% ${y}%`,
      transform: `scale(${scale})`,
      transformOrigin: `${x}% ${y}%`,
    };
  };

  const editImageStyle = imageAdjustStyle(
    { x: currentEditX, y: currentEditY },
    currentEditZoom
  );
  const perfilImageStyle = imageAdjustStyle(posPerfil, zoomPerfil);
  const capaImageStyle = imageAdjustStyle(posCapa, zoomCapa);


  if (perfilInexistente) {
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
          logado={!!usuarioLogado}
          onRequireAuth={onRequireAuth}
          irNotificacoes={irNotificacoes}
          irConfiguracoes={irConfiguracoes}
        />
        <main id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
          <PageHeader eyebrow="404" title="Perfil não encontrado" description="Esse @ não existe ou não está mais disponível." />
        </main>
      </div>
    );
  }

  if (!usuario) {
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
          logado={!!usuarioLogado}
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
        <div id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
          <div className="feed-empty-card" style={{ margin: 40 }}>
            <strong>Carregando perfil</strong>
            <p>Buscando suas informações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isBlockedByMe || bloqueadoPeloOutro) {
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
          logado={!!usuarioLogado}
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
        <div className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
          <PageHeader eyebrow="Privacidade" title="Perfil bloqueado" description="Você não vê posts nem pode interagir com esta conta." />
          <div className="perfil-bloqueado-aviso">
            {isBlockedByMe ? (
              <>
                <p>Você bloqueou este perfil. Ele não aparece mais pra você no site, e vocês não podem trocar mensagens.</p>
                <button
                  type="button"
                  className="btn-editar"
                  onClick={() => onUnblockUser?.(usuario.id)}
                >
                  Desbloquear perfil
                </button>
              </>
            ) : (
              <p>Este perfil não está disponível.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const criadoEmDate = usuario.criadoEm ? new Date(usuario.criadoEm) : null;
  const criadoEm =
    criadoEmDate && !Number.isNaN(criadoEmDate.getTime())
      ? criadoEmDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
      : null;
  const displayFotoPerfil = usuario.fotoPerfil || fallbackAvatar(usuario);
  const displayFotoCapa = usuario.fotoCapa || fallbackCover(usuario);
  const starCount = 5;
  const displayActiveStars = adminOverrideStars !== null ? adminOverrideStars : Number(usuario.estrelas || 0);

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
        logado={!!usuarioLogado}
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

      <div id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>

        <div className="topo-perfil">
          <button className="back-arrow-btn" onClick={irHome} type="button" title="Voltar">
            <img src={backArrow} alt="Voltar" />
          </button>
          <h3>{usuario.username}</h3>

          <div className="topo-perfil-actions">
            <div className="avaliacao">
              {Array.from({ length: starCount }, (_, index) => {
                const n = index + 1;
                const isActive = n <= displayActiveStars;
                const isGaining = n === animatingStar;
                return (
                  <span key={n} className={`star ${isActive ? "ativa" : ""} ${isGaining ? "gaining" : ""}`}>★</span>
                );
              })}
            </div>

            {isOwnProfile && (
              <div className="perfil-settings-wrap">
                <button
                  type="button"
                  className="perfil-settings-btn"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-label="Abrir configuracoes do perfil"
                  aria-expanded={profileMenuOpen}
                >
                  <GearIcon size={18} />
                </button>

                {profileMenuOpen && (
                  <div className="perfil-settings-menu">
                    <button type="button" onClick={() => openProfileCollection("curtidos")}>
                      Curtidos
                    </button>
                    <button type="button" onClick={() => openProfileCollection("salvos")}>
                      Posts salvos
                    </button>
                    <button type="button" onClick={() => openProfileCollection("republicados")}>
                      Republicados
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        irConfiguracoes?.();
                      }}
                    >
                      Configurações
                    </button>
                    {isAdmin && (
                      <button type="button" onClick={() => { setAdminMode(true); setProfileMenuOpen(false); }}>
                        Admin Tools
                      </button>
                    )}
                    <button type="button" className="danger" onClick={logout}>
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isOwnProfile && usuario.id && (
              <div className="perfil-settings-wrap">
                <button
                  type="button"
                  className="perfil-settings-btn"
                  onClick={() => setPerfilOpcoesAberto((open) => !open)}
                  aria-label="Mais opções deste perfil"
                  aria-expanded={perfilOpcoesAberto}
                >
                  ⋯
                </button>

                {perfilOpcoesAberto && (
                  <div className="perfil-settings-menu">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        setPerfilOpcoesAberto(false);
                        onBlockUser?.(usuario.id);
                      }}
                    >
                      Bloquear perfil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="capa"
          key={reloadImg}
        >
          {displayFotoCapa && (
            <img
              src={displayFotoCapa}
              alt="Capa do perfil"
              style={capaImageStyle}
            />
          )}
        </div>

        <div className="perfil-header">
          <button
            type="button"
            className="foto"
            key={reloadImg + "perfil"}
            onClick={() => displayFotoPerfil && setFotoPerfilAberta(true)}
            aria-label="Abrir foto do perfil"
          >
            {displayFotoPerfil ? (
              <img
                src={displayFotoPerfil}
                alt="Foto do perfil"
                style={perfilImageStyle}
              />
            ) : (
              <span>{avatarInitial(usuario.username || usuario.handle)}</span>
            )}
          </button>

          <div className="info">
            <div className="perfil-title-row">
              <div>
                <h2>{usuario.username}</h2>
                <span className="perfil-handle">@{usuario.handle || usuario.username}</span>
              </div>
              <div className="perfil-header-actions">
                {isOwnProfile && (
                  <button className="btn-editar" onClick={abrirEditorPerfil}>
                    Editar Perfil
                  </button>
                )}
                {!isOwnProfile && (
                  <button
                    className={`btn-editar${isFollowing ? " btn-seguindo" : ""}`}
                    onClick={toggleFollow}
                  >
                    {isFollowing ? "Seguindo" : "Seguir"}
                  </button>
                )}
                {!isOwnProfile && (
                  <button
                    className="btn-contatar"
                    onClick={() => {
                      if (!usuarioLogado) {
                        onRequireAuth?.("Entre para conversar com este perfil.");
                        return;
                      }
                      onContact?.({
                        id: usuario.id,
                        handle: usuario.handle || usuario.username,
                        username: usuario.username,
                        email: usuario.email,
                        fotoPerfil: usuario.fotoPerfil,
                      });
                    }}
                  >
                    Mensagem
                  </button>
                )}
                <div className="perfil-settings-wrap">
                  <button
                    type="button"
                    className="perfil-settings-btn"
                    onClick={() => (isOwnProfile ? setProfileMenuOpen((open) => !open) : setPerfilOpcoesAberto((open) => !open))}
                    aria-label="Mais opções"
                    title="Mais opções"
                    aria-expanded={isOwnProfile ? profileMenuOpen : perfilOpcoesAberto}
                  >
                    ⋯
                  </button>
                  {isOwnProfile && profileMenuOpen && (
                    <div className="perfil-settings-menu">
                      <button type="button" onClick={() => openProfileCollection("curtidos")}>
                        <DsIcon icon={Icons.Heart} size="small" />
                        Curtidos
                      </button>
                      <button type="button" onClick={() => openProfileCollection("salvos")}>
                        <DsIcon icon={Icons.Bookmark} size="small" />
                        Posts salvos
                      </button>
                      <button type="button" onClick={() => openProfileCollection("republicados")}>
                        <DsIcon icon={Icons.Repeat2} size="small" />
                        Republicados
                      </button>
                      <div className="perfil-settings-sep" role="separator" />
                      <button type="button" onClick={() => { setProfileMenuOpen(false); irConfiguracoes?.(); }}>
                        <DsIcon icon={Icons.Settings} size="small" />
                        Configurações
                      </button>
                      <div className="perfil-settings-sep" role="separator" />
                      <button type="button" className="danger" onClick={logout}>
                        <DsIcon icon={Icons.LogOut} size="small" />
                        Sair da conta
                      </button>
                      {isAdmin && (
                        <>
                          <div className="perfil-settings-sep" role="separator" />
                          <button type="button" onClick={() => { setAdminMode(true); setProfileMenuOpen(false); }}>
                            Ferramentas de admin
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {!isOwnProfile && perfilOpcoesAberto && (
                    <div className="perfil-settings-menu">
                      <button type="button" onClick={copiarLinkPerfil}>Copiar link</button>
                      {usuario.id && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setPerfilOpcoesAberto(false);
                            onBlockUser?.(usuario.id);
                          }}
                        >
                          Bloquear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="perfil-metrics">
              <span><b>{posts.length}</b> Posts</span>
              <button type="button" onClick={() => abrirListaSocial("seguidores")}>
                <b>{usuario.seguidores || 0}</b> Seguidores
              </button>
              <button type="button" onClick={() => abrirListaSocial("seguindo")}>
                <b>{usuario.seguindo?.length || 0}</b> Seguindo
              </button>
            </div>

            {usuario.bio ? (
              <p className="bio">{usuario.bio}</p>
            ) : isOwnProfile ? (
              <p className="bio bio-empty">
                Você ainda não escreveu uma bio.{" "}
                <button type="button" className="ds-btn ds-btn-secondary ds-btn--sm" onClick={abrirEditorPerfil}>
                  Adicionar
                </button>
              </p>
            ) : (
              <p className="bio bio-empty">Sem bio.</p>
            )}

            {usuario.disponivelContratacao && (
              <span className="ds-hire-badge">
                <DsIcon icon={Icons.Briefcase} size="small" />
                Disponível para contratação
              </span>
            )}

            <StarRating
              media={usuario.ratingMedia}
              count={usuario.ratingCount}
              minhaNota={usuario.minhaNota}
              interactive={!isOwnProfile}
              hoverValue={hoverRating}
              onHoverChange={setHoverRating}
              onRate={avaliarPerfil}
              disabled={savingRating}
            />

            {criadoEm && <p className="data">No DevSpace desde {criadoEm}</p>}
          </div>
        </div>

        <div className="posts-container">
          <h3>Posts</h3>
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="perfil-post-empty">
                <strong>{isOwnProfile ? "Sua timeline começa aqui." : "Sem posts ainda"}</strong>
                <p>
                  {isOwnProfile
                    ? "Publique seu primeiro projeto, ideia, código ou atualização."
                    : "Este perfil ainda não publicou posts."}
                </p>
                {isOwnProfile && (
                  <button type="button" className="perfil-empty-cta" onClick={() => onOpenPost?.()}>
                    Postar agora
                  </button>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="perfil-post-card">
                  <div className="perfil-post-avatar-card" style={avatarStyle(post.fotoPerfil || usuario.fotoPerfil, post.handle || post.username)}>
                    {!(post.fotoPerfil || usuario.fotoPerfil) && avatarInitial(post.username || post.handle)}
                  </div>
                  <div className="perfil-post-body">
                    <div className="perfil-post-header-row">
                      <div>
                        <div className="perfil-post-title">{post.username}</div>
                        <div className="perfil-post-handle">@{post.handle || post.username}</div>
                      </div>
                      {isOwnProfile && (
                        <button
                          className="perfil-post-options-btn"
                          onClick={(e) => togglePostMenu(e, post.id)}
                        >
                          ⋮
                        </button>
                      )}
                    </div>
                    <div className="perfil-post-text">
                      {post.texto ? <PostContent texto={post.texto} /> : "Post sem texto"}
                    </div>
                    {postEstaSalvo(post) && <div className="perfil-post-saved">Salvo</div>}

                    {(isOwnProfile || isAdmin) && activeMenuPostId === post.id && postMenuPosition && createPortal(
                      <div
                        className="perfil-post-menu perfil-post-menu-floating"
                        style={postMenuPosition}
                      >
                        {isOwnProfile && (
                          <>
                            <button type="button" onClick={() => toggleSavePost(post)}>
                              {postEstaSalvo(post) ? "Remover dos salvos" : "Salvar post"}
                            </button>
                            <button type="button" onClick={() => editPost(post)}>
                              Editar post
                            </button>
                            <button type="button" className="danger" onClick={() => setDeleteConfirm(post.id)}>
                              Excluir post
                            </button>
                          </>
                        )}
                        {isAdmin && !isOwnProfile && (
                          <button type="button" className="danger" onClick={() => setDeleteConfirm(post.id)}>
                            Excluir post (admin)
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {isOwnProfile && editando && createPortal(
          <div className="overlay">
            <div className="popup">
              <button
                className="close-btn"
                onClick={cancelarEdicaoPerfil}
              >
                ×
              </button>

              <h2>Editar Perfil</h2>
              <input id="perfil" type="file" hidden onChange={(e) => handleImagem(e, "perfil")} />
              <input id="capa" type="file" hidden onChange={(e) => handleImagem(e, "capa")} />
              <ProfileForm
                form={form}
                setForm={setForm}
                onSubmit={(e) => { e.preventDefault(); salvarPerfil(); }}
                erro={erro}
                sucesso={sucesso}
                onPickPhoto={() => document.getElementById("perfil")?.click()}
                onPickCover={() => document.getElementById("capa")?.click()}
                onCancel={cancelarEdicaoPerfil}
              />
            </div>
          </div>,
          document.body
        )}

        {isOwnProfile && editingPost && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditingPost(null)}>×</button>
              <h2>Editar Post</h2>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                placeholder="Atualize o texto do post"
                rows={6}
                style={{ background: '#222', color: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #333' }}
              />
              <div className="popup-btns">
                <button onClick={savePostEdit}>Salvar</button>
                <button onClick={() => setEditingPost(null)}>Cancelar</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {isAdmin && adminMode && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => { setAdminMode(false); setAdminOverrideStars(null); setAnimatingStar(null); }}>×</button>
              <h2>Ferramentas de admin</h2>

              <h3>Verificar estrelas</h3>
              <div className="avaliacao admin-stars">
                {Array.from({ length: 5 }, (_, index) => {
                  const n = index + 1;
                  const isActive = n <= (adminOverrideStars !== null ? adminOverrideStars : Number(usuario.estrelas || 0));
                  const isGaining = n === animatingStar;
                  return (
                    <span
                      key={n}
                      className={`star ${isActive ? "ativa" : ""} ${isGaining ? "gaining" : ""}`}
                      onClick={() => {
                        setAdminOverrideStars(n);
                        setAnimatingStar(n);
                        setTimeout(() => setAnimatingStar(null), 1000);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      ★
                    </span>
                  );
                })}
              </div>
              <p>Clique numa estrela para simular o nível.</p>

              <div className="popup-btns">
                <button onClick={() => { setAdminMode(false); setAdminOverrideStars(null); setAnimatingStar(null); }}>Fechar</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {deleteConfirm && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>×</button>
              <h2>Excluir post?</h2>
              <p>Tem certeza de que deseja excluir este post como admin? Essa ação não pode ser desfeita.</p>
              <div className="popup-btns">
                <button className="danger" onClick={() => { deletePost(deleteConfirm); setDeleteConfirm(null); }}>Excluir</button>
                <button onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {isOwnProfile && editandoImagem && createPortal(
          <div
            className="overlay"
            onClick={() => { setEditandoImagem(null); setPreviewImg(null); }}
            onMouseMove={moveImageDrag}
            onMouseUp={endImageDrag}
            onMouseLeave={endImageDrag}
            onTouchMove={moveImageDrag}
            onTouchEnd={endImageDrag}
          >
            <div className="popup" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => { setEditandoImagem(null); setPreviewImg(null); }}
                type="button"
                title="Fechar"
              >
                ×
              </button>

              <h2>Editar Imagem</h2>

              <div className={`preview-box ${editandoImagem === "perfil" ? "perfil" : "capa"}`}>
                <img
                  src={previewImg}
                  className={editandoImagem === "perfil" ? "preview-img perfil" : "preview-img capa"}
                  onMouseDown={beginImageDrag}
                  onTouchStart={beginImageDrag}
                  draggable={false}
                  style={{
                    ...editImageStyle,
                    cursor: dragging ? "grabbing" : "grab",
                  }}
                />
              </div>

              <label>Horizontal</label>
              <input type="range" min="0" max="100"
                value={editandoImagem === "perfil" ? editPosPerfil.x : editPosCapa.x}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, x: v });
                  } else {
                    setEditPosCapa({ ...editPosCapa, x: v });
                  }
                }}
              />

              <label>Vertical</label>
              <input type="range" min="0" max="100"
                value={editandoImagem === "perfil" ? editPosPerfil.y : editPosCapa.y}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, y: v });
                  } else {
                    setEditPosCapa({ ...editPosCapa, y: v });
                  }
                }}
              />

              <label>Zoom</label>
              <input
                type="range"
                min="80"
                max="220"
                value={editandoImagem === "perfil" ? editZoomPerfil : editZoomCapa}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (editandoImagem === "perfil") {
                    setEditZoomPerfil(v);
                  } else {
                    setEditZoomCapa(v);
                  }
                }}
              />

              <div className="popup-btns">
                <button onClick={salvarImagem}>Confirmar Imagem</button>
                <button onClick={() => { setEditandoImagem(null); setPreviewImg(null); }}>Cancelar</button>
              </div>

            </div>
          </div>,
          document.body
        )}

        {fotoPerfilAberta && displayFotoPerfil && createPortal(
          <div className="overlay foto-perfil-overlay" onClick={() => setFotoPerfilAberta(false)}>
            <div className="foto-perfil-popup" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setFotoPerfilAberta(false)}
                type="button"
                title="Fechar"
              >
                ×
              </button>

              <div className="foto-perfil-ampliada">
                <img
                  src={displayFotoPerfil}
                  alt={`Foto de perfil de ${usuario.username}`}
                  style={perfilImageStyle}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>

      {ratingToast && createPortal(
        <div className="ds-toast" role="status">{ratingToast}</div>,
        document.body
      )}

      {listaSocial && createPortal(
        <div className="overlay" onClick={() => setListaSocial(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" type="button" onClick={() => setListaSocial(null)}>×</button>
            <h2>{listaSocial.tipo === "seguidores" ? "Seguidores" : "Seguindo"}</h2>
            {listaSocial.loading && <p>Carregando...</p>}
            {listaSocial.erro && <p className="erro">{listaSocial.erro}</p>}
            {!listaSocial.loading && !listaSocial.erro && (listaSocial.users || []).length === 0 && (
              <p>Ninguém por aqui ainda.</p>
            )}
            <div className="posts-list">
              {(listaSocial.users || []).map((u) => (
                <button
                  key={u.id || u.handle}
                  type="button"
                  className="notif-row"
                  onClick={() => {
                    setListaSocial(null);
                    irPerfil?.({ handle: u.handle, username: u.username, id: u.id, fotoPerfil: u.fotoPerfil });
                  }}
                >
                  <strong>{u.username}</strong>
                  <span>@{u.handle}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
