import { useState } from "react";
import "../style/home.css";
import lupa from "../assets/IMGS/Lupa.svg";
import semFoto from "../assets/IMGS/NoPerfil.png";

export default function Topbar({ visible, usuario, onSearch, sidebarOpen = true }) {
  const [query, setQuery] = useState("");

  return (
    <div className={`topbar ${visible ? "show" : "hide"}${sidebarOpen ? "" : " sidebar-closed"}`}>
      <div className="search-box">
        <img src={lupa} alt="" aria-hidden="true" />
        <input
          type="text"
          placeholder="Buscar posts ou usuários"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
        />
      </div>

      <div className="profile">
        {usuario && (
          <div className="user-info">
            <span className="nome">{usuario.username}</span>
            <span className="arroba">@{usuario.username}</span>
          </div>
        )}

        <div className="avatar" style={{
          backgroundImage: `url(${usuario?.fotoPerfil || semFoto})`,
          backgroundPosition: usuario?.posPerfil ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%` : 'center',
          backgroundSize: 'cover'
        }}></div>
      </div>
    </div>
  );
}
