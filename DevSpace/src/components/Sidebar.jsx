import "../style/home.css";
import SidebarToggleIcon from "./SidebarToggleIcon";
import ChatIcon from "./ChatIcon";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import paginaInicial from "../assets/IMGS/Home.png";
import explorar from "../assets/IMGS/Explorar.png";
import perfil from "../assets/IMGS/NoPerfil.png";

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
      {!isOpen && (
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Abrir menu">
          <SidebarToggleIcon action="abrir" />
        </button>
      )}

      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} />}

      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={onReload}>
            <img src={logo} alt="DevSpace Logo" />
            {!isOpen && (
              <button
                className="logo-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                aria-label="Abrir menu"
              >
                <SidebarToggleIcon action="abrir" size={28} />
              </button>
            )}
          </div>

          {isOpen && (
            <button className="sidebar-toggle-inline" onClick={onToggle} aria-label="Minimizar menu">
              <SidebarToggleIcon action="fechar" />
            </button>
          )}
        </div>

        <nav>
          <div className="nav-item" data-label="Página Inicial" onClick={onReload}>
            <img src={paginaInicial} alt="" />
            <span>Página Inicial</span>
          </div>

          <div className="nav-item" data-label="Explorar" onClick={irExplorar}>
            <img src={explorar} alt="" />
            <span>Explorar</span>
          </div>

          <div className="nav-item" data-label="Perfil" onClick={irPerfil}>
            <img src={perfil} alt="" />
            <span>Perfil</span>
          </div>

          <div className="nav-item" data-label="Chat" onClick={irChat}>
            <ChatIcon />
            <span>Chat</span>
          </div>
        </nav>

        <button className="post-btn" data-label="Postar" onClick={onOpenPost}>
          Postar
        </button>
      </div>
    </>
  );
}
