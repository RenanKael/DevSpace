import { useEffect, useState } from "react";
import Login from "./paginas/Login";
import Home from "./paginas/Home";
import Perfil from "./paginas/Perfil";
import Explorar from "./paginas/explorar";
import PostModal from "./components/PostModal";

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

function App() {
  const [logado, setLogado] = useState(false);
  const [pagina, setPagina] = useState("home");
  const [usuario, setUsuario] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postRefresh, setPostRefresh] = useState(0);
  const [perfilAlvo, setPerfilAlvo] = useState(null);

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
      const postsValidos = posts.filter((post) => {
        return post && (post.email || post.username || post.handle) && post.criadoEm;
      });

      const postsMigrados = postsValidos.map((post) => {
        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : [];
        const isSeedFake = !!post.isSeedFake;
        const comments = isSeedFake
          ? commentsList.length || Number(post.comments || 0)
          : commentsList.length;

        return {
          ...post,
          commentsList,
          isSeedFake,
          comments,
          shares: Number(post.shares || 0),
          likes: Number(post.likes || 0),
          bookmarks: Number(post.bookmarks || 0),
          downloads: Number(post.downloads || 0),
        };
      });

      if (
        postsValidos.length !== posts.length ||
        JSON.stringify(postsMigrados) !== JSON.stringify(posts)
      ) {
        localStorage.setItem("posts", JSON.stringify(postsMigrados));
      }

      const byEmail = new Set(usuarios.map((u) => (u.email || "").toLowerCase()));
      const novosUsuarios = usuarios.map((u) => {
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
            estrelas: 1,
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
              estrelas: 1,
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
        dedupedMap.set(key, keepCurrent ? u : prev);
      });

      const dedupedUsers = [...dedupedMap.values()];
      localStorage.setItem("usuarios", JSON.stringify(dedupedUsers));
    } catch (error) {
      console.warn("Erro ao limpar posts:", error);
    }
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

  function abrirPerfilAlvo(userRef) {
    if (!userRef) return;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const byEmail = userRef.email
      ? usuarios.find((u) => (u.email || "").toLowerCase() === userRef.email.toLowerCase())
      : null;
    const byHandle = !byEmail
      ? usuarios.find((u) => (u.handle || "").toLowerCase() === (userRef.handle || "").toLowerCase())
      : null;
    const alvo = byEmail || byHandle || userRef;
    setPerfilAlvo(alvo);
    setPagina("perfil");
  }

  function handlePostCreated(post) {
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    const novoPost = {
      ...post,
      comments: Number(post.comments || 0),
      commentsList: Array.isArray(post.commentsList) ? post.commentsList : [],
      isSeedFake: !!post.isSeedFake,
    };
    const novos = [novoPost, ...posts];
    localStorage.setItem("posts", JSON.stringify(novos));
    setPostRefresh((value) => value + 1);
    setIsPostModalOpen(false);
  }

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }

  if (pagina === "perfil") {
    return (
      <>
        <Perfil
          onLogout={() => setLogado(false)}
          irHome={() => {
            setPerfilAlvo(null);
            setPagina("home");
          }}
          irPerfil={() => {
            setPerfilAlvo(null);
            setPagina("perfil");
          }}
          irExplorar={() => {
            setPerfilAlvo(null);
            setPagina("explorar");
          }}
          onOpenPost={handleOpenPost}
          refreshFeed={postRefresh}
          viewedUser={perfilAlvo}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
      </>
    );
  }

  if (pagina === "explorar") {
    return (
      <>
        <Explorar
          irHome={() => setPagina("home")}
          irPerfil={() => {
            setPerfilAlvo(null);
            setPagina("perfil");
          }}
          onOpenPost={handleOpenPost}
          onOpenUserProfile={abrirPerfilAlvo}
        />

        <PostModal
          open={isPostModalOpen}
          onClose={handleClosePost}
          usuario={usuario}
          onPostSaved={handlePostCreated}
        />
      </>
    );
  }

  return (
    <>
      <Home
        irPerfil={() => {
          setPerfilAlvo(null);
          setPagina("perfil");
        }}
        irExplorar={() => setPagina("explorar")}
        onOpenPost={handleOpenPost}
        refreshFeed={postRefresh}
        onOpenUserProfile={abrirPerfilAlvo}
      />

      <PostModal
        open={isPostModalOpen}
        onClose={handleClosePost}
        usuario={usuario}
        onPostSaved={handlePostCreated}
      />
    </>
  );
}

export default App;
