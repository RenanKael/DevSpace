import "../styles/home.css";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="logo"></div>

      <nav>
        <div className="nav-item">
          <img src="" alt="" />
          <span>Página Inicial</span>
        </div>

        <div className="nav-item">
          <img src="" alt="" />
          <span>Explorar</span>
        </div>

        <div className="nav-item">
          <img src="" alt="" />
          <span>Perfil</span>
        </div>
      </nav>

      <button className="post-btn">Postar</button>
    </div>
  );
}