import { useState } from "react";
import "../style/home.css";
import { useOverlayClose } from "../hooks/useOverlayClose";
import lupa from "../assets/IMGS/Lupa.svg";
import semFoto from "../assets/IMGS/NoPerfil.png";

export default function Topbar({ visible, usuario, onSearch, sidebarOpen = true, onOpenUserProfile, onOpenSettings, onLogout }) {
  const [query, setQuery] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  useOverlayClose(menuAberto, () => setMenuAberto(false));

  function sair() {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("lembrarMe");
    sessionStorage.removeItem("usuarioLogado");
    setMenuAberto(false);
    onLogout?.();
    // Home.jsx guarda sua propria copia do usuario (lida do storage so no
    // mount), entao so limpar o estado global do App nao atualiza o nome/
    // foto que ja estao na tela. Um reload garante que tudo reparte do zero
    // ja sem sessao.
    window.location.href = "/";
  }

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

      <div className="profile-wrapper">
        <button
          type="button"
          className="profile"
          onClick={() => usuario && setMenuAberto((aberto) => !aberto)}
        >
          {usuario && (
            <div className="user-info">
              <span className="nome">{usuario.username}</span>
              <span className="arroba">@{usuario.handle || usuario.username}</span>
            </div>
          )}

          <div className="avatar" style={{
            backgroundImage: `url(${usuario?.fotoPerfil || semFoto})`,
            backgroundPosition: usuario?.posPerfil ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%` : 'center',
            backgroundSize: 'cover'
          }}></div>
        </button>

        {menuAberto && (
          <>
            <div
              className="sidebar-backdrop"
              style={{ background: "transparent" }}
              onClick={() => setMenuAberto(false)}
            />
            <div className="profile-menu" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setMenuAberto(false);
                  onOpenUserProfile?.();
                }}
              >
                Ver perfil
              </button>
              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setMenuAberto(false);
                  onOpenSettings?.();
                }}
              >
                Configurações
              </button>
              <button type="button" className="profile-menu-item profile-menu-sair" onClick={sair}>
                Sair da conta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
