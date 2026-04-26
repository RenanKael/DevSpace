import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home({ irPerfil }) {
  const [showTopbar, setShowTopbar] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    setUsuario(user);
  }, []);

  const [posts, setPosts] = useState([
    "Post 1",
    "Post 2",
    "Post 3",
    "Post 4",
  ]);

  const [loading, setLoading] = useState(false);

  let lastScroll = 0;

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setShowTopbar(currentScroll < lastScroll);
      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const reloadFeed = () => {
    if (loading) return;

    setLoading(true);

    setTimeout(() => {
      setPosts([
        "Novo post A",
        "Novo post B",
        "Novo post C",
        "Novo post D",
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="home">
      <Sidebar
        onReload={reloadFeed}
        irPerfil={irPerfil}
      />

      <div className="main">
        <Topbar visible={showTopbar} usuario={usuario} />

        <div className="feed">
          {loading && <p>Carregando...</p>}

          {posts.map((post, index) => (
            <div key={index} className="post-placeholder">
              {post}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}