import { useEffect, useState } from "react";
import Login from "./paginas/Login";
import Home from "./paginas/Home";
import Perfil from "./paginas/Perfil";
import PerfilColecao from "./paginas/PerfilColecao";
import Explorar from "./paginas/explorar";
import PostModal from "./components/PostModal";
import {
  isSameUser,
  recordUserPostProgress,
  syncUsersStarProgress,
} from "./utils/starProgress";

function fakeAvatar(handle) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle || "usuario")}`;
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

function StarAchievement({ open, stars }) {
  if (!open) return null;
  const count = Math.max(1, Math.min(5, Number(stars || 1)));

  return (
    <div className="achievement-overlay" aria-live="polite">
      <div className="achievement-card">
        <div className="achievement-label">Conquista desbloqueada</div>
        <h2>{count === 1 ? "Primeiro post publicado" : `Nivel ${count} alcancado`}</h2>
        <p>Seu perfil ganhou {count === 1 ? "a primeira estrela" : `${count} estrelas`}.</p>
        <div className="achievement-stars" aria-label={`${count} de 5 estrelas`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={index < count ? "achievement-star earned" : "achievement-star"}>
              &#9733;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const LEGACY_COMMUNITY_USERS = [
  { username: "Lia Gomes", handle: "liagomes", email: "lia.gomes@dev.com", bio: "Compartilhando ideias, rotina e pequenos avancos no DevSpace." },
  { username: "Felipe Rocha", handle: "feliperocha", email: "felipe.rocha@dev.com", bio: "Desenvolvedor em modo prototipo, teste e cafe." },
  { username: "Nina Correa", handle: "ninacorrea", email: "nina.correa@dev.com", bio: "Aprendendo front-end, animacoes e interfaces mais fluidas." },
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

  if (parts[0] === "explorar") {
    return { pagina: "explorar", perfilAlvo: null, perfilCollection: "curtidos" };
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

  return { pagina: "home", perfilAlvo: null, perfilCollection: "curtidos" };
}

function buildRouteUrl(pagina, perfilAlvo, perfilCollection) {
  if (pagina === "explorar") return "/explorar";
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
    username: user.username || "Usuario",
    handle,
    email: user.email || `${handle}@devspace.fake`,
    senha: "123456",
    criadoEm: new Date().toISOString(),
    bio: user.bio || "Perfil da comunidade DevSpace.",
    fotoPerfil: user.fotoPerfil || fakeAvatar(handle),
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
  try {
    return JSON.parse(localStorage.getItem("usuarioLogado")) || JSON.parse(sessionStorage.getItem("usuarioLogado"));
  } catch {
    return null;
  }
}

function App() {
  const [route, setRoute] = useState(createInitialRouteState);
  const [logado, setLogado] = useState(() => !!getStoredUsuario());
  const [usuario, setUsuario] = useState(() => getStoredUsuario());
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postRefresh, setPostRefresh] = useState(0);
  const [achievementStars, setAchievementStars] = useState(0);
  const pagina = route.pagina;
  const perfilAlvo = route.perfilAlvo;
  const perfilCollection = route.perfilCollection;

  useEffect(() => {
    const savedLocal = JSON.parse(localStorage.getItem("usuarioLogado"));
    const savedSession = JSON.parse(sessionStorage.getItem("usuarioLogado"));

    if (savedLocal || savedSession) {
      setLogado(true);
    }

    // Limpa e migra posts antigos
    try {
      const posts = JSON.parse(localStorage.getItem("posts")) || [];
      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
      const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
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

      if (
        postsValidos.length !== posts.length ||
        JSON.stringify(postsMigrados) !== JSON.stringify(posts)
      ) {
        localStorage.setItem("posts", JSON.stringify(postsMigrados));
      }

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
          fotoPerfil: u.fotoPerfil || fakeAvatar(handle),
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
            username: post.username || "Usuario",
            handle,
            email,
            senha: "123456",
            criadoEm: post.criadoEm || new Date().toISOString(),
            bio: "Perfil da comunidade DevSpace.",
            fotoPerfil: post.fotoPerfil || fakeAvatar(handle),
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
              username: comment.username || "Usuario",
              handle: cHandle,
              email: cEmail,
              senha: "123456",
              criadoEm: comment.criadoEm || new Date().toISOString(),
              bio: "Pessoa da comunidade DevSpace.",
              fotoPerfil: comment.fotoPerfil || fakeAvatar(cHandle),
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
          fotoPerfil: u.fotoPerfil || fakeAvatar(handle),
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
      if (JSON.stringify(repairedPosts) !== JSON.stringify(postsMigrados)) {
        localStorage.setItem("posts", JSON.stringify(repairedPosts));
      }
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
      const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
      const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
      setUsuario(localUser || sessionUser);
    } else {
      setUsuario(null);
    }
  }, [logado]);

  function handleOpenPost() {
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

  function handlePostCreated(post) {
    try {
      const posts = JSON.parse(localStorage.getItem("posts")) || [];
      const currentUser = usuario || JSON.parse(localStorage.getItem("usuarioLogado")) || JSON.parse(sessionStorage.getItem("usuarioLogado"));
      const novoPost = {
        ...post,
        comments: Number(post.comments || 0),
        commentsList: Array.isArray(post.commentsList) ? post.commentsList : [],
        isSeedFake: !!post.isSeedFake,
      };
      const novos = [novoPost, ...posts];
      localStorage.setItem("posts", JSON.stringify(novos));

      if (currentUser) {
        const { updatedUser, previousStars, newStars } = recordUserPostProgress(currentUser);
        setUsuario(updatedUser);

        if (newStars > previousStars) {
          setAchievementStars(newStars);
          window.setTimeout(() => setAchievementStars(0), 4600);
        }
      }

      setPostRefresh((value) => value + 1);
      setIsPostModalOpen(false);
    } catch (error) {
      console.warn("Nao foi possivel salvar o post:", error);
    }
  }

  function showStarAchievement(stars) {
    setAchievementStars(stars);
    window.setTimeout(() => setAchievementStars(0), 4600);
  }

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }

  if (pagina === "perfil") {
    return (
      <>
        <Perfil
          onLogout={() => setLogado(false)}
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          refreshFeed={postRefresh}
          viewedUser={perfilAlvo}
          onOpenProfileCollection={(tipo) => {
            navigate({ pagina: "perfilColecao", perfilAlvo: null, perfilCollection: tipo });
          }}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} />
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
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
          onStarAchievement={showStarAchievement}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} />
      </>
    );
  }

  if (pagina === "explorar") {
    return (
      <>
        <Explorar
          irHome={() => navigate({ pagina: "home", perfilAlvo: null })}
          irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
        <StarAchievement open={achievementStars > 0} stars={achievementStars} />
      </>
    );
  }

  return (
    <>
      <Home
        irPerfil={() => navigate({ pagina: "perfil", perfilAlvo: null })}
        irExplorar={() => navigate({ pagina: "explorar", perfilAlvo: null })}
        onOpenPost={handleOpenPost}
        refreshFeed={postRefresh}
        onOpenUserProfile={abrirPerfilAlvo}
        onStarAchievement={showStarAchievement}
      />

      <PostModal
        open={isPostModalOpen}
        onClose={handleClosePost}
        usuario={usuario}
        onPostSaved={handlePostCreated}
      />
      <StarAchievement open={achievementStars > 0} stars={achievementStars} />
    </>
  );
}

export default App;
