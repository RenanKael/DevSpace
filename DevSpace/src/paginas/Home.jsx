import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home() {
  const [showTopbar, setShowTopbar] = useState(true);

  // POSTS
  const [posts, setPosts] = useState([
    "Post 1",
    "Post 2",
    "Post 3",
    "Post 4",
  ]);

  // 👇 NOVO: controle de loading
  const [loading, setLoading] = useState(false);

  let lastScroll = 0;

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll) {
        setShowTopbar(false);
      } else {
        setShowTopbar(true);
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 👇 FUNÇÃO DE RELOAD MELHORADA
  const reloadFeed = () => {
    if (loading) return; // bloqueia spam de clique

    setLoading(true);
    console.log("Recarregando feed...");

    // simulação de carregamento
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
      <Sidebar onReload={reloadFeed} />

      <div className="main">
        <Topbar visible={showTopbar} />

        <div className="feed">
          {/* 👇 MOSTRA QUANDO ESTÁ CARREGANDO */}
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