import "../style/home.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import paginaInicial from "../assets/IMGS/Home.png";
import explorar from "../assets/IMGS/Explorar.png";
import perfil from "../assets/IMGS/NoPerfil.png";

export default function Sidebar({ onReload, irPerfil }) {
  return (
    <div className="sidebar">
      <div className="logo" onClick={onReload}>
        <img src={logo} alt="DevSpace Logo" />
      </div>

      <nav>
        <div className="nav-item" onClick={onReload}>
          <img src={paginaInicial} />
          <span>Página Inicial</span>
        </div>

        <div className="nav-item">
          <img src={explorar} />
          <span>Explorar</span>
        </div>

        <div className="nav-item" onClick={irPerfil}>
          <img src={perfil} />
          <span>Perfil</span>
        </div>
      </nav>

      <button className="post-btn">Postar</button>
    </div>
  );
}