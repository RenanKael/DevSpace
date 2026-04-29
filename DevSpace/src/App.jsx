import { useEffect, useState } from "react";
import Login from "./paginas/Login";
import Home from "./paginas/Home";
import Perfil from "./paginas/Perfil";
import PostModal from "./components/PostModal";

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
      const novosUsuarios = [...usuarios];
      postsMigrados.forEach((post) => {
        const email = (post.email || `${post.handle || post.username}@devspace.fake`).toLowerCase();
        if (!byEmail.has(email)) {
          byEmail.add(email);
          novosUsuarios.push({
            username: post.username || "Usuario",
            handle: (post.handle || post.username || "usuario").replace(/\s+/g, "").toLowerCase(),
            email,
            senha: "123456",
            criadoEm: post.criadoEm || new Date().toISOString(),
            bio: "Perfil da comunidade DevSpace.",
            fotoPerfil: post.fotoPerfil || "",
            fotoCapa: "",
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
          if (!byEmail.has(cEmail)) {
            byEmail.add(cEmail);
            novosUsuarios.push({
              username: comment.username || "Usuario",
              handle: (comment.handle || comment.username || "usuario").replace(/\s+/g, "").toLowerCase(),
              email: cEmail,
              senha: "123456",
              criadoEm: comment.criadoEm || new Date().toISOString(),
              bio: "Pessoa da comunidade DevSpace.",
              fotoPerfil: comment.fotoPerfil || "",
              fotoCapa: "",
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
      localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
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

  return (
    <>
      <Home
        irPerfil={() => {
          setPerfilAlvo(null);
          setPagina("perfil");
        }}
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
