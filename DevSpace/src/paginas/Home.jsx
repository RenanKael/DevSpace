import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home() {
  const [showTopbar, setShowTopbar] = useState(true);

  // 👇 NOVO: posts
  const [posts, setPosts] = useState([
    "Post 1",
    "Post 2",
    "Post 3",
    "Post 4",
  ]);

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

  // FUNÇÃO DE RELOAD
  const reloadFeed = () => {
    console.log("Recarregando feed...");

    setPosts([
      "Novo post A",
      "Novo post B",
      "Novo post C",
      "Novo post D",
    ]);
  };

  return (
    <div className="home">
      {/* 👇 AQUI É ONDE PASSA */}
      <Sidebar onReload={reloadFeed} />

      <div className="main">
        <Topbar visible={showTopbar} />

        <div className="feed">
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