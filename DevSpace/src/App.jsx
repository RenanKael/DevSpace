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

  useEffect(() => {
    const savedLocal = JSON.parse(localStorage.getItem("usuarioLogado"));
    const savedSession = JSON.parse(sessionStorage.getItem("usuarioLogado"));

    if (savedLocal || savedSession) {
      setLogado(true);
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

  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    if (savedPosts.length === 0) {
      const seedPosts = [
        {
          id: 1,
          username: "Lia Gomes",
          handle: "liagomes",
          email: "lia.gomes@dev.com",
          fotoPerfil: "",
          texto: "Começando a semana com foco e café na mesa. Vamos fazer acontecer!",
          imagem: "",
          comments: 2,
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
          texto: "Adorei o novo projeto, já estou testando as ideias no protótipo.",
          imagem: "",
          comments: 3,
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
          texto: "Hora de aprender algo novo: hoje vou estudar animações CSS para fazer cards mais fluidos.",
          imagem: "",
          comments: 4,
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
          texto: "Todo dia é dia de melhorar o design e deixar o app mais agradável para as pessoas.",
          imagem: "",
          comments: 1,
          shares: 0,
          likes: 7,
          bookmarks: 1,
          downloads: 0,
          criadoEm: new Date().toISOString(),
        },
      ];

      localStorage.setItem("posts", JSON.stringify(seedPosts));
      setPostRefresh((value) => value + 1);
    }
  }, []);

  function handleOpenPost() {
    setIsPostModalOpen(true);
  }

  function handleClosePost() {
    setIsPostModalOpen(false);
  }

  function handlePostCreated(post) {
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    const novos = [post, ...posts];
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
          irHome={() => setPagina("home")}
          onOpenPost={handleOpenPost}
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
        irPerfil={() => setPagina("perfil")}
        onOpenPost={handleOpenPost}
        refreshFeed={postRefresh}
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