import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import { createPortal } from "react-dom";
import backArrow from "../assets/IMGS/DawnFlech (2).png";
import { syncUsersStarProgress } from "../utils/starProgress";

export default function Perfil({ onLogout, irHome, irPerfil, irExplorar, onOpenPost, refreshFeed, viewedUser, onOpenProfileCollection }) {
  const [usuario, setUsuario] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editando, setEditando] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminOverrideStars, setAdminOverrideStars] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [editandoImagem, setEditandoImagem] = useState(null);

  const [form, setForm] = useState({});
  const [senhaAtualPerfil, setSenhaAtualPerfil] = useState("");
  const [novaSenhaPerfil, setNovaSenhaPerfil] = useState("");
  const [confirmarSenhaPerfil, setConfirmarSenhaPerfil] = useState("");

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
  const [syncToast, setSyncToast] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    baseX: 50,
    baseY: 50,
  });

  const [animatingStar, setAnimatingStar] = useState(null);
  const previousActiveStarsRef = useRef(null);

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

  function fallbackCover(user) {
    const seed = user?.handle || user?.username || user?.email || "usuario";
    return `https://picsum.photos/seed/${encodeURIComponent(seed + "-cover")}/1200/320`;
  }

  useEffect(() => {
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
    const user = baseUser
      ? syncedUsers.find((u) => {
          const byEmail = baseUser.email && u.email &&
            u.email.toLowerCase() === baseUser.email.toLowerCase();
          const byHandle = baseUser.handle && u.handle &&
            u.handle.toLowerCase() === baseUser.handle.toLowerCase();
          return byEmail || byHandle;
        }) || baseUser
      : null;

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
    const user = baseUser
        ? syncedUsers.find((u) => {
            const byEmail = baseUser.email && u.email &&
              u.email.toLowerCase() === baseUser.email.toLowerCase();
            const byHandle = baseUser.handle && u.handle &&
              u.handle.toLowerCase() === baseUser.handle.toLowerCase();
            return byEmail || byHandle;
          }) || baseUser
        : null;

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
      setSyncToast(true);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [viewedUser]);

  useEffect(() => {
    if (!syncToast) return;
    const timer = setTimeout(() => setSyncToast(false), 2200);
    return () => clearTimeout(timer);
  }, [syncToast]);

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

  useEffect(() => {
    if (!usuario) return;

    let savedPosts = JSON.parse(localStorage.getItem("posts")) || [];

    const postsValidos = savedPosts.filter((post) => {
      return post && (post.email || post.username || post.handle);
    });

    if (postsValidos.length !== savedPosts.length) {
      localStorage.setItem("posts", JSON.stringify(postsValidos));
      savedPosts = postsValidos;
    }

    const filtered = savedPosts.filter((post) => postBelongsToUser(post, usuario));

    const ordered = filtered.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
    setPosts(ordered);
    setActiveMenuPostId(null);
  }, [usuario, refreshFeed]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setEditando(false);
        setEditandoImagem(null);
        setFotoPerfilAberta(false);
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function handleImagem(e, tipo) {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setPreviewImg(reader.result);
      setEditandoImagem(tipo);

      if (tipo === "perfil") setEditPosPerfil(posPerfil);
      if (tipo === "capa") setEditPosCapa(posCapa);
      if (tipo === "perfil") setEditZoomPerfil(zoomPerfil);
      if (tipo === "capa") setEditZoomCapa(zoomCapa);
    };

    reader.readAsDataURL(file);
  }

  function salvarImagem() {
    if (!isOwnProfile) return;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let atualizado = { ...usuario };

    if (editandoImagem === "perfil") {
      atualizado.fotoPerfil = previewImg;
      atualizado.posPerfil = editPosPerfil;
      atualizado.zoomPerfil = Number(editZoomPerfil || 100);
      setPosPerfil(editPosPerfil);
      setZoomPerfil(Number(editZoomPerfil || 100));
    }

    if (editandoImagem === "capa") {
      atualizado.fotoCapa = previewImg;
      atualizado.posCapa = editPosCapa;
      atualizado.zoomCapa = Number(editZoomCapa || 100);
      setPosCapa(editPosCapa);
      setZoomCapa(Number(editZoomCapa || 100));
    }

    saveProfileImageBackup(atualizado);

    const novosUsuarios = usuarios.map((u) =>
      u.email === atualizado.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
    if (localStorage.getItem("usuarioLogado")) {
      localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }
    if (sessionStorage.getItem("usuarioLogado")) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }
    sincronizarReferenciasDoUsuario(usuario, atualizado);

    setUsuarioLogado(atualizado);
    setUsuario(atualizado);

    setReloadImg(Date.now());

    setEditandoImagem(null);
    setPreviewImg(null);
  }

  function salvarPerfil() {
    if (!isOwnProfile) return;
    
    if (!form.username || !form.handle) {
      setErro("Nome e @ são obrigatórios!");
      return;
    }

    const querAlterarSenha = senhaAtualPerfil || novaSenhaPerfil || confirmarSenhaPerfil;

    if (querAlterarSenha) {
      if (!senhaAtualPerfil || !novaSenhaPerfil || !confirmarSenhaPerfil) {
        setErro("Preencha a senha atual, a nova senha e a confirmação.");
        return;
      }

      if (senhaAtualPerfil !== usuario.senha) {
        setErro("Senha atual incorreta.");
        return;
      }

      if (novaSenhaPerfil.length < 6) {
        setErro("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      if (novaSenhaPerfil !== confirmarSenhaPerfil) {
        setErro("A confirmação da nova senha não bate.");
        return;
      }
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
      senha: querAlterarSenha ? novaSenhaPerfil : usuario.senha,
    };

    atualizado.fotoPerfil = usuario.fotoPerfil;
    atualizado.fotoCapa = usuario.fotoCapa;
    atualizado.avaliacao = usuario.avaliacao || 0;
    atualizado.estrelas = usuario.estrelas || usuario.avaliacao || 0;
    atualizado.starStats = usuario.starStats;

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

    setReloadImg(Date.now());

    setPreviewImg(null);
    setEditandoImagem(null);
    setEditando(false);
    setSenhaAtualPerfil("");
    setNovaSenhaPerfil("");
    setConfirmarSenhaPerfil("");

    setErro("");
    setSucesso(querAlterarSenha ? "Perfil e senha atualizados com sucesso!" : "Perfil atualizado com sucesso!");
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
    setPosts(updatedPosts.filter((post) => postBelongsToUser(post, usuario)));
    setEditingPost(null);
    setEditingText("");
  }

  function toggleSavePost(post) {
    if (!isOwnProfile) return;
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.map((item) =>
      item.id === post.id ? { ...item, salvo: !item.salvo } : item
    );

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts.filter((post) => postBelongsToUser(post, usuario)));
    setActiveMenuPostId(null);
  }

  function deletePost(postId) {
    if (!isOwnProfile) return;
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.filter((post) => post.id !== postId);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts.filter((post) => postBelongsToUser(post, usuario)));
    setActiveMenuPostId(null);
  }

  function editPost(post) {
    if (!isOwnProfile) return;
    setEditingPost(post);
    setEditingText(post.texto || "");
    setActiveMenuPostId(null);
  }

  function logout() {
    if (!isOwnProfile) return;
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("lembrarMe");
    sessionStorage.removeItem("usuarioLogado");
    onLogout();
  }

  function openProfileCollection(tipo) {
    if (!isOwnProfile) return;
    setProfileMenuOpen(false);
    onOpenProfileCollection?.(tipo);
  }

  function toggleFollow() {
    if (isOwnProfile || !usuario || !usuarioLogado) return;

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const loggedEmail = (usuarioLogado.email || "").toLowerCase();
    const loggedHandle = (usuarioLogado.handle || usuarioLogado.username || "").toLowerCase();
    const targetHandle = (usuario.handle || usuario.username || "").toLowerCase();
    const targetKey = targetHandle;

    const updatedUsers = usuarios.map((u) => {
      const userEmail = (u.email || "").toLowerCase();
      const userHandle = (u.handle || u.username || "").toLowerCase();

      if ((loggedEmail && userEmail === loggedEmail) || (loggedHandle && userHandle === loggedHandle)) {
        const list = Array.isArray(u.seguindo) ? u.seguindo : [];
        const normalized = list.map((item) => (item || "").toLowerCase());
        const already = normalized.includes(targetKey);
        return {
          ...u,
          seguindo: already
            ? normalized.filter((item) => item !== targetKey)
            : [...normalized, targetKey],
        };
      }

      if (userHandle === targetHandle) {
        const currentFollowers = Number(u.seguidores || 0);
        return {
          ...u,
          seguidores: isFollowing
            ? Math.max(0, currentFollowers - 1)
            : currentFollowers + 1,
        };
      }

      return u;
    });

    localStorage.setItem("usuarios", JSON.stringify(updatedUsers));

    const nextLogged = updatedUsers.find((u) => {
      const userEmail = (u.email || "").toLowerCase();
      const userHandle = (u.handle || u.username || "").toLowerCase();
      return (loggedEmail && userEmail === loggedEmail) || (loggedHandle && userHandle === loggedHandle);
    }) || usuarioLogado;
    const nextTarget = updatedUsers.find((u) => {
      const userHandle = (u.handle || "").toLowerCase();
      return userHandle === targetHandle;
    }) || usuario;

    setUsuarioLogado(nextLogged);
    setUsuario(nextTarget);
    setIsFollowing(!isFollowing);

    if (localStorage.getItem("usuarioLogado")) {
      localStorage.setItem("usuarioLogado", JSON.stringify(nextLogged));
    }
    if (sessionStorage.getItem("usuarioLogado")) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(nextLogged));
    }
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

  const isRenan = usuario?.email === "renan.kael@gmail.com";

  useEffect(() => {
    if (!usuario) return;

    const currentActiveStars = isRenan ? 6 : Number(usuario.avaliacao || usuario.estrelas || 0);
    const previousActiveStars = previousActiveStarsRef.current;
    previousActiveStarsRef.current = currentActiveStars;

    if (previousActiveStars === null) return;

    if (currentActiveStars > previousActiveStars) {
      const startAnimationId = setTimeout(() => setAnimatingStar(currentActiveStars), 0);
      const clearAnimationId = setTimeout(() => setAnimatingStar(null), 1000);
      return () => {
        clearTimeout(startAnimationId);
        clearTimeout(clearAnimationId);
      };
    }
  }, [usuario, isRenan]);

  if (!usuario) return <h1>Carregando...</h1>;

  const starCount = 5;
  const activeStars = Number(usuario.avaliacao || usuario.estrelas || 0);
  const displayActiveStars = adminOverrideStars !== null ? adminOverrideStars : activeStars;
  const criadoEm = new Date(usuario.criadoEm).toLocaleDateString();
  const displayFotoPerfil = usuario.fotoPerfil || fallbackAvatar(usuario);
  const displayFotoCapa = usuario.fotoCapa || fallbackCover(usuario);

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={irPerfil} irExplorar={irExplorar} onOpenPost={onOpenPost} />

      <div className="profile-page">

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
                  ⋯
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
            {displayFotoPerfil && (
              <img
                src={displayFotoPerfil}
                alt="Foto do perfil"
                style={perfilImageStyle}
              />
            )}
          </button>

          <div className="stats">
            <span><b>{usuario.seguindo?.length || 0}</b> Seguindo</span>
            <span><b>{usuario.seguidores || 0}</b> Seguidores</span>
            <span><b>{posts.length}</b> Posts</span>
          </div>

          {isOwnProfile && (
            <button className="btn-editar" onClick={() => setEditando(true)}>
              Editar Perfil
            </button>
          )}
          {!isOwnProfile && (
            <button className="btn-editar" onClick={toggleFollow}>
              {isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>

        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.handle || usuario.username}</span>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>

          <p className="data">
            Criado em: {criadoEm}
          </p>
        </div>

        <div className="posts-container">
          <h3>Posts</h3>
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="perfil-post-empty">Sem posts ainda.</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="perfil-post-card">
                  <div className="perfil-post-avatar-card" style={{
                    backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }} />
                  <div className="perfil-post-body">
                    <div className="perfil-post-header-row">
                      <div>
                        <div className="perfil-post-title">{post.username}</div>
                        <div className="perfil-post-handle">@{post.handle || post.username}</div>
                      </div>
                      {isOwnProfile && (
                        <button
                          className="perfil-post-options-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                          }}
                        >
                          ⋮
                        </button>
                      )}
                    </div>
                    <div className="perfil-post-text">{post.texto || "Post sem texto"}</div>
                    {post.salvo && <div className="perfil-post-saved">Salvo</div>}

                    {(isOwnProfile || isAdmin) && activeMenuPostId === post.id && (
                      <div className="perfil-post-menu">
                        {isOwnProfile && (
                          <>
                            <button type="button" onClick={() => toggleSavePost(post)}>
                              {post.salvo ? "Desfazer salvar" : "Salvar post"}
                            </button>
                            <button type="button" onClick={() => editPost(post)}>
                              Editar post
                            </button>
                            <button type="button" onClick={() => deletePost(post.id)}>
                              Excluir post
                            </button>
                          </>
                        )}
                        {isAdmin && !isOwnProfile && (
                          <button type="button" className="danger" onClick={() => setDeleteConfirm(post.id)}>
                            Delete Post (Admin)
                          </button>
                        )}
                      </div>
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
                onClick={() => {
                  setEditando(false);
                  setSenhaAtualPerfil("");
                  setNovaSenhaPerfil("");
                  setConfirmarSenhaPerfil("");
                  setErro("");
                }}
              >
                x
              </button>

              <h2>Editar Perfil</h2>

              <input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Nome" />
              <input value={form.handle || ""} onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/\s+/g, "") })} placeholder="@usuário" />
              <input value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />

              <div className="password-edit-group">
                <strong>Alterar senha</strong>
                <input
                  type="password"
                  value={senhaAtualPerfil}
                  onChange={(e) => setSenhaAtualPerfil(e.target.value)}
                  placeholder="Senha atual"
                />
                <input
                  type="password"
                  value={novaSenhaPerfil}
                  onChange={(e) => setNovaSenhaPerfil(e.target.value)}
                  placeholder="Nova senha"
                />
                <input
                  type="password"
                  value={confirmarSenhaPerfil}
                  onChange={(e) => setConfirmarSenhaPerfil(e.target.value)}
                  placeholder="Confirmar nova senha"
                />
              </div>

              <button onClick={() => document.getElementById("perfil").click()}>Alterar Foto Perfil</button>
              <input id="perfil" type="file" hidden onChange={(e) => handleImagem(e, "perfil")} />

              <button onClick={() => document.getElementById("capa").click()}>Alterar Capa</button>
              <input id="capa" type="file" hidden onChange={(e) => handleImagem(e, "capa")} />

              {erro && <p>{erro}</p>}
              {sucesso && <p>{sucesso}</p>}

              <div className="popup-btns">
                <button onClick={salvarPerfil}>Salvar</button>
                <button
                  onClick={() => {
                    setEditando(false);
                    setSenhaAtualPerfil("");
                    setNovaSenhaPerfil("");
                    setConfirmarSenhaPerfil("");
                    setErro("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {isOwnProfile && editingPost && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditingPost(null)}>x</button>
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
              <button className="close-btn" onClick={() => { setAdminMode(false); setAdminOverrideStars(null); setAnimatingStar(null); }}>x</button>
              <h2>Admin Tools</h2>

              <h3>Star Verification</h3>
              <div className="avaliacao admin-stars">
                {Array.from({ length: starCount }, (_, index) => {
                  const n = index + 1;
                  const isActive = n <= (adminOverrideStars !== null ? adminOverrideStars : activeStars);
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
              <p>Click on a star to simulate gaining that star level.</p>

              <div className="popup-btns">
                <button onClick={() => { setAdminMode(false); setAdminOverrideStars(null); setAnimatingStar(null); }}>Close</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {deleteConfirm && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>x</button>
              <h2>Confirm Delete</h2>
              <p>Are you sure you want to delete this post as admin? This action cannot be undone.</p>
              <div className="popup-btns">
                <button className="danger" onClick={() => { deletePost(deleteConfirm); setDeleteConfirm(null); }}>Delete</button>
                <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {isOwnProfile && editandoImagem && createPortal(
          <div
            className="overlay"
            onMouseMove={moveImageDrag}
            onMouseUp={endImageDrag}
            onMouseLeave={endImageDrag}
            onTouchMove={moveImageDrag}
            onTouchEnd={endImageDrag}
          >
            <div className="popup">

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
                <button onClick={salvarImagem}>Salvar Imagem</button>
                <button onClick={() => setEditandoImagem(null)}>Cancelar</button>
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
                x
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

      {syncToast && (
        <div className="sync-toast">Dados atualizados em outra aba.</div>
      )}
    </div>
  );
}
