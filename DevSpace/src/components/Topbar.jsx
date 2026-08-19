import { useState } from "react";
import "../style/home.css";
import { useOverlayClose } from "../hooks/useOverlayClose";
import semFoto from "../assets/IMGS/NoPerfil.png";
import { logoutApi } from "../api";
import { DsIcon } from "./icons";
import { Icons } from "./iconKit";
import { usableFotoPerfil } from "../utils/avatar";

export default function Topbar({ visible, usuario, onSearch, sidebarOpen = true, onOpenUserProfile, onOpenSettings, onLogout, onLogin }) {
  const [query, setQuery] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  useOverlayClose(menuAberto, () => setMenuAberto(false));

  function sair() {
    logoutApi();
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
      <div className="topbar-shell">
      <div className="search-box">
        <DsIcon icon={Icons.Search} size="action" />
        <label className="sr-only" htmlFor="topbar-busca">Buscar posts ou usuários</label>
        <input
          id="topbar-busca"
          type="search"
          placeholder="Buscar posts ou usuários"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label="Limpar busca"
            onClick={() => {
              setQuery("");
              onSearch?.("");
            }}
          >
            ×
          </button>
        )}
      </div>

      <div className="profile-wrapper">
        {!usuario ? (
          <button type="button" className="topbar-login-btn" onClick={() => onLogin?.()}>
            Entrar
          </button>
        ) : (
        <button
          type="button"
          className="profile"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-label="Abrir menu da conta"
        >
          <div className="user-info">
            <span className="nome">{usuario.username}</span>
            <span className="arroba">@{usuario.handle || usuario.username}</span>
          </div>

          <div className="avatar" style={{
            backgroundImage: `url("${usableFotoPerfil(usuario.fotoPerfil) || semFoto}")`,
            backgroundPosition: usuario.posPerfil ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%` : 'center',
            backgroundSize: 'cover'
          }}></div>
        </button>
        )}

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
    </div>
  );
}
