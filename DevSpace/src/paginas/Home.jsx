import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../style/home.css";

export default function Home() {
  const [showTopbar, setShowTopbar] = useState(true);
  let lastScroll = 0;

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll) {
        setShowTopbar(false); // descendo
      } else {
        setShowTopbar(true); // subindo
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home">
      <Sidebar />

      <div className="main">
        <Topbar visible={showTopbar} />

        <div className="feed">
          {/* área preta scrollável */}
          <div className="post-placeholder"></div>
          <div className="post-placeholder"></div>
          <div className="post-placeholder"></div>
          <div className="post-placeholder"></div>
        </div>
      </div>
    </div>
  );
}