import "../style/home.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import paginaInicial from "../assets/IMGS/Home.png";
import explorar from "../assets/IMGS/Explorar.png";
import perfil from "../assets/IMGS/NoPerfil.png";
// import chat from "../assets/IMGS/Chat.png";

export default function Sidebar({
  isOpen,
  onToggle,
  onReload,
  irPerfil,
  irExplorar,
  onOpenPost,
  irChat,
}) {
  return (
    <>
      <button
        className="sidebar-toggle"
        style={{ left: isOpen ? "260px" : "15px" }}
        onClick={onToggle}
      >
        {isOpen ? "≡" : "≡"}
      </button>

      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="logo" onClick={onReload}>
          <img src={logo} alt="DevSpace Logo" />
        </div>

        <nav>
          <div className="nav-item" onClick={onReload}>
            <img src={paginaInicial} alt="" />
            <span>Página Inicial</span>
          </div>

          <div className="nav-item" onClick={irExplorar}>
            <img src={explorar} alt="" />
            <span>Explorar</span>
          </div>

          <div className="nav-item" onClick={irPerfil}>
            <img src={perfil} alt="" />
            <span>Perfil</span>
          </div>

          <div className="nav-item" onClick={irChat}>
            {/* <img src={chat} alt="" /> */}
            <span>Chat</span>
          </div>
        </nav>

        <button className="post-btn" onClick={onOpenPost}>
          Postar
        </button>
      </div>
    </>
  );
}