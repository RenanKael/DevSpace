import { useState } from "react";
import "../style/home.css";
import lupa from "../assets/IMGS/Lupa.svg";

export default function Topbar({ visible, usuario, onSearch }) {
  const [query, setQuery] = useState("");

  return (
    <div className={`topbar ${visible ? "show" : "hide"}`}>
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
        <div className="user-info">
          <span className="nome">
            {usuario ? usuario.username : "..."}
          </span>

          <span className="arroba">
            @{usuario ? usuario.username : "..."}
          </span>
        </div>

        <div className="avatar" style={{
          backgroundImage: usuario?.fotoPerfil ? `url(${usuario.fotoPerfil})` : 'none',
          backgroundPosition: usuario?.posPerfil ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%` : 'center',
          backgroundSize: 'cover'
        }}></div>
      </div>
    </div>
  );
}
